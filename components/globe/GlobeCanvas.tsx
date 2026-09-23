"use client";

import GlobeScene from "./GlobeScene";
import { GlobeLoader } from "./GlobeLoader";

// Everything that pulls in three.js / R3F / drei lives behind this module so
// GlobeMount can load it as a separate, client-only chunk. The page's own UI
// (header, pills, panels) then hydrates without waiting on ~250 kB of 3D code.
export default function GlobeCanvas() {
  return (
    <>
      <GlobeScene />
      <GlobeLoader />
    </>
  );
}
