"use client";

import { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({
  onComplete,
}: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Keep splash screen visible for 2.5 seconds
    const timer = setTimeout(() => {
      setFadeOut(true);

      // Wait for fade animation to finish
      setTimeout(() => {
        onComplete();
      }, 800);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black transition-all duration-700 ${
        fadeOut
          ? "opacity-0 scale-105 pointer-events-none"
          : "opacity-100 scale-100"
      }`}
    >
      <div className="flex flex-col items-center text-center">

        {/* Main Title */}
        <div
          className={`text-5xl font-bold tracking-[0.18em] text-white transition-all duration-1000 ${
            fadeOut
              ? "opacity-0 scale-110"
              : "opacity-100 scale-100"
          }`}
        >
          AI 3D
        </div>

        {/* Subtitle */}
        <div
          className={`mt-4 text-sm font-medium tracking-[0.35em] text-neutral-400 transition-all duration-1000 delay-200 ${
            fadeOut
              ? "opacity-0 translate-y-3"
              : "opacity-100 translate-y-0"
          }`}
        >
          CADASTRAL & ENCROACHMENT
        </div>

        {/* ENGINE */}
        <div
          className={`mt-2 text-xs tracking-[0.5em] text-neutral-500 transition-all duration-1000 delay-300 ${
            fadeOut
              ? "opacity-0 translate-y-3"
              : "opacity-100 translate-y-0"
          }`}
        >
          ENGINE
        </div>

        {/* Loading line */}
        <div className="mt-10 h-[2px] w-40 overflow-hidden bg-neutral-800">
          <div
            className={`h-full bg-white transition-all duration-[2200ms] ease-out ${
              fadeOut ? "w-full" : "w-0"
            }`}
          />
        </div>

      </div>
    </div>
  );
}