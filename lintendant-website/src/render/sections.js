import { PROJECTS } from "../data/projects.js"
import {
  EMAIL,
  FEATURED_SLUGS,
  HERO_SLUGS,
  MARQUEE,
  PORTFOLIO_PAGE,
  SECTOR_ORDER,
  SERVICE_IMAGES,
} from "../data/site.js"
import { markShapes } from "./brand.js"
import { btn, esc, icon, img, largest, linkArrow, pad, rich, splitWords, srcsetOf } from "./util.js"

const bySlug = Object.fromEntries(PROJECTS.map((p) => [p.slug, p]))
const href = (c, key) => `#${c.ids[key]}`

const eyebrow = (text, extra = "") => `<p class="eyebrow ${extra}" data-reveal>${esc(text)}</p>`

// Section title with the masked word-by-word reveal.
const title = (text, tag = "h2", extra = "") => {
  const [html] = splitWords(text)
  return `<${tag} class="title ${extra}" data-reveal="words">${html}</${tag}>`
}

/* ------------------------------------------------------------------ hero */

export function hero(c) {
  const slides = HERO_SLUGS.map((slug, i) => {
    const media = img(slug, {
      sizes: "100vw",
      eager: i === 0,
      priority: i === 0,
      className: "hero__img",
    })
    return `<div class="hero__slide${i === 0 ? " is-active" : ""}" data-slide="${i}">${media}</div>`
  }).join("")

  const titles = c.hero.slides
    .map((s, i) => {
      let n = 0
      const lines = s.lines
        .map((line) => {
          const [html, next] = splitWords(line, n)
          n = next
          return `<span class="hero__line">${html}</span>`
        })
        .join("")
      return `<p class="hero__title${i === 0 ? " is-active" : ""}" data-title="${i}"${i ? ' aria-hidden="true"' : ""}>${lines}</p>`
    })
    .join("")

  const ctas = c.hero.slides
    .map(
      (s, i) =>
        `<a class="hero__cta link-arrow link-arrow--light${i === 0 ? " is-active" : ""}" data-cta="${i}" href="${href(c, s.target)}"${i ? ' tabindex="-1" aria-hidden="true"' : ""}><span>${esc(s.cta)}</span>${icon.arrow}</a>`,
    )
    .join("")

  const dots = HERO_SLUGS.map((slug, i) => {
    const p = bySlug[slug]
    return `<button class="hero__dot${i === 0 ? " is-active" : ""}" type="button" data-dot="${i}" aria-label="${pad(i + 1)} — ${esc(p.name)}"${i === 0 ? ' aria-current="true"' : ""}>
      <span class="hero__dot-n">${pad(i + 1)}</span>
      <span class="hero__dot-bar"><i></i></span>
      <span class="hero__dot-name">${esc(p.name)}<em>${esc(c.sectors[p.sector])}</em></span>
    </button>`
  }).join("")

  const options = c.hero.options
    .map(
      (o, i) => `<li><a class="opt" href="${href(c, o.target)}">
        <span class="opt__n">${pad(i + 1)}</span>
        <span class="opt__body"><span class="opt__title">${esc(o.title)}</span><span class="opt__text"><span>${esc(o.text)}</span></span></span>
        <span class="opt__icon">${icon.arrow}</span>
      </a></li>`,
    )
    .join("")

  return `<section class="hero lined" data-hero aria-label="${esc(c.hero.h1)}">
  <div class="hero__media" aria-hidden="true">${slides}<div class="hero__shade"></div></div>
  <div class="hero__inner wrap">
    <div class="hero__copy">
      <h1 class="eyebrow eyebrow--light hero__h1">${esc(c.hero.h1)}</h1>
      <div class="hero__titles" aria-live="off">${titles}</div>
      <div class="hero__ctas">${ctas}</div>
    </div>
    <aside class="hero__panel" aria-label="${esc(c.hero.panelTitle)}">
      <p class="hero__panel-title">${esc(c.hero.panelTitle)}</p>
      <ul class="opts">${options}</ul>
    </aside>
  </div>
  <div class="hero__foot wrap">
    <div class="hero__dots">${dots}</div>
    <button class="hero__pause" type="button" data-pause aria-label="${esc(c.ui.pause)}" data-label-pause="${esc(c.ui.pause)}" data-label-play="${esc(c.ui.play)}">${icon.pause}${icon.play}</button>
    <a class="hero__scroll" href="${href(c, "trust")}"><span>${esc(c.hero.scroll)}</span>${icon.arrowDown}</a>
  </div>
</section>`
}

