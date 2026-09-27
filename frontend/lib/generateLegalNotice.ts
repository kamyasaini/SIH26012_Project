import jsPDF from "jspdf";

import type { ExtractedParcelResponse } from "@/lib/types";

function getCentroid(
  geometry: ExtractedParcelResponse["geometry"],
) {
  const coordinates =
    geometry.coordinates?.[0] ?? [];

  if (!coordinates.length) {
    return {
      latitude: 0,
      longitude: 0,
    };
  }

  let longitudeSum = 0;
  let latitudeSum = 0;

  let count = 0;

  for (const coordinate of coordinates) {
    if (
      Array.isArray(coordinate) &&
      coordinate.length >= 2
    ) {
      longitudeSum += Number(coordinate[0]);
      latitudeSum += Number(coordinate[1]);

      count++;
    }
  }

  if (count === 0) {
    return {
      latitude: 0,
      longitude: 0,
    };
  }

  return {
    longitude:
      longitudeSum / count,
    latitude:
      latitudeSum / count,
  };
}

async function captureMapSnapshot(
  mapElement?: HTMLElement | null,
) {
  if (!mapElement) {
    return null;
  }

  /*
   * Find the actual Cesium WebGL canvas.
   */
  const canvas =
    mapElement.querySelector(
      "canvas",
    ) as HTMLCanvasElement | null;

  if (!canvas) {
    console.warn(
      "Cesium canvas not found.",
    );

    return null;
  }

  try {
    /*
     * Ask Cesium to finish rendering
     * before taking the snapshot.
     */
    await new Promise<void>(
      (resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      },
    );

    /*
     * Copy the WebGL canvas into a
     * normal 2D canvas.
     */
    const snapshotCanvas =
      document.createElement(
        "canvas",
      );

    snapshotCanvas.width =
      canvas.width;

    snapshotCanvas.height =
      canvas.height;

    const context =
      snapshotCanvas.getContext(
        "2d",
      );

    if (!context) {
      return null;
    }

    /*
     * Black background first.
     */
    context.fillStyle = "#05070b";

    context.fillRect(
      0,
      0,
      snapshotCanvas.width,
      snapshotCanvas.height,
    );

    /*
     * Draw Cesium WebGL canvas.
     */
    context.drawImage(
      canvas,
      0,
      0,
    );

    return snapshotCanvas.toDataURL(
      "image/png",
    );
  } catch (error) {
    console.error(
      "Could not capture Cesium snapshot:",
      error,
    );

    return null;
  }
}

