// Quimperlé "K" logomark — red stylized K shape
export default function QuimperleLogoK({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Logo Quimperlé Kemperle"
    >
      {/* Left vertical bar of K */}
      <rect x="8" y="8" width="22" height="104" rx="4" fill="#D0021B" />
      {/* Upper arm of K (diagonal going up-right) */}
      <path d="M30 60 L88 8 L100 8 L100 24 L48 68 Z" fill="#D0021B" />
      {/* Lower arm of K (diagonal going down-right) */}
      <path d="M30 60 L88 112 L100 112 L100 96 L48 52 Z" fill="#D0021B" />
      {/* Q tail (bottom-right curl to suggest the Q in the combined mark) */}
      <path d="M72 88 Q100 110 100 120 L88 120 Q80 112 70 100 Z" fill="#D0021B" />
    </svg>
  );
}
