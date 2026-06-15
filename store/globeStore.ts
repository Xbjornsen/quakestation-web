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
  setQuakes: (q: Quake[]) => void;
  setSelected: (q: Quake | null) => void;
  setMinMagnitude: (m: number) => void;
  setDays: (d: number) => void;
  toggle: (key: "showPlates" | "showVolcanoes" | "showPeaks" | "showHeatmap") => void;
  setColorMode: (m: MarkerColorMode) => void;
  setSettingsOpen: (b: boolean) => void;
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
  setQuakes: (quakes) => set({ quakes }),
  setSelected: (selected) => set({ selected }),
  setMinMagnitude: (minMagnitude) => set({ minMagnitude }),
  setDays: (days) => set({ days }),
  toggle: (key) => set((s) => ({ [key]: !s[key] }) as Partial<GlobeState>),
  setColorMode: (colorMode) => set({ colorMode }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
}));
