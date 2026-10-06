import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

// Separate from vite.config.ts so the dev server config stays untouched. The
// alias must match vite.config.ts and tsconfig.app.json.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
  },
});
