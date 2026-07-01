"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Quake } from "@/lib/usgs";
import type { Swarm } from "@/lib/swarm";
import type { SelectedFeature } from "@/lib/features";

export type MarkerColorMode = "magnitude" | "depth";

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

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
  // Minimum magnitude a loose marker needs to get a floating number label
  // (swarm towers always get one, regardless of this).
  labelMinMag: number;
  // Depth band (km below sea level) that quakes must fall within to render.
  // Defaults to the full USGS range so nothing is hidden until narrowed.
  depthMin: number;
  depthMax: number;
  showPlates: boolean;
  showVolcanoes: boolean;
  // Swarm towers (the radial event stacks). Independent of loose markers.
  showSwarms: boolean;
  autoRotate: boolean;
  // Orbit auto-rotation speed (OrbitControls units).
  autoRotateSpeed: number;
  colorMode: MarkerColorMode;
  settingsOpen: boolean;
  swarmCount: number;
  flyToTarget: { lat: number; lon: number } | null;
  // Time-lapse replay: when `replayTime` is non-null the globe shows only
  // quakes that occurred at or before that timestamp (the playhead). Null
  // means "live" — show everything with the normal swarm grouping.
  replayTime: number | null;
  replayPlaying: boolean;
  setQuakes: (q: Quake[]) => void;
  setSelected: (q: Quake | null) => void;
  setSelectedSwarm: (s: Swarm | null) => void;
  setSelectedFeature: (f: SelectedFeature | null) => void;
  setSwarmCount: (n: number) => void;
  setMinMagnitude: (m: number) => void;
  setDays: (d: number) => void;
  setLabelMinMag: (m: number) => void;
  setDepthRange: (min: number, max: number) => void;
  setAutoRotateSpeed: (n: number) => void;
  toggle: (key: "showPlates" | "showVolcanoes" | "showSwarms" | "autoRotate") => void;
  setColorMode: (m: MarkerColorMode) => void;
  setSettingsOpen: (b: boolean) => void;
  setReplayTime: (t: number | null) => void;
  setReplayPlaying: (b: boolean) => void;
  flyTo: (lat: number, lon: number) => void;
  clearFlyTo: () => void;
  focusQuake: (q: Quake) => void;
  focusSwarm: (s: Swarm) => void;
  focusFeature: (f: SelectedFeature) => void;
  drillIntoQuake: (q: Quake, swarm: Swarm) => void;
}

// Bounds for the depth-band slider (km). Most catalogued quakes sit between
// the surface and ~700 km, so the band defaults to the whole range.
export const DEPTH_MIN = 0;
export const DEPTH_MAX = 700;

export const useGlobeStore = create<GlobeState>()(
  persist(
    (set) => ({
  quakes: [],
  selected: null,
  selectedSwarm: null,
  selectedFeature: null,
  swarmReturn: null,
  minMagnitude: 2.5,
  days: 1,
  labelMinMag: 4,
  depthMin: DEPTH_MIN,
  depthMax: DEPTH_MAX,
  showPlates: false,
  showVolcanoes: false,
  showSwarms: true,
  autoRotate: false,
  autoRotateSpeed: 0.35,
  colorMode: "magnitude",
  settingsOpen: false,
  swarmCount: 0,
  flyToTarget: null,
  replayTime: null,
  replayPlaying: false,
  setQuakes: (quakes) => set({ quakes }),
  // Selecting a single quake is exclusive: clear any swarm/feature panel so
  // the detail surface always shows exactly one thing (clicking a loose
  // marker while a swarm is open replaces it rather than hiding behind it).
  setSelected: (selected) =>
    set({ selected, selectedSwarm: null, selectedFeature: null, swarmReturn: null }),
  setSelectedSwarm: (selectedSwarm) => set({ selectedSwarm }),
  setSelectedFeature: (selectedFeature) => set({ selectedFeature }),
  setSwarmCount: (swarmCount) => set({ swarmCount }),
  setMinMagnitude: (minMagnitude) => set({ minMagnitude }),
  setDays: (days) => set({ days }),
  setLabelMinMag: (labelMinMag) => set({ labelMinMag }),
  // Keep the band ordered and clamped so the two sliders can't cross.
  setDepthRange: (min, max) =>
    set({
      depthMin: clamp(Math.min(min, max), DEPTH_MIN, DEPTH_MAX),
      depthMax: clamp(Math.max(min, max), DEPTH_MIN, DEPTH_MAX),
    }),
  setAutoRotateSpeed: (autoRotateSpeed) => set({ autoRotateSpeed }),
  toggle: (key) => set((s) => ({ [key]: !s[key] }) as Partial<GlobeState>),
  setColorMode: (colorMode) => set({ colorMode }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setReplayTime: (replayTime) => set({ replayTime }),
  setReplayPlaying: (replayPlaying) => set({ replayPlaying }),
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
    }),
    {
      name: "quakestation-settings",
      // Persist only the user's view preferences — never transient session
      // state (live quake data, current selection, replay playhead, etc.).
      partialize: (s) => ({
        minMagnitude: s.minMagnitude,
        days: s.days,
        labelMinMag: s.labelMinMag,
        depthMin: s.depthMin,
        depthMax: s.depthMax,
        showPlates: s.showPlates,
        showVolcanoes: s.showVolcanoes,
        showSwarms: s.showSwarms,
        autoRotate: s.autoRotate,
        autoRotateSpeed: s.autoRotateSpeed,
        colorMode: s.colorMode,
      }),
    },
  ),
);
