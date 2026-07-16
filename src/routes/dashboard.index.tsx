import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/kivo/Header";
import { EmojiAvatar } from "@/components/kivo/EmojiAvatar";
import { ChainBadge, TokenBadge } from "@/components/kivo/Badges";
import { Sticker } from "@/components/kivo/Sticker";
import { Odometer } from "@/components/kivo/Odometer";
import { CopyButton } from "@/components/kivo/CopyButton";
import { HandleUrl } from "@/components/kivo/Logo";
import { QRCodeSVG } from "qrcode.react";
import { AuthLoginCard } from "@/components/kivo/AuthLoginCard";
import { useCurrentCreator } from "@/lib/fyora/hooks";
import { loadUniversalAccountAddresses } from "@/lib/fyora/particle";
import {
  refreshCreatorPaymentsFn,
  refreshCreatorSettlementFn,
  refreshCreatorShareCardFn,
} from "@/lib/fyora/server-functions";
import { chainById } from "@/lib/fyora/chains";
import { Download, ExternalLink, Eye, Pencil, RefreshCw, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: "Dashboard - Fyora" },
      { name: "description", content: "Track supporters, share your page, and manage settlement." },
      { property: "og:title", content: "Dashboard - Fyora" },
      { property: "og:description", content: "Manage your Fyora money page." },
    ],
  }),
  component: Dashboard,
});

const FALLBACK_QR_IMAGE = "https://www.fyora.app/fyora-favicon.png";

