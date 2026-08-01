import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Allows `npm run dev` to be reached from other devices on the LAN
  // (e.g. testing on a phone via the printed Network URL) without Next.js
  // blocking cross-origin dev-only requests (HMR websocket, etc.).
  allowedDevOrigins: ["172.24.32.1"],
  async headers() {
    return [
      {
        source: "/main.js",
        headers: [{ key: "Cache-Control", value: "public, max-age=300, must-revalidate" }],
      },
      {
        source: "/frames/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=300, must-revalidate" }],
      },
      {
        source: "/frames24/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=300, must-revalidate" }],
      },
      {
        source: "/images/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=300, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
