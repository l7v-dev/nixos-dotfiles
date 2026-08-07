import type { NextConfig } from "next";

/**
 * Next.js application configuration object.
 * 
 * <p>This configuration defines the core settings for the Next.js application including:
 * <ul>
 *   <li>Image optimization settings with remote pattern allowlists</li>
 *   <li>Security and performance optimizations</li>
 *   <li>Build and rendering configurations</li>
 * </ul>
 * 
 * <p><strong>Image Remote Patterns:</strong>
 * Only trusted external image sources should be added to the remotePatterns array.
 * Each pattern must specify protocol and hostname to prevent unauthorized image loading.
 * Example: { protocol: "https", hostname: "img.clerk.com" }
 * 
 * @property images - Image optimization configuration
 * @property images.remotePatterns - Array of allowed remote image source patterns
 * 
 * @see {@link https://nextjs.org/docs/app/api-reference/config/next-config-js} for Next.js configuration documentation
 * @see {@link https://nextjs.org/docs/app/api-reference/components/image#remotepatterns} for remote patterns documentation
 */
const nextConfig: NextConfig = {
  images: {
    /**
     * Remote image patterns define which external domains are allowed to serve optimized images.
     * This is a security measure to prevent loading images from untrusted sources.
     * 
     * <p>Add new patterns only when required by specific features:
     * <ul>
     *   <li>Authentication provider images (e.g., clerk.com)</li>
     *   <li>User-generated content CDNs</li>
     *   <li>Third-party service avatars or logos</li>
     * </ul>
     */
    remotePatterns: [
      // Add remote image hosts here as they're needed, e.g.:
      // { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
};

export default nextConfig;
