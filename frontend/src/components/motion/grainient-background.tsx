"use client";

import { cn } from "@/lib/utils";
import Grainient from "@/components/reactbits/Grainient";

const LIGHT_PALETTE = { color1: "#b1bbbd", color2: "#5d8ad1", color3: "#4c86e4", timeSpeed: 1.15 };

/**
 * Ambient site-wide backdrop — the real react-bits Grainient (WebGL/ogl
 * shader: warped noise + film grain) with original light blue palette.
 */
export function GrainientBackground({ className }: { className?: string }) {
  const palette = LIGHT_PALETTE;

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <Grainient
        color1={palette.color1}
        color2={palette.color2}
        color3={palette.color3}
        timeSpeed={palette.timeSpeed}
        colorBalance={0}
        warpStrength={1}
        warpFrequency={5}
        warpSpeed={2}
        warpAmplitude={50}
        blendAngle={0}
        blendSoftness={0.05}
        rotationAmount={500}
        noiseScale={2}
        grainAmount={0.1}
        grainScale={2}
        grainAnimated={false}
        contrast={1.5}
        gamma={1}
        saturation={1}
        centerX={0}
        centerY={0}
        zoom={0.9}
        className="h-full w-full"
      />
    </div>
  );
}