/* --------------------------------------------------------------- marquee */

export function marquee(c) {
  const items = MARQUEE.map((name, i) => `<li class="${i % 2 ? "is-outline" : ""}">${esc(name)}</li><li class="sep" aria-hidden="true"></li>`).join("")
  return `<section class="marquee lined" aria-label="${esc(c.marqueeLabel)}">
  <div class="marquee__track" data-marquee><ul>${items}</ul><ul aria-hidden="true">${items}</ul></div>
</section>`
}

/* ----------------------------------------------------------------- trust */

export function trust(c) {
  const t = c.trust
  const statement = t.statement
    .split(/\s+/)
    .map((w) => `<span class="sw">${esc(w)}</span>`)
    .join(" ")
  const ops = ["+", "+", "="]
  const terms = t.equation
    .map(
      (e, i) => `<li class="eq__item" data-reveal style="--d:${i * 0.12}s">
        <span class="eq__n">${pad(i + 1)}</span>
        <span class="eq__term">${esc(e.term)}</span>
        <span class="eq__text">${esc(e.text)}</span>
      </li><li class="eq__op" aria-hidden="true" data-reveal style="--d:${i * 0.12 + 0.06}s">${ops[i]}</li>`,
    )
    .join("")
  return `<section class="trust lined" id="${c.ids.trust}">
  <div class="bp bp--trust" aria-hidden="true" data-reveal="draw" data-parallax><i></i></div>
  <div class="wrap">
    ${eyebrow(t.eyebrow)}
    <p class="trust__statement" data-scrub>${statement}</p>
    <ol class="eq">${terms}<li class="eq__item eq__item--result" data-reveal style="--d:.42s">
      <span class="eq__n">${markShapes("eq__mark")}</span>
      <span class="eq__term">${esc(t.result.term)}</span>
      <span class="eq__text">${esc(t.result.text)}</span>
    </li></ol>
    <div class="trust__foot">
      <p class="trust__body" data-reveal>${esc(t.body)}</p>
      <div data-reveal>${btn(t.cta, href(c, "approach"), "primary")}</div>
    </div>
  </div>
</section>`
}

/* -------------------------------------------------------------- approach */

// The 360° dial, redrawn from the legacy "approche-cercle" artwork: three
// concentric rings (one per phase, inner to outer) and the small triangle
// that marks the active one.
function dial(c) {
  const R = [15.4, 46.1, 77]
  const rings = R.map(
    (r, i) =>
      `<circle class="dial__hit" data-ring="${i}" cx="108" cy="108" r="${r}"/><circle class="dial__ring${i === 0 ? " is-active" : ""}" data-ring-line="${i}" cx="108" cy="108" r="${r}"/>`,
  ).join("")
  // Triangles sit on top of their ring, pointing clockwise; CSS spins the
  // active one around the centre (transform-origin 108px 108px).
  const markers = R.map((r, i) => {
    const y = +(108 - r).toFixed(1)
    return `<polygon class="dial__marker${i === 0 ? " is-active" : ""}" data-marker="${i}" points="101.9,${+(y - 7.1).toFixed(1)} 101.9,${+(y + 7.1).toFixed(1)} 114.1,${y}"/>`
  }).join("")
  const labels = c.approach.phases
    .map((p, i) => `<span class="dial__tag" data-tag="${i}"><b>${pad(i + 1)}</b>${esc(p.name)}</span>`)
    .join("")
  return `<div class="dial">
    <svg viewBox="0 0 216 216" aria-hidden="true">
      <circle class="dial__orbit" cx="108" cy="108" r="102"/>
      ${rings}
      ${markers}
    </svg>
    <div class="dial__tags" aria-hidden="true">${labels}</div>
  </div>`
}

