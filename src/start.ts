import { createCsrfMiddleware, createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

const cspMiddleware = createMiddleware().server(async ({ next }) => {
  const response = await next();
  if (response instanceof Response) {
    const csp = response.headers.get("content-security-policy");
    if (
      csp &&
      csp.includes("script-src") &&
      !csp.includes("'wasm-unsafe-eval'") &&
      !csp.includes("'unsafe-eval'")
    ) {
      const newHeaders = new Headers(response.headers);
      newHeaders.set(
        "content-security-policy",
        csp.replace("script-src", "script-src 'wasm-unsafe-eval'"),
      );
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }
  }
  return response;
});

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware, errorMiddleware, cspMiddleware],
}));
