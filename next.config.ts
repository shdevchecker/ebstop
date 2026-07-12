import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the workspace root to THIS project so Next doesn't pick up an unrelated
  // lockfile elsewhere on the machine when inferring the root.
  turbopack: {
    root: import.meta.dirname,
  },
  // PREVIEWING OVER LAN (e.g. on your phone at http://192.168.x.x:3000)? Next.js 16 blocks
  // cross-origin requests for dev server resources (HMR, /_next/*) by default. List the extra
  // origins you preview from here so those assets load. Dev-only; ignored in production builds.
  // Find your machine's LAN IP with `ipconfig getifaddr en0` (macOS) or `hostname -I` (Linux).
  // allowedDevOrigins: ["192.168.1.42", "my-laptop.local"],
};

export default nextConfig;
