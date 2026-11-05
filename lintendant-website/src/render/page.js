// Renders the complete HTML document for one language. Called at build time
// (and per request in dev) by the plugin in vite.config.js, so the browser
// receives finished HTML: fast first paint, indexable in both languages.

import en from "../content/en.js"
import fr from "../content/fr.js"
import { PROJECTS } from "../data/projects.js"
import { EMAIL, HERO_SLUGS, SECTOR_ORDER, SITE_URL } from "../data/site.js"
import { markShapes, wordmark } from "./brand.js"
import { about, approach, careers, contact, hero, lifecycle, lightbox, marquee, projects, services, stats, trust } from "./sections.js"
import { btn, esc, icon, img, pad, srcsetOf } from "./util.js"

const CONTENT = { fr, en }

function head(c) {
  const url = `${SITE_URL}${c.path}`
  const ld = {
    "@context": "https://schema.org",
    "@type": "GeneralContractor",
    name: "L'Intendant",
    description: c.meta.description,
    url: SITE_URL,
    email: EMAIL,
    logo: `${SITE_URL}/favicon.svg`,
    image: `${SITE_URL}/og.jpg`,
    areaServed: { "@type": "AdministrativeArea", name: "Québec" },
    knowsLanguage: ["fr", "en"],
  }
  return `<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(c.meta.title)}</title>
<meta name="description" content="${esc(c.meta.description)}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="fr-CA" href="${SITE_URL}/">
<link rel="alternate" hreflang="en-CA" href="${SITE_URL}/en/">
<link rel="alternate" hreflang="x-default" href="${SITE_URL}/">
<meta name="theme-color" content="#003865">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="website">
<meta property="og:site_name" content="L'Intendant">
<meta property="og:locale" content="${c.ogLocale}">
<meta property="og:title" content="${esc(c.meta.title)}">
<meta property="og:description" content="${esc(c.meta.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE_URL}/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="preload" as="image" type="image/webp" imagesrcset="${srcsetOf(HERO_SLUGS[0])}" imagesizes="100vw" fetchpriority="high">
<script>document.documentElement.classList.add("js")</script>
<link rel="stylesheet" href="/src/styles/main.css">
<script type="module" src="/src/main.js"></script>
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>`
}

