import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

/** Directory containing this config — real Next.js app root (deps live in ./node_modules here). */
const appDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  /**
   * Parent folder `Shift_handover/` also has a package-lock.json; Turbopack otherwise picks it as the
   * workspace root and fails to resolve `tailwindcss` (looks in parent with no node_modules).
   */
  turbopack: {
    root: appDir,
  },
};

export default nextConfig;
