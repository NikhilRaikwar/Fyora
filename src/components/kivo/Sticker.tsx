import { cn } from "@/lib/utils";
import { motion } from "motion/react";

export function Sticker({
  children,
  color = "lime",
  rotate = -4,
  className,
}: {
  children: React.ReactNode;
  color?: "lime" | "coral" | "lilac" | "butter" | "sky" | "ink";
  rotate?: number;
  className?: string;
}) {
  const map: Record<string, string> = {
    lime: "bg-lime text-ink",
    coral: "bg-coral text-ink",
    lilac: "bg-lilac text-ink",
    butter: "bg-butter text-ink",
    sky: "bg-sky text-ink",
    ink: "bg-ink text-paper",
  };
  return (
    <motion.span
      initial={{ scale: 0.9, rotate: rotate + 4 }}
      whileInView={{ scale: 1, rotate }}
      viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 200, damping: 12 }}
      className={cn(
        "inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider chunky shadow-sticker-sm",
        map[color],
        className,
      )}
      style={{ transformOrigin: "center" }}
    >
      {children}
    </motion.span>
  );
}
