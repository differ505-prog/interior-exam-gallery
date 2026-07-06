import { ImageResponse } from "next/og";

// Route segment config
export const runtime = "edge";

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      // ImageResponse JSX element
      <div
        style={{
          fontSize: 20,
          background: "#876f49", // Site accentColor
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#f5f1ea", // Site themeColor
          borderRadius: "8px",
          fontWeight: "bold",
          fontFamily: "serif",
        }}
      >
        D
      </div>
    ),
    // ImageResponse options
    {
      ...size,
    }
  );
}
