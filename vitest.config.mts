import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const cwd = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  define: {
    __VERSION__: JSON.stringify("TEST"),
  },
  resolve: {
    tsconfigPaths: true,
    alias: {
      "@src": resolve(cwd, "./src"),
    },
  },
  test: {
    name: "Unit Test",
    include: ["test/**/*.{spec,test}.{ts,tsx}"],
    globalSetup: [],
    coverage: {
      enabled: true,
      provider: "v8", // default provider
      include: ["src/**/*.ts"],
      exclude: [],
      reportOnFailure: true,
      reportsDirectory: "var/coverage/test",
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
    environment: "node",
  },
});
