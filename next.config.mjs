/** @type {import('next').NextConfig} */

// Applied to every response. Kept deliberately compatible with the existing
// careers site: camera/microphone stay enabled for same-origin so the video
// interview feature keeps working; only unused/risky features are denied.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  {
    key: "Permissions-Policy",
    value: "geolocation=(), browsing-topics=(), camera=(self), microphone=(self)",
  },
];

const nextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
