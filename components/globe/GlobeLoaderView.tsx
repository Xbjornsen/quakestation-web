// Pure markup for the "Loading globe" overlay, with no three.js / drei
// imports, so it can render as the placeholder while the lazily-loaded globe
// chunk is still downloading. GlobeLoader wraps it with real texture progress.
export function GlobeLoaderView({
  progress,
  done = false,
}: {
  progress?: number;
  done?: boolean;
}) {
  return (
    <div
      aria-hidden={done}
      className={`pointer-events-none absolute inset-0 z-20 grid place-items-center bg-ink-950 transition-opacity duration-700 ${
        done ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-3 text-white/60">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
        <span className="text-xs uppercase tracking-[0.3em]">Loading globe</span>
        <span className="h-3 font-mono text-[10px] text-white/40">
          {progress != null ? `${Math.round(progress)}%` : ""}
        </span>
      </div>
    </div>
  );
}
