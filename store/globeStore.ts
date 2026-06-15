"use client";

import { create } from "zustand";
import type { Quake } from "@/lib/usgs";

export type MarkerColorMode = "magnitude" | "depth";

interface GlobeState {
  quakes: Quake[];
  selected: Quake | null;
  minMagnitude: number;
  days: number;
  showPlates: boolean;
  showVolcanoes: boolean;
  showPeaks: boolean;
  showHeatmap: boolean;
  colorMode: MarkerColorMode;
  settingsOpen: boolean;
  flyToTarget: { lat: number; lon: number } | null;
  setQuakes: (q: Quake[]) => void;
  setSelected: (q: Quake | null) => void;
  setMinMagnitude: (m: number) => void;
  setDays: (d: number) => void;
  toggle: (key: "showPlates" | "showVolcanoes" | "showPeaks" | "showHeatmap") => void;
  setColorMode: (m: MarkerColorMode) => void;
  setSettingsOpen: (b: boolean) => void;
  flyTo: (lat: number, lon: number) => void;
  clearFlyTo: () => void;
  focusQuake: (q: Quake) => void;
}

export const useGlobeStore = create<GlobeState>((set) => ({
  quakes: [],
  selected: null,
  minMagnitude: 2.5,
  days: 1,
  showPlates: false,
  showVolcanoes: false,
  showPeaks: false,
  showHeatmap: false,
  colorMode: "magnitude",
  settingsOpen: false,
  flyToTarget: null,
  setQuakes: (quakes) => set({ quakes }),
  setSelected: (selected) => set({ selected }),
  setMinMagnitude: (minMagnitude) => set({ minMagnitude }),
  setDays: (days) => set({ days }),
  toggle: (key) => set((s) => ({ [key]: !s[key] }) as Partial<GlobeState>),
  setColorMode: (colorMode) => set({ colorMode }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  flyTo: (lat, lon) => set({ flyToTarget: { lat, lon } }),
  clearFlyTo: () => set({ flyToTarget: null }),
  focusQuake: (q) =>
    set({ selected: q, flyToTarget: { lat: q.lat, lon: q.lon } }),
}));
