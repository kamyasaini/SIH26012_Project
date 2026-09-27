"use client";

import { useState } from "react";

import type { ExtractedParcelResponse } from "@/lib/types";
import { generateLegalNotice } from "@/lib/generateLegalNotice";

interface ParcelDetailsHudProps {
  parcel: ExtractedParcelResponse;
  onClose: () => void;
  mapElement?: HTMLElement | null;
  position: {
    left: number;
    top: number;
  };
}

export default function ParcelDetailsHud({
  parcel,
  onClose,
  mapElement,
  position,
}: ParcelDetailsHudProps) {
  const [isGenerating, setIsGenerating] =
    useState(false);

  const [showAllDetails, setShowAllDetails] =
    useState(false);

  const handleGenerateNotice = async () => {
    try {
      setIsGenerating(true);

      await generateLegalNotice(
        parcel,
        mapElement,
      );
    } catch (error) {
      console.error(
        "Failed to generate legal notice:",
        error,
      );

      alert(
        "Could not generate the legal notice. Please try again.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      className="pointer-events-auto absolute z-[90] w-80 max-w-[calc(100%-24px)] max-h-[calc(100%-24px)] overflow-y-auto rounded-lg border border-cyan-400/30 bg-surface/95 p-4 text-neutral-100 shadow-2xl backdrop-blur-xl"
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`,
      }}
    >
      {/* HEADER */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white">
            Parcel Details
          </h2>

          <p className="mt-1 text-[9px] uppercase tracking-wider text-cyan-400">
            Selected Parcel
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded px-2 py-1 text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
          aria-label="Close parcel details"
        >
          ✕
        </button>
      </div>

      {/* ============================= */}
      {/* BASIC DETAILS */}
      {/* ============================= */}

      <div className="space-y-3 text-xs">
        <DetailRow
          label="Parcel Code"
          value={parcel.parcel_code}
        />

        <DetailRow
          label="Total Area"
          value={`${parcel.area_sqm.toFixed(2)} m²`}
        />

        <DetailRow
          label="Encroachment Area"
          value={`${parcel.encroachment_area_sqm.toFixed(
            2,
          )} m²`}
        />

        <DetailRow
          label="Encroachment"
          value={`${parcel.encroachment_percentage.toFixed(
            2,
          )}%`}
        />

        <div>
          <div className="text-neutral-500">
            Severity
          </div>

          <div className="mt-0.5 capitalize text-neutral-100">
            {parcel.severity}
          </div>
        </div>
      </div>

      {/* ============================= */}
      {/* VIEW ALL DETAILS BUTTON */}
      {/* ============================= */}

      <button
        type="button"
        onClick={() =>
          setShowAllDetails(
            (value) => !value,
          )
        }
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-300 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-300"
      >
        <span>
          {showAllDetails
            ? "HIDE DETAILS"
            : "VIEW ALL DETAILS"}
        </span>

        <span className="text-[9px]">
          {showAllDetails
            ? "▲"
            : "▼"}
        </span>
      </button>

      {/* ============================= */}
      {/* COMPLETE DETAILS */}
      {/* ============================= */}

      {showAllDetails && (
        <div className="mt-4 space-y-3 border-t border-white/10 pt-4 text-xs">
          <DetailRow
            label="ID"
            value={parcel.id}
            breakAll
          />

          <DetailRow
            label="Upload ID"
            value={parcel.upload_id}
            breakAll
          />

          <DetailRow
            label="Parcel Code"
            value={parcel.parcel_code}
          />

          <DetailRow
            label="Base Elevation"
            value={`${parcel.base_elevation_m.toFixed(
              2,
            )} m`}
          />

          <DetailRow
            label="Extruded Height"
            value={`${parcel.extruded_height_m.toFixed(
              2,
            )} m`}
          />

          <DetailRow
            label="Total Area"
            value={`${parcel.area_sqm.toFixed(
              2,
            )} m²`}
          />

          <DetailRow
            label="Encroachment Area"
            value={`${parcel.encroachment_area_sqm.toFixed(
              2,
            )} m²`}
          />

          <DetailRow
            label="Encroachment Percentage"
            value={`${parcel.encroachment_percentage.toFixed(
              2,
            )}%`}
          />

          <DetailRow
            label="Severity"
            value={parcel.severity}
            capitalize
          />

          <DetailRow
            label="Created"
            value={parcel.created_at}
            breakAll
          />
        </div>
      )}

      {/* ============================= */}
      {/* LEGAL NOTICE */}
      {/* ============================= */}

      <div className="mt-5 border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={handleGenerateNotice}
          disabled={isGenerating}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-cyan-300 transition hover:border-cyan-300/50 hover:bg-cyan-400/20 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGenerating ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-cyan-300/30 border-t-cyan-300" />

              Generating Notice...
            </>
          ) : (
            <>
              <span className="text-sm">
                ⚖
              </span>

              Generate Legal Notice
            </>
          )}
        </button>

        <p className="mt-2 text-center text-[9px] leading-relaxed text-neutral-500">
          Generates a system-generated draft notice
          for administrative review.
        </p>
      </div>
    </div>
  );
}

/* ================================= */
/* REUSABLE DETAIL ROW               */
/* ================================= */

function DetailRow({
  label,
  value,
  breakAll = false,
  capitalize = false,
}: {
  label: string;
  value: string;
  breakAll?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div>
      <div className="text-neutral-500">
        {label}
      </div>

      <div
        className={`mt-0.5 text-neutral-100 ${
          breakAll
            ? "break-all"
            : ""
        } ${
          capitalize
            ? "capitalize"
            : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}