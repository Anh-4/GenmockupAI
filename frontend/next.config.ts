import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allow large mockup data-URLs without complaint.
  experimental: { largePageDataBytes: 12 * 1024 * 1024 },
  // Static export so the FastAPI backend (and the packaged .exe) can serve the
  // whole UI as plain files. Set BUILD_STATIC=1 when building for the desktop
  // bundle; left off for normal `next dev`/`next start`.
  ...(process.env.BUILD_STATIC === "1"
    ? { output: "export" as const, images: { unoptimized: true } }
    : {}),
};

export default nextConfig;
