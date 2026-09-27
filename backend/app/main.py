"""
FastAPI application entrypoint for the 3D Cadastral Mapping backend.

Exposes a streaming orthomosaic/DEM upload endpoint that never loads the
full GeoTIFF into memory: bytes are read and written to disk in bounded
chunks, so a 500MB+ drone capture costs a fixed, small amount of RAM
(CHUNK_SIZE_BYTES) rather than the full file size.
"""
from __future__ import annotations

import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import rasterio
from fastapi import FastAPI, HTTPException, Response, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from geoalchemy2.shape import from_shape, to_shape
from rasterio.errors import RasterioIOError
from rasterio.warp import transform_bounds
from sqlalchemy import select
from starlette.concurrency import run_in_threadpool

from app.core.database import dispose_engine, init_models, session_scope, verify_postgis_ready
from app.models import CadastralParcel
from app.schemas.cadastre import (
    Coordinate3D,
    EncroachmentSeverity,
    ExtractedParcelResponse,
    ParcelExtractionResult,
    PolygonGeometry3D,
)
from app.services.cadastre_pipeline import ExtractedParcel, extract_parcels, to_3d_shapely
from app.services.raster_io import ensure_overviews
from app.services.raster_preview import render_raster_preview_png

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))
CHUNK_SIZE_BYTES = int(os.getenv("UPLOAD_CHUNK_SIZE_BYTES", 8 * 1024 * 1024))  # 8 MB per chunk
MAX_UPLOAD_SIZE_BYTES = int(os.getenv("MAX_UPLOAD_SIZE_BYTES", 2 * 1024 * 1024 * 1024))  # 2 GB hard cap
ALLOWED_EXTENSIONS = {".tif", ".tiff"}
WGS84 = "EPSG:4326"


@asynccontextmanager
async def lifespan(app: FastAPI):
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    await init_models()
    yield
    await dispose_engine()


app = FastAPI(
    title="3D Cadastral Mapping & Feature Extraction API",
    description="Ingests drone orthomosaics/DEMs and serves 3D cadastral parcel + encroachment data.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _validate_extension(filename: str) -> None:
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type '{suffix}'. Expected one of {sorted(ALLOWED_EXTENSIONS)}.",
        )


def _resolve_uploaded_file(filename: str) -> Path:
    """Resolves a user-supplied filename to a path inside UPLOAD_DIR, rejecting path traversal."""
    safe_name = Path(filename).name
    file_path = UPLOAD_DIR / safe_name
    if not file_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No uploaded raster named '{safe_name}'.")
    return file_path


def _record_to_response(record: CadastralParcel) -> ExtractedParcelResponse:
    """Decodes a persisted parcel's stored 3D geometry back into the API response shape."""
    poly3d = to_shape(record.geometry)
    rings = [list(poly3d.exterior.coords)]
    rings.extend(list(ring.coords) for ring in poly3d.interiors)

    return ExtractedParcelResponse(
        id=record.id,
        upload_id=record.upload_id,
        parcel_code=record.parcel_code,
        geometry=PolygonGeometry3D(
            coordinates=[
                [Coordinate3D(longitude=lon, latitude=lat, elevation_m=elev) for lon, lat, elev in ring]
                for ring in rings
            ]
        ),
        base_elevation_m=record.base_elevation_m,
        extruded_height_m=record.extruded_height_m,
        area_sqm=record.area_sqm,
        encroachment_area_sqm=record.encroachment_area_sqm,
        encroachment_percentage=record.encroachment_percentage,
        severity=EncroachmentSeverity(record.severity),
        created_at=record.created_at,
    )


def _summarize(upload_id: str, responses: list[ExtractedParcelResponse]) -> ParcelExtractionResult:
    return ParcelExtractionResult(
        upload_id=upload_id,
        parcel_count=len(responses),
        total_area_sqm=round(sum(p.area_sqm for p in responses), 3),
        total_encroached_area_sqm=round(sum(p.encroachment_area_sqm for p in responses), 3),
        active_alerts=sum(1 for p in responses if p.severity != EncroachmentSeverity.NONE),
        parcels=responses,
    )


async def _persist_parcels(upload_id: str, extracted: list[ExtractedParcel]) -> list[CadastralParcel]:
    now = datetime.now(timezone.utc)
    records = [
        CadastralParcel(
            id=uuid.uuid4(),
            upload_id=upload_id,
            parcel_code=p.parcel_code,
            geometry=from_shape(to_3d_shapely(p), srid=4326),
            base_elevation_m=p.base_elevation_m,
            extruded_height_m=p.extruded_height_m,
            area_sqm=p.area_sqm,
            encroachment_area_sqm=p.encroachment_area_sqm,
            encroachment_percentage=p.encroachment_percentage,
            severity=p.severity,
            created_at=now,
        )
        for p in extracted
    ]

    async with session_scope() as session:
        session.add_all(records)

    return records


async def _stream_to_disk(upload: UploadFile, destination: Path) -> int:
    """
    Reads the incoming multipart upload in fixed-size chunks and writes each
    chunk to disk immediately, discarding it from memory afterward. This
    keeps peak RAM usage at ~CHUNK_SIZE_BYTES regardless of total file size.
    """
    bytes_written = 0

    def _open_and_get_writer():
        return open(destination, "wb")

    file_handle = await run_in_threadpool(_open_and_get_writer)
    try:
        while True:
            chunk = await upload.read(CHUNK_SIZE_BYTES)
            if not chunk:
                break
            bytes_written += len(chunk)
            if bytes_written > MAX_UPLOAD_SIZE_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File exceeds the {MAX_UPLOAD_SIZE_BYTES} byte upload limit.",
                )
            await run_in_threadpool(file_handle.write, chunk)
    finally:
        await run_in_threadpool(file_handle.close)
        await upload.close()

    return bytes_written


