import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/kivo/Header";
import { EmojiAvatar } from "@/components/kivo/EmojiAvatar";
import { ChainBadge, TokenBadge } from "@/components/kivo/Badges";
import { Sticker } from "@/components/kivo/Sticker";
import { Odometer } from "@/components/kivo/Odometer";
import { CopyButton } from "@/components/kivo/CopyButton";
import { WigglyDivider } from "@/components/kivo/WigglyDivider";
import { PaymentSheet } from "@/components/kivo/PaymentSheet";
import { getPublicCreatorFn } from "@/lib/fyora/server-functions";
import { useState } from "react";
import { motion } from "motion/react";
import { Github, Globe, Youtube, Instagram, ArrowRight, Heart } from "lucide-react";
import { HandleUrl } from "@/components/kivo/Logo";

export const Route = createFileRoute("/$handle")({
  loader: async ({ params }) => {
    try {
      return await getPublicCreatorFn({ data: { handle: params.handle } });
    } catch {
      return null;
    }
  },
  head: ({ params, loaderData }) => {
    const baseUrl = "https://www.fyora.app";
    const handle = (params.handle ?? "").toLowerCase();
    const version = loaderData?.updatedAt ?? 1;
    const ogImage = `${baseUrl}/api/public/og/${encodeURIComponent(handle)}.png?v=${version}`;
    return {
      meta: [
        { title: `Support @${params.handle} on Fyora` },
        { name: "description", content: `Send a tip to @${params.handle} from any chain.` },
        { property: "og:title", content: `Support @${params.handle} on Fyora` },
        {
          property: "og:description",
          content: `Send a tip from any chain. Lands where they want.`,
        },
        { property: "og:url", content: `${baseUrl}/${params.handle}` },
        { property: "og:type", content: "profile" },
        { property: "og:image", content: ogImage },
        { property: "og:image:secure_url", content: ogImage },
        { property: "og:image:type", content: "image/png" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: `Fyora payment card for @${handle}` },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: ogImage },
        { name: "twitter:image:alt", content: `Fyora payment card for @${handle}` },
      ],
      links: [{ rel: "canonical", href: `${baseUrl}/${handle}` }],
    };
  },
  component: Public,
});

const AMOUNTS = [0.1, 1, 5, 10];

function socialIcon(kind: string) {
  const cls = "w-4 h-4";
  if (kind === "github") return <Github className={cls} />;
  if (kind === "youtube") return <Youtube className={cls} />;
  if (kind === "ig") return <Instagram className={cls} />;
  if (kind === "x") return <span className="font-bold text-sm">𝕏</span>;
  return <Globe className={cls} />;
}

