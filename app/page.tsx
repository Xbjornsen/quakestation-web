import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { HeaderPills } from "@/components/ui/HeaderPills";
import { HeaderStats } from "@/components/ui/HeaderStats";
import { DetailPanel } from "@/components/ui/DetailPanel";
import { SettingsButton } from "@/components/ui/SettingsButton";
import { Legend } from "@/components/ui/Legend";
import { GlobeMount } from "@/components/globe/GlobeMount";

export default function Page() {
  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-ink-950">
      <GlobeMount />
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
        <header className="pointer-events-auto flex items-start justify-between gap-3 p-4 sm:p-6">
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-1">
              <h1 className="font-display text-sm font-semibold uppercase tracking-[0.4em] text-white/80">
                QuakeStation
              </h1>
              <HeaderStats />
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
            <SettingsButton />
          </div>
        </header>
        <div className="flex-1" />
        <Legend />
      </div>
      <DetailPanel />
    </main>
  );
}