export function approach(c) {
  const a = c.approach
  const tabs = a.phases
    .map(
      (p, i) => `<button class="phase-tab${i === 0 ? " is-active" : ""}" type="button" role="tab" id="phase-tab-${i}" aria-controls="phase-${i}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ""} data-phase="${i}">
        <span class="phase-tab__n">${pad(i + 1)}</span><span class="phase-tab__name">${esc(p.name)}</span><span class="phase-tab__bar"><i></i></span>
      </button>`,
    )
    .join("")

  const panels = a.phases
    .map((p, i) => {
      const cols = ["financial", "administrative", "technical"]
        .filter((k) => p[k].length)
        .map(
          (k) => `<div class="phase__col"><h4>${esc(a.columns[k])}<span>${pad(p[k].length)}</span></h4><ul>${p[k].map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`,
        )
        .join("")
      return `<div class="phase${i === 0 ? " is-active" : ""}" role="tabpanel" id="phase-${i}" aria-labelledby="phase-tab-${i}"${i ? " hidden" : ""}>
        <div class="phase__head"><span class="phase__n">${pad(i + 1)}</span><div><h3>${esc(p.name)}</h3><p>${esc(p.text)}</p></div></div>
        <div class="phase__cols">${cols}</div>
      </div>`
    })
    .join("")

  return `<section class="approach lined" id="${c.ids.approach}" data-phases>
  <div class="approach__band" aria-hidden="true">
    ${img("entete-approche", { sizes: "141vw", className: "approach__band-img", attrs: "data-parallax" })}
    <span class="approach__big">360°</span>
  </div>
  <div class="wrap">
    <div class="approach__grid">
      <header class="sec-head sec-head--light">
        ${eyebrow(a.eyebrow, "eyebrow--light")}
        ${title(a.title)}
        <p class="lead" data-reveal>${esc(a.lead)}</p>
        <p class="body" data-reveal>${esc(a.body)}</p>
      </header>
      <div class="approach__dial" data-reveal>${dial(c)}</div>
    </div>
    <div class="phase-tabs" role="tablist" aria-label="${esc(a.eyebrow)}" data-reveal>${tabs}</div>
    <div class="phases">${panels}</div>
    <p class="approach__note" data-reveal>${esc(a.note)}</p>
  </div>
</section>`
}

/* -------------------------------------------------------------- services */

export function services(c) {
  const s = c.services
  let n = 0
  const tabs = s.items
    .map((it, i) => {
      const num = it.option ? "+" : pad(++n)
      return `<button class="svc-tab${i === 0 ? " is-active" : ""}" type="button" role="tab" id="svc-tab-${i}" aria-controls="svc-${i}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ""} data-svc="${i}">
        <span class="svc-tab__n">${num}</span><span class="svc-tab__name">${esc(it.name)}</span>${icon.arrow}
      </button>`
    })
    .join("")

  const panels = s.items
    .map((it, i) => {
      const slug = SERVICE_IMAGES[i]
      // Panoramic headers (2200x579) fill a wide band by height, so they need
      // a wider rendition than the band's own width.
      const sizes = slug.startsWith("entete-") ? "(min-width: 1100px) 90vw, 160vw" : "(min-width: 1100px) 62vw, 100vw"
      return `<div class="svc${i === 0 ? " is-active" : ""}" role="tabpanel" id="svc-${i}" aria-labelledby="svc-tab-${i}"${i ? " hidden" : ""}>
        <figure class="svc__media">${img(slug, { sizes })}<span class="svc__num" aria-hidden="true">${it.option ? "+" : pad(i + 1)}</span></figure>
        <div class="svc__intro">
          <h3 class="svc__name">${esc(it.name)}</h3>
          <p class="svc__tagline">${esc(it.tagline)}</p>
          <p class="svc__text">${esc(it.text)}</p>
          ${linkArrow(s.cta, href(c, "contact"))}
        </div>
        <ul class="ticks svc__ticks">${it.points.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      </div>`
    })
    .join("")

  return `<section class="services lined" id="${c.ids.services}" data-svc-tabs>
  <div class="bp bp--services" aria-hidden="true" data-reveal="draw" data-parallax><i></i></div>
  <div class="wrap">
    <header class="sec-head sec-head--split">
      <div>${eyebrow(s.eyebrow)}${title(s.title)}</div>
      <p class="lead" data-reveal>${esc(s.lead)}</p>
    </header>
    <p class="services__sub" data-reveal>${rich(s.sub[0])} <span>${rich(s.sub[1])}</span></p>
    <div class="svc-wrap">
      <div class="svc-tabs" role="tablist" aria-label="${esc(s.eyebrow)}" aria-orientation="vertical" data-reveal>${tabs}</div>
      <div class="svc-panels" data-reveal>${panels}</div>
    </div>
    <div class="services__foot">
      <p data-reveal>${rich(s.note)}</p>
      <p class="services__motto" data-reveal>${esc(s.motto)}</p>
    </div>
  </div>
</section>`
}

