"""
Heuristic 3D cadastral parcel extraction from a single uploaded raster.

Two extraction modes, auto-selected by band count:

- RGB orthomosaic (>=3 bands): Otsu-thresholds a grayscale intensity band
  to separate bright/built structures from vegetation & bare ground, then
  vectorizes the resulting mask into polygons (rasterio.features.shapes,
  a scanline contour tracer). A single nadir photo carries no elevation
  information, so extruded_height_m here is a documented area-based
  heuristic, not a measurement -- a real value needs a paired DEM/nDSM.

- Single-band DEM/DSM (1 band): pixels are actual elevations, so building
  candidates are found via local relief thresholding (height above a
  coarse ground estimate), and base_elevation_m / extruded_height_m are
  computed directly (real zonal min/max) from the data per connected
  component.

Encroachment is a proxy in the absence of ingested municipal registry
boundaries: parcels extracted from the same upload that geometrically
overlap each other are flagged, with the overlap area/percentage computed
from real geometry (not fabricated). A true registry-vs-extracted diff
engine (CLAUDE.md item 3) is a separate, not-yet-built feature.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
import rasterio
from pyproj import Geod
from rasterio.enums import Resampling
from rasterio.features import shapes as rasterio_shapes
from rasterio.warp import transform_geom
from scipy import ndimage
from shapely.geometry import Polygon, shape as shapely_shape
from shapely.strtree import STRtree
from skimage.filters import threshold_otsu
from skimage.morphology import binary_closing, binary_opening, remove_small_objects

from app.services.raster_io import decimated_out_shape, ensure_overviews, raster_env

GEOD = Geod(ellps="WGS84")

MAX_PROCESSING_DIMENSION = 1500  # cap resample size so segmentation stays fast/RAM-bounded
MIN_PARCEL_AREA_SQM = 15.0
MAX_PARCELS_PER_UPLOAD = 200  # keep DB writes & Cesium entity count bounded

# Orthophoto (no elevation data) height heuristic: bigger bright blobs -> taller.
ORTHOPHOTO_MIN_HEIGHT_M = 3.0
ORTHOPHOTO_MAX_HEIGHT_M = 15.0
ORTHOPHOTO_HEIGHT_AREA_SCALE_SQM = 400.0  # area at which the heuristic saturates
ORTHOPHOTO_BASE_ELEVATION_M = 0.0  # unknown without a DEM; documented placeholder

# DEM relief-thresholding: candidate structures are this many meters above
# the coarse per-scene ground estimate (10th percentile elevation).
DEM_GROUND_PERCENTILE = 10
DEM_RELIEF_THRESHOLD_M = 2.0
DEM_MIN_BLOB_PIXELS = 6


@dataclass
class ExtractedParcel:
    parcel_code: str
    polygon: Polygon  # 2D, WGS84 lon/lat
    base_elevation_m: float
    extruded_height_m: float
    area_sqm: float
    encroachment_area_sqm: float = 0.0
    encroachment_percentage: float = 0.0
    severity: str = "none"


def _geodesic_area_sqm(polygon: Polygon) -> float:
    if polygon.is_empty:
        return 0.0
    lon, lat = polygon.exterior.coords.xy
    area, _ = GEOD.polygon_area_perimeter(lon, lat)
    return abs(area)


def _geodesic_intersection_area_sqm(a: Polygon, b: Polygon) -> float:
    inter = a.intersection(b)
    if inter.is_empty:
        return 0.0
    if inter.geom_type == "Polygon":
        return _geodesic_area_sqm(inter)
    if inter.geom_type in ("MultiPolygon", "GeometryCollection"):
        return sum(_geodesic_area_sqm(g) for g in inter.geoms if g.geom_type == "Polygon")
    return 0.0


def _read_downsampled(src: rasterio.DatasetReader, band_indexes: list[int]):
    out_h, out_w = decimated_out_shape(src, MAX_PROCESSING_DIMENSION)
    data = src.read(
        indexes=band_indexes,
        out_shape=(len(band_indexes), out_h, out_w),
        resampling=Resampling.average,
    )
    transform = src.transform * src.transform.scale(src.width / out_w, src.height / out_h)
    return data, transform


def _mask_to_wgs84_polygons(mask: np.ndarray, transform, src_crs) -> list[Polygon]:
    polygons: list[Polygon] = []
    for geom, value in rasterio_shapes(mask.astype("uint8"), mask=mask, transform=transform):
        if value != 1:
            continue
        if src_crs is not None and src_crs.to_epsg() != 4326:
            geom = transform_geom(src_crs, "EPSG:4326", geom)
        poly = shapely_shape(geom)
        if poly.is_valid and not poly.is_empty and poly.geom_type == "Polygon":
            polygons.append(poly)
    return polygons


def _extract_from_orthophoto(src: rasterio.DatasetReader) -> list[tuple[Polygon, float, float]]:
    """Returns (polygon, base_elevation_m, extruded_height_m) triples."""
    band_count = min(src.count, 3)
    data, transform = _read_downsampled(src, list(range(1, band_count + 1)))
    gray = data.mean(axis=0)

    valid = np.isfinite(gray) & (gray > 0)
    if not valid.any() or gray[valid].max() <= gray[valid].min():
        return []

    threshold = threshold_otsu(gray[valid])
    mask = (gray > threshold) & valid
    mask = binary_opening(mask, footprint=np.ones((3, 3)))
    mask = binary_closing(mask, footprint=np.ones((3, 3)))
    mask = remove_small_objects(mask, min_size=6)

    polygons = _mask_to_wgs84_polygons(mask, transform, src.crs)

    results = []
    for poly in polygons:
        area = _geodesic_area_sqm(poly)
        if area < MIN_PARCEL_AREA_SQM:
            continue
        height_fraction = min(area / ORTHOPHOTO_HEIGHT_AREA_SCALE_SQM, 1.0)
        height = ORTHOPHOTO_MIN_HEIGHT_M + height_fraction * (
            ORTHOPHOTO_MAX_HEIGHT_M - ORTHOPHOTO_MIN_HEIGHT_M
        )
        results.append((poly, ORTHOPHOTO_BASE_ELEVATION_M, height))
    return results


def _extract_from_dem(src: rasterio.DatasetReader) -> list[tuple[Polygon, float, float]]:
    """Returns (polygon, base_elevation_m, extruded_height_m) triples with real zonal heights."""
    data, transform = _read_downsampled(src, [1])
    elevation = data[0].astype("float64")

    nodata = src.nodatavals[0] if src.nodatavals else None
    valid = np.isfinite(elevation)
    if nodata is not None:
        valid &= elevation != nodata
    if not valid.any():
        return []

    ground_level = np.percentile(elevation[valid], DEM_GROUND_PERCENTILE)
    structure_mask = valid & ((elevation - ground_level) > DEM_RELIEF_THRESHOLD_M)

    labeled, num_features = ndimage.label(structure_mask)
    results = []
    for label_id in range(1, num_features + 1):
        blob_mask = labeled == label_id
        if blob_mask.sum() < DEM_MIN_BLOB_PIXELS:
            continue

        # Base = the surrounding ground plane (not the blob's own elevation,
        # which is the roof); height = how far the roof sits above it.
        roof_elev = float(np.median(elevation[blob_mask]))
        height = max(roof_elev - ground_level, 0.5)

        for poly in _mask_to_wgs84_polygons(blob_mask, transform, src.crs):
            area = _geodesic_area_sqm(poly)
            if area < MIN_PARCEL_AREA_SQM:
                continue
            results.append((poly, float(ground_level), height))
    return results


def _compute_encroachments(parcels: list[ExtractedParcel]) -> None:
    """Mutates each parcel in place with overlap-against-siblings encroachment metrics."""
    if len(parcels) < 2:
        return

    polygons = [p.polygon for p in parcels]
    tree = STRtree(polygons)

    for i, parcel in enumerate(parcels):
        candidate_indexes = tree.query(parcel.polygon)
        overlap_area = 0.0
        for j in candidate_indexes:
            j = int(j)
            if j == i:
                continue
            overlap_area += _geodesic_intersection_area_sqm(parcel.polygon, polygons[j])

        overlap_area = min(overlap_area, parcel.area_sqm)
        pct = (overlap_area / parcel.area_sqm * 100) if parcel.area_sqm > 0 else 0.0

        if pct <= 0:
            severity = "none"
        elif pct < 5:
            severity = "minor"
        elif pct < 20:
            severity = "moderate"
        else:
            severity = "severe"

        parcel.encroachment_area_sqm = round(overlap_area, 3)
        parcel.encroachment_percentage = round(pct, 3)
        parcel.severity = severity


def to_3d_shapely(parcel: ExtractedParcel) -> Polygon:
    """3D version of the footprint for DB storage: every vertex Z = base_elevation_m."""
    exterior = [(x, y, parcel.base_elevation_m) for x, y in parcel.polygon.exterior.coords]
    interiors = [
        [(x, y, parcel.base_elevation_m) for x, y in ring.coords] for ring in parcel.polygon.interiors
    ]
    return Polygon(exterior, interiors)


def extract_parcels(raster_path: Path, upload_id: str) -> list[ExtractedParcel]:
    """
    Runs the full extraction pipeline on `raster_path` and returns extracted
    3D parcels, ranked by area (largest first) and capped at
    MAX_PARCELS_PER_UPLOAD, with encroachment metrics computed against
    sibling parcels from the same upload.
    """
    ensure_overviews(raster_path)

    with raster_env():
        with rasterio.open(raster_path) as src:
            if src.count >= 3:
                triples = _extract_from_orthophoto(src)
            else:
                triples = _extract_from_dem(src)

    triples.sort(key=lambda t: _geodesic_area_sqm(t[0]), reverse=True)
    triples = triples[:MAX_PARCELS_PER_UPLOAD]

    parcels = [
        ExtractedParcel(
            parcel_code=f"{upload_id[:8]}-P{idx:04d}",
            polygon=poly,
            base_elevation_m=base_elev,
            extruded_height_m=height,
            area_sqm=round(_geodesic_area_sqm(poly), 3),
        )
        for idx, (poly, base_elev, height) in enumerate(triples, start=1)
    ]

    _compute_encroachments(parcels)
    return parcels
