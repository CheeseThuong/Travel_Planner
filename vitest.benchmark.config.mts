import { defineConfig } from "vitest/config";
import baseline from "./vitest.config.mts";

export default defineConfig({
  resolve: baseline.resolve,
  test: { include: ["tests/benchmarks/**/*.test.ts"], maxWorkers: 1, fileParallelism: false },
});
