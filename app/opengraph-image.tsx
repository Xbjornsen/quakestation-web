import { ImageResponse } from "next/og";

// Static branded social card used for link previews across the site.
export const alt = "QuakeStation — Live global earthquake tracker";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background:
            "radial-gradient(circle at 72% 50%, #0a1c33 0%, #060b16 45%, #05070d 100%)",
          color: "white",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Glowing globe on the right */}
        <div
          style={{
            position: "absolute",
            right: -120,
            top: 95,
            width: 440,
            height: 440,
            borderRadius: 440,
            background:
              "radial-gradient(circle at 38% 35%, #1b4f7a 0%, #0e2c47 55%, #081a2c 100%)",
            boxShadow: "0 0 120px 24px rgba(45,160,225,0.35)",
            border: "1px solid rgba(120,200,255,0.25)",
            display: "flex",
          }}
        />
        {/* Accent ring */}
        <div
          style={{
            position: "absolute",
            right: -70,
            top: 145,
            width: 340,
            height: 340,
            borderRadius: 340,
            border: "2px solid rgba(92,236,255,0.30)",
            display: "flex",
          }}
        />

        {/* Left text block */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 80px",
            gap: 24,
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              color: "#5cecff",
              fontSize: 22,
              letterSpacing: 8,
              textTransform: "uppercase",
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 12,
                background: "#34d399",
                display: "flex",
              }}
            />
            Live · USGS
          </div>
          <div style={{ fontSize: 92, fontWeight: 700, letterSpacing: -2 }}>
            QuakeStation
          </div>
          <div style={{ fontSize: 34, color: "rgba(255,255,255,0.7)", maxWidth: 620 }}>
            Real-time global earthquakes on a cinematic 3D globe.
          </div>
          <div style={{ fontSize: 22, color: "rgba(255,255,255,0.4)", letterSpacing: 2 }}>
            quakestation.com
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
