import { Buffer } from "buffer";

type BrowserGlobal = Omit<typeof globalThis, "process" | "Buffer"> & {
  process?: BrowserProcess;
  Buffer?: typeof Buffer;
};

type BrowserProcess = {
  browser: true;
  env: Record<string, string | undefined>;
  version: string;
  versions: Record<string, string>;
  nextTick: (callback: (...args: unknown[]) => void, ...args: unknown[]) => void;
  cwd: () => string;
};

export function installBrowserPolyfills() {
  const scope = globalThis as unknown as BrowserGlobal;
  scope.Buffer ??= Buffer;
  scope.process ??= {
    browser: true,
    env: {},
    version: "",
    versions: {},
    nextTick(callback, ...args) {
      queueMicrotask(() => callback(...args));
    },
    cwd() {
      return "/";
    },
  };
}
