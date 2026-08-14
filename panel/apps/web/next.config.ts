import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "standalone",
    experimental: {
        serverActions: {
            allowedOrigins: ["panel.l7v.dev"],
        },
    },
    async rewrites() {
        const grafanaUrl = process.env.GRAFANA_URL || "http://127.0.0.1:3001";
        return [
            {
                source: "/grafana/:path*",
                destination: `${grafanaUrl}/grafana/:path*`,
            },
        ];
    },
};

export default nextConfig;
