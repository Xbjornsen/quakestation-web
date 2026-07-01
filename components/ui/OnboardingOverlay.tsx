"use client";

import { useEffect, useState } from "react";
import { X, Layers, Flame, Hash, SlidersHorizontal } from "lucide-react";

const DISMISSED_KEY = "quakestation-onboarding-dismissed";

const ITEMS: Array<{ icon: React.ReactNode; text: React.ReactNode }> = [
  {
    icon: <span className="h-4 w-4 shrink-0 rounded-full border-2 border-accent-amber" />,
    text: "Rings mark earthquakes — colour and size scale with magnitude.",
  },
  {
    icon: <Layers className="h-4 w-4 shrink-0 text-accent-amber" />,
    text: "A stack of rings is a swarm — related quakes clustered in place and time. Tap it for the full list.",
  },
  {
    icon: <Flame className="h-4 w-4 shrink-0 text-[#ff8a3d]" />,
    text: "Glowing craters are volcanoes that have erupted recently — dormant ones stay dark.",
  },
  {
    icon: <Hash className="h-4 w-4 shrink-0 text-white/60" />,
    text: "Numbers label the significant (M4+) events directly on the globe.",
  },
  {
    icon: <SlidersHorizontal className="h-4 w-4 shrink-0 text-white/60" />,
    text: "Open Settings to filter by magnitude, depth, and time window, or toggle layers.",
  },
];

// One-time welcome card explaining the globe's visual language. Shown once
// per browser (localStorage flag) — dismissing it, by either button, is
// permanent. Deliberately a plain localStorage flag rather than part of the
// persisted zustand settings, since it's a UI-shown-once concern, not a view
// preference.
export function OnboardingOverlay() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(DISMISSED_KEY)) setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="pointer-events-auto fixed inset-0 z-40 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-ink-900/95 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-base font-semibold text-white">Welcome to QuakeStation</h2>
          <button
            onClick={dismiss}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 -translate-y-1 translate-x-1 place-items-center rounded-full hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="mt-4 flex flex-col gap-3">
          {ITEMS.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-white/75">
              <span className="mt-0.5">{item.icon}</span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={dismiss}
          className="mt-5 w-full rounded-xl border border-accent-cyan/50 bg-accent-cyan/10 py-2.5 text-sm font-semibold text-accent-cyan transition-colors hover:bg-accent-cyan/20"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
