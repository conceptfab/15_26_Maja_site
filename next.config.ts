import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://use.typekit.net https://cloud.umami.is",
      "style-src 'self' 'unsafe-inline' https://use.typekit.net",
      "font-src 'self' https://use.typekit.net",
      "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://*.private.blob.vercel-storage.com",
      "connect-src 'self' https://cloud.umami.is https://vitals.vercel-insights.com https://va.vercel-scripts.com",
      "frame-ancestors 'self'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: '*.private.blob.vercel-storage.com',
      },
    ],
    deviceSizes: [640, 800, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    devtoolSegmentExplorer: false,
    serverActions: {
      bodySizeLimit: '8mb',
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