/* ----------------------------------------------------------------- stats */

export function stats(c) {
  const items = c.stats
    .map(
      (s, i) => `<li class="stat" data-reveal style="--d:${i * 0.1}s">
      <span class="stat__num"><span data-count="${s.value}">${s.value}</span>${s.suffix ? `<span class="stat__suffix">${s.suffix}</span>` : ""}</span>
      <span class="stat__label">${esc(s.label)}</span>
    </li>`,
    )
    .join("")
  return `<section class="stats lined" aria-label="L'Intendant">
  ${markShapes("stats__mark")}
  <ul class="wrap stats__list">${items}</ul>
</section>`
}

/* -------------------------------------------------------------- projects */

function tileData(c, p) {
  return `data-lb data-name="${esc(p.name)}" data-sector-label="${esc(c.sectors[p.sector])}" data-full="${largest(p.slug)}" data-srcset="${srcsetOf(p.slug)}"`
}

export function projects(c) {
  const t = c.projects
  const featured = FEATURED_SLUGS.map((slug, i) => {
    const p = bySlug[slug]
    return `<li class="feat">
      <button class="feat__btn" type="button" ${tileData(c, p)} aria-label="${esc(c.ui.view)} : ${esc(p.name)}">
        <span class="feat__media">${img(slug, { sizes: "(min-width: 1100px) 34vw, (min-width: 700px) 50vw, 82vw" })}</span>
        <span class="feat__meta">
          <span class="feat__idx">${pad(i + 1)}</span>
          <span class="feat__sector">${esc(c.sectors[p.sector])}</span>
          <span class="feat__name">${esc(p.name)}</span>
        </span>
        <span class="feat__plus">${icon.plus}</span>
      </button>
    </li>`
  }).join("")

  const counts = Object.fromEntries(SECTOR_ORDER.map((s) => [s, PROJECTS.filter((p) => p.sector === s).length]))
  const filters = [
    `<button class="chip is-active" type="button" data-filter="all" aria-pressed="true">${esc(t.all)}<span>${PROJECTS.length}</span></button>`,
    ...SECTOR_ORDER.map(
      (s) => `<button class="chip" type="button" data-filter="${s}" aria-pressed="false">${esc(c.sectors[s])}<span>${counts[s]}</span></button>`,
    ),
  ].join("")

  // "All" view: deal the sectors round-robin so the first page shows the
  // range of the portfolio rather than one sector at a time.
  const queues = SECTOR_ORDER.map((s) => PROJECTS.filter((p) => p.sector === s))
  const ordered = []
  while (queues.some((q) => q.length)) for (const q of queues) if (q.length) ordered.push(q.shift())

  const tiles = ordered.map(
    (p, i) => `<li class="tile${i >= PORTFOLIO_PAGE ? " is-more" : ""}" data-sector="${p.sector}">
      <button class="tile__btn" type="button" ${tileData(c, p)} aria-label="${esc(c.ui.view)} : ${esc(p.name)}">
        <span class="tile__media">${img(p.slug, { sizes: "(min-width: 1200px) 25vw, (min-width: 900px) 33vw, (min-width: 560px) 50vw, 100vw" })}<span class="tile__plus">${icon.plus}</span></span>
        <span class="tile__name">${esc(p.name)}</span>
        <span class="tile__sector">${esc(c.sectors[p.sector])}</span>
      </button>
    </li>`,
  ).join("")

  return `<section class="projects lined" id="${c.ids.projects}">
  <div class="wrap">
    <header class="sec-head sec-head--split">
      <div>${eyebrow(t.eyebrow)}${title(t.title)}</div>
      <div>
        <p class="lead" data-reveal>${esc(t.lead)}</p>
        <div class="rail-ctrl" data-reveal>
          <button class="rail-ctrl__btn" type="button" data-rail-prev aria-label="${esc(c.ui.prev)}">${icon.arrow}</button>
          <span class="rail-ctrl__count"><b data-rail-current>01</b> / ${pad(FEATURED_SLUGS.length)}</span>
          <button class="rail-ctrl__btn" type="button" data-rail-next aria-label="${esc(c.ui.next)}">${icon.arrow}</button>
        </div>
      </div>
    </header>
  </div>
  <div class="rail" data-rail>
    <ul class="rail__track" data-rail-track>${featured}</ul>
    <div class="wrap"><div class="rail__progress"><span data-rail-bar></span></div></div>
    <span class="cursor-badge" aria-hidden="true" data-cursor>${esc(c.ui.drag)}</span>
  </div>
  <div class="wrap portfolio" data-portfolio data-page="${PORTFOLIO_PAGE}">
    <header class="portfolio__head">
      ${title(t.allTitle, "h3", "title--sm")}
      <p class="lead" data-reveal>${esc(t.allLead)}</p>
    </header>
    <div class="chips" role="group" aria-label="${esc(t.filterLabel)}" data-reveal>${filters}</div>
    <ul class="grid" data-grid>${tiles}</ul>
    <div class="portfolio__more">
      <button class="btn btn--outline" type="button" data-more><span class="btn__label">${esc(t.more)} <span data-more-count></span></span><span class="btn__icon">${icon.plus}${icon.plus}</span></button>
    </div>
  </div>
</section>`
}

