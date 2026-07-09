import { motion } from "motion/react";

const COINS = [
  { emoji: "💎", top: "10%", left: "8%", delay: 0 },
  { emoji: "🪙", top: "22%", left: "88%", delay: 0.4 },
  { emoji: "💵", top: "60%", left: "4%", delay: 0.8 },
  { emoji: "🔷", top: "72%", left: "92%", delay: 0.2 },
  { emoji: "☀️", top: "40%", left: "94%", delay: 0.6 },
  { emoji: "✨", top: "85%", left: "45%", delay: 1.0 },
];

export function FloatingCoins() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {COINS.map((c, i) => (
        <motion.div
          key={i}
          className="absolute text-3xl md:text-4xl"
          style={{ top: c.top, left: c.left }}
          animate={{ y: [0, -14, 0], rotate: [-6, 8, -6] }}
          transition={{
            duration: 4 + i * 0.3,
            delay: c.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {c.emoji}
        </motion.div>
      ))}
    </div>
  );
}
