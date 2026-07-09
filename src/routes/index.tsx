import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/kivo/Header";
import { WigglyDivider } from "@/components/kivo/WigglyDivider";
import { Sticker } from "@/components/kivo/Sticker";
import { FloatingCoins } from "@/components/kivo/FloatingCoins";
import { EmojiAvatar } from "@/components/kivo/EmojiAvatar";
import { motion } from "motion/react";
import { useState } from "react";
import { SEED_CREATORS } from "@/lib/mock/creators";
import { ChainBadge } from "@/components/kivo/Badges";
import { ArrowRight, Zap, Globe2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fyora — Get paid from anywhere, land anywhere" },
      { name: "description", content: "Fyora is the playful creator money page for chain-abstracted payments. One link. Any chain. Instant support." },
      { property: "og:title", content: "Fyora — Get paid from anywhere" },
      { property: "og:description", content: "One link. Any chain. Instant support for creators." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [handle, setHandle] = useState("");
  const navigate = useNavigate();
  const clean = handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Header />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-paper" />
        <FloatingCoins />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 pt-10 sm:pt-16 pb-16 sm:pb-24 text-center">
          <Sticker color="coral" rotate={-6} className="mb-6">
            <Sparkles className="inline w-3 h-3 -mt-0.5 mr-1" />
            Powered by Particle Universal Accounts
          </Sticker>
          <h1 className="font-display text-5xl sm:text-7xl md:text-8xl leading-[0.95] tracking-tight">
            Get paid from{" "}
            <span className="italic relative inline-block">
              anywhere
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" preserveAspectRatio="none">
                <path d="M2 8 Q 50 -2 100 6 T 198 6" stroke="#C6F24E" strokeWidth="8" fill="none" strokeLinecap="round" />
              </svg>
            </span>
            ,<br className="hidden sm:block" /> land <span className="italic">wherever</span> you like.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
            One link. Any chain. Your supporters pay in a tap — you receive on the
            chain you love.
          </p>

          {/* handle claim */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (clean) navigate({ to: "/onboard", search: { h: clean } as any });
              else navigate({ to: "/onboard" });
            }}
            className="mt-10 mx-auto max-w-lg"
          >
            <div className="flex items-center gap-0 bg-card chunky-thick shadow-sticker-lg rounded-full pl-5 pr-1.5 py-1.5">
              <span className="text-muted-foreground font-mono text-sm sm:text-base whitespace-nowrap">
                fyora.app/
              </span>
              <input
                autoFocus
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="yourname"
                className="flex-1 bg-transparent outline-none py-3 text-base sm:text-lg font-semibold min-w-0"
              />
              <button
                type="submit"
                className="rounded-full bg-lime text-ink px-5 py-3 font-semibold chunky shadow-sticker-sm press whitespace-nowrap"
              >
                Claim →
              </button>
            </div>
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-lime border border-ink" />
              free forever · no wallet needed to start
            </div>
          </form>

          {/* creator marquee */}
          <div className="mt-14">
            <div className="text-xs uppercase font-bold tracking-wider text-muted-foreground mb-3">
              Creators already on Fyora
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {SEED_CREATORS.slice(0, 6).map((c, i) => (
                <Link
                  key={c.handle}
                  to="/$handle"
                  params={{ handle: c.handle }}
                  className="group flex items-center gap-2 rounded-full bg-card chunky shadow-sticker-sm pl-1 pr-4 py-1 press"
                  style={{ transform: `rotate(${(i % 2 ? -1 : 1) * (1 + (i % 3))}deg)` }}
                >
                  <EmojiAvatar emoji={c.emoji} gradient={c.gradient} size={32} />
                  <span className="font-semibold">@{c.handle}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
        <WigglyDivider />
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-10 sm:mb-14">

          <Sticker color="lilac" rotate={2}>How it works</Sticker>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl italic mt-4">
            Three taps. No chain-picker in sight.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              n: "01",
              t: "Claim your handle",
              d: "Pick a name, add a bio and an emoji. Share the link like a Linktree.",
              color: "bg-lime",
              icon: <Globe2 className="w-8 h-8" />,
            },
            {
              n: "02",
              t: "Set where you land",
              d: "Choose your favorite chain and token. Arbitrum + USDC by default.",
              color: "bg-lilac",
              icon: <ChainBadge id="arbitrum" />,
            },
            {
              n: "03",
              t: "Get paid, anywhere",
              d: "Supporters tap Support and pay from any chain. You receive on yours.",
              color: "bg-coral",
              icon: <Zap className="w-8 h-8" />,
            },
          ].map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ delay: i * 0.1, type: "spring", stiffness: 120, damping: 16 }}
              className="rounded-3xl chunky-thick shadow-sticker-lg bg-card p-6 relative"
            >
              <div className={`w-14 h-14 rounded-2xl ${s.color} chunky shadow-sticker-sm flex items-center justify-center mb-4`}>
                {s.icon}
              </div>
              <div className="font-mono text-xs text-muted-foreground">{s.n}</div>
              <h3 className="font-display text-3xl italic mt-1">{s.t}</h3>
              <p className="text-muted-foreground mt-2">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* PREVIEW STRIP */}
      <section className="relative py-16 sm:py-24 bg-ink text-paper overflow-hidden">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-8 sm:mb-10">
            <div>
              <Sticker color="lime" rotate={-3}>Explore</Sticker>
              <h2 className="font-display text-4xl sm:text-5xl italic mt-3">Peek at real Fyora pages</h2>

            </div>
            <Link
              to="/explore"
              className="inline-flex items-center gap-1 rounded-full bg-paper text-ink px-5 py-3 font-semibold chunky shadow-sticker press"
            >
              See all creators <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {SEED_CREATORS.slice(0, 4).map((c) => (
              <Link
                key={c.handle}
                to="/$handle"
                params={{ handle: c.handle }}
                className="rounded-3xl bg-paper text-ink p-4 chunky-thick shadow-sticker-lg press"
              >
                <EmojiAvatar emoji={c.emoji} gradient={c.gradient} size={56} />
                <div className="mt-3 font-display italic text-2xl leading-tight">{c.name}</div>
                <div className="text-xs text-muted-foreground">@{c.handle}</div>
                <p className="text-sm mt-2 line-clamp-2">{c.bio}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 py-16 sm:py-24 text-center">
        <h2 className="font-display text-4xl sm:text-6xl md:text-7xl italic leading-[1.05]">
          Your money page,<br /> ready in <span className="bg-lime px-3 rounded-2xl inline-block">60 seconds</span>.
        </h2>
        <Link
          to="/onboard"
          className="inline-block mt-8 sm:mt-10 rounded-full bg-ink text-paper px-6 sm:px-8 py-4 sm:py-5 text-base sm:text-lg font-semibold chunky-thick shadow-sticker-lg press"
        >
          Make my Fyora →
        </Link>
      </section>


      <footer className="border-t-2 border-ink py-8 text-center text-sm text-muted-foreground">
        Made with 💚 · Fyora · Powered by Particle Universal Accounts
      </footer>
    </div>
  );
}