/* ----------------------------------------------------------------- about */

export function about(c) {
  const a = c.about
  const pillars = a.pillars
    .map(
      (p, i) => `<li class="pillar" data-reveal style="--d:${i * 0.1}s"><span class="pillar__n">${pad(i + 1)}</span><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></li>`,
    )
    .join("")
  return `<section class="about lined" id="${c.ids.about}">
  <div class="wrap">
    <div class="about__grid">
      <div class="about__copy">
        ${eyebrow(a.eyebrow)}
        ${title(a.title)}
        <p class="lead" data-reveal>${esc(a.lead)}</p>
        <p class="body" data-reveal>${esc(a.body)}</p>
        <div data-reveal>${btn(a.cta, href(c, "contact"), "primary")}</div>
      </div>
      <figure class="about__media" data-reveal="clip">
        ${img("entete-propos", { sizes: "(min-width: 1100px) 130vw, 250vw", attrs: "data-parallax" })}
        <figcaption class="about__badge">${markShapes("about__mark")}<span>${esc(a.closing)}</span></figcaption>
      </figure>
    </div>
    <ol class="pillars">${pillars}</ol>
  </div>
</section>`
}

/* --------------------------------------------------------------- careers */

export function careers(c) {
  const k = c.careers
  const jobs = k.positions
    .map((p, i) => {
      const mail = `mailto:${EMAIL}?subject=${encodeURIComponent(`${k.subject} – ${p}`)}`
      return `<li><a class="job" href="${mail}"><span class="job__n">${pad(i + 1)}</span><span class="job__title">${esc(p)}</span><span class="job__cta">${esc(k.apply)}${icon.arrow}</span></a></li>`
    })
    .join("")
  return `<section class="careers lined" id="${c.ids.careers}">
  <div class="wrap careers__grid">
    <div class="careers__aside">
      <figure class="careers__media" data-reveal="clip">
        ${img("construction-man", { sizes: "(min-width: 1100px) 36vw, 100vw" })}
      </figure>
      <div class="open" data-reveal>
        <h3>${esc(k.openTitle)}</h3>
        <p>${esc(k.openText)}</p>
        ${btn(k.openCta, `mailto:${EMAIL}?subject=${encodeURIComponent(k.subject)}`, "light")}
        <a class="open__mail" href="mailto:${EMAIL}">${EMAIL}</a>
      </div>
    </div>
    <div class="careers__body">
      ${eyebrow(k.eyebrow, "eyebrow--light")}
      ${title(k.title)}
      <p class="lead" data-reveal>${esc(k.lead)}</p>
      <h3 class="careers__list-title" data-reveal>${esc(k.listTitle)}<span>${pad(k.positions.length)}</span></h3>
      <ul class="jobs" data-reveal>${jobs}</ul>
      ${k.footnote ? `<p class="careers__foot">${esc(k.footnote)}</p>` : ""}
    </div>
  </div>
</section>`
}

