import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Short links must never be cached by a CDN as a static asset —
  // the destination can be edited or deleted at any time.
  async headers() {
    return [
      {
        source: "/:slug",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
    ];
  },
};

export default nextConfig;
