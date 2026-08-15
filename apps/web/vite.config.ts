import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    // MapLibre is an optional renderer and is isolated from the initial route UI.
    chunkSizeWarningLimit: 1024,
  },
});
