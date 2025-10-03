import js from "@eslint/js";
import jest from 'eslint-plugin-jest';
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  { files: ["**/*.{js,mjs,cjs}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: globals.node } },
  { files: ["**/*.js"], languageOptions: { sourceType: "commonjs" } },
  { files: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}"], plugins: { jest }, rules: { ...jest.configs.recommended.rules }, languageOptions: { globals: { ...globals.jest } } }
]);
