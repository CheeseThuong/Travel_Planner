import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  { files: ["src/domain/**/*.ts"], rules: { "no-restricted-imports": ["error", { patterns: ["next", "next/**", "react", "react-dom", "@supabase/**", "@googlemaps/**", "@/adapters/**", "@/lib/**"] }] } },
  globalIgnores([".next/**", ".tools/**", ".preview/**", ".agent-skills/**", "vendor/**", "out/**", "coverage/**", "playwright-report/**", "test-results/**", "next-env.d.ts"]),
]);
