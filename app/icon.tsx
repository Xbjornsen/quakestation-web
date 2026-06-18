import { ImageResponse } from "next/og";

// Branded favicon: a cyan seismic ripple ring + epicentre dot on dark.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#05070d",
          borderRadius: 7,
        }}
      >
        <div
          style={{
            width: 19,
            height: 19,
            borderRadius: 19,
            border: "2px solid #5cecff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: 6, background: "#5cecff" }} />
        </div>
      </div>
    ),
    { ...size },
  );
}
