"""
Pydantic schemas for 3D cadastral parcels: boundary geometry, elevation /
extrusion attributes, and land-encroachment metrics. These are transport
schemas (API request/response bodies) that mirror, but are decoupled from,
the underlying GeoAlchemy2 ORM models.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

# ---------------------------------------------------------------------------
# Geometry primitives
# ---------------------------------------------------------------------------

class Coordinate3D(BaseModel):
    """A single vertex: (longitude, latitude, elevation) in WGS84 / EPSG:4326."""

    longitude: float = Field(..., ge=-180, le=180)
    latitude: float = Field(..., ge=-90, le=90)
    elevation_m: float = Field(
        0.0, description="Height above the reference ellipsoid/geoid, in meters."
    )

    def as_tuple(self) -> tuple[float, float, float]:
        return (self.longitude, self.latitude, self.elevation_m)


class PolygonGeometry3D(BaseModel):
    """
    GeoJSON-style 3D polygon. `coordinates` holds one or more linear rings;
    ring[0] is the exterior boundary, any subsequent rings are holes.
    Each ring must be closed (first vertex == last vertex) and contain
    at least 4 positions.
    """

    type: str = Field("Polygon", frozen=True)
    coordinates: list[list[Coordinate3D]]

    @field_validator("coordinates")
    @classmethod
    def validate_rings(cls, rings: list[list[Coordinate3D]]) -> list[list[Coordinate3D]]:
        if not rings:
            raise ValueError("Polygon must contain at least one linear ring")
        for ring in rings:
            if len(ring) < 4:
                raise ValueError("Each ring must have at least 4 positions (3 unique + closing vertex)")
            if ring[0].as_tuple() != ring[-1].as_tuple():
                raise ValueError("Each ring must be closed: first and last coordinates must match")
        return rings

    def to_geojson_coordinates(self) -> list[list[list[float]]]:
        """Converts to the raw [[[lon, lat, elev], ...]] shape CesiumJS/GeoJSON expects."""
        return [[list(vertex.as_tuple()) for vertex in ring] for ring in self.coordinates]


# ---------------------------------------------------------------------------
# Parcel schemas
# ---------------------------------------------------------------------------

class ParcelBase(BaseModel):
    """Shared fields for a 3D cadastral parcel boundary."""

    parcel_code: str = Field(..., min_length=1, max_length=64, description="Municipal/registry parcel identifier.")
    geometry: PolygonGeometry3D = Field(..., description="3D footprint boundary of the parcel.")
    base_elevation_m: float = Field(
        ..., description="Ground/terrain elevation at the parcel base, sampled from the DEM, in meters."
    )
    extruded_height_m: float = Field(
        0.0, ge=0, description="Height to extrude the footprint upward for 3D rendering (e.g. building height), in meters."
    )
    owner_name: str | None = Field(None, max_length=256)

    @property
    def apex_elevation_m(self) -> float:
        """Absolute elevation of the extruded roofline: base + extrusion."""
        return self.base_elevation_m + self.extruded_height_m


class ParcelCreate(ParcelBase):
    """Payload for registering a newly extracted parcel."""
    pass


class ParcelUpdate(BaseModel):
    """Partial update payload."""

    geometry: PolygonGeometry3D | None = None
    base_elevation_m: float | None = None
    extruded_height_m: float | None = Field(None, ge=0)
    owner_name: str | None = None


class ParcelRead(ParcelBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(default_factory=uuid4)
    area_sqm: float = Field(..., ge=0, description="Planimetric (2D) area of the parcel footprint, in square meters.")
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Encroachment metrics
# ---------------------------------------------------------------------------

class EncroachmentSeverity(str, Enum):
    NONE = "none"
    MINOR = "minor"        # < 5% deviation
    MODERATE = "moderate"  # 5-20% deviation
    SEVERE = "severe"      # > 20% deviation


class EncroachmentMetrics(BaseModel):
    """
    Result of diffing an AI-extracted 3D parcel boundary against the
    registered municipal record for the same parcel_code.
    """

    parcel_code: str
    registry_area_sqm: float = Field(..., ge=0, description="Officially registered parcel area, in square meters.")
    extracted_area_sqm: float = Field(..., ge=0, description="AI-extracted parcel area from the orthomosaic, in square meters.")
    encroached_area_sqm: float = Field(
        ..., ge=0, description="Area present in the extracted boundary but outside the registered boundary, in square meters."
    )
    encroachment_percentage: float = Field(
        ..., ge=0, description="encroached_area_sqm as a percentage of registry_area_sqm."
    )
    severity: EncroachmentSeverity
    detected_at: datetime = Field(default_factory=datetime.utcnow)

    @model_validator(mode="after")
    def check_consistency(self) -> "EncroachmentMetrics":
        if self.encroached_area_sqm > self.extracted_area_sqm + 1e-6:
            raise ValueError("encroached_area_sqm cannot exceed extracted_area_sqm")
        return self

    @classmethod
    def from_areas(
        cls,
        parcel_code: str,
        registry_area_sqm: float,
        extracted_area_sqm: float,
        encroached_area_sqm: float,
    ) -> "EncroachmentMetrics":
        pct = (encroached_area_sqm / registry_area_sqm * 100) if registry_area_sqm > 0 else 0.0
        if pct <= 0:
            severity = EncroachmentSeverity.NONE
        elif pct < 5:
            severity = EncroachmentSeverity.MINOR
        elif pct < 20:
            severity = EncroachmentSeverity.MODERATE
        else:
            severity = EncroachmentSeverity.SEVERE
        return cls(
            parcel_code=parcel_code,
            registry_area_sqm=registry_area_sqm,
            extracted_area_sqm=extracted_area_sqm,
            encroached_area_sqm=encroached_area_sqm,
            encroachment_percentage=round(pct, 4),
            severity=severity,
        )


class EncroachmentAlert(BaseModel):
    """Instant alert payload triggered when a parcel crosses the encroachment threshold."""

    parcel_code: str
    metrics: EncroachmentMetrics
    message: str
    triggered_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Extraction pipeline output (app.services.cadastre_pipeline)
# ---------------------------------------------------------------------------

class ExtractedParcelResponse(BaseModel):
    """One AI/heuristic-extracted 3D parcel, as returned by the extraction endpoints."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    upload_id: str
    parcel_code: str
    geometry: PolygonGeometry3D
    base_elevation_m: float
    extruded_height_m: float
    area_sqm: float
    encroachment_area_sqm: float
    encroachment_percentage: float
    severity: EncroachmentSeverity
    created_at: datetime


class ParcelExtractionResult(BaseModel):
    """Summary + full parcel list returned after running the extraction pipeline on an upload."""

    upload_id: str
    parcel_count: int
    total_area_sqm: float
    total_encroached_area_sqm: float
    active_alerts: int
    parcels: list[ExtractedParcelResponse]
