import { HeaderPills } from "@/components/ui/HeaderPills";
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
          <div className="flex flex-col gap-3">
            <h1 className="font-display text-sm font-semibold uppercase tracking-[0.4em] text-white/80">
              QuakeStation
            </h1>
            <HeaderPills />
          </div>
          <SettingsButton />
        </header>
        <div className="flex-1" />
        <Legend />
      </div>
      <DetailPanel />
    </main>
  );
}
