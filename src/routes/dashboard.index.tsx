import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/kivo/Header";
import { EmojiAvatar } from "@/components/kivo/EmojiAvatar";
import { ChainBadge, TokenBadge } from "@/components/kivo/Badges";
import { Sticker } from "@/components/kivo/Sticker";
import { Odometer } from "@/components/kivo/Odometer";
import { CopyButton } from "@/components/kivo/CopyButton";
import { HandleUrl } from "@/components/kivo/Logo";
import { QRCodeSVG } from "qrcode.react";
import { useKivo } from "@/lib/mock/store";
import { useHydrated } from "@/lib/mock/useHydrated";
import { chainById } from "@/lib/mock/chains";
import { ExternalLink, Eye, Pencil, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useMemo } from "react";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Fyora" },
      { name: "description", content: "Track supporters, share your page, and manage settlement." },
      { property: "og:title", content: "Dashboard — Fyora" },
      { property: "og:description", content: "Manage your Fyora money page." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const hydrated = useHydrated();
  const creator = useKivo((s) => s.creators[s.currentHandle]);
  const reset = useKivo((s) => s.resetDemo);

  const stats = useMemo(() => {
    if (!creator) return { total: 0, count: 0, avg: 0, topChain: "arbitrum", week: [] as number[] };
    const total = creator.payments.reduce((s, p) => s + p.amountUsd, 0);
    const count = creator.payments.length;
    const avg = count ? total / count : 0;
    const byChain: Record<string, number> = {};
    creator.payments.forEach((p) => (byChain[p.fromChain] = (byChain[p.fromChain] ?? 0) + p.amountUsd));
    const topChain = Object.entries(byChain).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "arbitrum";
    // fake week trend
    const week = [12, 18, 8, 24, 32, 16, Math.min(60, total / 5 + 20)];
    return { total, count, avg, topChain, week };
  }, [creator]);

  if (!hydrated || !creator) {
    return (
      <div className="min-h-screen bg-paper">
        <Header />
        <div className="mx-auto max-w-6xl px-4 py-16 text-center text-muted-foreground">
          Loading…
        </div>
      </div>
    );
  }

  const shareUrl = `https://fyora.app/${creator.handle}`;
  const max = Math.max(...stats.week);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Header />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        {/* Top row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <EmojiAvatar emoji={creator.emoji} gradient={creator.gradient} size={64} className="sm:!w-[72px] sm:!h-[72px]" />
            <div className="min-w-0">
              <Sticker color="lime" rotate={-3}>Your dashboard</Sticker>
              <h1 className="font-display italic text-3xl sm:text-5xl mt-2 truncate">Hi, {creator.name.split(" ")[0]}</h1>
              <div className="mt-1"><HandleUrl handle={creator.handle} tone="plain" size="md" /></div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              to="/$handle"
              params={{ handle: creator.handle }}
              className="inline-flex items-center gap-1 rounded-full bg-card chunky shadow-sticker-sm px-4 py-2 font-semibold press text-sm"
            >
              <Eye className="w-4 h-4" /> Preview
            </Link>
            <Link
              to="/dashboard/edit"
              className="inline-flex items-center gap-1 rounded-full bg-ink text-paper chunky shadow-sticker px-4 py-2 font-semibold press text-sm"
            >
              <Pencil className="w-4 h-4" /> Edit page
            </Link>
          </div>
        </div>


        {/* Stat cards */}
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total received" value={<Odometer value={stats.total} prefix="$" />} bg="bg-lime" />
          <StatCard label="Supporters" value={<Odometer value={stats.count} />} bg="bg-lilac" />
          <StatCard label="Avg tip" value={<Odometer value={stats.avg} prefix="$" decimals={2} />} bg="bg-butter" />
          <div className="rounded-3xl bg-coral chunky shadow-sticker p-5">
            <div className="text-xs uppercase font-bold tracking-wider">Top source</div>
            <div className="mt-3">
              <ChainBadge id={stats.topChain} />
            </div>
            <div className="text-xs mt-2 opacity-80">Most funds arriving from</div>
          </div>
        </div>

        {/* Row 2: Share + Trend */}
        <div className="mt-6 grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-3xl bg-card chunky-thick shadow-sticker-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display italic text-2xl sm:text-3xl">This week</h2>
              <div className="text-xs text-muted-foreground">last 7 days · demo data</div>
            </div>
            <div className="flex items-end gap-2 h-40">
              {stats.week.map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                  <div
                    className="w-full rounded-t-xl chunky bg-lime shadow-sticker-sm"
                    style={{ height: `${(v / max) * 100}%`, minHeight: 8 }}
                  />
                  <div className="text-[10px] text-muted-foreground">{["M","T","W","T","F","S","S"][i]}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-card chunky-thick shadow-sticker-lg p-6">
            <div className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
              Share your page
            </div>
            <div className="mt-3 flex items-start gap-4">
              <div className="bg-white p-2 rounded-xl chunky shadow-sticker-sm">
                <QRCodeSVG value={shareUrl} size={90} bgColor="#ffffff" fgColor="#141313" />
              </div>
              <div className="flex-1 min-w-0">
                <HandleUrl handle={creator.handle} tone="plain" size="md" />
                <div className="mt-2 flex flex-wrap gap-2">
                  <CopyButton value={shareUrl} label="Copy link" />
                  <button
                    onClick={() => toast("Shared!", { icon: "🚀" })}
                    className="inline-flex items-center gap-1 rounded-full bg-card chunky shadow-sticker-sm px-3 py-1.5 text-sm font-semibold press"
                  >
                    Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Settlement */}
        <div className="mt-6 rounded-3xl bg-card chunky-thick shadow-sticker-lg p-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-display italic text-2xl sm:text-3xl">Settlement</h2>
              <p className="text-sm text-muted-foreground">Where funds land, always.</p>
            </div>
            <Link
              to="/dashboard/edit"
              className="inline-flex items-center gap-1 rounded-full bg-card chunky shadow-sticker-sm px-3 py-1.5 text-sm font-semibold press"
            >
              <Pencil className="w-3 h-3" /> Change
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ChainBadge id={creator.settlement.chain} />
            <TokenBadge id={creator.settlement.token} />
            <span className="font-mono text-xs sm:text-sm bg-secondary chunky rounded-full px-3 py-1 max-w-full truncate">
              {creator.settlement.address}
            </span>
          </div>

        </div>

        {/* Payments table */}
        <div className="mt-6 rounded-3xl bg-card chunky-thick shadow-sticker-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display italic text-2xl sm:text-3xl">Recent payments</h2>
            <button
              onClick={() => {
                reset();
                toast("Demo data reset");
              }}
              className="inline-flex items-center gap-1 text-xs rounded-full bg-card chunky shadow-sticker-sm px-3 py-1.5 font-semibold press"
            >
              <RefreshCw className="w-3 h-3" /> Reset demo
            </button>
          </div>
          {creator.payments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No payments yet. Share your link!
            </div>
          ) : (
            <div className="divide-y-2 divide-dashed divide-ink/15">
              {creator.payments.map((p) => (
                <div key={p.id} className="py-3 flex items-center gap-3 flex-wrap">
                  <div className="w-9 h-9 rounded-full bg-secondary chunky flex items-center justify-center text-lg">
                    {p.supporterEmoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{p.supporterName}</div>
                    {p.note && <div className="text-xs text-muted-foreground italic truncate">"{p.note}"</div>}
                  </div>
                  <ChainBadge id={p.fromChain} size="sm" />
                  <span className="text-xs bg-lime chunky rounded-full px-2 py-0.5 font-semibold">
                    {p.status}
                  </span>
                  <span className="font-display italic text-xl sm:text-2xl w-16 sm:w-20 text-right">${p.amountUsd}</span>
                  <button
                    onClick={() => toast("Opening UniversalX…", { icon: "🚀" })}
                    className="w-8 h-8 rounded-full bg-card chunky shadow-sticker-sm flex items-center justify-center press"
                    title="View tx"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  bg,
}: {
  label: string;
  value: React.ReactNode;
  bg: string;
}) {
  return (
    <div className={`rounded-3xl ${bg} chunky shadow-sticker p-5`}>
      <div className="text-xs uppercase font-bold tracking-wider">{label}</div>
      <div className="font-display italic text-3xl sm:text-4xl mt-1 truncate">{value}</div>
    </div>

  );
}
