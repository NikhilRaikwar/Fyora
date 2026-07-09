import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="min-h-screen bg-paper text-ink flex items-center justify-center px-4">
      <div className="max-w-md text-center chunky shadow-sticker-lg rounded-3xl bg-card p-10">
        <div className="text-7xl mb-2">🫧</div>
        <h1 className="text-6xl font-display italic">Lost in space</h1>
        <p className="mt-3 text-muted-foreground">This page floated away. Let's get you home.</p>
        <Link
          to="/"
          className="inline-flex mt-6 items-center justify-center rounded-full bg-lime text-ink chunky shadow-sticker px-6 py-3 font-semibold press"
        >
          Take me home →
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="min-h-screen bg-paper text-ink flex items-center justify-center px-4">
      <div className="max-w-md text-center chunky shadow-sticker-lg rounded-3xl bg-card p-10">
        <div className="text-6xl mb-2">💥</div>
        <h1 className="text-4xl font-display italic">Oops, a hiccup.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something broke. Try again or head home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-full bg-ink text-paper chunky shadow-sticker px-5 py-2.5 font-semibold press"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-full bg-card chunky shadow-sticker px-5 py-2.5 font-semibold press"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Fyora — Get paid from anywhere, land anywhere" },
      {
        name: "description",
        content:
          "Fyora is the creator money page for chain-abstracted payments. Share one link, get paid from any chain, receive on your favorite one.",
      },
      { name: "author", content: "Fyora" },
      { property: "og:title", content: "Fyora — Get paid from anywhere" },
      { property: "og:description", content: "One link. Any chain. Instant support for creators." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/api/public/og/fyora" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/api/public/og/fyora" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,600;1,9..144,700&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Archivo+Black&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster />
    </QueryClientProvider>
  );
}
