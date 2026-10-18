import { defineConfig } from "vite";
export default defineConfig({
  server: { strictPort: true, proxy: { "/api": "http://127.0.0.1:4318" } },
  build: {
    rollupOptions: {
      input: { game: "index.html", lab: "lab.html" },
      output: {
        // Cache the physics dependency separately from frequently changed game code.
        manualChunks: (id) =>
          id.includes("/node_modules/") ? "vendor" : undefined,
      },
    },
  },
});
