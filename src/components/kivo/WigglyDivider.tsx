export function WigglyDivider({ color = "#141313" }: { color?: string }) {
  return (
    <svg viewBox="0 0 1200 40" className="w-full h-6" preserveAspectRatio="none" aria-hidden>
      <path
        d="M0 20 Q 50 0 100 20 T 200 20 T 300 20 T 400 20 T 500 20 T 600 20 T 700 20 T 800 20 T 900 20 T 1000 20 T 1100 20 T 1200 20"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
