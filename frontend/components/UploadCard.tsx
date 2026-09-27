"use client";

import { useCallback, useRef, useState } from "react";
import {
  UploadCloud,
  FileCheck2,
  AlertCircle,
  Loader2,
  Boxes,
} from "lucide-react";
import { extractParcels, uploadOrthomosaic } from "@/lib/api";
import type {
  ParcelExtractionResult,
  UploadOrthomosaicResponse,
} from "@/lib/types";

const ALLOWED_EXTENSIONS = [".tif", ".tiff"];

interface UploadCardProps {
  onUploadComplete?: (result: UploadOrthomosaicResponse) => void;
  onParcelsExtracted?: (result: ParcelExtractionResult) => void;
}

type Stage = "idle" | "uploading" | "extracting";

export default function UploadCard({
  onUploadComplete,
  onParcelsExtracted,
}: UploadCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] =
    useState<UploadOrthomosaicResponse | null>(null);
  const [parcelResult, setParcelResult] =
    useState<ParcelExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const isValidFile = (file: File) =>
    ALLOWED_EXTENSIONS.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setResult(null);
      setParcelResult(null);

      if (!isValidFile(file)) {
        setError(
          `Unsupported file type. Expected ${ALLOWED_EXTENSIONS.join(" or ")}.`
        );
        return;
      }

      setStage("uploading");
      setProgress(0);

      let uploadResponse: UploadOrthomosaicResponse;

      try {
        uploadResponse = await uploadOrthomosaic(file, setProgress);

        setResult(uploadResponse);
        onUploadComplete?.(uploadResponse);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Upload failed."
        );
        setStage("idle");
        return;
      }

      setStage("extracting");

      try {
        const extraction = await extractParcels(
          uploadResponse.stored_filename
        );

        setParcelResult(extraction);
        onParcelsExtracted?.(extraction);
      } catch (err) {
        setError(
          err instanceof Error
            ? `Upload succeeded, but parcel extraction failed: ${err.message}`
            : "Parcel extraction failed."
        );
      } finally {
        setStage("idle");
      }
    },
    [onUploadComplete, onParcelsExtracted],
  );

  // ⭐ 1-CLICK DEMO SAMPLE
  const loadSampleFile = useCallback(async () => {
    try {
      setError(null);

      const response = await fetch("/samples/sih_demo.tif");

      if (!response.ok) {
        throw new Error("Failed to load demo file.");
      }

      const blob = await response.blob();

      const sampleFile = new File(
        [blob],
        "sih_demo.tif",
        { type: "image/tiff" }
      );

      // Send the demo file through the SAME upload pipeline
      handleFile(sampleFile);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load demo file."
      );
    }
  }, [handleFile]);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];

      if (file) {
        handleFile(file);
      }
    },
    [handleFile],
  );

  const onSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];

      if (file) {
        handleFile(file);
      }

      e.target.value = "";
    },
    [handleFile],
  );

  const busy = stage !== "idle";

  return (
    <div className="rounded-lg border border-border bg-surface p-3.5">
      <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-400">
        Orthomosaic Ingestion
      </h2>

      {/* ⭐ 1-CLICK DEMO SECTION */}
      <div className="mb-3 rounded-md border border-accent/40 bg-accent/5 p-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-accent">
            Live Demo
          </span>

          <span className="rounded bg-accent/10 px-2 py-0.5 text-[10px] text-accent">
            1-Click
          </span>
        </div>

        <p className="mb-2 text-[10px] text-neutral-400">
          Instantly load the SIH demo orthomosaic.
        </p>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            loadSampleFile();
          }}
          disabled={busy}
          className="w-full rounded-md bg-accent px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ⚡ Load SIH Demo Sample
        </button>
      </div>

      {/* EXISTING DRAG & DROP UPLOAD */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-6 text-center transition-colors ${
          isDragging
            ? "border-accent bg-accent/10"
            : "border-border bg-surface-raised hover:border-accent/60"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".tif,.tiff"
          className="hidden"
          onChange={onSelect}
        />

        {stage === "uploading" && (
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        )}

        {stage === "extracting" && (
          <Boxes className="h-6 w-6 animate-pulse text-accent" />
        )}

        {stage === "idle" && (
          <UploadCloud className="h-6 w-6 text-neutral-400" />
        )}

        <p className="text-xs text-neutral-300">
          {stage === "uploading" &&
            `Uploading… ${progress}%`}

          {stage === "extracting" &&
            "Extracting 3D parcels…"}

          {stage === "idle" &&
            "Drag & drop a drone .tif/.tiff, or click to browse"}
        </p>

        <p className="text-[10px] text-neutral-500">
          Streamed in chunks — handles 500MB+ files
        </p>
      </div>

      {/* UPLOAD PROGRESS */}
      {stage === "uploading" && (
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
          <div
            className="h-full rounded-full bg-accent transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* ERROR MESSAGE */}
      {error && (
        <div className="mt-2.5 flex items-start gap-1.5 rounded-md border border-red-900/50 bg-red-950/40 p-2 text-xs text-red-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* UPLOAD RESULT */}
      {result && (
        <div className="mt-2.5 space-y-1.5 rounded-md border border-emerald-900/50 bg-emerald-950/30 p-2.5 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-300">
            <FileCheck2 className="h-3.5 w-3.5 shrink-0" />

            <span className="truncate font-medium">
              {result.original_filename}
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-neutral-400">
            <dt>Size</dt>

            <dd className="text-neutral-200">
              {result.size_mb} MB
            </dd>

            <dt>Dimensions</dt>

            <dd className="text-neutral-200">
              {result.raster_metadata.width_px} ×{" "}
              {result.raster_metadata.height_px} px
            </dd>

            <dt>Bands</dt>

            <dd className="text-neutral-200">
              {result.raster_metadata.band_count}
            </dd>

            <dt>CRS</dt>

            <dd className="truncate text-neutral-200">
              {result.raster_metadata.crs ?? "unknown"}
            </dd>
          </dl>

          <div className="border-t border-emerald-900/40 pt-1.5 text-neutral-400">
            <p className="mb-0.5 text-[10px] uppercase tracking-wide text-neutral-500">
              WGS84 bounding box
            </p>

            <p className="text-neutral-200">
              {result.raster_metadata.wgs84_bounding_box.min_latitude?.toFixed(
                5
              )}
              ,{" "}
              {result.raster_metadata.wgs84_bounding_box.min_longitude?.toFixed(
                5
              )}{" "}
              →{" "}
              {result.raster_metadata.wgs84_bounding_box.max_latitude?.toFixed(
                5
              )}
              ,{" "}
              {result.raster_metadata.wgs84_bounding_box.max_longitude?.toFixed(
                5
              )}
            </p>
          </div>

          {parcelResult && (
            <div className="border-t border-emerald-900/40 pt-1.5 text-neutral-400">
              <p className="text-neutral-200">
                {parcelResult.parcel_count} parcels extracted ·{" "}
                {parcelResult.active_alerts} encroachment alert
                {parcelResult.active_alerts === 1 ? "" : "s"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* EXTRACTION WARNING */}
      {!busy && !error && result && !parcelResult && (
        <p className="mt-2 text-[10px] text-amber-400">
          Extraction did not complete — try re-uploading.
        </p>
      )}
    </div>
  );
}