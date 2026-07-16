import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";

// Browser stand-ins for the few Node core modules the wallet SDKs pull in
// (magic-sdk, rpc-websockets). These are resolved from the `buffer`, `events`,
// and `process` npm packages that ship as regular dependencies.
const BROWSER_SHIMS: Record<string, string> = {
  buffer: "buffer/",
  "node:buffer": "buffer/",
  events: "events/",
  "node:events": "events/",
  process: "process/browser",
  "node:process": "process/browser",
};

// Rewrite Node core imports to their browser shims ONLY in the client build.
// The Cloudflare Workers server runs with `nodejs_compat`, so it keeps the
// native `node:buffer`/`node:events`/`node:process` implementations. We must
// not leak the browser shims into the server graph — the browser `buffer`
// shim has no `node:buffer` export, which previously broke the Nitro build.
function clientNodeShims(): Plugin {
  return {
    name: "fyora-client-node-shims",
    // Only apply this plugin in the client environment.
    applyToEnvironment: (environment) => environment.name === "client",
    enforce: "pre",
    resolveId(id) {
      const shim = BROWSER_SHIMS[id];
      if (!shim) return null;
      return this.resolve(shim, undefined, { skipSelf: true });
    },
  };
}

export default defineConfig({
  vite: {
    plugins: [clientNodeShims()],
    define: {
      global: "globalThis",
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
