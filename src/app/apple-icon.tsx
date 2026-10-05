import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const ORANGE = "#eb6834";

// Same baby-bottle mark as icon.svg; iOS needs a PNG for the home screen.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: ORANGE,
        }}
      >
        <div style={{ width: 26, height: 24, borderRadius: 12, background: "#fff" }} />
        <div
          style={{ width: 60, height: 16, borderRadius: 6, background: "#fff", marginTop: 4 }}
        />
        <div
          style={{
            width: 52,
            height: 80,
            borderRadius: 16,
            background: "#fff",
            marginTop: 4,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <div style={{ width: 20, height: 6, borderRadius: 3, background: ORANGE }} />
          <div style={{ width: 28, height: 6, borderRadius: 3, background: ORANGE }} />
          <div style={{ width: 20, height: 6, borderRadius: 3, background: ORANGE }} />
        </div>
      </div>
    ),
    size,
  );
}
