# QuakeStation Web — agent guide

Live earthquake tracker on a Three.js globe. Next.js 15 (App Router) + React 19 +
React Three Fiber, Zustand, TanStack Query, Tailwind. Deployed on Vercel from `main`
(quakestation.com). Web companion to the QuakeStation Android app — `lib/swarm.ts`
is a port of the app's swarm detector; keep behaviour in step with it.

## Commands

| | |
|---|---|
| `npm run dev` | dev server, live USGS feed |
| `npm run dev:fixture` | dev server on the committed synthetic catalogue (no network) |
| `npm run check` | typecheck + lint + unit tests — **must pass before you commit** |
| `npm test` / `npm run test:watch` | Vitest only |
| `npm run build` | production build — run when you touch routes, imports or config |
| `npm run fixture:make` | regenerate `fixtures/usgs-synthetic.json` |
| `npm run fixture:record [days] [minMag]` | snapshot real USGS data to `fixtures/usgs-recorded.json` |

## Map of the code

```
app/
  page.tsx              home: header, pills, panels around <GlobeMount/>; async generateMetadata for ?quake=
  stats/page.tsx        stats dashboard (pure DOM/SVG charts, no three.js)
  embed/globe/          embeddable globe
  api/usgs/route.ts     USGS proxy (60 s cache) — or fixture data when USGS_FIXTURE is set
components/globe/       everything inside <Canvas> (three.js); loaded as a client-only chunk
  GlobeMount → GlobeCanvas → GlobeScene (data → filters → swarms → layers)
  Markers, SwarmSpines, Volcanoes, Plates, PoleMarkers, GeomagneticPoles  — layers
  LabelLayout           per-frame label collision / HUD avoidance pass
  CameraController      OrbitControls + fly-to
  TestHooks             window.__quakestation for tests/agents (dev only)
components/ui/          HUD: header pills, detail panel, settings drawer, replay bar, legend
store/globeStore.ts     single Zustand store; persisted prefs (DEFAULT_PREFS) vs transient state
hooks/useQuakes.ts      TanStack Query against /api/usgs, 60 s refetch
lib/                    pure logic — usgs (client-safe), usgsServer (server-only, fs),
                        swarm, geo, labelLayout, features (static overlay data), utils
fixtures/               committed USGS catalogues for offline/test mode
public/data, textures   overlay datasets and Earth textures (4K + 8K, chosen at runtime)
```

## Conventions and gotchas

- **Client vs server modules.** `lib/usgs.ts` is imported by client components — it must stay
  free of Node APIs. Anything using `fs`/`path` goes in `lib/usgsServer.ts` (or another
  server-only module). Importing `node:*` from a client-reachable file breaks `next build`
  even though `tsc` passes.
- **Three.js stays in the globe chunk.** Don't import `three`, R3F or drei from `app/` or
  `components/ui/` — it defeats the code split (home first-load JS went 370 kB → 128 kB).
- **HUD elements that can cover the globe need `data-label-avoid`**, or magnitude labels
  will render under them. The header lets pointer events through its gaps; only the controls
  set `pointer-events-auto`.
- **Selection goes through store actions** (`focusQuake`, `focusSwarm`, `focusFeature`,
  `drillIntoQuake`) — they keep the three selection kinds mutually exclusive and trigger
  the fly-to. Don't set `selected` directly from UI.
- **Persisted prefs:** add new user preferences to `DEFAULT_PREFS` *and* `partialize`, and
  clamp values read back from storage (old visitors may have stale values — see the
  `GLOBE_MAX_DAYS` clamp in `GlobeScene`).
- **Shaders on mobile GPUs:** `pow()` with a negative base is undefined on many mobile GPUs
  (markers vanished — PR #8). Clamp/abs before `pow`, and test with the mobile viewport.
- **Mobile is ≤ 640 px** (`useIsMobile`): lower DPR, no MSAA, fewer sphere segments.
  8K Earth textures load only on ≥ 1024 px screens with GPUs that support them; everyone
  else gets the 4K set.
- **Time:** components read `Date.now()` directly. In tests, freeze the browser clock to the
  fixture's `generated` timestamp.
- Lint: existing `any`s in R3F glue are warnings; don't add new ones. No new
  dependencies without a reason in the PR description.

## Testing

- **Unit (Vitest):** `*.test.ts` next to the module, in Node. `tests/helpers.ts` has a
  `q()` Quake factory. Pure logic in `lib/` and the store should get a test with every
  change; `it.fails` marks a known bug (see the antimeridian centroid test in
  `lib/swarm.test.ts`).
- **Fixture mode:** `USGS_FIXTURE=1` (or `npm run dev:fixture`) serves
  `fixtures/usgs-synthetic.json` — 67 events over 30 days, frozen "now" =
  2026-01-15T12:00Z, ids `fx0001…`. It covers swarms (Iceland ×6, Alaska ×3), a
  2-event near-miss, an antimeridian pair, deep-focus events, every PAGER level, tsunami
  flags and an event exactly on M2.5. Extend `scripts/make-usgs-fixture.mjs` when a
  feature needs a new case; don't hand-edit the JSON.
- **Driving the globe in a browser:** the globe is one `<canvas>`, so you can't query
  markers in the DOM. Use the dev-only hook (`lib/testHooks.ts`):
  - wait for `html[data-globe-ready="true"]` and `html[data-quake-count]`
  - `window.__quakestation.projectQuake(id)` → `{ x, y, visible }` viewport pixels to click
  - `.store.getState().focusQuake(q)` to select, `.lookAt(lat, lon)` to aim the camera
  - Set `NEXT_PUBLIC_TEST_HOOKS=1` to enable it in a production build.
- **UI changes:** check desktop and a 375×812 mobile viewport, with Auto-rotate off, and
  include before/after screenshots in the PR.

## Git workflow

- Branch off `main` (`feature-name`), open a PR into `main`; Vercel builds a preview per PR.
- Commit messages: a short summary line, then a bulleted body explaining *why*
  (see recent history).
- Line endings are LF everywhere (`.gitattributes`). If git shows whole files changed,
  it's line endings — don't commit them.
