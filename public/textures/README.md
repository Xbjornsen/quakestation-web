# Earth textures

NASA Visible Earth textures for the photoreal globe. `Earth.tsx` picks a set at
load time; without any of them the app falls back to a flat sphere so dev
still works.

| File | Size | Served to |
| --- | --- | --- |
| `earth_day.jpg` / `earth_night.jpg` | 8192 × 4096 (~7.7 MB total) | Screens ≥ 1024px wide whose GPU supports 8K textures, unless Save-Data is on |
| `earth_day_4k.jpg` / `earth_night_4k.jpg` | 4096 × 2048 (~1.2 MB total) | Everyone else (phones, tablets, low-end GPUs) |
| `earth_spec.jpg` | 2048 × 1024 | Always — land/ocean mask (white land, black ocean) |
| `earth_normal.jpg` | 2048 × 1024 | Currently unused |

The 4K files are downscaled from the 8K originals (Lanczos, JPEG q85,
progressive). Regenerate them if the 8K sources change.

Sources:
- https://visibleearth.nasa.gov/collection/1484/blue-marble
- https://earthobservatory.nasa.gov/features/NightLights