function fmtAgo(ms: number) {
  const d = Date.now() - ms;
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Public() {
  const { handle } = Route.useParams();
  const creator = Route.useLoaderData();
  const [amount, setAmount] = useState<number>(0.1);
  const [custom, setCustom] = useState("");
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);

  if (!creator) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <Header />
        <div className="mx-auto max-w-md text-center py-24 px-4">
          <div className="text-6xl">🕵️</div>
          <h1 className="font-display italic text-4xl sm:text-5xl mt-4">Handle up for grabs</h1>
          <p className="text-muted-foreground mt-2">
            No one owns <HandleUrl handle={handle} tone="plain" size="md" /> yet.
          </p>
          <Link
            to="/onboard"
            search={{ h: handle } as Record<string, string>}
            className="mt-6 inline-block rounded-full bg-lime text-ink chunky shadow-sticker px-6 py-3 font-semibold press"
          >
            Claim this handle →
          </Link>
        </div>
      </div>
    );
  }

  const total = creator.payments.reduce((s, p) => s + p.amountUsd, 0);
  const finalAmount = custom ? Math.max(0.01, Number(Number(custom).toFixed(2))) || amount : amount;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Header />

      {/* Hero card */}
      <section className="relative">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${creator.gradient[0]}44, ${creator.gradient[1]}44)`,
          }}
        />
        <div className="relative mx-auto max-w-2xl px-4 sm:px-6 pt-12 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl bg-card chunky-thick shadow-sticker-lg p-6 sm:p-8"
          >
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <EmojiAvatar emoji={creator.emoji} gradient={creator.gradient} size={96} animate />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display italic text-4xl sm:text-5xl leading-none break-words">
                    {creator.name}
                  </h1>
                </div>

                <div className="mt-1">
                  <HandleUrl handle={creator.handle} size="md" />
                </div>
                <p className="mt-3 text-base">{creator.bio}</p>
                {creator.socials.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {creator.socials.map((s, i) => (
                      <a
                        key={i}
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="w-9 h-9 rounded-full bg-card chunky shadow-sticker-sm flex items-center justify-center press"
                      >
                        {socialIcon(s.kind)}
                      </a>
                    ))}
                    <CopyButton value={`https://fyora.app/${creator.handle}`} label="Share" />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Amount picker */}
      <section className="mx-auto max-w-2xl px-4 sm:px-6 pb-6">
        <div className="rounded-3xl bg-card chunky-thick shadow-sticker-lg p-6 sm:p-8">
          <div className="flex items-center justify-between mb-4">
            <Sticker color="lime">Send a tip</Sticker>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              lands as <TokenBadge id={creator.settlement.token} size="sm" /> on{" "}
              <ChainBadge id={creator.settlement.chain} size="sm" />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {AMOUNTS.map((a) => (
              <motion.button
                key={a}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setAmount(a);
                  setCustom("");
                }}
                className={`rounded-2xl chunky py-3 sm:py-4 font-display italic text-2xl sm:text-3xl press ${
                  amount === a && !custom ? "bg-lime shadow-sticker" : "bg-card shadow-sticker-sm"
                }`}
              >
                ${a}
              </motion.button>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2 bg-secondary chunky rounded-2xl px-4 py-3">
            <span className="text-muted-foreground text-lg">$</span>
            <input
              inputMode="decimal"
              value={custom}
              onChange={(e) => setCustom(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="Custom amount"
              className="flex-1 bg-transparent outline-none text-lg font-semibold"
            />
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Say something nice ✨ (optional)"
            rows={2}
            className="mt-3 w-full bg-secondary chunky rounded-2xl px-4 py-3 outline-none resize-none"
          />

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setOpen(true)}
            className="mt-4 w-full rounded-full bg-ink text-paper py-4 sm:py-5 text-base sm:text-xl font-semibold chunky-thick shadow-sticker-lg press inline-flex items-center justify-center gap-2"
          >
            <Heart className="w-5 h-5 shrink-0" />{" "}
            <span className="truncate">
              Support {creator.name.split(" ")[0]} · ${finalAmount}
            </span>
          </motion.button>

          <div className="mt-2 text-center text-xs text-muted-foreground">
            No account needed. Pay from any chain.
          </div>
        </div>
      </section>

      <WigglyDivider />

      {/* Stats */}
      <section className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-3xl bg-lime chunky shadow-sticker p-5">
            <div className="text-xs uppercase font-bold tracking-wider">Total received</div>
            <div className="font-display italic text-3xl sm:text-5xl mt-1 truncate">
              <Odometer value={total} prefix="$" />
            </div>
          </div>
          <div className="rounded-3xl bg-lilac chunky shadow-sticker p-5">
            <div className="text-xs uppercase font-bold tracking-wider">Supporters</div>
            <div className="font-display italic text-3xl sm:text-5xl mt-1 truncate">
              <Odometer value={creator.payments.length} />
            </div>
          </div>
        </div>
      </section>

      {/* Supporter wall */}
      <section className="mx-auto max-w-2xl px-4 sm:px-6 pb-24">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display italic text-3xl">Recent supporters</h2>
          <span className="text-xs text-muted-foreground">💌</span>
        </div>
        <div className="space-y-3">
          {creator.payments.length === 0 && (
            <div className="rounded-2xl bg-card chunky shadow-sticker-sm p-6 text-center text-muted-foreground">
              Be the first to send some love ✨
            </div>
          )}
          {creator.payments.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-card chunky shadow-sticker-sm p-4 flex items-start gap-3"
            >
              <div className="w-11 h-11 rounded-full bg-secondary chunky flex items-center justify-center text-xl">
                {p.supporterEmoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{p.supporterName}</span>
                  <span className="text-muted-foreground text-xs">·</span>
                  <span className="text-xs text-muted-foreground">{fmtAgo(p.createdAt)}</span>
                  <span className="ml-auto font-display italic text-2xl">${p.amountUsd}</span>
                </div>
                {p.note && <div className="text-sm mt-1 italic">"{p.note}"</div>}
                <div className="mt-2 flex items-center gap-1">
                  <ChainBadge id={p.fromChain} size="sm" />
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <ChainBadge id={creator.settlement.chain} size="sm" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="inline-block rotate-[-2deg]">
            <Sticker color="coral">Powered by Fyora</Sticker>
          </div>
        </div>
      </section>

      <PaymentSheet
        creator={creator}
        open={open}
        onOpenChange={setOpen}
        amount={finalAmount}
        note={note}
      />
    </div>
  );
}
