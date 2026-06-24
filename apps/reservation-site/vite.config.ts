import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const SERVER_PORT = process.env.PORT ?? "8787";

// Frontend lives in ./web; index.html at the app root references web/main.tsx.
// In dev, /api is proxied to the Hono server so the SPA and API share an origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": `http://localhost:${SERVER_PORT}`,
    },
  },
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
  },
});
