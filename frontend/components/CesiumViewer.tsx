"use client";

import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Viewer,
  Entity,
  PolygonGraphics,
  ImageryLayer,
  CameraFlyTo,
} from "resium";

import {
  Ion,
  ImageryLayer as CesiumImageryLayer,
  OpenStreetMapImageryProvider,
  SingleTileImageryProvider,
  EllipsoidTerrainProvider,
  createWorldTerrainAsync,
  Cartesian3,
  Rectangle,
  Color,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Viewer as CesiumViewerInstance,
} from "cesium";

import "cesium/Build/Cesium/Widgets/widgets.css";

import type {
  EncroachmentSeverity,
  ExtractedParcelResponse,
} from "@/lib/types";

import ParcelDetailsHud from "./ParcelDetailsHud";

import type {
  TacticalSettings,
} from "./TacticalControls";

const ionToken =
  process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;

if (ionToken) {
  Ion.defaultAccessToken = ionToken;
}

export interface WgsBounds {
  min_longitude?: number;
  min_latitude?: number;
  max_longitude?: number;
  max_latitude?: number;
}

export interface RasterOverlay {
  url: string;
  bounds: WgsBounds;
}

interface CesiumViewerProps {
  flyToBounds?: WgsBounds | null;
  flyToKey?: string;
  rasterOverlay?: RasterOverlay | null;
  parcels?: ExtractedParcelResponse[];
  onParcelSelect?: (
    parcel: ExtractedParcelResponse | null,
  ) => void;
  tacticalSettings?: TacticalSettings;
}

const DEFAULT_TACTICAL_SETTINGS: TacticalSettings = {
  hud: true,
  layout: "compact",
  style: "tactical",
  density: 50,
  allocation: "elastic",
  fade: 100,
};

/* ================================================= */
/* COLORS                                             */
/* ================================================= */

const SEVERITY_COLORS: Record<
  EncroachmentSeverity,
  Color
> = {
  none: Color.fromCssColorString(
    "#22d3ee",
  ).withAlpha(0.45),

  minor: Color.fromCssColorString(
    "#f59e0b",
  ).withAlpha(0.55),

  moderate: Color.fromCssColorString(
    "#f97316",
  ).withAlpha(0.6),

  severe: Color.fromCssColorString(
    "#ef4444",
  ).withAlpha(0.65),
};

const SELECTED_COLOR =
  Color.fromCssColorString(
    "#ffff00",
  ).withAlpha(0.95);

const SELECTED_OUTLINE =
  Color.fromCssColorString(
    "#ffff00",
  ).withAlpha(1);

const LEGEND_ITEMS: {
  label: string;
  severity: EncroachmentSeverity;
}[] = [
  {
    label: "No overlap",
    severity: "none",
  },
  {
    label: "Minor (<5%)",
    severity: "minor",
  },
  {
    label: "Moderate (5-20%)",
    severity: "moderate",
  },
  {
    label: "Severe (>20%)",
    severity: "severe",
  },
];

/* ================================================= */
/* HELPERS                                            */
/* ================================================= */

function toRectangle(
  bounds?: WgsBounds | null,
): Rectangle | null {
  if (
    !bounds ||
    bounds.min_longitude === undefined ||
    bounds.min_latitude === undefined ||
    bounds.max_longitude === undefined ||
    bounds.max_latitude === undefined
  ) {
    return null;
  }

  return Rectangle.fromDegrees(
    bounds.min_longitude,
    bounds.min_latitude,
    bounds.max_longitude,
    bounds.max_latitude,
  );
}

function normalize(
  value: number,
  min: number,
  max: number,
): number {
  if (max <= min) {
    return 0.5;
  }

  return Math.max(
    0,
    Math.min(
      1,
      (value - min) /
        (max - min),
    ),
  );
}

/* ================================================= */
/* COMPONENT                                          */
/* ================================================= */

