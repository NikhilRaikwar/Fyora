import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/kivo/Header";
import { EmojiAvatar } from "@/components/kivo/EmojiAvatar";
import { ChainBadge, TokenBadge } from "@/components/kivo/Badges";
import { Sticker } from "@/components/kivo/Sticker";
import { listPublicCreatorsFn } from "@/lib/fyora/server-functions";
import { ArrowRight, Search } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/explore")({
  loader: async () => {
    try {
      return await listPublicCreatorsFn();
    } catch {
      return [];
    }
  },
  head: () => ({
    meta: [
      { title: "Explore Creators — Fyora" },
      {
        name: "description",
        content: "Discover creators building on Fyora and support them from any chain.",
      },
      { property: "og:title", content: "Explore Creators — Fyora" },
      { property: "og:description", content: "Support creators from any chain in a tap." },
    ],
  }),
  component: Explore,
});

function Explore() {
  const [q, setQ] = useState("");
  const creators = Route.useLoaderData();
  const filtered = creators.filter(
    (c) =>
      c.handle.toLowerCase().includes(q.toLowerCase()) ||
      c.name.toLowerCase().includes(q.toLowerCase()) ||
      c.bio.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Header />
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-12 pb-8">
        <Sticker color="lilac" rotate={-3}>
          The directory
        </Sticker>
        <h1 className="font-display text-6xl italic mt-3">Meet the creators.</h1>
        <p className="text-muted-foreground mt-2 max-w-lg">
          Indie hackers, artists, streamers, and open-source heroes. Send them a little something.
        </p>

        <div className="mt-8 max-w-md flex items-center gap-2 rounded-full bg-card chunky shadow-sticker px-4 py-2.5">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search creators…"
            className="flex-1 bg-transparent outline-none"
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((c, i) => {
            const total = c.payments.reduce((s, p) => s + p.amountUsd, 0);
            return (
              <Link
                key={c.handle}
                to="/$handle"
                params={{ handle: c.handle }}
                className="group rounded-3xl bg-card chunky-thick shadow-sticker-lg p-5 press block relative"
                style={{ transform: `rotate(${i % 3 === 0 ? 0.6 : i % 3 === 1 ? -0.4 : 0.2}deg)` }}
              >
                <div className="flex items-start justify-between">
                  <EmojiAvatar
                    emoji={c.emoji}
                    gradient={c.gradient}
                    avatarUrl={c.avatarUrl}
                    size={64}
                  />
                  <ChainBadge id={c.settlement.chain} />
                </div>
                <div className="mt-4 font-display text-3xl italic leading-tight">{c.name}</div>
                <div className="text-sm text-muted-foreground">@{c.handle}</div>
                <p className="mt-2 text-sm line-clamp-2 min-h-[2.5rem]">{c.bio}</p>
                <div className="mt-4 flex items-center justify-between pt-4 border-t-2 border-dashed border-ink/20">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      Received
                    </div>
                    <div className="font-display italic text-xl">${total}</div>
                  </div>
                  <div className="inline-flex items-center gap-1 text-sm font-semibold">
                    View <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            No one by that name yet.{" "}
            <Link to="/onboard" className="underline">
              Claim it?
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
