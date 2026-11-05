import IMAGES from "../data/images.generated.js"

export const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

// "Le visage de la *compétence*." -> escaped HTML with <strong>.
export const rich = (s = "") => esc(s).replace(/\*([^*]+)\*/g, "<strong>$1</strong>")

// Splits rich text into masked words for the staggered reveal. Each word is
// <span class="w"><span style="--i:n">word</span></span>; the outer span
// clips, the inner one slides up. Returns [html, nextIndex] so several lines
// can share one stagger sequence.
export function splitWords(s, start = 0) {
  let i = start
  let bold = false
  // Split on whitespace only, so "*compétence*." stays one word (no stray
  // space before the period); "*" toggles bold wherever it appears.
  const html = String(s)
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const inner = word
        .split("*")
        .map((part, k) => {
          if (k > 0) bold = !bold
          return part ? (bold ? `<strong>${esc(part)}</strong>` : esc(part)) : ""
        })
        .join("")
      return `<span class="w"><span style="--i:${i++}">${inner}</span></span>`
    })
    .join(" ")
  return [html, i]
}

export const pad = (n) => String(n).padStart(2, "0")

// Responsive <img> from the generated renditions, with the blurred
// placeholder painted as its background until the real image arrives.
export function img(slug, { sizes = "100vw", alt = "", className = "", eager = false, priority = false, attrs = "" } = {}) {
  const meta = IMAGES[slug]
  if (!meta) throw new Error(`Unknown image "${slug}" — run npm run images`)
  const srcset = meta.widths.map((w) => `/img/${slug}-${w}.webp ${w}w`).join(", ")
  const fallback = meta.widths.find((w) => w >= 960) ?? meta.widths.at(-1)
  return `<img class="lq ${className}" src="/img/${slug}-${fallback}.webp" srcset="${srcset}" sizes="${sizes}" width="${meta.w}" height="${meta.h}" alt="${esc(alt)}" ${eager ? "" : 'loading="lazy" '}decoding="async"${priority ? ' fetchpriority="high"' : ""} style="background-image:url(${meta.lqip})" ${attrs}>`
}

export const largest = (slug) => {
  const meta = IMAGES[slug]
  return `/img/${slug}-${meta.widths.at(-1)}.webp`
}

export const srcsetOf = (slug) =>
  IMAGES[slug].widths.map((w) => `/img/${slug}-${w}.webp ${w}w`).join(", ")

// Icons. The arrow is the legacy site's "fleche-cote" arrow, shortened.
export const icon = {
  arrow: `<svg class="i-arrow" viewBox="0 0 28 13.6" aria-hidden="true" focusable="false"><polygon points="28,6.8 20.7,13.6 18.6,11.4 22,8.3 0,8.3 0,5.3 22,5.3 18.6,2.2 20.7,0"/></svg>`,
  arrowLong: `<svg class="i-arrow-long" viewBox="0 0 84 13.6" aria-hidden="true" focusable="false"><polygon points="84,6.8 76.7,13.6 74.6,11.4 78,8.3 0,8.3 0,5.3 78,5.3 74.6,2.2 76.7,0"/></svg>`,
  // The legacy "fleche-bas" scroll arrow.
  arrowDown: `<svg class="i-arrow-down" viewBox="0 0 13.6 84" aria-hidden="true" focusable="false"><polygon points="6.8,84 0,76.7 2.2,74.6 5.3,78 5.3,0 8.3,0 8.3,78 11.4,74.6 13.6,76.7"/></svg>`,
  chevron: `<svg class="i-chev" viewBox="0 0 12 8" aria-hidden="true" focusable="false"><path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`,
  plus: `<svg class="i-plus" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 1v14M1 8h14" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`,
  close: `<svg class="i-close" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M2 2l12 12M14 2L2 14" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`,
  pause: `<svg class="i-pause" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M3 1.5v9M9 1.5v9" stroke="currentColor" stroke-width="2"/></svg>`,
  play: `<svg class="i-play" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M3 1.5l7 4.5-7 4.5z" fill="currentColor"/></svg>`,
  mail: `<svg class="i-mail" viewBox="0 0 20 16" aria-hidden="true" focusable="false"><path d="M1 1h18v14H1zM1 1l9 7 9-7" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`,
}

// Button with the double-arrow swap on hover (one arrow leaves to the right
// while a second one slides in from the left).
export const btn = (label, href, variant = "primary", extra = "") =>
  `<a class="btn btn--${variant}" href="${href}" ${extra}><span class="btn__label">${esc(label)}</span><span class="btn__icon">${icon.arrow}${icon.arrow}</span></a>`

export const linkArrow = (label, href, extra = "") =>
  `<a class="link-arrow" href="${href}" ${extra}><span>${esc(label)}</span>${icon.arrow}</a>`