def _extract_raster_metadata(path: Path) -> dict[str, Any]:
    """Opens the persisted GeoTIFF with rasterio and reads header metadata only (no pixel data)."""
    with rasterio.open(path) as dataset:
        native_bounds = dataset.bounds  # (left, bottom, right, top) in dataset CRS
        native_crs = dataset.crs

        if native_crs is not None and native_crs.to_epsg() != 4326:
            wgs84_bounds = transform_bounds(native_crs, WGS84, *native_bounds)
        else:
            wgs84_bounds = tuple(native_bounds)

        return {
            "driver": dataset.driver,
            "width_px": dataset.width,
            "height_px": dataset.height,
            "band_count": dataset.count,
            "dtype": dataset.dtypes[0] if dataset.dtypes else None,
            "crs": native_crs.to_string() if native_crs else None,
            "pixel_size_x": dataset.res[0],
            "pixel_size_y": dataset.res[1],
            "native_bounding_box": {
                "min_x": native_bounds.left,
                "min_y": native_bounds.bottom,
                "max_x": native_bounds.right,
                "max_y": native_bounds.top,
            },
            "wgs84_bounding_box": {
                "min_longitude": wgs84_bounds[0],
                "min_latitude": wgs84_bounds[1],
                "max_longitude": wgs84_bounds[2],
                "max_latitude": wgs84_bounds[3],
            },
        }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/health", tags=["system"])
async def health_check() -> dict[str, Any]:
    try:
        postgis_status = await verify_postgis_ready()
    except Exception as exc:  # database not reachable/provisioned yet
        return {"status": "degraded", "database": "unreachable", "detail": str(exc)}
    return {"status": "ok", "database": "connected", **postgis_status}


@app.post("/api/upload-orthomosaic", tags=["ingestion"], status_code=status.HTTP_201_CREATED)
async def upload_orthomosaic(file: UploadFile) -> dict[str, Any]:
    """
    Streams a drone-captured orthomosaic or DEM GeoTIFF to disk in bounded
    chunks (protecting system RAM for files well over 500MB), then reads
    back only the raster header to return file metadata and its spatial
    bounding box extent in both native and WGS84 coordinates.
    """
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No filename provided.")

    _validate_extension(file.filename)

    upload_id = uuid.uuid4()
    stored_filename = f"{upload_id}{Path(file.filename).suffix.lower()}"
    destination = UPLOAD_DIR / stored_filename

    try:
        bytes_written = await _stream_to_disk(file, destination)

        if bytes_written == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

        try:
            raster_metadata = await run_in_threadpool(_extract_raster_metadata, destination)
            # Build low-res overview levels once, up front, so every later
            # preview/extraction read is a cheap decimated read against a
            # small overview instead of the full-resolution source (see
            # app.services.raster_io) -- this is what a 50MB+ drone raster
            # needs to avoid exhausting RAM.
            await run_in_threadpool(ensure_overviews, destination)
        except RasterioIOError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"File is not a valid GeoTIFF raster: {exc}",
            ) from exc

    except HTTPException:
        destination.unlink(missing_ok=True)
        raise
    except Exception as exc:
        destination.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {exc}",
        ) from exc

    return {
        "upload_id": str(upload_id),
        "original_filename": file.filename,
        "stored_path": str(destination),
        "stored_filename": stored_filename,
        "preview_url": f"/api/raster-preview/{stored_filename}",
        "size_bytes": bytes_written,
        "size_mb": round(bytes_written / (1024 * 1024), 2),
        "raster_metadata": raster_metadata,
    }


@app.get("/api/raster-preview/{filename}", tags=["ingestion"])
async def raster_preview(filename: str) -> Response:
    """
    Renders the stored GeoTIFF at `filename` into a georeferenced RGBA PNG
    for use as a Cesium `SingleTileImageryProvider` overlay at the raster's
    bounding box (see UploadOrthomosaicResponse.raster_metadata.wgs84_bounding_box).
    """
    file_path = _resolve_uploaded_file(filename)
    try:
        png_bytes = await run_in_threadpool(render_raster_preview_png, file_path)
    except RasterioIOError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Could not render preview: {exc}",
        ) from exc

    return Response(content=png_bytes, media_type="image/png")


@app.post("/api/extract-parcels/{filename}", tags=["extraction"], response_model=ParcelExtractionResult)
async def extract_parcels_endpoint(filename: str) -> ParcelExtractionResult:
    """
    Runs the heuristic 3D parcel extraction pipeline (see
    app.services.cadastre_pipeline) against a previously uploaded raster,
    persists the resulting parcels to Supabase PostGIS, and returns them.
    """
    file_path = _resolve_uploaded_file(filename)
    upload_id = file_path.stem

    try:
        extracted = await run_in_threadpool(extract_parcels, file_path, upload_id)
    except RasterioIOError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Could not process raster for extraction: {exc}",
        ) from exc

    records = await _persist_parcels(upload_id, extracted)
    responses = [_record_to_response(r) for r in records]
    return _summarize(upload_id, responses)


@app.get("/api/parcels/{upload_id}", tags=["extraction"], response_model=ParcelExtractionResult)
async def get_parcels(upload_id: str) -> ParcelExtractionResult:
    """Returns previously extracted parcels for an upload without re-running the pipeline."""
    async with session_scope() as session:
        result = await session.execute(
            select(CadastralParcel).where(CadastralParcel.upload_id == upload_id)
        )
        records = list(result.scalars().all())

    responses = [_record_to_response(r) for r in records]
    return _summarize(upload_id, responses)


@app.get("/", tags=["system"])
async def root() -> dict[str, str]:
    return {"service": "3D Cadastral Mapping & Feature Extraction API", "status": "running"}
