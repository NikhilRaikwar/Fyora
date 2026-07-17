import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { chainById, tokenById } from "@/lib/fyora/chains";
import type { Creator } from "@/lib/fyora/types";
import { useFyoraAuth } from "@/lib/fyora/AuthProvider";
import { loadPrimaryAssetsFn } from "@/lib/fyora/particle-functions";
import {
  createPaymentIntentFn,
  recordPaymentSubmissionFn,
  refreshPaymentFn,
} from "@/lib/fyora/server-functions";
import { EmojiAvatar } from "./EmojiAvatar";
import { ChainBadge, TokenBadge } from "./Badges";
import { Sticker } from "./Sticker";
import { ArrowRight, Check, ExternalLink, Loader2, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { installBrowserPolyfills } from "@/lib/fyora/browser-polyfills";
import { useParticleSender } from "@/lib/fyora/useParticleSender";

type Step = "confirm" | "connect" | "balance" | "signing" | "receipt";
type BalanceItem = { chain: string; token: string; amount: number; amountInUSD: number };

installBrowserPolyfills();

const SUPPORTER_EMOJIS = ["🦊", "🐳", "🦁", "🐸", "🌻", "🚀", "✨", "🐧", "🌊", "🌟"];

export function PaymentSheet({
  creator,
  open,
  onOpenChange,
  amount,
  note,
}: {
  creator: Creator;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  amount: number;
  note: string;
}) {
  const [step, setStep] = useState<Step>("confirm");
  const [email, setEmail] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [signIdx, setSignIdx] = useState(0);
  const [txId, setTxId] = useState("");
  const [universalxUrl, setUniversalxUrl] = useState("");
  const [balances, setBalances] = useState<BalanceItem[]>([]);
  const [unifiedTotal, setUnifiedTotal] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [supporterEmoji, setSupporterEmoji] = useState(SUPPORTER_EMOJIS[0]);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const { identity, refreshIdentity, signInWithEmail, ensureEip7702Delegated } = useFyoraAuth();
  const { sendTransfer } = useParticleSender();
  const router = useRouter();

  const chain = chainById(creator.settlement.chain);
  const token = tokenById(creator.settlement.token);
  const signingSteps = useMemo(
    () => [
      "Confirming with Magic...",
      "Routing across chains...",
      `Bridging to ${chain.name}...`,
      `Landing ${token.symbol}...`,
    ],
    [chain.name, token.symbol],
  );
  const routeSource = useMemo(
    () =>
      balances.find(
        (balance) => balance.token === creator.settlement.token && balance.amountInUSD > 0,
      ) ??
      balances.find((balance) => balance.token === "usdc" && balance.amountInUSD > 0) ??
      balances[0],
    [balances, creator.settlement.token],
  );
  const crossChainRoute = Boolean(routeSource && routeSource.chain !== creator.settlement.chain);

  useEffect(() => {
    if (open) {
      setSupporterEmoji(SUPPORTER_EMOJIS[Math.floor(Math.random() * SUPPORTER_EMOJIS.length)]);
      setIdempotencyKey(crypto.randomUUID());
      return;
    }
    const timer = setTimeout(() => {
      setStep("confirm");
      setEmail("");
      setConnecting(false);
      setSignIdx(0);
      setTxId("");
      setUniversalxUrl("");
      setBalances([]);
      setUnifiedTotal(0);
      setConfirmed(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [open]);

  const loadBalance = async (didToken: string) => {
    const response = await loadPrimaryAssetsFn({ data: { didToken } });
    setUnifiedTotal(response.totalAmountInUSD);
    setBalances(
      response.assets.flatMap((asset) =>
        asset.chainAggregation
          .filter((entry) => entry.amount > 0)
          .map((entry) => ({
            chain: chainById(String(entry.token.chainId)).id,
            token: String(entry.token.type ?? entry.token.assetId).toLowerCase(),
            amount: entry.amount,
            amountInUSD: entry.amountInUSD,
          })),
      ),
    );
  };

  const handleContinue = async () => {
    if (!identity) {
      setStep("connect");
      return;
    }
    setConnecting(true);
    try {
      await loadBalance(identity.didToken);
      setStep("balance");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load Universal Balance.");
    } finally {
      setConnecting(false);
    }
  };

  const handleEmailLogin = async () => {
    setConnecting(true);
    try {
      await signInWithEmail(email);
      toast.success("Complete sign-in in the Magic modal.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Magic sign-in failed.");
    } finally {
      setConnecting(false);
    }
  };

  useEffect(() => {
    if (!open || step !== "connect" || !identity || connecting) return;
    let cancelled = false;
    setConnecting(true);
    loadBalance(identity.didToken)
      .then(() => {
        if (!cancelled) setStep("balance");
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Could not load Universal Balance.");
        }
      })
      .finally(() => {
        if (!cancelled) setConnecting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [connecting, identity, open, step]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && step === "signing") return;
    onOpenChange(nextOpen);
  };

  const keepOpenWhileSigning = (event: Event) => {
    if (step === "signing") event.preventDefault();
  };

  const pollUntilSettled = async (intentId: string, didToken: string) => {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const result = await refreshPaymentFn({ data: { didToken, intentId } });
      if (["confirmed", "refunded", "failed"].includes(result.status)) return result;
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    return null;
  };

  const handleSend = async () => {
    if (!identity) {
      setStep("connect");
      return;
    }
    setStep("signing");
    setSignIdx(0);
    try {
      const currentIdentity = await refreshIdentity();
      await ensureEip7702Delegated(currentIdentity.evmAddress);
      const intent = await createPaymentIntentFn({
        data: {
          didToken: currentIdentity.didToken,
          handle: creator.handle,
          amountUsd: amount,
          note: note || undefined,
          supporterEmoji,
          idempotencyKey,
        },
      });
      setSignIdx(1);
      const { result: submitted } = await sendTransfer({
        chainId: intent.destination.chainId,
        tokenAddress: intent.destination.tokenAddress,
        amount: String(intent.amountUsd),
        receiver: intent.destination.address,
      });
      setTxId(submitted.transactionId);
      setSignIdx(2);
      const recorded = await recordPaymentSubmissionFn({
        data: {
          didToken: currentIdentity.didToken,
          intentId: intent.id,
          transactionId: submitted.transactionId,
        },
      });
      setUniversalxUrl(recorded.universalxUrl ?? "");
      setSignIdx(3);
      const settled = await pollUntilSettled(intent.id, currentIdentity.didToken);
      if (settled?.status === "failed" || settled?.status === "refunded") {
        throw new Error(`Particle transaction ${settled.status}.`);
      }
      setConfirmed(settled?.status === "confirmed");
      setUniversalxUrl(settled?.universalxUrl ?? recorded.universalxUrl ?? "");
      setStep("receipt");
      if (settled?.status === "confirmed") {
        await router.invalidate();
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.5 },
          colors: ["#C6F24E", "#FF6B4A", "#B8A6FF", "#FFD166"],
        });
      }
    } catch (error) {
      console.error("[Fyora] Payment submission failed", error);
      toast.error(error instanceof Error ? error.message : "Payment could not be submitted.");
      setStep("balance");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={step !== "signing"}>
      <DialogContent
        onEscapeKeyDown={keepOpenWhileSigning}
        onInteractOutside={keepOpenWhileSigning}
        onPointerDownOutside={keepOpenWhileSigning}
        className="w-[calc(100vw-1.5rem)] sm:w-full max-w-md p-0 gap-0 chunky rounded-3xl shadow-sticker-lg overflow-hidden bg-card border-ink"
      >
        <DialogTitle className="sr-only">Support {creator.name}</DialogTitle>

        <div className="px-4 sm:px-6 pt-5 sm:pt-6 pb-4 border-b-2 border-ink bg-paper flex items-center gap-3">
          <EmojiAvatar emoji={creator.emoji} gradient={creator.gradient} size={44} />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] sm:text-xs uppercase font-bold text-muted-foreground tracking-wider">
              You're supporting
            </div>
            <div className="font-display italic text-xl sm:text-2xl leading-tight truncate">
              {creator.name}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl sm:text-3xl font-display italic">${amount}</div>
          </div>
        </div>

        <div className="p-4 sm:p-6 min-h-[380px]">
          <AnimatePresence mode="wait">
            {step === "confirm" && (
              <StepWrap key="confirm">
                <div className="space-y-4">
                  <div className="rounded-2xl chunky bg-secondary p-4">
                    <div className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-2">
                      Lands as
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <TokenBadge id={token.id} />
                      <ArrowRight className="w-4 h-4" />
                      <ChainBadge id={chain.id} />
                      <span className="font-mono text-xs text-muted-foreground ml-auto">
                        {creator.settlement.address}
                      </span>
                    </div>
                  </div>
                  {note && (
                    <div className="rounded-2xl chunky bg-butter/60 p-4 text-sm italic">
                      &quot;{note}&quot;
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground text-center">
                    No chain switching. No bridge. No gas math.
                  </div>
                  <button
                    onClick={handleContinue}
                    disabled={connecting}
                    className="w-full rounded-full bg-ink text-paper py-4 text-lg font-semibold chunky shadow-sticker press disabled:opacity-60"
                  >
                    {connecting ? "Loading balance..." : "Continue ->"}
                  </button>
                </div>
              </StepWrap>
            )}

            {step === "connect" && (
              <StepWrap key="connect">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-display italic text-2xl">Sign in to pay</h3>
                    <p className="text-sm text-muted-foreground">One click. No app to install.</p>
                  </div>
                  <div className="rounded-2xl chunky bg-lilac/30 p-4">
                    <label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
                      Email
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@somewhere.com"
                        className="flex-1 bg-transparent outline-none text-base"
                      />
                    </div>
                  </div>
                  <button
                    disabled={connecting || !email}
                    onClick={handleEmailLogin}
                    className="w-full rounded-full bg-lime text-ink py-4 font-semibold chunky shadow-sticker press flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {connecting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Opening Magic...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" /> Continue with Magic
                      </>
                    )}
                  </button>
                </div>
              </StepWrap>
            )}

            {step === "balance" && (
              <StepWrap key="balance">
                <div className="space-y-4">
                  <div className="rounded-2xl chunky bg-lime/40 p-4 text-center relative overflow-hidden">
                    <div className="text-xs uppercase font-bold tracking-wider">
                      Your unified balance
                    </div>
                    <div className="font-display italic text-4xl sm:text-5xl mt-1">
                      ${unifiedTotal.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      across {new Set(balances.map((item) => item.chain)).size} chains - spend it
                      anywhere
                    </div>
                    <div className="absolute -right-4 -top-4 rotate-12">
                      <Sticker color="ink" rotate={12}>
                        Universal
                      </Sticker>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {balances.map((balance) => (
                      <div
                        key={`${balance.chain}:${balance.token}`}
                        className="flex items-center justify-between rounded-xl chunky bg-card px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <ChainBadge id={balance.chain} />
                          <TokenBadge id={balance.token} size="sm" />
                        </div>
                        <div className="text-sm font-mono">
                          {balance.amount.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-2xl chunky bg-secondary p-3 flex items-center gap-2 text-sm">
                    <span className="font-semibold">Route:</span>
                    <TokenBadge id={routeSource?.token ?? "usdc"} size="sm" />
                    <ChainBadge id={routeSource?.chain ?? "base"} size="sm" />
                    <ArrowRight className="w-3 h-3" />
                    <TokenBadge id={creator.settlement.token} size="sm" />
                    <ChainBadge id={creator.settlement.chain} size="sm" />
                  </div>
                  {crossChainRoute && (
                    <p className="text-xs text-muted-foreground">
                      Cross-chain routes need extra Particle routing buffer. If quote fails, add
                      more Base USDC/ETH or test a smaller amount.
                    </p>
                  )}
                  <button
                    onClick={handleSend}
                    disabled={unifiedTotal < amount || !idempotencyKey}
                    className="w-full rounded-full bg-ink text-paper py-4 text-lg font-semibold chunky shadow-sticker press disabled:opacity-60"
                  >
                    {unifiedTotal < amount ? "Insufficient balance" : `Sign & send $${amount} ->`}
                  </button>
                </div>
              </StepWrap>
            )}

            {step === "signing" && (
              <StepWrap key="signing">
                <div className="flex flex-col items-center justify-center h-full space-y-6 py-8">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-20 h-20 rounded-full bg-lime chunky shadow-sticker-lg flex items-center justify-center text-4xl"
                  >
                    ⚡
                  </motion.div>
                  <div className="w-full space-y-2">
                    {signingSteps.map((label, index) => (
                      <div
                        key={label}
                        className={`flex items-center gap-2 text-sm transition-opacity ${index <= signIdx ? "opacity-100" : "opacity-30"}`}
                      >
                        {index < signIdx ? (
                          <Check className="w-4 h-4 text-lime" strokeWidth={3} />
                        ) : index === signIdx ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-current opacity-40" />
                        )}
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              </StepWrap>
            )}

            {step === "receipt" && (
              <StepWrap key="receipt">
                <div className="space-y-4 text-center">
                  <motion.div
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 12 }}
                    className="mx-auto w-24 h-24 rounded-full bg-lime chunky shadow-sticker-lg flex items-center justify-center"
                  >
                    <Check className="w-12 h-12 text-ink" strokeWidth={3} />
                  </motion.div>
                  <div>
                    <h3 className="font-display italic text-3xl">
                      {confirmed ? "Sent!" : "Submitted!"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {confirmed
                        ? `$${amount} landed for ${creator.name}`
                        : `$${amount} is still settling for ${creator.name}`}
                    </p>
                  </div>
                  <div className="rounded-2xl chunky bg-secondary p-3 text-left text-xs font-mono break-all">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1 font-sans">
                      Particle transaction
                    </div>
                    {txId}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        universalxUrl && window.open(universalxUrl, "_blank", "noopener,noreferrer")
                      }
                      disabled={!universalxUrl}
                      className="flex-1 rounded-full bg-ink text-paper py-3 font-semibold chunky shadow-sticker-sm press inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
                    >
                      <ExternalLink className="w-4 h-4" /> UniversalX
                    </button>
                    <button
                      onClick={() => onOpenChange(false)}
                      className="flex-1 rounded-full bg-card py-3 font-semibold chunky shadow-sticker-sm press"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </StepWrap>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepWrap({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.22 }}
    >
      {children}
    </motion.div>
  );
}
