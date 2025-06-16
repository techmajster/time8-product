import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Suppress some non-critical warnings that don't affect functionality
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-unused-vars": [
        "error", 
        { 
          "argsIgnorePattern": "^_", 
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_"
        }
      ],
      "react-hooks/exhaustive-deps": "warn",
      // Allow intentional any types with a warning instead of error
      "@typescript-eslint/no-explicit-any": "warn",
    }
  }
];

export default eslintConfig;
