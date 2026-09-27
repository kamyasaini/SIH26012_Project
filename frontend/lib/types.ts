// Mirrors backend/app/schemas/cadastre.py and the /api/upload-orthomosaic
// response shape from backend/app/main.py.

export interface BoundingBox2D {
  min_longitude?: number;
  min_latitude?: number;
  max_longitude?: number;
  max_latitude?: number;
  min_x?: number;
  min_y?: number;
  max_x?: number;
  max_y?: number;
}

export interface RasterMetadata {
  driver: string;
  width_px: number;
  height_px: number;
  band_count: number;
  dtype: string | null;
  crs: string | null;
  pixel_size_x: number;
  pixel_size_y: number;
  native_bounding_box: BoundingBox2D;
  wgs84_bounding_box: BoundingBox2D;
}

export interface UploadOrthomosaicResponse {
  upload_id: string;
  original_filename: string;
  stored_path: string;
  stored_filename: string;
  preview_url: string;
  size_bytes: number;
  size_mb: number;
  raster_metadata: RasterMetadata;
}

export interface ApiErrorPayload {
  detail?: string;
}

export type EncroachmentSeverity = "none" | "minor" | "moderate" | "severe";

// Mirrors PolygonGeometry3D in backend/app/schemas/cadastre.py.
export interface Coordinate3D {
  longitude: number;
  latitude: number;
  elevation_m: number;
}

export interface PolygonGeometry3D {
  type: "Polygon";
  coordinates: Coordinate3D[][];
}

// Mirrors ExtractedParcelResponse in backend/app/schemas/cadastre.py.
export interface ExtractedParcelResponse {
  id: string;
  upload_id: string;
  parcel_code: string;
  geometry: PolygonGeometry3D;
  base_elevation_m: number;
  extruded_height_m: number;
  area_sqm: number;
  encroachment_area_sqm: number;
  encroachment_percentage: number;
  severity: EncroachmentSeverity;
  created_at: string;
}

// Mirrors ParcelExtractionResult in backend/app/schemas/cadastre.py.
export interface ParcelExtractionResult {
  upload_id: string;
  parcel_count: number;
  total_area_sqm: number;
  total_encroached_area_sqm: number;
  active_alerts: number;
  parcels: ExtractedParcelResponse[];
}

export interface EncroachmentAlertItem {
  id: string;
  parcelCode: string;
  encroachedAreaSqm: number;
  encroachmentPercentage: number;
  severity: EncroachmentSeverity;
  detectedAt: string;
}

export interface ParcelStats {
  totalParcels: number;
  totalAreaSqm: number;
  totalEncroachedAreaSqm: number;
  activeAlerts: number;
}
