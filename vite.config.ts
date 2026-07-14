import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig(({ isSsrBuild }) => {
  return {
    vite: {
      plugins: [
        !isSsrBuild &&
          nodePolyfills({
            globals: {
              Buffer: true,
              global: true,
              process: true,
            },
          }),
      ].filter(Boolean) as any[],
    },
    tanstackStart: {
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      // nitro/vite builds from this
      server: { entry: "server" },
    },
  };
});
