"use client";

import { useEffect, useMemo } from "react";
import { Play, Pause, History, X } from "lucide-react";
import { useGlobeStore } from "@/store/globeStore";
import { useIsMobile } from "@/hooks/useIsMobile";
import { REPLAY_MIN_MAG, type Quake } from "@/lib/usgs";

// Wall-clock seconds to play the whole window end to end.
const PLAY_SECONDS = 24;
// Minimum wall-clock gap between camera fly-tos during playback. Long enough
// to land on an event and watch a ripple emanate before flying to the next,
// rather than lurching around frantically.
const FLY_INTERVAL = 1900;

function fmt(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReplayBar() {
  const quakes = useGlobeStore((s) => s.quakes);
  const replayTime = useGlobeStore((s) => s.replayTime);
  const playing = useGlobeStore((s) => s.replayPlaying);
  const setReplayTime = useGlobeStore((s) => s.setReplayTime);
  const setReplayPlaying = useGlobeStore((s) => s.setReplayPlaying);
  const flyTo = useGlobeStore((s) => s.flyTo);
  const isMobile = useIsMobile();
  const panelOpen = useGlobeStore(
    (s) => !!(s.selected || s.selectedSwarm || s.selectedFeature),
  );

  // Quakes in chronological order, for picking what just happened as the
  // playhead sweeps forward.
  const sorted = useMemo(() => [...quakes].sort((a, b) => a.time - b.time), [quakes]);

  const { min, max } = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const q of quakes) {
      if (q.time < lo) lo = q.time;
      if (q.time > hi) hi = q.time;
    }
    if (!Number.isFinite(lo)) {
      const now = Date.now();
      return { min: now, max: now };
    }
    return { min: lo, max: hi };
  }, [quakes]);

  const active = replayTime != null;
  const head = replayTime ?? min;
  // Replay tours only significant events.
  const sig = useMemo(() => quakes.filter((q) => q.mag >= REPLAY_MIN_MAG), [quakes]);
  const shownSig = useMemo(
    () => (active ? sig.filter((q) => q.time <= head).length : sig.length),
    [active, sig, head],
  );

  // rAF playback. The precise playhead lives in a local accumulator; we push
  // to the store at ~14fps to bound how often the marker geometry rebuilds.
  useEffect(() => {
    if (!playing) return;
    const span = Math.max(1, max - min);
    const rate = span / (PLAY_SECONDS * 1000); // data-ms per wall-ms
    let headMs = useGlobeStore.getState().replayTime ?? min;
    if (headMs >= max) headMs = min; // restart if parked at the end
    let last = performance.now();
    let lastPush = 0;
    let lastFly = 0;
    let lastFlyHead = headMs - 1; // so the very first quake is eligible
    let raf = requestAnimationFrame(function tick(now) {
      headMs += (now - last) * rate;
      last = now;
      if (headMs >= max) {
        setReplayTime(max);
        setReplayPlaying(false);
        return;
      }
      if (now - lastPush >= 70) {
        setReplayTime(headMs);
        lastPush = now;
      }
      // Camera follow: every FLY_INTERVAL, jump to the biggest quake that
      // crossed the playhead since the last jump.
      if (now - lastFly >= FLY_INTERVAL) {
        let best: Quake | null = null;
        for (const q of sorted) {
          if (q.time > headMs) break; // sorted ascending — rest are future
          if (q.mag >= REPLAY_MIN_MAG && q.time > lastFlyHead && (!best || q.mag > best.mag)) {
            best = q;
          }
        }
        if (best) {
          flyTo(best.lat, best.lon);
          lastFly = now;
          lastFlyHead = headMs;
        }
      }
      raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [playing, min, max, sorted, flyTo, setReplayTime, setReplayPlaying]);

  const enter = () => {
    setReplayTime(min);
    setReplayPlaying(true);
  };
  const togglePlay = () => {
    if (playing) {
      setReplayPlaying(false);
    } else {
      if ((replayTime ?? min) >= max) setReplayTime(min);
      setReplayPlaying(true);
    }
  };
  const exit = () => {
    setReplayPlaying(false);
    setReplayTime(null);
  };

  const disabled = quakes.length === 0;

  // On phones the detail panel owns the bottom of the screen; don't overlap it.
  if (isMobile && panelOpen) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-4 sm:p-6">
      {!active ? (
        <button
          onClick={enter}
          disabled={disabled}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-ink-900/80 px-4 py-2 text-xs font-medium text-white/80 backdrop-blur-md transition-colors hover:bg-white/10 disabled:opacity-40"
        >
          <History className="h-4 w-4 text-accent-cyan" />
          Replay
          <span className="text-white/40">· M{REPLAY_MIN_MAG.toFixed(1)}+</span>
        </button>
      ) : (
        <div className="pointer-events-auto flex w-full max-w-xl items-center gap-3 rounded-2xl border border-white/10 bg-ink-900/80 px-3 py-2.5 backdrop-blur-md">
          <button
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-cyan/15 text-accent-cyan transition-colors hover:bg-accent-cyan/25"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.18em] text-white/45">
              <span>Significant events · M{REPLAY_MIN_MAG.toFixed(1)}+</span>
              <span className="font-mono">
                {shownSig.toLocaleString()}/{sig.length.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={1000}
              value={head}
              onChange={(e) => {
                setReplayPlaying(false);
                setReplayTime(Number(e.target.value));
              }}
              className="w-full accent-accent-cyan"
            />
            <div className="font-mono text-[10px] text-white/70">{fmt(head)}</div>
          </div>

          <button
            onClick={exit}
            aria-label="Exit replay"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/60 hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
