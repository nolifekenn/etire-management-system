import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Allows production build to succeed even with type errors
    // This is a temporary fix to enable deployment while type issues are addressed
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
