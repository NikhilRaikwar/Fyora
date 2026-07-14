type BrowserGlobal = typeof globalThis & {
  process?: BrowserProcess;
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
  const scope = globalThis as BrowserGlobal;
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
