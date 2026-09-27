"""
Renders an uploaded GeoTIFF into a georeferenced RGBA PNG suitable for use
as a Cesium `SingleTileImageryProvider` overlay draped over the terrain at
the raster's exact bounding box.

Downsamples to a bounded resolution so a 500MB+ drone capture doesn't blow
up into a multi-hundred-megabyte PNG or exhaust RAM while rendering.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.io import MemoryFile

from app.services.raster_io import decimated_out_shape, ensure_overviews, raster_env

MAX_PREVIEW_DIMENSION = 2048


def _stretch_to_uint8(band: np.ndarray) -> np.ndarray:
    """Percentile-stretches a single band to the full 0-255 range."""
    finite = np.isfinite(band)
    if not finite.any():
        return np.zeros(band.shape, dtype="uint8")

    lo, hi = np.percentile(band[finite], [2, 98])
    if hi <= lo:
        hi = lo + 1.0
    stretched = np.clip((band.astype("float64") - lo) / (hi - lo), 0, 1) * 255
    stretched = np.where(finite, stretched, 0)
    return stretched.astype("uint8")


def render_raster_preview_png(path: Path) -> bytes:
    """Reads `path` with rasterio and returns RGBA PNG bytes, nodata rendered transparent."""
    ensure_overviews(path)

    with raster_env():
        with rasterio.open(path) as src:
            out_height, out_width = decimated_out_shape(src, MAX_PREVIEW_DIMENSION)

            band_count = min(src.count, 3)
            data = src.read(
                indexes=list(range(1, band_count + 1)),
                out_shape=(band_count, out_height, out_width),
                resampling=Resampling.bilinear,
            )
            alpha = src.read_masks(
                1, out_shape=(out_height, out_width), resampling=Resampling.nearest
            )

    if data.dtype == np.uint8:
        rgb = data
    else:
        rgb = np.stack([_stretch_to_uint8(data[i]) for i in range(band_count)])

    if rgb.shape[0] == 1:
        rgb = np.repeat(rgb, 3, axis=0)

    rgba = np.concatenate([rgb, alpha[np.newaxis, :, :]], axis=0).astype("uint8")

    profile = {
        "driver": "PNG",
        "height": out_height,
        "width": out_width,
        "count": 4,
        "dtype": "uint8",
    }
    with MemoryFile() as memfile:
        with memfile.open(**profile) as dataset:
            dataset.write(rgba)
        return memfile.read()
