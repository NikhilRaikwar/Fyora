import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/kivo/Header";
import { EmojiAvatar } from "@/components/kivo/EmojiAvatar";
import { ChainBadge, TokenBadge } from "@/components/kivo/Badges";
import { Sticker } from "@/components/kivo/Sticker";
import { AuthLoginCard } from "@/components/kivo/AuthLoginCard";
import { useCurrentCreator } from "@/lib/fyora/hooks";
import { updateCreatorAvatarFn, updateCreatorFn } from "@/lib/fyora/server-functions";
import { loadUniversalAccountAddresses } from "@/lib/fyora/particle";
import { SETTLEMENT_CHAINS, settlementAssetsForChain } from "@/lib/fyora/settlement";
import { useEffect, useState } from "react";
import { Save, ArrowLeft, Upload, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { HandleUrl } from "@/components/kivo/Logo";
import type { Social } from "@/lib/fyora/types";

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
  const [socials, setSocials] = useState<Social[]>([]);
  const [chain, setChain] = useState("arbitrum");
  const [token, setToken] = useState("usdc");
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUpload, setAvatarUpload] = useState<{
    fileName: string;
    contentType: "image/png" | "image/jpeg" | "image/webp";
    base64: string;
  } | null>(null);
  const addressesQuery = useQuery({
    queryKey: ["particle-ua-addresses", identity?.evmAddress],
    queryFn: () => loadUniversalAccountAddresses(identity!.evmAddress),
    enabled: Boolean(identity?.evmAddress),
    retry: 1,
  });

  useEffect(() => {
    if (creator) {
      setName(creator.name);
      setBio(creator.bio);
      setEmoji(creator.emoji);
      setSocials(creator.socials.length ? creator.socials : [{ kind: "site", url: "" }]);
      setChain(creator.settlement.chain);
      setToken(creator.settlement.token);
      setAvatarPreview(creator.avatarUrl);
      setAvatarUpload(null);
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

  const selectedChain = SETTLEMENT_CHAINS.find((item) => item.chainSlug === chain)!;
  const chainAssets = settlementAssetsForChain(selectedChain.chainId);
  const selectedAsset = chainAssets.find((item) => item.tokenId === token) ?? chainAssets[0];
  const address =
    selectedAsset.networkType === "solana"
      ? (addressesQuery.data?.solanaUaAddress ?? "")
      : (addressesQuery.data?.evmUaAddress ?? "");

  const pickAvatar = (file?: File) => {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Upload a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Use an image smaller than 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      const base64 = dataUrl.split(",")[1];
      if (!base64) {
        toast.error("Could not read that image.");
        return;
      }
      setAvatarPreview(dataUrl);
      setAvatarUpload({
        fileName: file.name,
        contentType: file.type as "image/png" | "image/jpeg" | "image/webp",
        base64,
      });
    };
    reader.onerror = () => toast.error("Could not read that image.");
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setSaving(true);
    try {
      const currentIdentity = await refreshIdentity();
      if (!addressesQuery.data) throw new Error("Universal receive address is still loading.");
      await updateCreatorFn({
        data: {
          didToken: currentIdentity.didToken,
          name,
          bio,
          emoji,
          socials: socials
            .filter((social) => social.url.trim())
            .map((social) => ({
              ...social,
              url: /^https?:\/\//i.test(social.url) ? social.url : `https://${social.url}`,
            })),
          chainId: selectedAsset.chainId,
          tokenAddress: selectedAsset.tokenAddress,
          universalAddresses: addressesQuery.data,
        },
      });
      if (avatarUpload) {
        await updateCreatorAvatarFn({
          data: {
            didToken: currentIdentity.didToken,
            ...avatarUpload,
          },
        });
      }
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
              <div className="text-xs uppercase font-bold tracking-wider text-muted-foreground mb-2">
                Photo
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <EmojiAvatar
                  emoji={emoji}
                  gradient={creator.gradient}
                  avatarUrl={avatarPreview}
                  size={84}
                />
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-card chunky shadow-sticker-sm px-4 py-2 text-sm font-semibold press">
                  <Upload className="h-4 w-4" />
                  Upload photo
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(event) => pickAvatar(event.target.files?.[0])}
                  />
                </label>
                <p className="max-w-xs text-xs text-muted-foreground">
                  Used on your page, share QR, and automatic card previews. Emoji stays as the
                  fallback.
                </p>
              </div>
            </div>
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
                Social links
              </div>
              <div className="space-y-2">
                {socials.map((social, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      value={social.kind}
                      onChange={(event) => {
                        const next = [...socials];
                        next[index] = {
                          ...social,
                          kind: event.target.value as Social["kind"],
                        };
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
                      value={social.url}
                      onChange={(event) => {
                        const next = [...socials];
                        next[index] = { ...social, url: event.target.value };
                        setSocials(next);
                      }}
                      placeholder="https://..."
                      className="flex-1 bg-secondary chunky rounded-xl px-3 py-2 outline-none min-w-0"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setSocials(socials.filter((_, itemIndex) => itemIndex !== index))
                      }
                      className="w-9 h-9 rounded-xl bg-card chunky shadow-sticker-sm flex items-center justify-center press"
                      aria-label="Remove social link"
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
            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-muted-foreground mb-2">
                Settlement chain
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SETTLEMENT_CHAINS.map((c) => {
                  const unavailableSolana = Boolean(
                    c.networkType === "solana" &&
                    addressesQuery.data &&
                    !addressesQuery.data.solanaUaAddress,
                  );
                  return (
                    <button
                      key={c.chainId}
                      onClick={() => {
                        if (unavailableSolana) {
                          toast.error("Solana Universal receive is not available yet.");
                          return;
                        }
                        setChain(c.chainSlug);
                        setToken(settlementAssetsForChain(c.chainId)[0].tokenId);
                      }}
                      disabled={unavailableSolana}
                      className={`rounded-2xl chunky p-3 text-left press disabled:opacity-50 ${chain === c.chainSlug ? "bg-lime shadow-sticker" : "bg-card shadow-sticker-sm"}`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-full border border-ink"
                          style={{ background: c.chainColor }}
                        />
                        <div className="font-semibold text-sm">{c.chainName}</div>
                      </div>
                      {unavailableSolana && (
                        <div className="mt-1 text-[10px] text-muted-foreground">
                          Universal receive unavailable
                        </div>
                      )}
                    </button>
                  );
                })}
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
                value={addressesQuery.isLoading ? "Loading Universal receive address..." : address}
                readOnly
                className="w-full bg-secondary chunky rounded-2xl px-4 py-3 outline-none font-mono text-sm"
              />
              {addressesQuery.isError && (
                <p className="mt-2 text-xs text-destructive">
                  Could not load Universal receive address. Refresh and try again.
                </p>
              )}
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
                <EmojiAvatar
                  emoji={emoji}
                  gradient={creator.gradient}
                  avatarUrl={avatarPreview}
                  size={72}
                />
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
