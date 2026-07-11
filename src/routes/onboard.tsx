import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { QRCodeSVG } from "qrcode.react";
import { Header } from "@/components/kivo/Header";
import { EmojiAvatar } from "@/components/kivo/EmojiAvatar";
import { Sticker } from "@/components/kivo/Sticker";
import { CopyButton } from "@/components/kivo/CopyButton";
import { MagicLoginCard } from "@/components/kivo/MagicLoginCard";
import { useMagic } from "@/lib/fyora/MagicProvider";
import { claimCreatorFn, getPublicCreatorFn } from "@/lib/fyora/server-functions";
import {
  DEFAULT_SETTLEMENT,
  SETTLEMENT_CHAINS,
  settlementAssetsForChain,
} from "@/lib/fyora/settlement";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, X, ArrowRight, ArrowLeft } from "lucide-react";
import type { Social } from "@/lib/fyora/types";
import { toast } from "sonner";

const searchSchema = z.object({ h: z.string().optional() });

export const Route = createFileRoute("/onboard")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Claim your Fyora page" },
      { name: "description", content: "Set up your money page in under a minute." },
      { property: "og:title", content: "Claim your Fyora page" },
      { property: "og:description", content: "One link. Any chain." },
    ],
  }),
  component: Onboard,
});

const EMOJIS = [
  "🦊",
  "🐨",
  "🐳",
  "🦁",
  "🐸",
  "🌻",
  "🚀",
  "✨",
  "🐧",
  "🌊",
  "🌟",
  "🎨",
  "🎧",
  "🌙",
  "🌸",
  "🦖",
  "📚",
  "☕",
];
const GRADIENTS: [string, string][] = [
  ["#C6F24E", "#B8A6FF"],
  ["#FF6B4A", "#FFD166"],
  ["#B8A6FF", "#7DD3FC"],
  ["#FBCFE8", "#C6F24E"],
  ["#FFB4A2", "#B8A6FF"],
  ["#C6F24E", "#7DD3FC"],
];

