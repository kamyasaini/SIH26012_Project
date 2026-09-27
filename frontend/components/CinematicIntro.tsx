"use client";

import { useEffect, useState } from "react";

interface CinematicIntroProps {
  onComplete: () => void;
}

export default function CinematicIntro({
  onComplete,
}: CinematicIntroProps) {
  const [phase, setPhase] = useState<
    "logo" | "title" | "exit"
  >("logo");

  useEffect(() => {
    // Reveal product title
    const titleTimer = setTimeout(() => {
      setPhase("title");
    }, 700);

    // Begin exit after loading has almost completed
    const exitTimer = setTimeout(() => {
      setPhase("exit");
    }, 3700);

    // Completely remove intro
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 4300);

    return () => {
      clearTimeout(titleTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden bg-black ${
        phase === "exit"
          ? "intro-exit"
          : ""
      }`}
    >

      {/* ========================================= */}
      {/* BACKGROUND GRID */}
      {/* ========================================= */}

      <div className="absolute inset-0 opacity-[0.08]">
        <div className="intro-grid h-full w-full" />
      </div>


      {/* ========================================= */}
      {/* CENTER CONTENT */}
      {/* ========================================= */}

      <div className="relative z-10 flex flex-col items-center text-center">

        {/* ========================================= */}
        {/* AI 3D LOGO */}
        {/* ========================================= */}

        <div
          className={`intro-logo ${
            phase === "title"
              ? "intro-logo-expand"
              : ""
          } ${
            phase === "exit"
              ? "intro-logo-exit"
              : ""
          }`}
        >
          <span>AI</span>

          <span className="ml-3 font-light">
            3D
          </span>
        </div>


        {/* ========================================= */}
        {/* PRODUCT TITLE */}
        {/* ========================================= */}

        <div
          className={`mt-7 ${
            phase === "logo"
              ? "intro-title-hidden"
              : "intro-title-visible"
          } ${
            phase === "exit"
              ? "intro-title-exit"
              : ""
          }`}
        >

          <div className="text-xl font-semibold tracking-[0.28em] text-white">
            CADASTRAL
          </div>

          <div className="mt-2 text-xl font-semibold tracking-[0.28em] text-white">
            & ENCROACHMENT ENGINE
          </div>

        </div>


        {/* ========================================= */}
        {/* TAGLINE */}
        {/* ========================================= */}

        <div
          className={`mt-6 text-[10px] uppercase tracking-[0.5em] text-neutral-500 ${
            phase === "logo"
              ? "intro-tag-hidden"
              : "intro-tag-visible"
          }`}
        >
          Automated Urban Parcel Intelligence
        </div>


        {/* ========================================= */}
        {/* CINEMATIC LOADING BAR */}
        {/* ========================================= */}

        <div className="mt-10 intro-tag-visible">

          {/* Loading track */}

          <div className="relative h-[5px] w-72 overflow-hidden rounded-full bg-white/10">

            {/* Actual progress */}

            <div className="intro-loading-gradient absolute inset-y-0 left-0 rounded-full" />

            {/* Glow */}

            <div className="intro-loading-glow absolute inset-y-0 left-0 rounded-full" />

          </div>


          {/* Loading status */}

          <div className="mt-3 flex w-72 justify-between text-[9px] uppercase tracking-[0.3em]">

            <span className="text-neutral-500">
              Initializing
            </span>

            <span className="text-neutral-400">
              Geospatial Engine
            </span>

          </div>

        </div>

      </div>


      {/* ========================================= */}
      {/* SCANNING LINE */}
      {/* ========================================= */}

      <div
        className={`absolute left-0 top-1/2 h-px w-full bg-white/20 ${
          phase === "title"
            ? "intro-scan"
            : "opacity-0"
        }`}
      />

    </div>
  );
}