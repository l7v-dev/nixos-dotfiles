import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "standalone",
    transpilePackages: ["lucide-react"],
    experimental: {
        serverActions: {
            allowedOrigins: ["panel.l7v.dev"],
        },
    },
};

export default nextConfig;
