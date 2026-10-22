import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/integration/local-owner.test.ts"],
    environment: "node",
    maxWorkers: 1,
    fileParallelism: false,
  },
});