function Onboard() {
  const { h } = Route.useSearch();
  const { identity, loading, refreshIdentity } = useMagic();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [handle, setHandle] = useState(h ?? "");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [gradient, setGradient] = useState<[string, string]>(GRADIENTS[0]);
  const [socials, setSocials] = useState<Social[]>([{ kind: "x", url: "" }]);
  const [chain, setChain] = useState(DEFAULT_SETTLEMENT.chainSlug);
  const [token, setToken] = useState(DEFAULT_SETTLEMENT.tokenId);
  const [publishing, setPublishing] = useState(false);

  const cleanHandle = handle
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
  const { data: existingHandle, isFetching: checkingHandle } = useQuery({
    queryKey: ["public-creator", cleanHandle],
    queryFn: () => getPublicCreatorFn({ data: { handle: cleanHandle } }),
    enabled: cleanHandle.length >= 3,
    staleTime: 15_000,
  });
  const selectedChain = SETTLEMENT_CHAINS.find((item) => item.chainSlug === chain)!;
  const chainAssets = settlementAssetsForChain(selectedChain.chainId);
  const selectedAsset = chainAssets.find((item) => item.tokenId === token) ?? chainAssets[0];
  const address =
    selectedAsset.networkType === "solana"
      ? (identity?.solanaAddress ?? "")
      : (identity?.evmAddress ?? "");
  const available = cleanHandle.length >= 3 && !checkingHandle && existingHandle === null;

  const canNext = useMemo(() => {
    if (step === 0) return available;
    if (step === 1) return name.trim().length > 1;
    if (step === 2) return address.trim().length > 0;
    return true;
  }, [step, available, name, address]);

  const done = async () => {
    if (!identity || !selectedAsset) return;
    setPublishing(true);
    try {
      const currentIdentity = await refreshIdentity();
      await claimCreatorFn({
        data: {
          didToken: currentIdentity.didToken,
          handle: cleanHandle,
          name,
          bio,
          emoji,
          gradient,
          socials: socials
            .filter((social) => social.url.trim())
            .map((social) => ({
              ...social,
              url: /^https?:\/\//i.test(social.url) ? social.url : `https://${social.url}`,
            })),
          chainId: selectedAsset.chainId,
          tokenAddress: selectedAsset.tokenAddress,
        },
      });
      await queryClient.invalidateQueries();
      setStep(3);
      setTimeout(() => {
        confetti({
          particleCount: 160,
          spread: 90,
          origin: { y: 0.4 },
          colors: ["#C6F24E", "#FF6B4A", "#B8A6FF", "#FFD166"],
        });
      }, 200);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not publish this page.");
    } finally {
      setPublishing(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-paper">
        <Header />
      </div>
    );
  if (!identity) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <Header />
        <div className="px-4 py-16">
          <MagicLoginCard title="Sign in to claim your page" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Header />
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
        {/* progress */}
        <div className="flex items-center justify-between gap-2 mb-8">
          {["Handle", "Profile", "Settlement", "Done"].map((label, i) => (
            <div key={label} className="flex-1 flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full chunky shadow-sticker-sm flex items-center justify-center text-xs font-bold ${
                  i < step ? "bg-lime" : i === step ? "bg-coral text-paper" : "bg-card"
                }`}
              >
                {i < step ? <Check className="w-4 h-4" strokeWidth={3} /> : i + 1}
              </div>
              <span
                className={`text-xs font-semibold hidden sm:inline ${i === step ? "" : "text-muted-foreground"}`}
              >
                {label}
              </span>
              {i < 3 && <div className="flex-1 h-0.5 bg-ink/30" />}
            </div>
          ))}
        </div>

        <div className="rounded-3xl bg-card chunky-thick shadow-sticker-lg p-6 sm:p-10">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <StepBox key="0">
                <Sticker color="lime">Step 1</Sticker>
                <h2 className="font-display italic text-4xl sm:text-5xl mt-3">Pick your handle</h2>
                <p className="text-muted-foreground mt-1">This becomes your Fyora page URL.</p>
                <div className="mt-6 flex items-center bg-secondary chunky rounded-2xl px-4 py-3">
                  <span className="text-muted-foreground font-mono">fyora.app/</span>
                  <input
                    autoFocus
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="yourname"
                    className="flex-1 bg-transparent outline-none text-lg font-semibold"
                  />
                  {cleanHandle.length >= 3 &&
                    (available ? (
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-ink bg-lime chunky rounded-full px-2 py-0.5">
                        <Check className="w-3 h-3" /> free
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-destructive">taken</span>
                    ))}
                </div>
              </StepBox>
            )}

            {step === 1 && (
              <StepBox key="1">
                <Sticker color="coral">Step 2</Sticker>
                <h2 className="font-display italic text-4xl sm:text-5xl mt-3">Your vibe</h2>
                <p className="text-muted-foreground mt-1">Name, bio, and a face for the page.</p>

                <div className="mt-6 flex items-start gap-4">
                  <EmojiAvatar emoji={emoji} gradient={gradient} size={80} animate />
                  <div className="flex-1 space-y-3">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="w-full bg-secondary chunky rounded-2xl px-4 py-3 outline-none text-lg font-semibold"
                    />
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="What are you making?"
                      rows={3}
                      className="w-full bg-secondary chunky rounded-2xl px-4 py-3 outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <div className="text-xs uppercase font-bold tracking-wider text-muted-foreground mb-2">
                    Emoji
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {EMOJIS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => setEmoji(e)}
                        className={`w-11 h-11 rounded-xl text-xl chunky press ${emoji === e ? "bg-lime shadow-sticker" : "bg-card shadow-sticker-sm"}`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-xs uppercase font-bold tracking-wider text-muted-foreground mb-2">
                    Background
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {GRADIENTS.map((g, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setGradient(g)}
                        className={`w-11 h-11 rounded-xl chunky press ${gradient === g ? "shadow-sticker" : "shadow-sticker-sm"}`}
                        style={{ background: `linear-gradient(135deg, ${g[0]}, ${g[1]})` }}
                        aria-label={`Gradient ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <div className="text-xs uppercase font-bold tracking-wider text-muted-foreground mb-2">
                    Social links
                  </div>
                  <div className="space-y-2">
                    {socials.map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <select
                          value={s.kind}
                          onChange={(e) => {
                            const next = [...socials];
                            next[i] = { ...s, kind: e.target.value as Social["kind"] };
                            setSocials(next);
                          }}
                          className="bg-secondary chunky rounded-xl px-3 py-2 outline-none font-semibold"
                        >
                          <option value="x">X</option>
                          <option value="github">GitHub</option>
                          <option value="site">Website</option>
                          <option value="youtube">YouTube</option>
                          <option value="ig">Instagram</option>
                        </select>
                        <input
                          value={s.url}
                          onChange={(e) => {
                            const next = [...socials];
                            next[i] = { ...s, url: e.target.value };
                            setSocials(next);
                          }}
                          placeholder="https://…"
                          className="flex-1 bg-secondary chunky rounded-xl px-3 py-2 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setSocials(socials.filter((_, j) => j !== i))}
                          className="w-9 h-9 rounded-xl bg-card chunky shadow-sticker-sm flex items-center justify-center press"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSocials([...socials, { kind: "site", url: "" }])}
                      className="inline-flex items-center gap-1 rounded-full bg-card chunky shadow-sticker-sm px-3 py-1.5 text-sm font-semibold press"
                    >
                      <Plus className="w-4 h-4" /> Add link
                    </button>
                  </div>
                </div>
              </StepBox>
            )}

            {step === 2 && (
              <StepBox key="2">
                <Sticker color="lilac">Step 3</Sticker>
                <h2 className="font-display italic text-4xl sm:text-5xl mt-3">
                  Where do funds land?
                </h2>
                <p className="text-muted-foreground mt-1">
                  Your favorite chain and token. You can change it anytime.
                </p>

                <div className="mt-6">
                  <div className="text-xs uppercase font-bold tracking-wider text-muted-foreground mb-2">
                    Settlement chain
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SETTLEMENT_CHAINS.map((c) => (
                      <button
                        type="button"
                        key={c.chainId}
                        onClick={() => {
                          setChain(c.chainSlug);
                          setToken(settlementAssetsForChain(c.chainId)[0].tokenId);
                        }}
                        className={`relative rounded-2xl chunky p-3 text-left press ${chain === c.chainSlug ? "bg-lime shadow-sticker" : "bg-card shadow-sticker-sm"}`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full border border-ink"
                            style={{ background: c.chainColor }}
                          />
                          <div className="font-semibold text-sm">{c.chainName}</div>
                        </div>
                        {c.chainSlug === "arbitrum" && (
                          <span className="absolute -top-2 -right-2 rotate-6 bg-coral text-ink chunky rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sticker-sm">
                            Recommended
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <div className="text-xs uppercase font-bold tracking-wider text-muted-foreground mb-2">
                    Token
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {chainAssets.map((t) => (
                      <button
                        type="button"
                        key={t.tokenAddress}
                        onClick={() => setToken(t.tokenId)}
                        className={`rounded-full chunky px-4 py-2 press font-semibold ${token === t.tokenId ? "bg-lime shadow-sticker" : "bg-card shadow-sticker-sm"}`}
                      >
                        {t.tokenEmoji} {t.tokenSymbol}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <div className="text-xs uppercase font-bold tracking-wider text-muted-foreground mb-2">
                    Receive address
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={address}
                      readOnly
                      placeholder="Magic wallet address"
                      className="flex-1 bg-secondary chunky rounded-2xl px-4 py-3 outline-none font-mono text-sm"
                    />
                  </div>
                </div>
              </StepBox>
            )}

            {step === 3 && (
              <StepBox key="3">
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 12 }}
                    className="mx-auto"
                  >
                    <EmojiAvatar emoji={emoji} gradient={gradient} size={100} />
                  </motion.div>
                  <Sticker color="lime" rotate={-4} className="mt-4">
                    You're live
                  </Sticker>
                  <h2 className="font-display italic text-4xl sm:text-5xl mt-3">
                    Welcome, {name.split(" ")[0]}!
                  </h2>
                  <p className="text-muted-foreground mt-1">Share your page anywhere.</p>

                  <div className="mt-6 mx-auto max-w-sm rounded-2xl bg-secondary chunky p-4 flex items-center gap-4">
                    <div className="bg-card p-2 rounded-xl chunky shadow-sticker-sm">
                      <QRCodeSVG
                        value={`https://fyora.app/${cleanHandle}`}
                        size={80}
                        bgColor="#ffffff"
                        fgColor="#141313"
                      />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                        Your page
                      </div>
                      <div className="font-mono text-sm truncate">fyora.app/{cleanHandle}</div>
                      <CopyButton
                        value={`https://fyora.app/${cleanHandle}`}
                        label="Copy link"
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex gap-2 justify-center">
                    <Link
                      to="/$handle"
                      params={{ handle: cleanHandle }}
                      className="rounded-full bg-card chunky shadow-sticker px-5 py-3 font-semibold press"
                    >
                      View page →
                    </Link>
                    <Link
                      to="/dashboard"
                      className="rounded-full bg-ink text-paper chunky shadow-sticker px-5 py-3 font-semibold press"
                    >
                      Go to dashboard
                    </Link>
                  </div>
                </div>
              </StepBox>
            )}
          </AnimatePresence>

          {step < 3 && (
            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={() => setStep(Math.max(0, step - 1))}
                disabled={step === 0}
                className="inline-flex items-center gap-1 rounded-full bg-card chunky shadow-sticker-sm px-4 py-2 font-semibold press disabled:opacity-40"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              {step < 2 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={!canNext}
                  className="inline-flex items-center gap-1 rounded-full bg-ink text-paper chunky shadow-sticker px-5 py-2.5 font-semibold press disabled:opacity-40"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={done}
                  disabled={!canNext || publishing}
                  className="inline-flex items-center gap-1 rounded-full bg-lime text-ink chunky shadow-sticker px-5 py-2.5 font-semibold press disabled:opacity-40"
                >
                  Publish page ✨
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepBox({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
    >
      {children}
    </motion.div>
  );
}
