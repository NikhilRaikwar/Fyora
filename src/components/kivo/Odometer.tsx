import { animate, useMotionValue, useTransform } from "motion/react";
import { motion } from "motion/react";
import { useEffect } from "react";

export function Odometer({
  value,
  prefix = "",
  decimals = 0,
  className,
}: {
  value: number;
  prefix?: string;
  decimals?: number;
  className?: string;
}) {
  const mv = useMotionValue(0);
  const rounded = useTransform(
    mv,
    (v) =>
      prefix +
      v.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }),
  );
  useEffect(() => {
    const controls = animate(mv, value, { duration: 1.2, ease: [0.22, 1, 0.36, 1] });
    return controls.stop;
  }, [value, mv]);
  return <motion.span className={className}>{rounded}</motion.span>;
}
