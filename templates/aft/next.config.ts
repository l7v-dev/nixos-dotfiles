import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Add remote image hosts here as they're needed, e.g.:
      // { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
};

export default nextConfig;
