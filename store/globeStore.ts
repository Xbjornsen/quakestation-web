"use client";

import { create } from "zustand";
import type { Quake } from "@/lib/usgs";
import type { Swarm } from "@/lib/swarm";
import type { SelectedFeature } from "@/lib/features";

export type MarkerColorMode = "magnitude" | "depth";

interface GlobeState {
  quakes: Quake[];
  selected: Quake | null;
  selectedSwarm: Swarm | null;
  // A selected volcano overlay feature. Mutually exclusive with
  // `selected` / `selectedSwarm` — selecting one clears the others.
  selectedFeature: SelectedFeature | null;
  // When a quake is opened by drilling into a swarm's event list, we
  // remember that swarm so the detail view can offer "Back to swarm".
  swarmReturn: Swarm | null;
  minMagnitude: number;
  days: number;
  showPlates: boolean;
  showVolcanoes: boolean;
  showHeatmap: boolean;
  autoRotate: boolean;
  colorMode: MarkerColorMode;
  settingsOpen: boolean;
  swarmCount: number;
  flyToTarget: { lat: number; lon: number } | null;
  setQuakes: (q: Quake[]) => void;
  setSelected: (q: Quake | null) => void;
  setSelectedSwarm: (s: Swarm | null) => void;
  setSelectedFeature: (f: SelectedFeature | null) => void;
  setSwarmCount: (n: number) => void;
  setMinMagnitude: (m: number) => void;
  setDays: (d: number) => void;
  toggle: (key: "showPlates" | "showVolcanoes" | "showHeatmap" | "autoRotate") => void;
  setColorMode: (m: MarkerColorMode) => void;
  setSettingsOpen: (b: boolean) => void;
  flyTo: (lat: number, lon: number) => void;
  clearFlyTo: () => void;
  focusQuake: (q: Quake) => void;
  focusSwarm: (s: Swarm) => void;
  focusFeature: (f: SelectedFeature) => void;
  drillIntoQuake: (q: Quake, swarm: Swarm) => void;
}

export const useGlobeStore = create<GlobeState>((set) => ({
  quakes: [],
  selected: null,
  selectedSwarm: null,
  selectedFeature: null,
  swarmReturn: null,
  minMagnitude: 2.5,
  days: 1,
  showPlates: false,
  showVolcanoes: false,
  showHeatmap: false,
  autoRotate: false,
  colorMode: "magnitude",
  settingsOpen: false,
  swarmCount: 0,
  flyToTarget: null,
  setQuakes: (quakes) => set({ quakes }),
  setSelected: (selected) => set({ selected }),
  setSelectedSwarm: (selectedSwarm) => set({ selectedSwarm }),
  setSelectedFeature: (selectedFeature) => set({ selectedFeature }),
  setSwarmCount: (swarmCount) => set({ swarmCount }),
  setMinMagnitude: (minMagnitude) => set({ minMagnitude }),
  setDays: (days) => set({ days }),
  toggle: (key) => set((s) => ({ [key]: !s[key] }) as Partial<GlobeState>),
  setColorMode: (colorMode) => set({ colorMode }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  flyTo: (lat, lon) => set({ flyToTarget: { lat, lon } }),
  clearFlyTo: () => set({ flyToTarget: null }),
  // Selecting a single quake (e.g. clicking a marker) clears any swarm
  // context so the panel shows a plain detail view with no back link.
  focusQuake: (q) =>
    set({
      selected: q,
      selectedSwarm: null,
      selectedFeature: null,
      swarmReturn: null,
      flyToTarget: { lat: q.lat, lon: q.lon },
    }),
  // Clicking a swarm tower opens its breakdown and flies to its centroid.
  focusSwarm: (s) =>
    set({
      selectedSwarm: s,
      selected: null,
      selectedFeature: null,
      flyToTarget: { lat: s.centroidLat, lon: s.centroidLon },
    }),
  // Clicking a volcano cone: show its detail card, clear any quake/swarm
  // selection, and fly to it.
  focusFeature: (f) =>
    set({
      selectedFeature: f,
      selected: null,
      selectedSwarm: null,
      swarmReturn: null,
      flyToTarget: { lat: f.data.lat, lon: f.data.lon },
    }),
  // Clicking an event inside a swarm list: show that quake but remember
  // the swarm so we can offer a "Back to swarm" link.
  drillIntoQuake: (q, swarm) =>
    set({
      selected: q,
      selectedSwarm: null,
      selectedFeature: null,
      swarmReturn: swarm,
      flyToTarget: { lat: q.lat, lon: q.lon },
    }),
}));
