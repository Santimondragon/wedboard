import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Convex codegen — not ours to lint.
    "convex/_generated/**",
  ]),
  {
    rules: {
      // The public invitation templates render Convex storage URLs with plain
      // <img>; next/image isn't configured for those remote blobs.
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
