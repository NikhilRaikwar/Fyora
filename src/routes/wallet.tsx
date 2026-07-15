import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { IAssetsResponse, ITransaction } from "@particle-network/universal-account-sdk";
import { isAddress } from "ethers";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  QrCode,
  RefreshCw,
  Send,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Header } from "@/components/kivo/Header";
import { CopyButton } from "@/components/kivo/CopyButton";
import { AuthLoginCard } from "@/components/kivo/AuthLoginCard";
import { useFyoraAuth } from "@/lib/fyora/AuthProvider";
import {
  createWalletTransferQuote,
  loadUniversalAccountAddresses,
  loadPrimaryAssets,
  loadWalletActivity,
  loadWalletTransaction,
  type WalletActivity,
} from "@/lib/fyora/particle";
import { useParticleSender } from "@/lib/fyora/useParticleSender";
import { PRIMARY_ASSETS } from "@/lib/fyora/settlement";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet - Fyora" },
      {
        name: "description",
        content: "View your Universal Balance and send assets across chains with Fyora.",
      },
    ],
  }),
  component: WalletCenter,
});

type TransferStage =
  | "idle"
  | "quoting"
  | "quoted"
  | "signing"
  | "submitting"
  | "pending"
  | "confirmed"
  | "failed"
  | "rejected"
  | "refunded";

const TOKEN_IDS = ["usdc", "usdt", "eth", "bnb", "sol"] as const;

function tokenKey(value: unknown) {
  return String(value ?? "").toLowerCase();
}

function statusFromResponse(value: unknown): string {
  if (!value || typeof value !== "object") return "pending";
  const row = value as Record<string, unknown>;
  for (const key of ["status", "state", "transactionStatus", "transaction_status"]) {
    if (row[key]) return String(row[key]).toLowerCase();
  }
  for (const key of ["data", "result", "transaction"]) {
    const nested = statusFromResponse(row[key]);
    if (nested !== "pending") return nested;
  }
  return "pending";
}

function terminalStage(status: string): TransferStage | null {
  if (["confirmed", "completed", "success", "succeeded", "finalized"].includes(status)) {
    return "confirmed";
  }
  if (["refunded", "refund"].includes(status)) return "refunded";
  if (["failed", "reverted", "cancelled", "canceled"].includes(status)) return "failed";
  return null;
}

function isSolanaAddress(value: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value < 1 ? 2 : 2,
    maximumFractionDigits: value < 1 ? 4 : 2,
  }).format(value || 0);
}

function shortAddress(value: string) {
  return value.length > 18 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;
}

