import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelative(timestampMs: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - timestampMs);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function rgbCss([r, g, b]: [number, number, number], alpha = 1): string {
  const to = (v: number) => Math.round(v * 255);
  return `rgba(${to(r)}, ${to(g)}, ${to(b)}, ${alpha})`;
}

export function magnitudeColor(mag: number): [number, number, number] {
  if (mag >= 7) return [1.0, 0.25, 0.35];
  if (mag >= 6) return [1.0, 0.45, 0.25];
  if (mag >= 5) return [1.0, 0.71, 0.28];
  if (mag >= 4) return [1.0, 0.93, 0.42];
  if (mag >= 3) return [0.55, 0.92, 0.58];
  return [0.36, 0.88, 1.0];
}

export function depthColor(km: number): [number, number, number] {
  if (km < 70) return [1.0, 0.35, 0.35];
  if (km < 300) return [1.0, 0.78, 0.32];
  return [0.36, 0.78, 1.0];
}

// USGS PAGER alert colors — a fixed, well-known palette (not derived from
// magnitude), so it intentionally doesn't reuse magnitudeColor.
export function alertColor(level: "green" | "yellow" | "orange" | "red"): [number, number, number] {
  if (level === "red") return [1.0, 0.25, 0.35];
  if (level === "orange") return [1.0, 0.55, 0.2];
  if (level === "yellow") return [1.0, 0.85, 0.3];
  return [0.4, 0.85, 0.45];
}
