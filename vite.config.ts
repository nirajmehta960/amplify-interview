import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      clientPort: 8080, // Ensure HMR client connects to the correct port
    },
  },
  build: {
    outDir: "dist",
    sourcemap: mode === "development",
  },
}));
