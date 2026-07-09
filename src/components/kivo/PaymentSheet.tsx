import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { CHAINS, chainById, tokenById } from "@/lib/mock/chains";
import type { Creator, Payment } from "@/lib/mock/creators";
import { useKivo } from "@/lib/mock/store";
import { EmojiAvatar } from "./EmojiAvatar";
import { ChainBadge, TokenBadge } from "./Badges";
import { Sticker } from "./Sticker";
import { ArrowRight, Check, Loader2, Mail, Wallet, Sparkles, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Step = "confirm" | "connect" | "balance" | "signing" | "receipt";

const BALANCES = [
  { chain: "base", token: "usdc", amount: 148.22 },
  { chain: "optimism", token: "usdc", amount: 62.5 },
  { chain: "polygon", token: "usdt", amount: 40.1 },
  { chain: "ethereum", token: "eth", amount: 0.048 },
  { chain: "solana", token: "sol", amount: 3.21 },
];
const UNIFIED_TOTAL = 298.14;

const SIGNING_STEPS = [
  "Signing EIP-7702 authorization…",
  "Routing across chains…",
  "Bridging to Arbitrum…",
  "Landing funds…",
];

const SUPPORTER_EMOJIS = ["🦊", "🐳", "🦁", "🐸", "🌻", "🚀", "✨", "🐧", "🌊", "🌟"];

function mkTx() {
  return (
    "0x" +
    Array.from({ length: 40 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")
  );
}

export function PaymentSheet({
  creator,
  open,
  onOpenChange,
  amount,
  note,
}: {
  creator: Creator;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  amount: number;
  note: string;
}) {
  const [step, setStep] = useState<Step>("confirm");
  const [email, setEmail] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [signIdx, setSignIdx] = useState(0);
  const [txId, setTxId] = useState<string>("");
  const addPayment = useKivo((s) => s.addPayment);

  const chain = chainById(creator.settlement.chain);
  const token = tokenById(creator.settlement.token);

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep("confirm");
        setEmail("");
        setConnecting(false);
        setSignIdx(0);
        setTxId("");
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (step !== "signing") return;
    setSignIdx(0);
    const interval = setInterval(() => {
      setSignIdx((i) => {
        if (i >= SIGNING_STEPS.length - 1) {
          clearInterval(interval);
          setTimeout(() => {
            const id = mkTx();
            setTxId(id);
            const p: Payment = {
              id: "px" + Date.now(),
              amountUsd: amount,
              supporterName: email ? email.split("@")[0] : "Anon",
              supporterEmoji: SUPPORTER_EMOJIS[Math.floor(Math.random() * SUPPORTER_EMOJIS.length)],
              fromChain: "base",
              fromToken: "usdc",
              note: note || undefined,
              txId: id,
              createdAt: Date.now(),
              status: "confirmed",
            };
            addPayment(creator.handle, p);
            setStep("receipt");
            confetti({
              particleCount: 120,
              spread: 80,
              origin: { y: 0.5 },
              colors: ["#C6F24E", "#FF6B4A", "#B8A6FF", "#FFD166"],
            });
          }, 500);
          return i;
        }
        return i + 1;
      });
    }, 700);
    return () => clearInterval(interval);
  }, [step, amount, note, email, addPayment, creator.handle]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full max-w-md p-0 gap-0 chunky rounded-3xl shadow-sticker-lg overflow-hidden bg-card border-ink">
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
                      "{note}"
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground text-center">
                    ✨ No chain switching. No bridge. No gas math.
                  </div>
                  <button
                    onClick={() => setStep("connect")}
                    className="w-full rounded-full bg-ink text-paper py-4 text-lg font-semibold chunky shadow-sticker press"
                  >
                    Continue →
                  </button>
                </div>
              </StepWrap>
            )}

            {step === "connect" && (
              <StepWrap key="connect">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-display italic text-2xl">Sign in to pay</h3>
                    <p className="text-sm text-muted-foreground">
                      One click. No app to install.
                    </p>
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
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@somewhere.com"
                        className="flex-1 bg-transparent outline-none text-base"
                      />
                    </div>
                  </div>

                  <button
                    disabled={connecting || !email}
                    onClick={() => {
                      setConnecting(true);
                      setTimeout(() => {
                        setConnecting(false);
                        setStep("balance");
                      }, 1400);
                    }}
                    className="w-full rounded-full bg-lime text-ink py-4 font-semibold chunky shadow-sticker press flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {connecting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Magic-linking…
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" /> Continue with Magic
                      </>
                    )}
                  </button>

                  <div className="text-center text-xs text-muted-foreground">or</div>

                  <button
                    onClick={() => {
                      setConnecting(true);
                      setTimeout(() => {
                        setConnecting(false);
                        setStep("balance");
                      }, 900);
                    }}
                    className="w-full rounded-full bg-card py-3 font-semibold chunky shadow-sticker-sm press flex items-center justify-center gap-2"
                  >
                    <Wallet className="w-4 h-4" /> Continue with wallet
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
                      ${UNIFIED_TOTAL.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      across {BALANCES.length} chains — spend it anywhere
                    </div>
                    <div className="absolute -right-4 -top-4 rotate-12">
                      <Sticker color="ink" rotate={12}>Universal</Sticker>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {BALANCES.map((b) => (
                      <div
                        key={b.chain}
                        className="flex items-center justify-between rounded-xl chunky bg-card px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <ChainBadge id={b.chain} />
                          <TokenBadge id={b.token} size="sm" />
                        </div>
                        <div className="text-sm font-mono">
                          {b.amount.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl chunky bg-secondary p-3 flex items-center gap-2 text-sm">
                    <span className="font-semibold">Route:</span>
                    <TokenBadge id="usdc" size="sm" />
                    <ChainBadge id="base" size="sm" />
                    <ArrowRight className="w-3 h-3" />
                    <TokenBadge id={creator.settlement.token} size="sm" />
                    <ChainBadge id={creator.settlement.chain} size="sm" />
                  </div>

                  <button
                    onClick={() => setStep("signing")}
                    className="w-full rounded-full bg-ink text-paper py-4 text-lg font-semibold chunky shadow-sticker press"
                  >
                    Sign & send ${amount} →
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
                    {SIGNING_STEPS.map((s, i) => (
                      <div
                        key={s}
                        className={`flex items-center gap-2 text-sm transition-opacity ${
                          i <= signIdx ? "opacity-100" : "opacity-30"
                        }`}
                      >
                        {i < signIdx ? (
                          <Check className="w-4 h-4 text-lime" strokeWidth={3} />
                        ) : i === signIdx ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-current opacity-40" />
                        )}
                        {s}
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
                    <h3 className="font-display italic text-3xl">Sent!</h3>
                    <p className="text-sm text-muted-foreground">
                      ${amount} landed for {creator.name}
                    </p>
                  </div>
                  <div className="rounded-2xl chunky bg-secondary p-3 text-left text-xs font-mono break-all">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1 font-sans">
                      Transaction
                    </div>
                    {txId}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        toast("Opening UniversalX…", { icon: "🚀" });
                      }}
                      className="flex-1 rounded-full bg-ink text-paper py-3 font-semibold chunky shadow-sticker-sm press inline-flex items-center justify-center gap-1.5"
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

function StepWrap({ children }: { children: React.ReactNode }) {
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
