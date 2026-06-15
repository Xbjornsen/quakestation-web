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
