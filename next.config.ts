import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Allows `npm run dev` to be reached from other devices on the LAN
  // (e.g. testing on a phone via the printed Network URL) without Next.js
  // blocking cross-origin dev-only requests (HMR websocket, etc.).
  allowedDevOrigins: ["172.24.32.1"],
};

export default nextConfig;
