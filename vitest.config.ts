import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup-env.ts"],
    // Run test files sequentially: multiple suites apply the drizzle migrations against the same
    // Docker Postgres, and parallel `CREATE TABLE` runs would race. This does NOT affect the
    // sacred ledger concurrency test, which fires its parallel debits *within* a single test.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // `server-only`'s default export throws under plain Node (no react-server condition).
      // Alias it to an empty stub so server modules can be unit-tested without weakening the
      // guard in source. See tests/stubs/server-only.ts.
      "server-only": fileURLToPath(
        new URL("./tests/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
});
