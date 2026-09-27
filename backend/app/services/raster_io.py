"""
Shared memory-safe raster I/O helpers.

Reading a 50MB+ compressed (500MB+ uncompressed) drone raster at full
resolution just to downsample it in memory is what crashed this app on a
7687x6756 real-world orthomosaic: with no pre-built overviews, GDAL's
`out_shape` decimation still has to decode full-resolution source blocks
to compute the averaged output, so peak memory scales with the SOURCE
size, not the requested output size.

The fix is the standard GDAL approach: build low-resolution overview
levels once per uploaded file, then always read through `out_shape`
decimation. With overviews present, GDAL transparently reads from the
smallest overview at least as large as the requested output instead of
the full-resolution source, so peak memory for any decimated read stays
proportional to the (small) output size regardless of source file size.
A capped GDAL block cache is a second line of defense during the
one-time overview build itself.
"""
from __future__ import annotations

from pathlib import Path

import rasterio
from rasterio.enums import Resampling

# Bounds GDAL's internal block cache so even the one-time overview build
# (or a decimated read before overviews exist) can't balloon memory to the
# size of the source file.
GDAL_CACHEMAX_BYTES = 128 * 1024 * 1024
OVERVIEW_FACTORS = [2, 4, 8, 16, 32]


def raster_env() -> rasterio.Env:
    """A GDAL environment with a bounded block cache; wrap every raster open in this."""
    return rasterio.Env(GDAL_CACHEMAX=GDAL_CACHEMAX_BYTES, GDAL_TIFF_OVR_BLOCKSIZE="128")


def ensure_overviews(path: Path) -> None:
    """
    Builds internal decimated overview levels for `path` if it doesn't
    already have them. GDAL's overview builder streams the source in
    blocks rather than materializing it whole, so this is safe to run on
    a 500MB+ raster. Idempotent: a no-op once overviews exist -- checked
    read-only first, since re-opening an already-optimized Cloud Optimized
    GeoTIFF in write mode is rejected by GDAL outright (it would break the
    COG layout), and many drone processing tools (ODM, Pix4D, DroneDeploy)
    already export COGs with overviews baked in.
    """
    with raster_env():
        with rasterio.open(path) as dataset:
            if dataset.overviews(1):
                return

        with rasterio.open(path, "r+") as dataset:
            dataset.build_overviews(OVERVIEW_FACTORS, Resampling.average)
            dataset.update_tags(ns="rio_overview", resampling="average")


def decimated_out_shape(src: rasterio.DatasetReader, max_dimension: int) -> tuple[int, int]:
    """(height, width) capped at max_dimension on the longer side, preserving aspect ratio."""
    scale = min(1.0, max_dimension / max(src.width, src.height))
    return max(1, round(src.height * scale)), max(1, round(src.width * scale))
