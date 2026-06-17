"use client";

import { useEffect, useState } from "react";
import GlobeScene from "./GlobeScene";
import { GlobeLoader } from "./GlobeLoader";

export function GlobeMount() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // GlobeLoader sits over the canvas and fades out once the Earth textures
  // are ready. It also covers the pre-mount tick (before the WebGL canvas
  // renders client-side), so the placeholder is continuous from first paint.
  return (
    <>
      {mounted && <GlobeScene />}
      <GlobeLoader />
    </>
  );
}
