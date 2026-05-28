import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Pin the workspace root so Next doesn't infer a stray lockfile elsewhere on
// the machine (e.g. ~/package-lock.json) as the root.
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  // Hide the on-screen dev tools indicator (the "N" badge). Build/runtime
  // errors are still surfaced.
  devIndicators: false,
};

export default nextConfig;
