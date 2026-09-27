"use client";

import type { ReactNode } from "react";

export type TacticalSettings = {
  hud: boolean;
  layout: "compact" | "wide";
  style: "tactical" | "dense";
  density: number;
  allocation: "elastic" | "weighted";
  fade: number;
};

interface TacticalControlsProps {
  settings?: TacticalSettings;
  onChange?: (
    changes: Partial<TacticalSettings>,
  ) => void;
}

const DEFAULT_SETTINGS: TacticalSettings = {
  hud: true,
  layout: "compact",
  style: "tactical",
  density: 50,
  allocation: "elastic",
  fade: 100,
};

export default function TacticalControls({
  settings,
  onChange,
}: TacticalControlsProps) {
  const safeSettings =
    settings ?? DEFAULT_SETTINGS;

  const update = (
    changes: Partial<TacticalSettings>,
  ) => {
    onChange?.(changes);
  };

  return (
    <div className="rounded-lg border border-white/10 bg-black/30 p-3">
      {/* HEADER */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white">
            Display Control
          </div>

          <div className="mt-0.5 text-[9px] uppercase tracking-wide text-neutral-600">
            Tactical visualization interface
          </div>
        </div>

        <div
          className={`h-1.5 w-1.5 rounded-full ${
            safeSettings.hud
              ? "animate-pulse bg-white"
              : "bg-neutral-700"
          }`}
        />
      </div>

      {/* DISPLAY */}
      <ControlSection title="Display">
        {/* HUD */}
        <div className="mb-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[9px] font-medium uppercase tracking-wide text-neutral-500">
              HUD
            </span>

            <span className="text-[8px] uppercase tracking-wider text-neutral-700">
              {safeSettings.hud
                ? "Visible"
                : "Hidden"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1">
            <ChoiceButton
              label="ON"
              active={safeSettings.hud}
              onClick={() =>
                update({
                  hud: true,
                })
              }
            />

            <ChoiceButton
              label="OFF"
              active={!safeSettings.hud}
              onClick={() =>
                update({
                  hud: false,
                })
              }
            />
          </div>
        </div>

        {/* LAYOUT */}
        <div className="border-l border-white/10 pl-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[9px] font-medium uppercase tracking-wide text-neutral-500">
              Layout
            </span>

            <span className="text-[8px] uppercase tracking-wider text-neutral-700">
              {safeSettings.layout}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1">
            <ChoiceButton
              label="COMPACT"
              active={
                safeSettings.layout === "compact"
              }
              onClick={() =>
                update({
                  layout: "compact",
                })
              }
            />

            <ChoiceButton
              label="WIDE"
              active={
                safeSettings.layout === "wide"
              }
              onClick={() =>
                update({
                  layout: "wide",
                })
              }
            />
          </div>
        </div>
      </ControlSection>

      {/* MODE / STYLE */}
      <ControlSection title="Mode / Style">
        <div className="grid grid-cols-2 gap-1">
          <ChoiceButton
            label="TACTICAL"
            active={
              safeSettings.style === "tactical"
            }
            onClick={() =>
              update({
                style: "tactical",
              })
            }
          />

          <ChoiceButton
            label="DENSE"
            active={
              safeSettings.style === "dense"
            }
            onClick={() =>
              update({
                style: "dense",
              })
            }
          />
        </div>
      </ControlSection>

      {/* DENSITY */}
      <ControlSection title="Density">
        <div className="rounded border border-white/5 bg-white/[0.02] p-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[8px] uppercase tracking-wider text-neutral-600">
              Parcel intensity
            </span>

            <span className="text-[9px] font-semibold text-white">
              {safeSettings.density}%
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={safeSettings.density}
            onChange={(event) =>
              update({
                density: Number(
                  event.target.value,
                ),
              })
            }
            className="h-1 w-full cursor-pointer accent-white"
          />

          <div className="mt-1 flex justify-between text-[8px] uppercase tracking-wider text-neutral-700">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>
      </ControlSection>

      {/* ALLOCATION */}
      <ControlSection title="Allocation">
        <div className="grid grid-cols-2 gap-1">
          <ChoiceButton
            label="ELASTIC"
            active={
              safeSettings.allocation ===
              "elastic"
            }
            onClick={() =>
              update({
                allocation: "elastic",
              })
            }
          />

          <ChoiceButton
            label="WEIGHTED"
            active={
              safeSettings.allocation ===
              "weighted"
            }
            onClick={() =>
              update({
                allocation: "weighted",
              })
            }
          />
        </div>
      </ControlSection>

      {/* FADE */}
      <ControlSection title="Fade">
        <div className="rounded border border-white/5 bg-white/[0.02] p-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[8px] uppercase tracking-wider text-neutral-600">
              Overlay opacity
            </span>

            <span className="text-[9px] font-semibold text-white">
              {safeSettings.fade}%
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={safeSettings.fade}
            onChange={(event) =>
              update({
                fade: Number(
                  event.target.value,
                ),
              })
            }
            className="h-1 w-full cursor-pointer accent-white"
          />

          <div className="mt-1 flex justify-between text-[8px] uppercase tracking-wider text-neutral-700">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
      </ControlSection>

      {/* STATUS */}
      <div className="mt-3 border-t border-white/5 pt-2">
        <div className="flex items-center justify-between text-[8px] uppercase tracking-wider">
          <span className="text-neutral-600">
            Style
          </span>

          <span className="text-neutral-400">
            {safeSettings.style}
          </span>
        </div>

        <div className="mt-1 flex items-center justify-between text-[8px] uppercase tracking-wider">
          <span className="text-neutral-600">
            Density
          </span>

          <span className="text-neutral-400">
            {safeSettings.density}%
          </span>
        </div>

        <div className="mt-1 flex items-center justify-between text-[8px] uppercase tracking-wider">
          <span className="text-neutral-600">
            Allocation
          </span>

          <span className="text-neutral-400">
            {safeSettings.allocation}
          </span>
        </div>
      </div>
    </div>
  );
}

function ControlSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="mb-2 text-[8px] font-semibold uppercase tracking-[0.18em] text-neutral-600">
        {title}
      </div>

      {children}
    </div>
  );
}

function ChoiceButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-2 py-2 text-[9px] font-semibold uppercase tracking-wide transition ${
        active
          ? "border-white/30 bg-white text-black"
          : "border-white/5 bg-white/[0.02] text-neutral-500 hover:border-white/15 hover:bg-white/5 hover:text-white"
      }`}
    >
      {active ? "● " : "○ "}
      {label}
    </button>
  );
}