function Dashboard() {
  const { creator, identity, loading, isLoading, refreshIdentity, refetch } = useCurrentCreator();
  const [isCardLoading, setIsCardLoading] = useState(true);
  const [regeneratingCard, setRegeneratingCard] = useState(false);
  const [cardPreviewNonce, setCardPreviewNonce] = useState(0);
  const [refreshingSettlement, setRefreshingSettlement] = useState(false);
  const [refreshingPayments, setRefreshingPayments] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !identity) {
      navigate({ to: "/", replace: true });
    }
  }, [loading, identity, navigate]);

  const addressesQuery = useQuery({
    queryKey: ["particle-ua-addresses", identity?.evmAddress],
    queryFn: () => loadUniversalAccountAddresses(identity!.evmAddress),
    enabled: Boolean(identity?.evmAddress),
    retry: 1,
  });

  const stats = useMemo(() => {
    if (!creator) {
      return { total: 0, count: 0, avg: 0, topChain: null as string | null, week: [] as number[] };
    }
    const confirmedPayments = creator.payments.filter((payment) => payment.status === "confirmed");
    const total = confirmedPayments.reduce((s, p) => s + p.amountUsd, 0);
    const count = confirmedPayments.length;
    const avg = count ? total / count : 0;
    const byChain: Record<string, number> = {};
    confirmedPayments.forEach(
      (p) => (byChain[p.fromChain] = (byChain[p.fromChain] ?? 0) + p.amountUsd),
    );
    const topChain = Object.entries(byChain).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    const week = Array.from({ length: 7 }, () => 0);
    confirmedPayments.forEach((payment) => {
      const index = Math.floor((payment.createdAt - start.getTime()) / 86_400_000);
      if (index >= 0 && index < 7) week[index] += payment.amountUsd;
    });
    return { total, count, avg, topChain, week };
  }, [creator]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-paper">
        <Header />
        <div className="mx-auto max-w-6xl px-4 py-16 text-center text-muted-foreground">
          Loading...
        </div>
      </div>
    );
  }

  if (!identity) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <Header />
        <div className="px-4 py-16">
          <AuthLoginCard />
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <Header />
        <div className="px-4 py-16 text-center">
          <Link
            to="/onboard"
            className="rounded-full bg-lime chunky shadow-sticker px-5 py-3 font-semibold press"
          >
            Claim your page
          </Link>
        </div>
      </div>
    );
  }

  const shareUrl = `https://www.fyora.app/${creator.handle}`;
  const cardUrl = `https://www.fyora.app/api/public/og/${encodeURIComponent(
    creator.handle,
  )}.png?v=${encodeURIComponent(String(creator.updatedAt))}`;
  const cardPreviewUrl = cardPreviewNonce ? `${cardUrl}&preview=${cardPreviewNonce}` : cardUrl;
  const qrImage = creator.avatarUrl || FALLBACK_QR_IMAGE;
  const max = Math.max(...stats.week, 1);

  const sharePage = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${creator.name} on Fyora`,
          text: `Support ${creator.name} from any chain.`,
          url: shareUrl,
        });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Could not share this page");
    }
  };

  const downloadCard = async () => {
    try {
      const response = await fetch(cardPreviewUrl);
      if (!response.ok) throw new Error("Card download failed");
      const objectUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `fyora-${creator.handle}.png`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error("Could not download your card");
    }
  };

  const regenerateCard = async () => {
    try {
      setRegeneratingCard(true);
      setIsCardLoading(true);
      const currentIdentity = await refreshIdentity();
      await refreshCreatorShareCardFn({ data: { didToken: currentIdentity.didToken } });
      await refetch();
      setCardPreviewNonce(Date.now());
      toast.success("Share card regenerated");
    } catch (error) {
      setIsCardLoading(false);
      toast.error(error instanceof Error ? error.message : "Could not regenerate your card");
    } finally {
      setRegeneratingCard(false);
    }
  };

  const refreshSettlement = async () => {
    try {
      setRefreshingSettlement(true);
      const currentIdentity = await refreshIdentity();
      const universalAddresses =
        addressesQuery.data ?? (await loadUniversalAccountAddresses(currentIdentity.evmAddress));
      await refreshCreatorSettlementFn({
        data: { didToken: currentIdentity.didToken, universalAddresses },
      });
      await refetch();
      toast.success("Settlement address refreshed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not refresh settlement address.");
    } finally {
      setRefreshingSettlement(false);
    }
  };

  const refreshPayments = async () => {
    try {
      setRefreshingPayments(true);
      const currentIdentity = await refreshIdentity();
      const result = await refreshCreatorPaymentsFn({
        data: { didToken: currentIdentity.didToken },
      });
      await refetch();
      toast.success(
        result.updated
          ? `Updated ${result.updated} payment${result.updated === 1 ? "" : "s"}`
          : "Payments refreshed",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not refresh payments.");
    } finally {
      setRefreshingPayments(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Header />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        {/* Top row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <EmojiAvatar
              emoji={creator.emoji}
              gradient={creator.gradient}
              avatarUrl={creator.avatarUrl}
              size={64}
              className="sm:!w-[72px] sm:!h-[72px]"
            />
            <div className="min-w-0">
              <Sticker color="lime" rotate={-3}>
                Your dashboard
              </Sticker>
              <h1 className="font-display italic text-3xl sm:text-5xl mt-2 truncate">
                Hi, {creator.name.split(" ")[0]}
              </h1>
              <div className="mt-1">
                <HandleUrl handle={creator.handle} tone="plain" size="md" />
              </div>
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
          <StatCard
            label="Total received"
            value={<Odometer value={stats.total} prefix="$" />}
            bg="bg-lime"
          />
          <StatCard label="Supporters" value={<Odometer value={stats.count} />} bg="bg-lilac" />
          <StatCard
            label="Avg tip"
            value={<Odometer value={stats.avg} prefix="$" decimals={2} />}
            bg="bg-butter"
          />
          <div className="rounded-3xl bg-coral chunky shadow-sticker p-5">
            <div className="text-xs uppercase font-bold tracking-wider">Top source</div>
            {stats.topChain ? (
              <>
                <div className="mt-3">
                  <ChainBadge id={stats.topChain} />
                </div>
                <div className="text-xs mt-2 opacity-80">Most funds arriving from</div>
              </>
            ) : (
              <div className="mt-3 text-sm font-semibold opacity-80">No confirmed payments yet</div>
            )}
          </div>
        </div>

        {/* Row 2: Share + Trend */}
        <div className="mt-6 grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-3xl bg-card chunky-thick shadow-sticker-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display italic text-2xl sm:text-3xl">This week</h2>
              <div className="text-xs text-muted-foreground">last 7 days - confirmed payments</div>
            </div>
            <div className="flex items-end gap-2 h-40">
              {stats.week.map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                  <div
                    className="w-full rounded-t-xl chunky bg-lime shadow-sticker-sm"
                    style={{ height: `${(v / max) * 100}%`, minHeight: 8 }}
                  />
                  <div className="text-[10px] text-muted-foreground">
                    {["M", "T", "W", "T", "F", "S", "S"][i]}
                  </div>
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
                <QRCodeSVG
                  value={shareUrl}
                  size={90}
                  bgColor="#ffffff"
                  fgColor="#141313"
                  level="H"
                  imageSettings={{
                    src: qrImage,
                    height: 22,
                    width: 22,
                    excavate: true,
                    crossOrigin: "anonymous",
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <HandleUrl handle={creator.handle} tone="plain" size="md" />
                <div className="mt-2 flex flex-wrap gap-2">
                  <CopyButton value={shareUrl} label="Copy link" />
                  <button
                    onClick={sharePage}
                    className="inline-flex items-center gap-1 rounded-full bg-card chunky shadow-sticker-sm px-3 py-1.5 text-sm font-semibold press"
                  >
                    <Share2 className="h-3.5 w-3.5" /> Share
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
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={refreshSettlement}
                disabled={refreshingSettlement}
                className="inline-flex items-center gap-1 rounded-full bg-card chunky shadow-sticker-sm px-3 py-1.5 text-sm font-semibold press disabled:opacity-60"
              >
                <RefreshCw className={`w-3 h-3 ${refreshingSettlement ? "animate-spin" : ""}`} />{" "}
                Refresh address
              </button>
              <Link
                to="/dashboard/edit"
                className="inline-flex items-center gap-1 rounded-full bg-card chunky shadow-sticker-sm px-3 py-1.5 text-sm font-semibold press"
              >
                <Pencil className="w-3 h-3" /> Change
              </Link>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ChainBadge id={creator.settlement.chain} />
            <TokenBadge id={creator.settlement.token} />
            <span className="font-mono text-xs sm:text-sm bg-secondary chunky rounded-full px-3 py-1 max-w-full truncate">
              {creator.settlement.address}
            </span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            This is the Universal receive address where creator payments land.
          </p>
        </div>

        {/* Share card */}
        <section className="mt-6 rounded-3xl bg-card chunky-thick shadow-sticker-lg p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display italic text-2xl sm:text-3xl">Automatic share card</h2>
              <p className="text-sm text-muted-foreground">
                This preview is attached automatically when you share your Fyora link.
              </p>
            </div>
            <button
              type="button"
              onClick={regenerateCard}
              disabled={regeneratingCard}
              className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-semibold chunky shadow-sticker-sm press disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${regeneratingCard ? "animate-spin" : ""}`} />
              Regenerate card
            </button>
          </div>

          <div className="mt-5">
            <div className="overflow-hidden rounded-xl chunky-thick bg-paper shadow-sticker-lg relative min-h-[150px] flex items-center justify-center">
              {isCardLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-paper/60 z-10">
                  <RefreshCw className="h-8 w-8 animate-spin text-ink" />
                </div>
              )}
              <img
                src={cardPreviewUrl}
                alt={`Fyora share card for ${creator.name}`}
                onLoad={() => setIsCardLoading(false)}
                onError={() => setIsCardLoading(false)}
                className={`block aspect-[40/21] w-full object-cover transition-opacity duration-200 ${
                  isCardLoading ? "opacity-30" : "opacity-100"
                }`}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={downloadCard}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper chunky shadow-sticker press"
              >
                <Download className="h-4 w-4" /> Download PNG
              </button>
              <button
                type="button"
                onClick={sharePage}
                className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-semibold chunky shadow-sticker-sm press"
              >
                <Share2 className="h-4 w-4" /> Share
              </button>
              <CopyButton value={shareUrl} label="Copy link" />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Social apps may keep an older preview for a while after you update your page.
            </p>
          </div>
        </section>

        {/* Payments table */}
        <div className="mt-6 rounded-3xl bg-card chunky-thick shadow-sticker-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display italic text-2xl sm:text-3xl">Recent payments</h2>
            <button
              onClick={refreshPayments}
              disabled={refreshingPayments}
              className="inline-flex items-center gap-1 text-xs rounded-full bg-card chunky shadow-sticker-sm px-3 py-1.5 font-semibold press disabled:opacity-60"
            >
              <RefreshCw className={`w-3 h-3 ${refreshingPayments ? "animate-spin" : ""}`} />{" "}
              Refresh
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
                    {p.note && (
                      <div className="text-xs text-muted-foreground italic truncate">
                        "{p.note}"
                      </div>
                    )}
                  </div>
                  <ChainBadge id={p.fromChain} size="sm" />
                  <span className="text-xs bg-lime chunky rounded-full px-2 py-0.5 font-semibold">
                    {p.status}
                  </span>
                  <span className="font-display italic text-xl sm:text-2xl w-16 sm:w-20 text-right">
                    ${p.amountUsd}
                  </span>
                  <button
                    onClick={() =>
                      p.universalxUrl &&
                      window.open(p.universalxUrl, "_blank", "noopener,noreferrer")
                    }
                    disabled={!p.universalxUrl}
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

function StatCard({ label, value, bg }: { label: string; value: React.ReactNode; bg: string }) {
  return (
    <div className={`rounded-3xl ${bg} chunky shadow-sticker p-5`}>
      <div className="text-xs uppercase font-bold tracking-wider">{label}</div>
      <div className="font-display italic text-3xl sm:text-4xl mt-1 truncate">{value}</div>
    </div>
  );
}
