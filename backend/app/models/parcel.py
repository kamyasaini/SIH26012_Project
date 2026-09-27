"""
ORM model for AI/heuristic-extracted 3D cadastral parcels, persisted to the
Supabase PostGIS database. One row per polygon vectorized out of an
uploaded orthomosaic/DEM by app.services.cadastre_pipeline.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import DateTime, Float, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CadastralParcel(Base):
    __tablename__ = "cadastral_parcels"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Links back to the /api/upload-orthomosaic response that produced this parcel.
    upload_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    parcel_code: Mapped[str] = mapped_column(String(64), nullable=False)

    # 3D polygon footprint (every vertex's Z = base_elevation_m); Cesium extrudes
    # upward from this base using extruded_height_m.
    geometry: Mapped[object] = mapped_column(
        Geometry(geometry_type="POLYGONZ", srid=4326), nullable=False
    )

    base_elevation_m: Mapped[float] = mapped_column(Float, nullable=False)
    extruded_height_m: Mapped[float] = mapped_column(Float, nullable=False)
    area_sqm: Mapped[float] = mapped_column(Float, nullable=False)

    # Encroachment proxy: overlap against sibling parcels extracted from the
    # same upload. A real municipal-registry diff engine (CLAUDE.md item 3)
    # would replace this once registry boundaries are ingested.
    encroachment_area_sqm: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    encroachment_percentage: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    severity: Mapped[str] = mapped_column(String(16), nullable=False, default="none")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
