import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin Turbopack root to this app directory (where package.json / next live)
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
