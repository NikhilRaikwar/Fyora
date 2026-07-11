import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useMagic } from "@/lib/fyora/MagicProvider";

export const Route = createFileRoute("/auth/callback")({
  component: MagicCallback,
});

function MagicCallback() {
  const { finishGoogleSignIn } = useMagic();
  const [error, setError] = useState("");

  useEffect(() => {
    finishGoogleSignIn()
      .then(() => {
        const destination = sessionStorage.getItem("fyora-auth-return") || "/";
        sessionStorage.removeItem("fyora-auth-return");
        window.location.replace(destination);
      })
      .catch((cause) => {
        setError(cause instanceof Error ? cause.message : "Google sign-in failed.");
      });
  }, [finishGoogleSignIn]);

  return (
    <main className="min-h-screen bg-paper text-ink flex items-center justify-center px-4">
      <div className="rounded-3xl bg-card chunky-thick shadow-sticker-lg p-8 text-center max-w-sm">
        {error ? (
          <>
            <h1 className="font-display italic text-3xl">Sign-in failed</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <a
              href="/"
              className="mt-5 inline-block rounded-full bg-ink text-paper px-5 py-2.5 font-semibold press"
            >
              Back to Fyora
            </a>
          </>
        ) : (
          <>
            <Loader2 className="w-8 h-8 animate-spin mx-auto" />
            <h1 className="font-display italic text-3xl mt-4">Finishing sign-in</h1>
          </>
        )}
      </div>
    </main>
  );
}
