import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import type { ElementType } from "react";

export function EmojiAvatar({
  emoji,
  gradient,
  size = 64,
  className,
  animate = false,
}: {
  emoji: string;
  gradient: [string, string];
  size?: number;
  className?: string;
  animate?: boolean;
}) {
  const Comp = (animate ? motion.div : "div") as ElementType;
  return (
    <Comp
      {...(animate && {
        initial: { rotate: -6, scale: 0.9 },
        animate: { rotate: 0, scale: 1 },
        transition: { type: "spring", stiffness: 200, damping: 12 },
      })}
      className={cn(
        "flex items-center justify-center rounded-full chunky shadow-sticker shrink-0",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
        fontSize: size * 0.55,
      }}
    >
      <span style={{ filter: "drop-shadow(0 1px 0 rgba(0,0,0,0.15))" }}>{emoji}</span>
    </Comp>
  );
}
