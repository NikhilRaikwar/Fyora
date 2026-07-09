export type Payment = {
  id: string;
  amountUsd: number;
  supporterName: string;
  supporterEmoji: string;
  fromChain: string;
  fromToken: string;
  note?: string;
  txId: string;
  createdAt: number; // ms
  status: "confirmed" | "pending" | "failed";
};

export type Social = { kind: "x" | "github" | "site" | "youtube" | "ig"; url: string };

export type Creator = {
  handle: string;
  name: string;
  bio: string;
  emoji: string;
  gradient: [string, string]; // two colors
  socials: Social[];
  settlement: {
    chain: string; // chain id
    token: string; // token id
    address: string;
  };
  payments: Payment[];
};

const now = Date.now();
const min = 60_000;
const hr = 60 * min;
const day = 24 * hr;

const mkTx = () =>
  "0x" +
  Array.from({ length: 40 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");

export const SEED_CREATORS: Creator[] = [
  {
    handle: "nikhil",
    name: "Nikhil Raikwar",
    bio: "Indie hacker building playful crypto tools. Coffee, chess, and ship-fast energy. ☕♟️",
    emoji: "🦊",
    gradient: ["#C6F24E", "#B8A6FF"],
    socials: [
      { kind: "x", url: "https://x.com/nikhil" },
      { kind: "github", url: "https://github.com/nikhil" },
      { kind: "site", url: "https://nikhil.dev" },
    ],
    settlement: { chain: "arbitrum", token: "usdc", address: "0x8f3a...D42b" },
    payments: [
      {
        id: "p1",
        amountUsd: 25,
        supporterName: "Maya",
        supporterEmoji: "🌻",
        fromChain: "base",
        fromToken: "usdc",
        note: "Loved your last demo!",
        txId: mkTx(),
        createdAt: now - 12 * min,
        status: "confirmed",
      },
      {
        id: "p2",
        amountUsd: 5,
        supporterName: "Leo",
        supporterEmoji: "🦁",
        fromChain: "polygon",
        fromToken: "usdt",
        note: "keep shipping ⚡",
        txId: mkTx(),
        createdAt: now - 2 * hr,
        status: "confirmed",
      },
      {
        id: "p3",
        amountUsd: 50,
        supporterName: "Sana",
        supporterEmoji: "🐳",
        fromChain: "optimism",
        fromToken: "eth",
        note: "for the coffee jar",
        txId: mkTx(),
        createdAt: now - 8 * hr,
        status: "confirmed",
      },
      {
        id: "p4",
        amountUsd: 10,
        supporterName: "Kai",
        supporterEmoji: "🌊",
        fromChain: "solana",
        fromToken: "sol",
        txId: mkTx(),
        createdAt: now - 1 * day,
        status: "confirmed",
      },
      {
        id: "p5",
        amountUsd: 100,
        supporterName: "Ari",
        supporterEmoji: "🚀",
        fromChain: "ethereum",
        fromToken: "usdc",
        note: "seed round 😄",
        txId: mkTx(),
        createdAt: now - 3 * day,
        status: "confirmed",
      },
      {
        id: "p6",
        amountUsd: 3,
        supporterName: "Ren",
        supporterEmoji: "🐸",
        fromChain: "arbitrum",
        fromToken: "usdc",
        txId: mkTx(),
        createdAt: now - 5 * day,
        status: "confirmed",
      },
    ],
  },
  {
    handle: "aria",
    name: "Aria Chen",
    bio: "Streaming code + lofi. Come hang. 🎧",
    emoji: "🎧",
    gradient: ["#FF6B4A", "#FFD166"],
    socials: [
      { kind: "x", url: "#" },
      { kind: "youtube", url: "#" },
    ],
    settlement: { chain: "base", token: "usdc", address: "0x11ab...C0de" },
    payments: [
      {
        id: "a1",
        amountUsd: 10,
        supporterName: "Fox",
        supporterEmoji: "🦊",
        fromChain: "arbitrum",
        fromToken: "usdc",
        txId: mkTx(),
        createdAt: now - 30 * min,
        status: "confirmed",
      },
      {
        id: "a2",
        amountUsd: 5,
        supporterName: "Owl",
        supporterEmoji: "🦉",
        fromChain: "optimism",
        fromToken: "usdc",
        txId: mkTx(),
        createdAt: now - 4 * hr,
        status: "confirmed",
      },
    ],
  },
  {
    handle: "milo",
    name: "Milo Park",
    bio: "OSS maintainer @ tiny-libs. Please star, I like stars. ⭐",
    emoji: "🐨",
    gradient: ["#B8A6FF", "#7DD3FC"],
    socials: [
      { kind: "github", url: "#" },
      { kind: "site", url: "#" },
    ],
    settlement: { chain: "arbitrum", token: "usdc", address: "0x44ee...9911" },
    payments: [
      {
        id: "m1",
        amountUsd: 25,
        supporterName: "Nova",
        supporterEmoji: "✨",
        fromChain: "base",
        fromToken: "usdc",
        note: "thanks for tiny-router!",
        txId: mkTx(),
        createdAt: now - 6 * hr,
        status: "confirmed",
      },
    ],
  },
  {
    handle: "juno",
    name: "Juno Fields",
    bio: "Designer. Sticker maker. Type nerd. 🎨",
    emoji: "🎨",
    gradient: ["#FFB4A2", "#B8A6FF"],
    socials: [
      { kind: "ig", url: "#" },
      { kind: "site", url: "#" },
    ],
    settlement: { chain: "optimism", token: "usdc", address: "0x55cc...AA10" },
    payments: [],
  },
  {
    handle: "devi",
    name: "Devi Kapoor",
    bio: "Crypto explainers, no jargon. Weekly newsletter.",
    emoji: "📚",
    gradient: ["#C6F24E", "#7DD3FC"],
    socials: [{ kind: "x", url: "#" }],
    settlement: { chain: "arbitrum", token: "usdt", address: "0x77aa...B0B0" },
    payments: [
      {
        id: "d1",
        amountUsd: 15,
        supporterName: "Zed",
        supporterEmoji: "⚡",
        fromChain: "polygon",
        fromToken: "usdt",
        txId: mkTx(),
        createdAt: now - 20 * hr,
        status: "confirmed",
      },
    ],
  },
  {
    handle: "sun",
    name: "Sun Ito",
    bio: "Digital artist ✿ commissions open",
    emoji: "🌸",
    gradient: ["#FBCFE8", "#C6F24E"],
    socials: [{ kind: "ig", url: "#" }],
    settlement: { chain: "base", token: "eth", address: "0x99ff...1234" },
    payments: [],
  },
  {
    handle: "rex",
    name: "Rex Alvarez",
    bio: "Hackathon speedrunner 🏁 shipping every weekend",
    emoji: "🦖",
    gradient: ["#FF6B4A", "#C6F24E"],
    socials: [
      { kind: "x", url: "#" },
      { kind: "github", url: "#" },
    ],
    settlement: { chain: "arbitrum", token: "usdc", address: "0xabcd...5678" },
    payments: [
      {
        id: "r1",
        amountUsd: 50,
        supporterName: "Ori",
        supporterEmoji: "🌟",
        fromChain: "base",
        fromToken: "usdc",
        note: "loved your Fyora build!",
        txId: mkTx(),
        createdAt: now - 1 * hr,
        status: "confirmed",
      },
    ],
  },
  {
    handle: "luna",
    name: "Luna Sato",
    bio: "Lo-fi musician. Melodies for late-night code sessions. 🌙",
    emoji: "🌙",
    gradient: ["#B8A6FF", "#FFD166"],
    socials: [
      { kind: "youtube", url: "#" },
      { kind: "site", url: "#" },
    ],
    settlement: { chain: "base", token: "usdc", address: "0xdeaf...beef" },
    payments: [
      {
        id: "l1",
        amountUsd: 8,
        supporterName: "Kip",
        supporterEmoji: "🐧",
        fromChain: "arbitrum",
        fromToken: "usdc",
        txId: mkTx(),
        createdAt: now - 3 * hr,
        status: "confirmed",
      },
    ],
  },
];
