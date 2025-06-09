import js from "@eslint/js";
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";



export default defineConfig([
  tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  { files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], plugins: { js }, extends: ["js/recommended"] },
  { files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], languageOptions: { globals: globals.browser } },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/triple-slash-reference": "off",
      "no-unused-vars": "off",
    },
  },
]);


