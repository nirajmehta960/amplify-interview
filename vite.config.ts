import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
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
    sourcemap: true,
  },
  // Vite automatically loads .env files, so we don't need to manually define them
  // The VITE_ prefix makes them available to the client
});