function CesiumViewer({
  flyToBounds,
  flyToKey,
  rasterOverlay,
  parcels = [],
  onParcelSelect,
  tacticalSettings,
}: CesiumViewerProps) {
  const settings =
    tacticalSettings ??
    DEFAULT_TACTICAL_SETTINGS;

  const viewerRef =
    useRef<CesiumViewerInstance | null>(
      null,
    );

  const mapContainerRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const [selectedParcelId, setSelectedParcelId] =
    useState<string | null>(null);

  const [parcelHudPosition, setParcelHudPosition] =
    useState<{
      left: number;
      top: number;
    } | null>(null);

  const lastClickPosition =
    useRef<{
      x: number;
      y: number;
    } | null>(null);

  /* ================================================= */
  /* SELECTED PARCEL                                   */
  /* ================================================= */

  const selectedParcel = useMemo(() => {
    if (!selectedParcelId) {
      return undefined;
    }

    return parcels.find(
      (parcel) =>
        parcel.id ===
        selectedParcelId,
    );
  }, [
    parcels,
    selectedParcelId,
  ]);

  /* ================================================= */
  /* AREA RANGE                                        */
  /* ================================================= */

  const areaRange = useMemo(() => {
    if (parcels.length === 0) {
      return {
        min: 0,
        max: 1,
      };
    }

    const areas = parcels.map(
      (parcel) =>
        Number(
          parcel.area_sqm,
        ) || 0,
    );

    return {
      min: Math.min(...areas),
      max: Math.max(...areas),
    };
  }, [parcels]);

  /* ================================================= */
  /* ENCROACHMENT RANGE                                */
  /* ================================================= */

  const encroachmentRange =
    useMemo(() => {
      if (parcels.length === 0) {
        return {
          min: 0,
          max: 1,
        };
      }

      const values = parcels.map(
        (parcel) =>
          Number(
            parcel.encroachment_percentage,
          ) || 0,
      );

      return {
        min: Math.min(...values),
        max: Math.max(...values),
      };
    }, [parcels]);

  /* ================================================= */
  /* BASE LAYERS                                       */
  /* ================================================= */

  const baseLayer = useMemo(
    () =>
      new CesiumImageryLayer(
        new OpenStreetMapImageryProvider({
          url:
            "https://tile.openstreetmap.org/",
        }),
      ),
    [],
  );

  const terrainProvider = useMemo(
    () =>
      ionToken
        ? createWorldTerrainAsync()
        : new EllipsoidTerrainProvider(),
    [],
  );

  const flyToDestination = useMemo(
    () =>
      toRectangle(
        flyToBounds,
      ),
    [flyToBounds],
  );

  /* ================================================= */
  /* ORTHOMOSAIC                                       */
  /* ================================================= */

  const overlayProvider =
    useMemo(() => {
      if (!rasterOverlay) {
        return null;
      }

      const rectangle =
        toRectangle(
          rasterOverlay.bounds,
        );

      if (!rectangle) {
        return null;
      }

      return SingleTileImageryProvider.fromUrl(
        rasterOverlay.url,
        {
          rectangle,
        },
      );
    }, [rasterOverlay]);

  /* ================================================= */
  /* HUD POSITION                                      */
  /* ================================================= */

  const calculateHudPosition = (
    clickX: number,
    clickY: number,
  ) => {
    const container =
      mapContainerRef.current;

    if (!container) {
      return;
    }

    const rect =
      container.getBoundingClientRect();

    const hudWidth =
      settings.layout === "wide"
        ? 380
        : 320;

    const hudHeight = 500;
    const gap = 18;
    const padding = 12;

    let left =
      clickX + gap;

    let top =
      clickY - 70;

    if (
      left + hudWidth >
      rect.width - padding
    ) {
      left =
        clickX -
        hudWidth -
        gap;
    }

    left = Math.max(
      padding,
      Math.min(
        left,
        rect.width -
          hudWidth -
          padding,
      ),
    );

    top = Math.max(
      padding,
      Math.min(
        top,
        rect.height -
          hudHeight -
          padding,
      ),
    );

    setParcelHudPosition({
      left,
      top,
    });
  };

  /* ================================================= */
  /* CLICK HANDLER                                     */
  /* ================================================= */

  useEffect(() => {
    const viewer =
      viewerRef.current;

    if (!viewer) {
      return;
    }

    const handler =
      new ScreenSpaceEventHandler(
        viewer.scene.canvas,
      );

    handler.setInputAction(
      (movement: any) => {
        const clickX =
          movement.position.x;

        const clickY =
          movement.position.y;

        lastClickPosition.current = {
          x: clickX,
          y: clickY,
        };

        const pickedObject =
          viewer.scene.pick(
            movement.position,
          );

        if (
          !pickedObject ||
          !pickedObject.id
        ) {
          setSelectedParcelId(null);
          setParcelHudPosition(null);

          lastClickPosition.current =
            null;

          onParcelSelect?.(null);

          return;
        }

        const pickedEntity =
          pickedObject.id;

        if (
          typeof pickedEntity.id !==
          "string"
        ) {
          setSelectedParcelId(null);
          setParcelHudPosition(null);

          onParcelSelect?.(null);

          return;
        }

        const clickedParcel =
          parcels.find(
            (parcel) =>
              parcel.id ===
              pickedEntity.id,
          );

        if (!clickedParcel) {
          setSelectedParcelId(null);
          setParcelHudPosition(null);

          onParcelSelect?.(null);

          return;
        }

        setSelectedParcelId(
          clickedParcel.id,
        );

        onParcelSelect?.(
          clickedParcel,
        );

        calculateHudPosition(
          clickX,
          clickY,
        );
      },
      ScreenSpaceEventType.LEFT_CLICK,
    );

    return () => {
      handler.destroy();
    };
  }, [
    parcels,
    onParcelSelect,
    settings.layout,
  ]);

  /* ================================================= */
  /* INVALID SELECTION                                 */
  /* ================================================= */

  useEffect(() => {
    if (
      selectedParcelId &&
      !parcels.some(
        (parcel) =>
          parcel.id ===
          selectedParcelId,
      )
    ) {
      setSelectedParcelId(null);
      setParcelHudPosition(null);

      onParcelSelect?.(null);
    }
  }, [
    parcels,
    selectedParcelId,
    onParcelSelect,
  ]);

  /* ================================================= */
  /* RENDER                                            */
  /* ================================================= */

  return (
    <div
      ref={mapContainerRef}
      className={`relative h-full w-full ${
        settings.style === "dense"
          ? "contrast-110"
          : ""
      }`}
    >
      <Viewer
        full
        baseLayer={baseLayer}
        terrainProvider={
          terrainProvider
        }
        timeline={false}
        animation={false}
        baseLayerPicker={false}
        geocoder={false}
        homeButton={false}
        sceneModePicker={false}
        navigationHelpButton={false}
        fullscreenButton={false}
        infoBox={false}
        selectionIndicator={false}
        ref={(element) => {
          viewerRef.current =
            element?.cesiumElement ??
            null;
        }}
      >
        {/* CAMERA */}

        {flyToDestination && (
          <CameraFlyTo
            key={flyToKey}
            destination={
              flyToDestination
            }
            duration={2}
            once
          />
        )}

        {/* ORTHOMOSAIC */}

        {overlayProvider && (
          <ImageryLayer
            key={rasterOverlay?.url}
            imageryProvider={
              overlayProvider
            }
            alpha={
              settings.fade / 100
            }
          />
        )}

        {/* ================================================= */}
        {/* PARCELS                                             */}
        {/* ================================================= */}

        {parcels.map((parcel) => {
          const ring =
            parcel.geometry
              .coordinates[0];

          const flatPositions =
            ring.flatMap(
              (coordinate) => [
                coordinate.longitude,
                coordinate.latitude,
              ],
            );

          const isSelected =
            selectedParcelId ===
            parcel.id;

          /* ----------------------------------------------- */
          /* DATA                                             */
          /* ----------------------------------------------- */

          const area =
            Number(
              parcel.area_sqm,
            ) || 0;

          const encroachment =
            Number(
              parcel.encroachment_percentage,
            ) || 0;

          const areaScore =
            normalize(
              area,
              areaRange.min,
              areaRange.max,
            );

          const encroachmentScore =
            normalize(
              encroachment,
              encroachmentRange.min,
              encroachmentRange.max,
            );

          const originalHeight =
            Math.max(
              0.5,
              Number(
                parcel.extruded_height_m,
              ) || 0.5,
            );

          /* ================================================= */
          /* DENSITY                                           */
          /* ================================================= */

          /*
           * Slider:
           *
           * 0%  = very low extrusion
           * 50% = normal
           * 100% = very strong extrusion
           */

          const densityValue =
            settings.density / 100;

          const densityMultiplier =
            0.35 +
            densityValue * 1.65;

          /*
           * Area contributes to the
           * visual density.
           */
          const areaMultiplier =
            0.65 +
            areaScore * 0.7;

          /* ================================================= */
          /* ALLOCATION                                        */
          /* ================================================= */

          let allocationMultiplier =
            1;

          if (
            settings.allocation ===
            "elastic"
          ) {
            /*
             * Softer variation.
             */
            allocationMultiplier =
              0.85 +
              (
                areaScore * 0.15 +
                encroachmentScore *
                  0.1
              );
          }

          if (
            settings.allocation ===
            "weighted"
          ) {
            /*
             * Stronger differentiation.
             */
            allocationMultiplier =
              0.75 +
              (
                areaScore * 0.45 +
                encroachmentScore *
                  0.4
              );
          }

          /* ================================================= */
          /* FINAL HEIGHT                                      */
          /* ================================================= */

          let calculatedHeight =
            originalHeight *
            densityMultiplier *
            areaMultiplier *
            allocationMultiplier;

          /*
           * Dense mode makes the 3D
           * cadastral structure more
           * pronounced.
           */
          if (
            settings.style ===
            "dense"
          ) {
            calculatedHeight *=
              1.25;
          }

          calculatedHeight =
            Math.max(
              0.5,
              calculatedHeight,
            );

          /* ================================================= */
          /* OPACITY                                           */
          /* ================================================= */

          const fade =
            settings.fade / 100;

          const parcelAlpha =
            Math.max(
              0.08,
              (
                settings.style ===
                "dense"
                  ? 0.75
                  : 0.55
              ) * fade,
            );

          /* ================================================= */
          /* COLORS                                            */
          /* ================================================= */

          const baseColor =
            isSelected
              ? SELECTED_COLOR
              : SEVERITY_COLORS[
                  parcel.severity
                ] ??
                SEVERITY_COLORS.none;

          const fillColor =
            isSelected
              ? SELECTED_COLOR
              : baseColor.withAlpha(
                  parcelAlpha,
                );

          const outlineColor =
            isSelected
              ? SELECTED_OUTLINE
              : Color.WHITE.withAlpha(
                  settings.style ===
                  "dense"
                    ? 1
                    : 0.8,
                );

          /* ================================================= */
          /* ENTITY                                            */
          /* ================================================= */

          return (
            <Entity
              key={parcel.id}
              id={parcel.id}
              name={
                parcel.parcel_code
              }
              description={`Area: ${parcel.area_sqm.toFixed(
                1,
              )} m² · Height: ${parcel.extruded_height_m.toFixed(
                1,
              )} m · Severity: ${parcel.severity}`}
            >
              <PolygonGraphics
                hierarchy={Cartesian3.fromDegreesArray(
                  flatPositions,
                )}

                height={
                  parcel.base_elevation_m
                }

                /*
                 * ACTUAL 3D CONTROL
                 */
                extrudedHeight={
                  parcel.base_elevation_m +
                  calculatedHeight
                }

                material={
                  fillColor
                }

                outline={true}

                outlineColor={
                  outlineColor
                }

                outlineWidth={
                  isSelected
                    ? 5
                    : settings.style ===
                        "dense"
                      ? 3
                      : 1
                }
              />
            </Entity>
          );
        })}
      </Viewer>

      {/* ================================================= */}
      {/* PARCEL HUD                                         */}
      {/* ================================================= */}

      {settings.hud &&
        selectedParcel &&
        parcelHudPosition && (
          <ParcelDetailsHud
            parcel={
              selectedParcel
            }
            position={
              parcelHudPosition
            }
            mapElement={
              mapContainerRef.current
            }
            onClose={() => {
              setSelectedParcelId(
                null,
              );

              setParcelHudPosition(
                null,
              );

              lastClickPosition.current =
                null;

              onParcelSelect?.(
                null,
              );
            }}
          />
        )}

      {/* ================================================= */}
      {/* LEGEND                                             */}
      {/* ================================================= */}

      {settings.hud &&
        parcels.length > 0 && (
          <div
            className={`pointer-events-none absolute bottom-4 rounded-md border border-border bg-surface/90 p-2.5 text-[10px] text-neutral-300 backdrop-blur ${
              settings.layout ===
              "wide"
                ? "right-4"
                : "left-4"
            }`}
          >
            <p className="mb-1.5 font-semibold uppercase tracking-wide text-neutral-400">
              Parcel Severity
            </p>

            <div className="space-y-1">
              {LEGEND_ITEMS.map(
                (item) => (
                  <div
                    key={
                      item.severity
                    }
                    className="flex items-center gap-1.5"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-sm border border-white/40"
                      style={{
                        backgroundColor:
                          SEVERITY_COLORS[
                            item.severity
                          ].toCssColorString(),
                      }}
                    />

                    {item.label}
                  </div>
                ),
              )}
            </div>
          </div>
        )}

      {/* ================================================= */}
      {/* STATUS HUD                                         */}
      {/* ================================================= */}

      {settings.hud && (
        <div className="pointer-events-none absolute bottom-4 right-4 z-50 rounded-md border border-white/10 bg-black/75 px-3 py-2 text-[9px] uppercase tracking-[0.15em] text-neutral-400 backdrop-blur">
          <div>
            STYLE:{" "}
            <span className="text-white">
              {settings.style}
            </span>
          </div>

          <div>
            DENSITY:{" "}
            <span className="text-white">
              {settings.density}%
            </span>
          </div>

          <div>
            ALLOCATION:{" "}
            <span className="text-white">
              {settings.allocation}
            </span>
          </div>

          <div>
            FADE:{" "}
            <span className="text-white">
              {settings.fade}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================= */
/* MEMO                                                */
/* ================================================= */

function areCesiumViewerPropsEqual(
  previous: CesiumViewerProps,
  next: CesiumViewerProps,
) {
  return (
    previous.flyToKey ===
      next.flyToKey &&
    previous.flyToBounds ===
      next.flyToBounds &&
    previous.rasterOverlay ===
      next.rasterOverlay &&
    previous.parcels ===
      next.parcels &&
    previous.onParcelSelect ===
      next.onParcelSelect &&
    previous.tacticalSettings ===
      next.tacticalSettings
  );
}

export default memo(
  CesiumViewer,
  areCesiumViewerPropsEqual,
);