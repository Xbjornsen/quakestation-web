import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { HeaderPills } from "@/components/ui/HeaderPills";
import { HeaderStats } from "@/components/ui/HeaderStats";
import { DetailPanel } from "@/components/ui/DetailPanel";
import { SettingsButton } from "@/components/ui/SettingsButton";
import { ShareButton } from "@/components/ui/ShareButton";
import { Legend } from "@/components/ui/Legend";
import { LiveIndicator } from "@/components/ui/LiveIndicator";
import { ReplayBar } from "@/components/ui/ReplayBar";
import { DeepLinkSync } from "@/components/ui/DeepLinkSync";
import { ShareViewSync } from "@/components/ui/ShareViewSync";
import { OnboardingOverlay } from "@/components/ui/OnboardingOverlay";
import { GlobeMount } from "@/components/globe/GlobeMount";
import { fetchQuakeById } from "@/lib/usgs";

// A shared ?quake=<id> link gets a relevant title/description for previews.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const id = typeof sp.quake === "string" ? sp.quake : undefined;
  if (!id) return {};
  const q = await fetchQuakeById(id).catch(() => null);
  if (!q) return {};
  const title = `M${q.mag.toFixed(1)} — ${q.place} · QuakeStation`;
  const description = `Magnitude ${q.mag.toFixed(
    1,
  )} earthquake near ${q.place}. Explore it live on the QuakeStation 3D globe.`;
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description },
  };
}

export default function Page() {
  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-ink-950">
      <Suspense fallback={null}>
        <DeepLinkSync />
        <ShareViewSync />
      </Suspense>
      <GlobeMount />
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
        {/* Soft top fade so header text stays legible over busy globe
            regions (dense magnitude labels, swarm towers near the pole)
            without needing a hard opaque bar. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-ink-950/80 via-ink-950/35 to-transparent" />
        <header className="pointer-events-auto flex items-start justify-between gap-3 p-4 sm:p-6">
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-1">
              <h1 className="font-display text-sm font-semibold uppercase tracking-[0.4em] text-white/80">
                QuakeStation
              </h1>
              <HeaderStats />
              <LiveIndicator />
            </div>
            <HeaderPills />
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/stats"
              aria-label="Statistics"
              className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/5 backdrop-blur-md transition-colors hover:bg-white/10"
            >
              <BarChart3 className="h-4 w-4 text-white/80" />
            </Link>
            <ShareButton />
            <SettingsButton />
          </div>
        </header>
        <div className="flex-1" />
        <Legend />
      </div>
      <ReplayBar />
      <DetailPanel />
      <OnboardingOverlay />
    </main>
  );
}
