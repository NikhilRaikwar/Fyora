import { useState } from "react";
import { Loader2, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useFyoraAuth } from "@/lib/fyora/AuthProvider";

export function AuthLoginCard({ title = "Sign in to Fyora" }: { title?: string }) {
  const [email, setEmail] = useState("");
  const [working, setWorking] = useState(false);
  const { signInWithEmail } = useFyoraAuth();

  const emailLogin = async () => {
    setWorking(true);
    try {
      await signInWithEmail(email);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Particle sign-in failed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-3xl bg-card chunky-thick shadow-sticker-lg p-6 space-y-4">
      <div>
        <h2 className="font-display italic text-3xl">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Particle creates your embedded wallet and Universal Account.
        </p>
      </div>
      <div className="rounded-2xl chunky bg-lilac/30 p-4 flex items-center gap-2">
        <Mail className="w-4 h-4 text-muted-foreground" />
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@somewhere.com"
          className="flex-1 min-w-0 bg-transparent outline-none"
        />
      </div>
      <button
        onClick={emailLogin}
        disabled={working || !email}
        className="w-full rounded-full bg-lime text-ink py-3 font-semibold chunky shadow-sticker press flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        Continue with Particle
      </button>
    </div>
  );
}
