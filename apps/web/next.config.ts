import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.trycloudflare.com", "127.0.0.1", "localhost"],
};

export default nextConfig;
