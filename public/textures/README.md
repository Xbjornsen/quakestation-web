# Earth textures

Drop the following NASA Visible Earth textures here for the photoreal globe.
Without them, the app falls back to a procedural sphere so dev still works.

- `earth_day_4k.jpg` — Blue Marble Next Generation, 4096 × 2048
- `earth_night_4k.jpg` — Black Marble (city lights), 4096 × 2048
- `earth_spec_2k.jpg` — land/ocean specular mask (white land, black ocean), 2048 × 1024

Suggested sources:
- https://visibleearth.nasa.gov/collection/1484/blue-marble
- https://earthobservatory.nasa.gov/features/NightLights

8K variants will live in `8k/` and be served conditionally based on devicePixelRatio
and effective connection type once M2 lands.
