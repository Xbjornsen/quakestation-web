"use client";

import { useGlobeStore } from "@/store/globeStore";
import { Settings } from "lucide-react";
import { SettingsDrawer } from "./SettingsDrawer";

export function SettingsButton() {
  const open = useGlobeStore((s) => s.settingsOpen);
  const setOpen = useGlobeStore((s) => s.setSettingsOpen);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Settings"
        className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/5 backdrop-blur-md transition-colors hover:bg-white/10"
      >
        <Settings className="h-4 w-4 text-white/80" />
      </button>
      {open ? <SettingsDrawer /> : null}
    </>
  );
}
