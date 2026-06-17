# QuakeStation Web

Web companion to the [QuakeStation Android app](https://github.com/Xbjornsen/QuakeStation).
Live global earthquake tracker on a cinematic Three.js globe, with deep-linkable events,
volcano overlays, swarm detection and time-lapse replay.

> Domain: [quakestation.com](https://quakestation.com)

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **React Three Fiber** + **drei** + **postprocessing** (Three.js)
- **TanStack Query** for USGS fetching
- **Zustand** for globe / UI state
- **Tailwind CSS** + **lucide-react** icons
- Deployed on **Vercel**

## Local dev

```bash
npm install
npm run dev
```

The app reads the USGS FDSNWS feed through `/api/usgs` (server-cached for 60s).
No API keys required.

## Earth textures

For the photoreal globe, drop these files into `public/textures/`:

- `earth_day.jpg` — NASA Blue Marble
- `earth_night.jpg` — NASA Black Marble
- `earth_spec.jpg` — land/ocean mask (white = land, black = ocean)

Without them the globe renders a procedural fallback so dev still works.

A future PR will gate the heaviest assets behind a `prefers-reduced-motion` /
mobile check.

## Roadmap

See the plan in the design doc — milestones M1–M10.

- [x] M1 — Project scaffold, globe canvas, day/night shader
- [x] M3 — USGS feed + instanced markers + detail panel
- [x] M4 — Header pills + settings drawer
- [x] M6 — Plates / volcanoes overlays
- [x] M9 — Stats dashboard + embeddable globe
- [x] M5 — Swarm detection + time-lapse replay
- [x] M8 — Deep links + OG image
- [ ] M2 — 8K textures + atmospheric scattering pass
- [ ] M7 — Seismic density heatmap (shelved; glow-splat prototype on branch `shelf/heatmap-glow-splats`, needs proper render-to-texture rebuild)
- [ ] M10 — Polish + Lighthouse pass

Live feed auto-refreshes every 60s (USGS proxy is cached 60s server-side).

## Data sources

- Earthquakes — [USGS FDSNWS Event API](https://earthquake.usgs.gov/fdsnws/event/1/)
- Tectonic plates — Bird (2003) PB2002
- Volcanoes — Smithsonian Global Volcanism Program
- Earth textures — NASA Visible Earth (Blue Marble / Black Marble)

## License

All rights reserved (will add a license file once decided).