function header(c) {
  const h = c.header
  const counts = Object.fromEntries(SECTOR_ORDER.map((s) => [s, PROJECTS.filter((p) => p.sector === s).length]))

  let n = 0
  const megaServices = `<div class="mega" data-mega="services">
    <div class="wrap mega__grid">
      <div>
        <p class="mega__title">${esc(h.megaServices.title)}</p>
        <ul class="mega__list">${c.services.items
          .map(
            (s, i) => `<li><a href="#${c.ids.services}" data-goto-svc="${i}"><span class="mega__n">${s.option ? "+" : pad(++n)}</span><span><b>${esc(s.name)}</b><em>${esc(s.tagline)}</em></span></a></li>`,
          )
          .join("")}</ul>
      </div>
      <a class="mega__feature" href="#${c.ids.approach}">
        ${img("le-gc", { sizes: "380px" })}
        <span>${esc(h.megaServices.more)}${icon.arrow}</span>
      </a>
    </div>
  </div>`

  const megaProjects = `<div class="mega" data-mega="projects">
    <div class="wrap mega__grid">
      <div>
        <p class="mega__title">${esc(h.megaProjects.title)}</p>
        <ul class="mega__list mega__list--cols">${SECTOR_ORDER.map(
          (s) => `<li><a href="#${c.ids.projects}" data-goto-filter="${s}"><span><b>${esc(c.sectors[s])}</b></span><span class="mega__count">${pad(counts[s])}</span></a></li>`,
        ).join("")}<li><a href="#${c.ids.projects}" data-goto-filter="all"><span><b>${esc(h.megaProjects.all)}</b></span><span class="mega__count">${PROJECTS.length}</span></a></li></ul>
      </div>
      <a class="mega__feature" href="#${c.ids.projects}">
        ${img("la-maison-simons-galeries-de-la-capitale", { sizes: "360px" })}
        <span>La Maison Simons${icon.arrow}</span>
      </a>
    </div>
  </div>`

  const items = h.nav
    .map((item) => {
      const mega = item.mega === "services" ? megaServices : item.mega === "projects" ? megaProjects : ""
      return `<li class="nav__item${mega ? " has-mega" : ""}"><a class="nav__link" href="#${c.ids[item.key]}" data-nav="${c.ids[item.key]}">${esc(item.label)}${mega ? icon.chevron : ""}</a>${mega}</li>`
    })
    .join("")

  return `<header class="hdr" data-header>
  <div class="hdr__progress" aria-hidden="true"><span data-progress></span></div>
  <div class="wrap hdr__bar">
    <a class="hdr__logo" href="${c.path}" aria-label="L'Intendant">${wordmark({ className: "hdr__wordmark" })}</a>
    <nav class="nav" aria-label="${esc(c.ui.menu)}"><ul class="nav__list">${items}</ul></nav>
    <div class="hdr__end">
      <a class="hdr__lang" href="${c.alt.path}" hreflang="${c.alt.lang}" lang="${c.alt.lang}" title="${esc(c.alt.name)}">${esc(c.alt.short)}</a>
      ${btn(h.cta, `#${c.ids.contact}`, "header")}
      <button class="burger" type="button" aria-expanded="false" aria-controls="menu" data-burger>
        <span class="burger__lines" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="burger__label" data-open="${esc(c.ui.menu)}" data-close="${esc(c.ui.close)}">${esc(c.ui.menu)}</span>
      </button>
    </div>
  </div>
</header>`
}

function menu(c) {
  const links = [...c.header.nav.map((n) => ({ id: c.ids[n.key], label: n.label })), { id: c.ids.contact, label: c.header.cta }]
  return `<div class="menu" id="menu" data-menu hidden>
  ${markShapes("menu__mark")}
  <div class="wrap menu__inner">
    <ol class="menu__list">${links
      .map((l, i) => `<li style="--i:${i}"><a href="#${l.id}" data-menu-link><span>${pad(i + 1)}</span>${esc(l.label)}</a></li>`)
      .join("")}</ol>
    <div class="menu__foot">
      <a href="mailto:${EMAIL}">${EMAIL}</a>
      <a href="${c.alt.path}" hreflang="${c.alt.lang}" lang="${c.alt.lang}">${esc(c.alt.name)}</a>
    </div>
  </div>
</div>`
}

function footer(c) {
  const f = c.footer
  const year = new Date().getFullYear()
  const nav = c.header.nav.map((n) => `<li><a href="#${c.ids[n.key]}">${esc(n.label)}</a></li>`).join("")
  const svc = c.services.items.map((s, i) => `<li><a href="#${c.ids.services}" data-goto-svc="${i}">${esc(s.name)}</a></li>`).join("")
  return `<footer class="ftr lined">
  <div class="wrap">
    <div class="ftr__top">
      <div class="ftr__brand">
        <p class="ftr__tagline">${esc(f.tagline)}</p>
        ${btn(c.header.cta, `#${c.ids.contact}`, "light")}
      </div>
      <div><h2 class="ftr__h">${esc(f.navTitle)}</h2><ul class="ftr__list">${nav}</ul></div>
      <div><h2 class="ftr__h">${esc(f.servicesTitle)}</h2><ul class="ftr__list">${svc}</ul></div>
      <div><h2 class="ftr__h">${esc(f.contactTitle)}</h2><ul class="ftr__list"><li><a href="mailto:${EMAIL}">${EMAIL}</a></li><li><a href="${c.alt.path}" hreflang="${c.alt.lang}" lang="${c.alt.lang}">${esc(c.alt.name)}</a></li></ul></div>
    </div>
    <a class="ftr__wordmark" href="#top" aria-label="${esc(c.ui.backToTop)}" data-reveal="rise">${wordmark({ className: "ftr__wm", label: "L'Intendant" })}</a>
    <div class="ftr__bottom">
      <p>© ${year} L'Intendant. ${esc(f.rights)}</p>
      <a class="ftr__top-link" href="#top">${esc(c.ui.backToTop)}<span>${icon.arrow}</span></a>
    </div>
  </div>
</footer>`
}

export function renderPage(lang) {
  const c = CONTENT[lang]
  if (!c) throw new Error(`No content for language "${lang}"`)
  return `<!doctype html>
<html lang="${c.lang}">
${head(c)}
<body id="top">
<a class="skip" href="#main">${esc(c.ui.skip)}</a>
${header(c)}
${menu(c)}
<main id="main">
${hero(c)}
${marquee(c)}
${trust(c)}
${approach(c)}
${lifecycle(c)}
${services(c)}
${stats(c)}
${projects(c)}
${about(c)}
${careers(c)}
${contact(c)}
</main>
${footer(c)}
${lightbox(c)}
</body>
</html>`
}