/* --------------------------------------------------------------- contact */

export function contact(c) {
  const k = c.contact
  const f = k.form
  const sectorOpts = SECTOR_ORDER.map((s) => `<option>${esc(c.sectors[s])}</option>`).join("") + `<option>${esc(f.sectorOther)}</option>`
  const formulaOpts = f.formulaOptions.map((o) => `<option>${esc(o)}</option>`).join("")
  const field = (name, label, type = "text", { required = false, auto = "", full = false } = {}) =>
    `<div class="field${full ? " field--full" : ""}"><input id="f-${name}" name="${name}" type="${type}" placeholder=" "${required ? " required" : ""}${auto ? ` autocomplete="${auto}"` : ""}><label for="f-${name}">${esc(label)}${required ? " *" : ""}</label><span class="field__err" aria-live="polite"></span></div>`
  const select = (name, label, opts) =>
    `<div class="field field--select"><select id="f-${name}" name="${name}"><option value="">${esc(f.choose)}</option>${opts}</select><label for="f-${name}">${esc(label)}</label>${icon.chevron}</div>`

  return `<section class="contact lined" id="${c.ids.contact}">
  <div class="bp bp--contact" aria-hidden="true" data-reveal="draw" data-parallax><i></i></div>
  <div class="wrap contact__grid">
    <div class="contact__intro">
      ${eyebrow(k.eyebrow)}
      ${title(k.title)}
      <p class="lead" data-reveal>${esc(k.lead)}</p>
      <dl class="contact__dl" data-reveal>
        <div><dt>${esc(k.emailLabel)}</dt><dd><a href="mailto:${EMAIL}">${EMAIL}</a></dd></div>
        <div><dt>${esc(k.careersLabel)}</dt><dd><a href="mailto:${EMAIL}?subject=${encodeURIComponent(c.careers.subject)}">${EMAIL}</a></dd></div>
      </dl>
    </div>
    <form class="form" data-form novalidate data-email="${EMAIL}" data-subject="${esc(f.subject)}" data-msg-required="${esc(f.required)}" data-msg-email="${esc(f.invalidEmail)}" data-msg-sending="${esc(f.sending)}" data-msg-success="${esc(f.success)}" data-msg-error="${esc(f.error)}" data-reveal>
      ${field("name", f.name, "text", { required: true, auto: "name" })}
      ${field("company", f.company, "text", { auto: "organization" })}
      ${field("email", f.email, "email", { required: true, auto: "email" })}
      ${field("phone", f.phone, "tel", { auto: "tel" })}
      ${select("sector", f.sector, sectorOpts)}
      ${select("formula", f.formula, formulaOpts)}
      <div class="field field--full field--area"><textarea id="f-message" name="message" rows="4" placeholder=" " required></textarea><label for="f-message">${esc(f.message)} *</label><span class="field__err" aria-live="polite"></span></div>
      <div class="form__foot">
        <button class="btn btn--primary" type="submit"><span class="btn__label">${esc(f.submit)}</span><span class="btn__icon">${icon.arrow}${icon.arrow}</span></button>
        <p class="form__note" data-form-note>${esc(f.mailtoNote)}</p>
      </div>
      <p class="form__status" role="status" data-form-status></p>
    </form>
  </div>
</section>`
}

/* -------------------------------------------------------------- lightbox */

export function lightbox(c) {
  return `<dialog class="lb" data-lightbox aria-label="${esc(c.ui.project)}">
  <div class="lb__stage">
    <img class="lb__img" alt="" data-lb-img>
  </div>
  <div class="lb__bar">
    <p class="lb__cap"><span class="lb__count" data-lb-count></span><span class="lb__sector" data-lb-sector></span><strong data-lb-name></strong></p>
    <div class="lb__nav">
      <button class="lb__btn lb__btn--prev" type="button" data-lb-prev aria-label="${esc(c.ui.prev)}">${icon.arrow}</button>
      <button class="lb__btn" type="button" data-lb-next aria-label="${esc(c.ui.next)}">${icon.arrow}</button>
      <button class="lb__btn lb__btn--close" type="button" data-lb-close aria-label="${esc(c.ui.close)}">${icon.close}</button>
    </div>
  </div>
</dialog>`
}