function WalletCenter() {
  const { identity, loading, openWallet } = useFyoraAuth();
  const { sendPaymentQuote } = useParticleSender();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !identity) {
      navigate({ to: "/", replace: true });
    }
  }, [loading, identity, navigate]);

  const [receiveNetwork, setReceiveNetwork] = useState<"evm" | "solana">("evm");
  const [tokenId, setTokenId] = useState<(typeof TOKEN_IDS)[number]>("usdc");
  const [chainId, setChainId] = useState(8453);
  const [amount, setAmount] = useState("");
  const [receiver, setReceiver] = useState("");
  const [stage, setStage] = useState<TransferStage>("idle");
  const [quote, setQuote] = useState<{ account?: unknown; transaction: ITransaction } | null>(null);
  const [transactionId, setTransactionId] = useState("");

  const assetsQuery = useQuery({
    queryKey: ["particle-primary-assets", identity?.evmAddress],
    queryFn: () => loadPrimaryAssets(identity!.evmAddress),
    enabled: Boolean(identity?.evmAddress),
    retry: 1,
  });
  const addressesQuery = useQuery({
    queryKey: ["particle-ua-addresses", identity?.evmAddress],
    queryFn: () => loadUniversalAccountAddresses(identity!.evmAddress),
    enabled: Boolean(identity?.evmAddress),
    retry: 1,
  });
  const activityQuery = useQuery({
    queryKey: ["particle-wallet-activity", identity?.evmAddress],
    queryFn: () => loadWalletActivity(identity!.evmAddress),
    enabled: Boolean(identity?.evmAddress),
    retry: 1,
  });
  const activeAssets = assetsQuery.data;
  const activeAddresses = addressesQuery.data;
  const activeOwnerAddress = identity?.evmAddress ?? "";
  const activeLoading = assetsQuery.isLoading;
  const activeFetching = assetsQuery.isFetching;

  const tokenAssets = useMemo(
    () => PRIMARY_ASSETS.filter((asset) => asset.tokenId === tokenId),
    [tokenId],
  );
  const selectedAsset =
    tokenAssets.find((asset) => asset.chainId === chainId) ?? tokenAssets[0] ?? PRIMARY_ASSETS[0];
  const tokenPrice =
    activeAssets?.assets.find((asset) => tokenKey(asset.tokenType).includes(tokenId))?.price ??
    (tokenId === "usdc" || tokenId === "usdt" ? 1 : 0);
  const amountNumber = Number(amount);
  const amountUsd = Number.isFinite(amountNumber) ? amountNumber * tokenPrice : 0;

  const balances = useMemo(() => {
    const response = activeAssets;
    return TOKEN_IDS.map((id) => {
      const asset = response?.assets.find((entry) => tokenKey(entry.tokenType).includes(id));
      return {
        id,
        amount: asset?.amount ?? 0,
        amountInUSD: asset?.amountInUSD ?? 0,
        chains: (asset?.chainAggregation ?? []).filter((entry) => entry.amount > 0),
      };
    });
  }, [activeAssets]);

  useEffect(() => {
    if (receiveNetwork === "solana" && activeAddresses && !activeAddresses.solanaUaAddress) {
      setReceiveNetwork("evm");
    }
  }, [activeAddresses, receiveNetwork]);

  const clearQuote = () => {
    if (stage !== "idle") setStage("idle");
    setQuote(null);
    setTransactionId("");
  };

  const validateTransfer = () => {
    if (!amount || !Number.isFinite(amountNumber) || amountNumber <= 0) {
      throw new Error("Enter a valid token amount.");
    }
    const validReceiver =
      selectedAsset.networkType === "solana" ? isSolanaAddress(receiver) : isAddress(receiver);
    if (!validReceiver) {
      throw new Error(
        selectedAsset.networkType === "solana"
          ? "Enter a valid Solana address."
          : "Enter a valid EVM address.",
      );
    }
  };

  const buildQuote = async () => {
    if (!identity) return;
    try {
      validateTransfer();
      setStage("quoting");
      const next = await createWalletTransferQuote(identity.evmAddress, {
        chainId: selectedAsset.chainId,
        tokenAddress: selectedAsset.tokenAddress,
        amount,
        receiver: receiver.trim(),
      });
      setQuote(next);
      setStage("quoted");
    } catch (error) {
      setStage("idle");
      toast.error(error instanceof Error ? error.message : "Particle could not build this quote.");
    }
  };

  const pollTransaction = async (id: string) => {
    if (!identity) return;
    for (let attempt = 0; attempt < 45; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 4_000));
      const response = await loadWalletTransaction(identity.evmAddress, id);
      const terminal = terminalStage(statusFromResponse(response));
      if (terminal) {
        setStage(terminal);
        await Promise.all([assetsQuery.refetch(), activityQuery.refetch()]);
        return;
      }
    }
    setStage("pending");
  };

  const submitTransfer = async () => {
    if (!quote || !identity) return;
    try {
      setStage("signing");
      const freshQuote = await createWalletTransferQuote(identity.evmAddress, {
        chainId: selectedAsset.chainId,
        tokenAddress: selectedAsset.tokenAddress,
        amount,
        receiver: receiver.trim(),
      });
      setQuote(freshQuote);
      const result = await sendPaymentQuote(
        freshQuote.account as Parameters<typeof sendPaymentQuote>[0],
        freshQuote.transaction,
      );
      setStage("submitting");
      setTransactionId(result.transactionId);
      setStage("pending");
      void pollTransaction(result.transactionId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Transfer failed.";
      const rejected = /reject|denied|cancel/i.test(message);
      setStage(rejected ? "rejected" : "failed");
      toast.error(rejected ? "Signature request rejected." : message);
    }
  };

  if (loading) {
    return <WalletLoading />;
  }

  if (!identity) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <Header />
        <div className="px-4 py-16">
          <AuthLoginCard title="Sign in to open your wallet" />
        </div>
      </div>
    );
  }

  const ownerAddress =
    receiveNetwork === "solana" ? (activeAddresses?.solanaUaAddress ?? "") : activeOwnerAddress;
  const receiveAddress =
    receiveNetwork === "solana"
      ? (activeAddresses?.solanaUaAddress ?? "")
      : (activeAddresses?.evmUaAddress ?? "");
  const receiveQrValue =
    receiveNetwork === "solana" ? `solana:${receiveAddress}` : `ethereum:${receiveAddress}@8453`;
  const receiveMode =
    receiveNetwork === "solana"
      ? "Solana Universal address"
      : receiveAddress.toLowerCase() === ownerAddress.toLowerCase()
        ? "Particle EOA upgraded as Universal Account"
        : "Separate Particle UA address";
  const receiveNetworks = activeAddresses?.solanaUaAddress
    ? (["evm", "solana"] as const)
    : (["evm"] as const);
  const feeUsd = quote
    ? Number(quote.transaction.tokenChanges.totalFeeInUSD || 0) +
      Number(quote.transaction.transactionFees.transactionLPFeeAmountInUSD || 0) +
      Number(quote.transaction.transactionFees.transactionServiceFeeAmountInUSD || 0)
    : 0;
  const receivedUsd = quote ? Number(quote.transaction.tokenChanges.totalIncrAmountInUSD || 0) : 0;
  const universalXUrl = transactionId
    ? `https://universalx.app/activity/details?id=${encodeURIComponent(transactionId)}`
    : "";

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-lime chunky px-3 py-1 text-xs font-bold uppercase">
              <CheckCircle2 className="h-4 w-4" /> Your wallet is ready
            </div>
            <h1 className="mt-3 font-display text-4xl italic sm:text-6xl">Wallet center</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
              One Universal Balance across supported chains, with Particle securing the embedded EOA
              and Particle routing every transfer.
            </p>
          </div>
          <button
            type="button"
            onClick={openWallet}
            className="inline-flex items-center gap-2 rounded-full bg-card chunky shadow-sticker-sm px-4 py-2 text-sm font-semibold press"
          >
            <ShieldCheck className="h-4 w-4" />
            Open Particle Wallet
          </button>
        </div>

        <section className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl bg-ink p-6 text-paper chunky-thick shadow-sticker-lg sm:p-8">
            <div className="text-xs font-bold uppercase tracking-wider text-paper/65">
              Universal Balance
            </div>
            <div className="mt-3 font-display text-5xl italic sm:text-7xl">
              {activeLoading ? "..." : money(activeAssets?.totalAmountInUSD ?? 0)}
            </div>
            <p className="mt-3 text-sm text-paper/65">
              Calculated by Particle across primary assets.
            </p>
            <button
              type="button"
              onClick={() =>
                Promise.all([
                  assetsQuery.refetch(),
                  addressesQuery.refetch(),
                  activityQuery.refetch(),
                ])
              }
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-paper px-4 py-2 text-sm font-semibold text-ink chunky shadow-sticker-sm press"
            >
              <RefreshCw className={`h-4 w-4 ${activeFetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          <div className="rounded-3xl bg-card p-6 chunky-thick shadow-sticker-lg">
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              <h2 className="font-display text-2xl italic">Receive</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Funds arrive here. Particle signs sends because it owns this Universal Account.
            </p>
            <div className="mt-4 inline-flex rounded-full bg-secondary p-1 chunky">
              {receiveNetworks.map((network) => (
                <button
                  key={network}
                  type="button"
                  onClick={() => setReceiveNetwork(network)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase ${receiveNetwork === network ? "bg-ink text-paper" : ""}`}
                >
                  {network === "evm" ? "EVM" : "Solana"}
                </button>
              ))}
            </div>
            {addressesQuery.isError ? (
              <div className="mt-4 rounded-2xl bg-coral/20 p-4 chunky">
                <p className="text-sm font-semibold">Could not load Universal receive address.</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {addressesQuery.error instanceof Error
                    ? addressesQuery.error.message
                    : "Particle address lookup failed."}
                </p>
                <button
                  type="button"
                  onClick={() => addressesQuery.refetch()}
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-card px-3 py-1.5 text-xs font-semibold chunky shadow-sticker-sm press"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Retry
                </button>
              </div>
            ) : addressesQuery.isLoading ? (
              <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading receive address...
              </div>
            ) : receiveAddress ? (
              <div className="mt-4 flex items-center gap-4">
                <div className="rounded-xl bg-white p-2 chunky shadow-sticker-sm">
                  <QRCodeSVG
                    value={receiveQrValue}
                    size={104}
                    fgColor="#141313"
                    level="H"
                    imageSettings={{
                      src: "https://www.fyora.app/fyora-favicon.png",
                      height: 20,
                      width: 20,
                      excavate: true,
                      crossOrigin: "anonymous",
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold uppercase text-muted-foreground">
                    Universal receive address
                  </div>
                  <div className="mt-1 break-all font-mono text-xs">
                    {shortAddress(receiveAddress)}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{receiveMode}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    QR opens a wallet deposit URI. Copy address for exchanges or manual sends.
                  </div>
                  <CopyButton value={receiveAddress} label="Copy address" className="mt-3" />
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Solana Universal receive is not available for this account yet.
              </p>
            )}
            {ownerAddress && (
              <div className="mt-4 rounded-2xl bg-secondary p-3 chunky">
                <div className="text-[10px] font-bold uppercase text-muted-foreground">
                  Signer address
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="min-w-0 break-all font-mono text-xs">
                    {shortAddress(ownerAddress)}
                  </span>
                  <CopyButton value={ownerAddress} label="Copy" />
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="mt-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-3xl italic">Assets</h2>
              <p className="text-sm text-muted-foreground">
                Primary assets available to Particle routing.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {balances.map((balance) => (
              <div key={balance.id} className="rounded-2xl bg-card p-4 chunky shadow-sticker-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold uppercase">{balance.id}</span>
                  <span className="text-xs text-muted-foreground">
                    {money(balance.amountInUSD)}
                  </span>
                </div>
                <div className="mt-2 font-display text-2xl italic">
                  {balance.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </div>
                <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                  {balance.chains.length ? (
                    balance.chains.map((chain) => (
                      <div
                        key={`${balance.id}-${chain.token.chainId}`}
                        className="flex justify-between gap-2"
                      >
                        <span>Chain {chain.token.chainId}</span>
                        <span>
                          {chain.amount.toLocaleString(undefined, { maximumFractionDigits: 5 })}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span>No balance</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <div className="rounded-3xl bg-card p-6 chunky-thick shadow-sticker-lg sm:p-8">
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              <h2 className="font-display text-3xl italic">Send anywhere</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              This sends from your Universal Balance, confirmed by Particle.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Keep extra balance for Particle routing fees. For a demo, fund about $0.20 on Base
              USDC and send a smaller amount like $0.01-$0.02.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold">
                Token
                <select
                  value={tokenId}
                  onChange={(event) => {
                    const next = event.target.value as (typeof TOKEN_IDS)[number];
                    const first = PRIMARY_ASSETS.find((asset) => asset.tokenId === next)!;
                    setTokenId(next);
                    setChainId(first.chainId);
                    clearQuote();
                  }}
                  className="mt-2 h-11 w-full rounded-xl bg-paper px-3 chunky outline-none focus:ring-2 focus:ring-lime"
                >
                  {TOKEN_IDS.map((token) => (
                    <option key={token} value={token}>
                      {token.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold">
                Destination chain
                <select
                  value={selectedAsset.chainId}
                  onChange={(event) => {
                    setChainId(Number(event.target.value));
                    clearQuote();
                  }}
                  className="mt-2 h-11 w-full rounded-xl bg-paper px-3 chunky outline-none focus:ring-2 focus:ring-lime"
                >
                  {tokenAssets.map((asset) => (
                    <option key={`${asset.tokenId}-${asset.chainId}`} value={asset.chainId}>
                      {asset.chainName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold">
                Amount
                <input
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    clearQuote();
                  }}
                  inputMode="decimal"
                  placeholder={`0.00 ${tokenId.toUpperCase()}`}
                  className="mt-2 h-11 w-full rounded-xl bg-paper px-3 chunky outline-none focus:ring-2 focus:ring-lime"
                />
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  About {money(amountUsd)}
                </span>
              </label>
              <label className="text-sm font-semibold">
                Recipient
                <input
                  value={receiver}
                  onChange={(event) => {
                    setReceiver(event.target.value);
                    clearQuote();
                  }}
                  placeholder={
                    selectedAsset.networkType === "solana" ? "Solana address" : "0x address"
                  }
                  className="mt-2 h-11 w-full rounded-xl bg-paper px-3 font-mono text-xs chunky outline-none focus:ring-2 focus:ring-lime"
                />
              </label>
            </div>

            {!quote ? (
              <button
                type="button"
                onClick={buildQuote}
                disabled={stage === "quoting"}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-lime px-5 py-3 font-semibold chunky shadow-sticker press disabled:opacity-50"
              >
                {stage === "quoting" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                Review transfer
              </button>
            ) : (
              <div className="mt-6 border-t-2 border-dashed border-ink/20 pt-5">
                <div className="grid gap-3 text-sm sm:grid-cols-3">
                  <QuoteStat label="Expected value" value={money(receivedUsd || amountUsd)} />
                  <QuoteStat label="Estimated fees" value={money(feeUsd)} />
                  <QuoteStat
                    label="Expected delivery"
                    value={
                      quote.transaction.userOps.length > 1
                        ? "Cross-chain route"
                        : "Single-chain route"
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={submitTransfer}
                  disabled={["signing", "submitting", "pending"].includes(stage)}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 font-semibold text-paper chunky shadow-sticker press disabled:opacity-60"
                >
                  {["signing", "submitting", "pending"].includes(stage) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  {stage === "signing"
                    ? "Confirm with Particle"
                    : stage === "submitting"
                      ? "Submitting"
                      : stage === "pending"
                        ? "Pending"
                        : "Confirm and send"}
                </button>
                <TransferStatus stage={stage} universalXUrl={universalXUrl} />
              </div>
            )}
          </div>

          <ActivityPanel
            activity={activityQuery.data ?? []}
            loading={activityQuery.isLoading}
            onRefresh={() => activityQuery.refetch()}
          />
        </section>
      </main>
    </div>
  );
}

function QuoteStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

function TransferStatus({ stage, universalXUrl }: { stage: TransferStage; universalXUrl: string }) {
  if (["idle", "quoting", "quoted"].includes(stage)) return null;
  const label: Record<TransferStage, string> = {
    idle: "",
    quoting: "Building quote",
    quoted: "Quote ready",
    signing: "Waiting for Particle confirmation",
    submitting: "Submitting to Particle",
    pending: "Transfer pending",
    confirmed: "Transfer confirmed",
    failed: "Transfer failed",
    rejected: "Signature rejected",
    refunded: "Transfer refunded",
  };
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-semibold">
      <span>{label[stage]}</span>
      {universalXUrl && (
        <a
          href={universalXUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 underline decoration-2 underline-offset-2"
        >
          View on UniversalX <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}

function ActivityPanel({
  activity,
  loading,
  onRefresh,
}: {
  activity: WalletActivity[];
  loading: boolean;
  onRefresh: () => unknown;
}) {
  return (
    <aside className="rounded-3xl bg-card p-6 chunky-thick shadow-sticker-lg">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl italic">Activity</h2>
          <p className="text-sm text-muted-foreground">Directly from Particle.</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          title="Refresh activity"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card chunky shadow-sticker-sm press"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
      <div className="mt-5 divide-y-2 divide-dashed divide-ink/15">
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading activity...</div>
        ) : activity.length ? (
          activity.map((item) => (
            <div key={item.id} className="py-4">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-bold uppercase chunky">
                  {item.status}
                </span>
                {item.amountInUSD !== undefined && (
                  <span className="font-semibold">{money(item.amountInUSD)}</span>
                )}
              </div>
              <div className="mt-2 font-mono text-xs text-muted-foreground">
                {shortAddress(item.id)}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleString()
                    : "Particle transaction"}
                </span>
                <a
                  href={`https://universalx.app/activity/details?id=${encodeURIComponent(item.id)}`}
                  target="_blank"
                  rel="noreferrer"
                  title="Open in UniversalX"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-card chunky shadow-sticker-sm press"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          ))
        ) : (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No wallet activity yet.
          </div>
        )}
      </div>
    </aside>
  );
}

function WalletLoading() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <Header />
      <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-24 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Opening wallet...
      </div>
    </div>
  );
}