export async function generateLegalNotice(
  parcel: ExtractedParcelResponse,
  mapElement?: HTMLElement | null,
) {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth =
    pdf.internal.pageSize.getWidth();

  const margin = 18;

  const centroid =
    getCentroid(
      parcel.geometry,
    );

  /* ===================================================== */
  /* HEADER                                                  */
  /* ===================================================== */

  pdf.setFillColor(
    10,
    14,
    23,
  );

  pdf.rect(
    0,
    0,
    pageWidth,
    35,
    "F",
  );

  pdf.setTextColor(
    255,
    255,
    255,
  );

  pdf.setFont(
    "helvetica",
    "bold",
  );

  pdf.setFontSize(17);

  pdf.text(
    "ENCROACHMENT NOTICE",
    margin,
    15,
  );

  pdf.setFont(
    "helvetica",
    "normal",
  );

  pdf.setFontSize(8);

  pdf.setTextColor(
    180,
    190,
    205,
  );

  pdf.text(
    "AI 3D CADASTRAL & ENCROACHMENT ENGINE",
    margin,
    23,
  );

  pdf.text(
    "SYSTEM-GENERATED DRAFT",
    margin,
    29,
  );


  /* ===================================================== */
  /* NOTICE INFORMATION                                     */
  /* ===================================================== */

  let y = 48;

  pdf.setTextColor(
    20,
    25,
    35,
  );

  pdf.setFont(
    "helvetica",
    "bold",
  );

  pdf.setFontSize(12);

  pdf.text(
    "Parcel Information",
    margin,
    y,
  );

  y += 10;

  pdf.setFontSize(9);

  const addRow = (
    label: string,
    value: string,
  ) => {
    pdf.setFont(
      "helvetica",
      "bold",
    );

    pdf.setTextColor(
      80,
      90,
      105,
    );

    pdf.text(
      label,
      margin,
      y,
    );

    pdf.setFont(
      "helvetica",
      "normal",
    );

    pdf.setTextColor(
      25,
      30,
      40,
    );

    pdf.text(
      value,
      margin + 55,
      y,
    );

    y += 7;
  };

  addRow(
    "Parcel ID",
    parcel.id,
  );

  addRow(
    "Upload / Survey ID",
    parcel.upload_id,
  );

  addRow(
    "Parcel Code",
    parcel.parcel_code,
  );

  addRow(
    "Base Elevation",
    `${parcel.base_elevation_m.toFixed(2)} m`,
  );

  addRow(
    "Extruded Height",
    `${parcel.extruded_height_m.toFixed(2)} m`,
  );

  addRow(
    "Parcel Area",
    `${parcel.area_sqm.toFixed(2)} m²`,
  );

  addRow(
    "Encroachment Area",
    `${parcel.encroachment_area_sqm.toFixed(2)} m²`,
  );

  addRow(
    "Encroachment Percentage",
    `${parcel.encroachment_percentage.toFixed(2)}%`,
  );

  addRow(
    "Severity",
    parcel.severity.toUpperCase(),
  );

  addRow(
    "Detection Date",
    new Date(
      parcel.created_at,
    ).toLocaleString(),
  );


  /* ===================================================== */
  /* GPS CENTROID                                           */
  /* ===================================================== */

  y += 5;

  pdf.setFont(
    "helvetica",
    "bold",
  );

  pdf.setFontSize(12);

  pdf.setTextColor(
    20,
    25,
    35,
  );

  pdf.text(
    "GPS Location",
    margin,
    y,
  );

  y += 9;

  pdf.setFont(
    "helvetica",
    "normal",
  );

  pdf.setFontSize(9);

  pdf.setTextColor(
    25,
    30,
    40,
  );

  pdf.text(
    `Latitude: ${centroid.latitude.toFixed(6)}`,
    margin,
    y,
  );

  y += 7;

  pdf.text(
    `Longitude: ${centroid.longitude.toFixed(6)}`,
    margin,
    y,
  );


  /* ===================================================== */
  /* MAP SNAPSHOT                                           */
  /* ===================================================== */

  const mapSnapshot =
    await captureMapSnapshot(
      mapElement,
    );

  if (mapSnapshot) {
    y += 12;

    pdf.setFont(
      "helvetica",
      "bold",
    );

    pdf.setFontSize(12);

    pdf.setTextColor(
      20,
      25,
      35,
    );

    pdf.text(
      "Spatial Analysis Snapshot",
      margin,
      y,
    );

    y += 5;

    const imageWidth =
      pageWidth -
      margin * 2;

    /*
     * Keep the snapshot at a
     * readable size inside A4.
     */
    const imageHeight = 75;

    pdf.addImage(
      mapSnapshot,
      "PNG",
      margin,
      y,
      imageWidth,
      imageHeight,
    );

    y += imageHeight + 8;
  }


  /* ===================================================== */
  /* NOTICE TEXT                                            */
  /* ===================================================== */

  if (y > 245) {
    pdf.addPage();

    y = 25;
  }

  pdf.setFont(
    "helvetica",
    "bold",
  );

  pdf.setFontSize(12);

  pdf.setTextColor(
    20,
    25,
    35,
  );

  pdf.text(
    "Administrative Observation",
    margin,
    y,
  );

  y += 8;

  pdf.setFont(
    "helvetica",
    "normal",
  );

  pdf.setFontSize(9);

  pdf.setTextColor(
    45,
    50,
    60,
  );

  const noticeText =
    `Automated spatial analysis has identified an apparent encroachment associated with parcel ${parcel.parcel_code}. The measured encroachment area is ${parcel.encroachment_area_sqm.toFixed(2)} square metres, representing approximately ${parcel.encroachment_percentage.toFixed(2)}% of the measured parcel area. The detected severity classification is ${parcel.severity.toUpperCase()}.`;

  const wrappedText =
    pdf.splitTextToSize(
      noticeText,
      pageWidth -
        margin * 2,
    );

  pdf.text(
    wrappedText,
    margin,
    y,
  );


  /* ===================================================== */
  /* DISCLAIMER                                             */
  /* ===================================================== */

  y +=
    wrappedText.length *
      5 +
    12;

  pdf.setFillColor(
    245,
    247,
    250,
  );

  pdf.roundedRect(
    margin,
    y,
    pageWidth -
      margin * 2,
    25,
    2,
    2,
    "F",
  );

  pdf.setFont(
    "helvetica",
    "bold",
  );

  pdf.setFontSize(8);

  pdf.setTextColor(
    70,
    80,
    95,
  );

  pdf.text(
    "IMPORTANT",
    margin + 5,
    y + 7,
  );

  pdf.setFont(
    "helvetica",
    "normal",
  );

  pdf.setFontSize(7);

  const disclaimer =
    "This document is a system-generated draft based on automated spatial analysis. It is intended for administrative review and verification and does not constitute an officially issued legal notice.";

  const disclaimerLines =
    pdf.splitTextToSize(
      disclaimer,
      pageWidth -
        margin * 2 -
        10,
    );

  pdf.text(
    disclaimerLines,
    margin + 5,
    y + 13,
  );


  /* ===================================================== */
  /* FOOTER                                                 */
  /* ===================================================== */

  const pageHeight =
    pdf.internal.pageSize.getHeight();

  pdf.setDrawColor(
    210,
    215,
    225,
  );

  pdf.line(
    margin,
    pageHeight - 18,
    pageWidth - margin,
    pageHeight - 18,
  );

  pdf.setFont(
    "helvetica",
    "normal",
  );

  pdf.setFontSize(7);

  pdf.setTextColor(
    120,
    130,
    145,
  );

  pdf.text(
    "Generated by AI 3D Cadastral & Encroachment Engine",
    margin,
    pageHeight - 11,
  );

  pdf.text(
    `Parcel: ${parcel.parcel_code}`,
    pageWidth - margin,
    pageHeight - 11,
    {
      align: "right",
    },
  );


  /* ===================================================== */
  /* DOWNLOAD                                               */
  /* ===================================================== */

  const safeParcelCode =
    parcel.parcel_code.replace(
      /[^a-zA-Z0-9-_]/g,
      "_",
    );

  pdf.save(
    `Encroachment_Notice_${safeParcelCode}.pdf`,
  );
}