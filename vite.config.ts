/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./", // relative asset paths: dist/ runs from any static host or sub-folder
  plugins: [react()],
  build: { chunkSizeWarningLimit: 6000 }, // the lazy CMUdict chunk is ~4 MB by design
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    globalSetup: ["tests/parity/summary.ts"],
    testTimeout: 600_000,
    hookTimeout: 120_000,
  },
});
