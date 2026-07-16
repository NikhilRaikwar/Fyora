import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  vite: {
    define: {
      global: "globalThis",
    },
    resolve: {
      alias: {
        "@coral-xyz/anchor": fileURLToPath(
          new URL("./node_modules/@coral-xyz/anchor/dist/cjs/index.js", import.meta.url),
        ),
        buffer: "buffer/",
        "node:buffer": "buffer/",
        events: "events/",
        "node:events": "events/",
        process: "process/browser",
        "node:process": "process/browser",
      },
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
