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
          // Content Security Policy — restrict sources for scripts, styles, and connections
          // 'unsafe-inline' + 'unsafe-eval' are required by Next.js internals (inline scripts, HMR)
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Next.js requires unsafe-inline (inline <script> tags) and unsafe-eval (eval from webpack/turbopack)
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              // Supabase storage & auth avatars
              "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com",
              // Supabase REST, Auth, Storage, and Realtime (ws/wss)
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
              "font-src 'self'",
              // Block Flash, Java, and other plugins
              "object-src 'none'",
              // Prevent base-tag hijacking
              "base-uri 'self'",
              // Only allow form actions on the same origin
              "form-action 'self'",
              // Complement to X-Frame-Options SAMEORIGIN
              "frame-ancestors 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },

  // ── Experimental: server actions are stable in Next 15 ────────────────────
  // Nothing extra needed; 'use server' works out of the box.
};

export default nextConfig;

