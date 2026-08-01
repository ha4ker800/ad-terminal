import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ Removed: output: "standalone" — that's for Docker/VPS only, breaks Vercel
  // ✅ Removed: WebSocket headers — Vercel serverless can't upgrade to WS anyway

  async rewrites() {
    return [
      {
        source: "/connect.sh",
        destination: "/scripts/connect.sh",
      },
      {
        source: "/connect.bat",
        destination: "/scripts/connect.bat",
      },
      {
        source: "/connect.ps1",
        destination: "/scripts/connect.ps1",
      },
    ];
  },
};

export default nextConfig;
