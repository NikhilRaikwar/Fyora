import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/kivo/Header";
import { EmojiAvatar } from "@/components/kivo/EmojiAvatar";
import { ChainBadge, TokenBadge } from "@/components/kivo/Badges";
import { Sticker } from "@/components/kivo/Sticker";
import { MagicLoginCard } from "@/components/kivo/MagicLoginCard";
import { useCurrentCreator } from "@/lib/fyora/hooks";
import { updateCreatorFn } from "@/lib/fyora/server-functions";
import { SETTLEMENT_CHAINS, settlementAssetsForChain } from "@/lib/fyora/settlement";
import { useEffect, useState } from "react";
import { Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { HandleUrl } from "@/components/kivo/Logo";

export const Route = createFileRoute("/dashboard/edit")({
  head: () => ({
    meta: [
      { title: "Edit profile — Fyora" },
      { name: "description", content: "Edit your Fyora page." },
      { property: "og:title", content: "Edit profile — Fyora" },
      { property: "og:description", content: "Customize your Fyora money page." },
    ],
  }),
  component: EditPage,
});

function EditPage() {
  const { creator, identity, loading, isLoading, refreshIdentity, refetch } = useCurrentCreator();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [emoji, setEmoji] = useState("🦊");
  const [chain, setChain] = useState("arbitrum");
  const [token, setToken] = useState("usdc");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (creator) {
      setName(creator.name);
      setBio(creator.bio);
      setEmoji(creator.emoji);
      setChain(creator.settlement.chain);
      setToken(creator.settlement.token);
    }
  }, [creator]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-paper">
        <Header />
      </div>
    );
  }

  if (!identity) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <Header />
        <div className="px-4 py-16">
          <MagicLoginCard />
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

  const selectedChain = SETTLEMENT_CHAINS.find((item) => item.chainSlug === chain)!;
  const chainAssets = settlementAssetsForChain(selectedChain.chainId);
  const selectedAsset = chainAssets.find((item) => item.tokenId === token) ?? chainAssets[0];
  const address =
    selectedAsset.networkType === "solana" ? (identity.solanaAddress ?? "") : identity.evmAddress;

  const save = async () => {
    setSaving(true);
    try {
      const currentIdentity = await refreshIdentity();
      await updateCreatorFn({
        data: {
          didToken: currentIdentity.didToken,
          name,
          bio,
          emoji,
          chainId: selectedAsset.chainId,
          tokenAddress: selectedAsset.tokenAddress,
        },
      });
      await refetch();
      toast.success("Saved!");
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Header />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <Sticker color="lilac" rotate={-2}>
              Editor
            </Sticker>
            <h1 className="font-display italic text-3xl sm:text-5xl mt-3">Tune your page</h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1 rounded-full bg-card chunky shadow-sticker-sm px-4 py-2 font-semibold press text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Cancel
            </Link>
            <button
              onClick={save}
              disabled={saving || !address}
              className="inline-flex items-center gap-1 rounded-full bg-lime text-ink chunky shadow-sticker px-4 py-2 font-semibold press text-sm"
            >
              <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="rounded-3xl bg-card chunky-thick shadow-sticker-lg p-6 space-y-5">
            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-muted-foreground mb-1">
                Name
              </div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-secondary chunky rounded-2xl px-4 py-3 outline-none font-semibold"
              />
            </div>
            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-muted-foreground mb-1">
                Bio
              </div>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full bg-secondary chunky rounded-2xl px-4 py-3 outline-none resize-none"
              />
            </div>
            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-muted-foreground mb-2">
                Emoji
              </div>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    className={`w-11 h-11 rounded-xl text-xl chunky press ${emoji === e ? "bg-lime shadow-sticker" : "bg-card shadow-sticker-sm"}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-muted-foreground mb-2">
                Settlement chain
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SETTLEMENT_CHAINS.map((c) => (
                  <button
                    key={c.chainId}
                    onClick={() => {
                      setChain(c.chainSlug);
                      setToken(settlementAssetsForChain(c.chainId)[0].tokenId);
                    }}
                    className={`rounded-2xl chunky p-3 text-left press ${chain === c.chainSlug ? "bg-lime shadow-sticker" : "bg-card shadow-sticker-sm"}`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded-full border border-ink"
                        style={{ background: c.chainColor }}
                      />
                      <div className="font-semibold text-sm">{c.chainName}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-muted-foreground mb-2">
                Token
              </div>
              <div className="flex flex-wrap gap-2">
                {chainAssets.map((t) => (
                  <button
                    key={t.tokenAddress}
                    onClick={() => setToken(t.tokenId)}
                    className={`rounded-full chunky px-4 py-2 press font-semibold ${token === t.tokenId ? "bg-lime shadow-sticker" : "bg-card shadow-sticker-sm"}`}
                  >
                    {t.tokenEmoji} {t.tokenSymbol}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-muted-foreground mb-1">
                Receive address
              </div>
              <input
                value={address}
                readOnly
                className="w-full bg-secondary chunky rounded-2xl px-4 py-3 outline-none font-mono text-sm"
              />
            </div>
          </div>

          {/* Live preview */}
          <div className="lg:sticky lg:top-24 h-fit">
            <div className="text-xs uppercase font-bold tracking-wider text-muted-foreground mb-2 ml-1">
              Live preview
            </div>
            <div
              className="rounded-3xl bg-card chunky-thick shadow-sticker-lg p-6"
              style={{
                background: `linear-gradient(135deg, ${creator.gradient[0]}22, ${creator.gradient[1]}22), var(--card)`,
              }}
            >
              <div className="flex items-start gap-4">
                <EmojiAvatar emoji={emoji} gradient={creator.gradient} size={72} />
                <div className="flex-1 min-w-0">
                  <div className="font-display italic text-3xl leading-tight">
                    {name || "Your name"}
                  </div>
                  <div className="mt-1">
                    <HandleUrl handle={creator.handle} tone="plain" size="sm" />
                  </div>
                  <p className="mt-2 text-sm">{bio || "Your bio shows here."}</p>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-2 flex-wrap">
                <ChainBadge id={chain} />
                <TokenBadge id={token} />
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {[5, 10, 25, 50].map((a) => (
                  <div
                    key={a}
                    className="rounded-xl chunky bg-card shadow-sticker-sm py-3 text-center font-display italic text-xl"
                  >
                    ${a}
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-full bg-ink text-paper text-center py-3 font-semibold chunky shadow-sticker">
                Support {(name || creator.name).split(" ")[0]}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
