"use client";

import * as React from "react";

import LiquidEther from "@/components/LiquidEther.jsx";

function hslVarToCssColor(varName: string) {
  // Our theme variables are like: `--primary: 248 98% 61%`
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return raw ? `hsl(${raw})` : "";
}

function softenHslColor(hsl: string, opts?: { saturation?: number; lightness?: number }) {
  // Input: "hsl(248 98% 61%)"
  const m = hsl.match(
    /^hsl\(\s*([0-9.]+)\s+([0-9.]+)%\s+([0-9.]+)%\s*\)$/i
  );
  if (!m) return hsl;
  const h = Number(m[1]);
  const s = Number(m[2]);
  const l = Number(m[3]);
  const satMul = opts?.saturation ?? 0.55;
  const lightMul = opts?.lightness ?? 1.08;
  const s2 = Math.max(0, Math.min(100, s * satMul));
  const l2 = Math.max(0, Math.min(100, l * lightMul));
  return `hsl(${h} ${s2}% ${l2}%)`;
}

export function AuthLiquidBackground() {
  const [colors, setColors] = React.useState<string[] | null>(null);

  React.useEffect(() => {
    const base = [
      hslVarToCssColor("--primary"),
      hslVarToCssColor("--chart-4"),
      hslVarToCssColor("--chart-5"),
    ].filter(Boolean);

    const next = base.map((c) => softenHslColor(c));

    // Fallback to the demo palette if variables aren't available for some reason.
    setColors(next.length ? next : ["#5227FF", "#FF9FFC", "#B497CF"]);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 opacity-70">
        <LiquidEther
          mouseForce={10}
          cursorSize={80}
          isViscous={false}
          viscous={30}
          colors={colors ?? ["#5227FF", "#FF9FFC", "#B497CF"]}
          autoDemo
          autoSpeed={0.18}
          autoIntensity={1.2}
          isBounce={false}
          resolution={0.35}
        />
      </div>
      {/* Soft overlay so content stays readable */}
      <div className="absolute inset-0 bg-background/65 backdrop-blur-[2px]" />
    </div>
  );
}

