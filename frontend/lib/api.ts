import type { ApiErrorPayload, ParcelExtractionResult, UploadOrthomosaicResponse } from "./types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === "ok" || data.status === "degraded";
  } catch {
    return false;
  }
}

/**
 * Uploads a drone orthomosaic/DEM GeoTIFF to the backend's streaming
 * ingestion endpoint. Uses XMLHttpRequest (rather than fetch) so we can
 * surface real upload progress for large (500MB+) files.
 */
export function uploadOrthomosaic(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<UploadOrthomosaicResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/api/upload-orthomosaic`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let body: unknown;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = null;
      }

      if (xhr.status >= 200 && xhr.status < 300 && body) {
        resolve(body as UploadOrthomosaicResponse);
      } else {
        const detail =
          (body as ApiErrorPayload | null)?.detail ??
          `Upload failed with status ${xhr.status}`;
        reject(new Error(detail));
      }
    };

    xhr.onerror = () => {
      reject(
        new Error(
          `Could not reach backend at ${API_BASE_URL}. Is the FastAPI server running?`,
        ),
      );
    };

    const formData = new FormData();
    formData.append("file", file);
    xhr.send(formData);
  });
}

async function parseJsonOrThrow<T>(res: Response, fallbackMessage: string): Promise<T> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // no JSON body
  }
  if (!res.ok) {
    throw new Error((body as ApiErrorPayload | null)?.detail ?? fallbackMessage);
  }
  return body as T;
}

/** Runs the heuristic 3D parcel extraction pipeline against a previously uploaded raster. */
export async function extractParcels(storedFilename: string): Promise<ParcelExtractionResult> {
  const res = await fetch(
    `${API_BASE_URL}/api/extract-parcels/${encodeURIComponent(storedFilename)}`,
    { method: "POST" },
  );
  return parseJsonOrThrow<ParcelExtractionResult>(res, "Parcel extraction failed.");
}

/** Refetches previously extracted parcels for an upload without re-running the pipeline. */
export async function fetchParcels(uploadId: string): Promise<ParcelExtractionResult> {
  const res = await fetch(`${API_BASE_URL}/api/parcels/${encodeURIComponent(uploadId)}`, {
    cache: "no-store",
  });
  return parseJsonOrThrow<ParcelExtractionResult>(res, "Could not fetch parcels.");
}

export function rasterPreviewUrl(previewPath: string): string {
  return `${API_BASE_URL}${previewPath}`;
}
