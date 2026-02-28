import type { NextConfig } from "next";

/**
 * next.config.ts — Production-Ready Configuration
 * eTire Management System
 */
const nextConfig: NextConfig = {
  // ── React strict-mode: double-invokes effects in dev to catch side-effects ──
  reactStrictMode: true,

  // ── TypeScript — enforce clean builds in production ───────────────────────
  // ignoreBuildErrors was removed; all TS errors must be resolved.
  typescript: {
    ignoreBuildErrors: false,
  },

  // ── Remote image patterns (Supabase Storage) ──────────────────────────────
  // Add your Supabase project ref below (e.g. "abcdefghijklmnop").
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        // Supabase Auth avatars (e.g. Google OAuth)
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },

  // ── HTTP Security Headers (Vercel-compatible) ─────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent clickjacking
          { key: "X-Frame-Options",         value: "SAMEORIGIN" },
          // Prevent MIME-type sniffing
          { key: "X-Content-Type-Options",   value: "nosniff" },
          // Enable XSS filter in legacy browsers
          { key: "X-XSS-Protection",         value: "1; mode=block" },
          // Strict transport security (1 year)
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          // Control referrer info sent to external sites
          { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
          // Permissions policy — disable features the app doesn't use
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },

  // ── Experimental: server actions are stable in Next 15 ────────────────────
  // Nothing extra needed; 'use server' works out of the box.
};

export default nextConfig;

