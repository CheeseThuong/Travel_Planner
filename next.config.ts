import type { NextConfig } from "next";
import { parseServerEnv } from "./src/lib/config/env.server";

parseServerEnv();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
