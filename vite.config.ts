import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import stdLibBrowser from "node-stdlib-browser";

export default defineConfig({
  vite: {
    define: {
      global: "globalThis",
    },
    resolve: {
      alias: {
        buffer: stdLibBrowser.buffer,
        "node:buffer": stdLibBrowser.buffer,
        events: stdLibBrowser.events,
        "node:events": stdLibBrowser.events,
      },
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
