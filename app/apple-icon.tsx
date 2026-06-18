import { ImageResponse } from "next/og";

// Apple touch icon (home-screen): globe-tinted square with a seismic ripple.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 38% 35%, #0e2c47 0%, #060b16 70%, #05070d 100%)",
        }}
      >
        <div
          style={{
            width: 104,
            height: 104,
            borderRadius: 104,
            border: "8px solid #5cecff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ width: 30, height: 30, borderRadius: 30, background: "#5cecff" }} />
        </div>
      </div>
    ),
    { ...size },
  );
}
