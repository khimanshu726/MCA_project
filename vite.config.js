import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/tests/setup.js",
  },
});
