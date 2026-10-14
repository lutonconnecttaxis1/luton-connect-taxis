import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // The booking form now lives on the homepage card – keep old /book links working.
  async redirects() {
    return [
      { source: "/book", destination: "/#quote", permanent: false },
      { source: "/:locale(ro|es|it|fr|zh|de)/book", destination: "/:locale#quote", permanent: false },
      // "Wedding transfers" became "Wedding Taxi Hire" – keep the old page address working.
      { source: "/services/wedding-transfers", destination: "/services/wedding-taxi-hire", permanent: true },
      {
        source: "/:locale(ro|es|it|fr|zh|de)/services/wedding-transfers",
        destination: "/:locale/services/wedding-taxi-hire",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  // A full Content-Security-Policy is added in milestone 7 once every
  // third-party script (Maps, reCAPTCHA, Analytics, Firebase) is final.
};

export default nextConfig;
