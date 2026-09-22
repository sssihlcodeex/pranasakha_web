import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  plugins: [
    tanstackStart({
      // Project is plain JS/JSX now, so generate a type-free route tree.
      router: {
        generatedRouteTree: "./src/routeTree.gen.js",
        disableTypes: true,
      },
    }),
    react(),
    tsconfigPaths(),
    tailwindcss(),
  ],

  // Add this new server block to allow your Cloudflare domain
  server: {
    allowedHosts: ["pranasakha.codeex.space"],
  },

  tanstackStart: {
    server: {
      entry: "server",
      host: true,
      port: 5173,
      open: true,
    },
  },
});
