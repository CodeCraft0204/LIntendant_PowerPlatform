import wordmark from "../assets/brand/lintendant-wordmark.png"

// The L' mark, redrawn from the brand file (4.png) so it stays sharp at any
// size. The navy square, white stem and slate base match the official colors
// exactly (#003865, #FFFFFF, #7C878E).
export function LogoMark({ className = "size-9", title = "L'Intendant" }) {
  return (
    <svg viewBox="75 75 1350 1350" className={className} role="img" aria-label={title}>
      <rect x="75" y="75" width="1350" height="1350" fill="#003865" />
      <polygon points="462,338 660,338 660,944 462,1142" fill="#FFFFFF" />
      <polygon points="680,964 1038,964 1038,1162 482,1162" fill="#7C878E" />
      <rect x="1038" y="75" width="102" height="364" fill="#7C878E" />
    </svg>
  )
}

// The official L'INTENDANT wordmark (white on navy). The source file is
// 223 × 67 px, so it is shown at half size or smaller to stay crisp.
export function LogoWordmark({ className = "h-8 w-auto" }) {
  return <img src={wordmark} alt="L'Intendant" className={className} width="223" height="67" />
}

// Mark plus the product name, as in the ERP sidebar.
export function LogoLockup({ subtitle = "Risques et enjeux", collapsed = false }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <LogoMark className="size-9 shrink-0 rounded-[3px] ring-1 ring-white/15" />
      {!collapsed && (
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[15px] font-bold text-white">L'Intendant</span>
          <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a9b4bd]">{subtitle}</span>
        </span>
      )}
    </span>
  )
}
