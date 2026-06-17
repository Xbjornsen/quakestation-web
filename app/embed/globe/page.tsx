import { Suspense } from "react";
import { EmbedGlobe } from "./EmbedGlobe";

// Minimal-chrome, full-viewport globe intended to be dropped into an
// <iframe>. Filters are driven entirely by URL search params:
//   ?min=<magnitude>&days=<1|7|30>&rotate=<1>
export default function EmbedGlobePage() {
  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-ink-950">
      <Suspense
        fallback={
          <div className="absolute inset-0 grid place-items-center text-white/50">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
          </div>
        }
      >
        <EmbedGlobe />
      </Suspense>
    </main>
  );
}
