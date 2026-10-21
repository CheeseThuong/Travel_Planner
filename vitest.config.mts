import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/components/**/*.test.ts"],
    environment: "node",
    maxWorkers: 2,
    coverage: { provider: "v8", reporter: ["text", "json-summary"], include: ["src/domain/**/*.ts", "src/components/ui/button.tsx"] },
  },
});
