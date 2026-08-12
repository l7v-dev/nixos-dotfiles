import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "standalone",
    experimental: {
        serverActions: {
            allowedOrigins: ["panel.l7v.dev"],
        },
    },
};

export default nextConfig;
