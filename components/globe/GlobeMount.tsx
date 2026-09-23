"use client";

import dynamic from "next/dynamic";
import { GlobeLoaderView } from "./GlobeLoaderView";

// Client-only, code-split globe. While its chunk downloads, the same
// "Loading globe" overlay renders from plain markup; GlobeLoader (inside the
// chunk) then takes over with real texture progress and fades out, so the
// placeholder is continuous from first paint.
const GlobeCanvas = dynamic(() => import("./GlobeCanvas"), {
  ssr: false,
  loading: () => <GlobeLoaderView />,
});

export function GlobeMount() {
  return <GlobeCanvas />;
}
