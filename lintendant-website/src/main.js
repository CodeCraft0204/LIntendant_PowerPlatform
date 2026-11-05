// Interactions for the L'Intendant site. The page is fully rendered HTML;
// everything here is progressive enhancement and the site reads fine without
// it (reveal styles only apply under html.js).

const $ = (sel, root = document) => root.querySelector(sel)
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)]
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches

/* ------------------------------------------------------------ scroll loop */

// One passive listener feeds every scroll-driven effect through a single
// requestAnimationFrame, so the work happens at most once per frame.
const scrollHandlers = []
let scrollQueued = false
let lastY = scrollY
let velocity = 0

function runScroll() {
  scrollQueued = false
  const y = scrollY
  velocity = y - lastY
  for (const fn of scrollHandlers) fn(y, velocity)
  lastY = y
}

addEventListener(
  "scroll",
  () => {
    if (!scrollQueued) {
      scrollQueued = true
      requestAnimationFrame(runScroll)
    }
  },
  { passive: true },
)
addEventListener("resize", () => requestAnimationFrame(runScroll))

/* ----------------------------------------------------------------- header */

const header = $("[data-header]")
const progress = $("[data-progress]")
const body = document.body
let menuOpen = false

scrollHandlers.push((y, v) => {
  header.classList.toggle("is-solid", y > 24)
  const hoverLock = header.matches(":hover") || header.contains(document.activeElement)
  if (!menuOpen && !hoverLock && y > innerHeight * 0.7 && v > 2) header.classList.add("is-hidden")
  else if (v < -2 || y < 200) header.classList.remove("is-hidden")
  const max = document.documentElement.scrollHeight - innerHeight
  progress.style.setProperty("--p", max > 0 ? (y / max).toFixed(4) : 0)
})

// Bring a hidden header back when the pointer heads for the top edge.
if (finePointer) {
  addEventListener(
    "pointermove",
    (e) => {
      if (e.clientY < 72) header.classList.remove("is-hidden")
    },
    { passive: true },
  )
}

// Clicking a mega-menu link: close the panel even though the pointer is
// still over it.
function closeMega() {
  header.classList.add("mega-off")
  document.activeElement?.blur()
  setTimeout(() => header.classList.remove("mega-off"), 700)
}
$$(".mega a").forEach((a) => a.addEventListener("click", closeMega))
addEventListener("keydown", (e) => {
  if (e.key === "Escape" && header.querySelector(".mega:focus-within")) closeMega()
})

// Highlight the nav link of the section in view.
const navLinks = $$("[data-nav]")
const spy = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      navLinks.forEach((a) => a.classList.toggle("is-current", a.dataset.nav === entry.target.id))
    }
  },
  { rootMargin: "-45% 0px -50% 0px" },
)
// Every section is observed so the highlight clears over sections that have
// no nav entry (hero, trust, stats, contact).
$$("main > section").forEach((section) => spy.observe(section))

/* ------------------------------------------------------------------- menu */

const burger = $("[data-burger]")
const menu = $("[data-menu]")
const burgerLabel = $(".burger__label", burger)

function setMenu(open) {
  menuOpen = open
  burger.setAttribute("aria-expanded", String(open))
  burgerLabel.textContent = open ? burgerLabel.dataset.close : burgerLabel.dataset.open
  body.classList.toggle("menu-open", open)
  body.classList.toggle("is-locked", open)
  if (open) {
    menu.hidden = false
    header.classList.remove("is-hidden")
    requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add("is-open")))
    $("[data-menu-link]", menu)?.focus({ preventScroll: true })
  } else {
    menu.classList.remove("is-open")
    setTimeout(() => {
      if (!menuOpen) menu.hidden = true
    }, reduceMotion ? 0 : 700)
  }
}

burger.addEventListener("click", () => setMenu(!menuOpen))
$$("[data-menu-link], .menu__foot a", menu).forEach((a) => a.addEventListener("click", () => setMenu(false)))
addEventListener("keydown", (e) => {
  if (e.key === "Escape" && menuOpen) {
    setMenu(false)
    burger.focus()
  }
})

/* ----------------------------------------------------------------- reveal */

const revealer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      entry.target.classList.add("is-in")
      revealer.unobserve(entry.target)
    }
  },
  { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
)
$$("[data-reveal]").forEach((el) => revealer.observe(el))

/* ------------------------------------------------------------------- hero */

;(() => {
  const hero = $("[data-hero]")
  if (!hero) return
  const DURATION = 7000
  const slides = $$("[data-slide]", hero)
  const titles = $$("[data-title]", hero)
  const ctas = $$("[data-cta]", hero)
  const dots = $$("[data-dot]", hero)
  const pauseBtn = $("[data-pause]", hero)
  let index = 0
  let elapsed = 0
  let last = 0
  let userPaused = reduceMotion
  let visible = true

  function go(next) {
    if (next === index) return
    const prev = index
    index = (next + slides.length) % slides.length
    elapsed = 0
    slides.forEach((s, i) => s.classList.toggle("is-active", i === index))
    titles[prev].classList.remove("is-active")
    titles[prev].classList.add("is-leaving")
    titles[prev].setAttribute("aria-hidden", "true")
    setTimeout(() => titles[prev].classList.remove("is-leaving"), 900)
    titles[index].classList.remove("is-leaving")
    titles[index].classList.add("is-active")
    titles[index].removeAttribute("aria-hidden")
    ctas.forEach((a, i) => {
      const on = i === index
      a.classList.toggle("is-active", on)
      a.tabIndex = on ? 0 : -1
      a.toggleAttribute("aria-hidden", !on)
    })
    dots.forEach((d, i) => {
      d.classList.toggle("is-active", i === index)
      d.toggleAttribute("aria-current", i === index)
      $("i", d).style.setProperty("--t", i < index ? 1 : 0)
    })
  }

  function tick(now) {
    const dt = last ? now - last : 0
    last = now
    if (!userPaused && visible && !document.hidden) {
      elapsed += dt
      $("i", dots[index]).style.setProperty("--t", clamp(elapsed / DURATION, 0, 1).toFixed(4))
      if (elapsed >= DURATION) go(index + 1)
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)

  function setPaused(paused) {
    userPaused = paused
    hero.classList.toggle("is-paused", paused)
    pauseBtn.setAttribute("aria-label", paused ? pauseBtn.dataset.labelPlay : pauseBtn.dataset.labelPause)
  }
  setPaused(userPaused)
  pauseBtn.addEventListener("click", () => setPaused(!userPaused))
  dots.forEach((d, i) => d.addEventListener("click", () => go(i)))

  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(hero)

  // Swipe between slides on touch screens.
  let startX = null
  hero.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") startX = e.clientX
  })
  hero.addEventListener("pointerup", (e) => {
    if (startX === null) return
    const dx = e.clientX - startX
    startX = null
    if (Math.abs(dx) > 60) go(index + (dx < 0 ? 1 : -1))
  })
})()

/* ---------------------------------------------------------------- marquee */

;(() => {
  const track = $("[data-marquee]")
  if (!track || reduceMotion) return
  const first = track.firstElementChild
  let x = 0
  let boost = 0
  let width = first.offsetWidth
  let active = false
  let slow = false
  let last = 0
  new ResizeObserver(() => (width = first.offsetWidth)).observe(first)
  new IntersectionObserver(([e]) => (active = e.isIntersecting)).observe(track)
  // Scrolling down kicks the band forward, scrolling up throws it back.
  scrollHandlers.push((_y, v) => (boost = clamp(boost + v * 0.35, -30, 30)))
  track.addEventListener("pointerenter", () => (slow = true))
  track.addEventListener("pointerleave", () => (slow = false))

  function frame(now) {
    const dt = last ? Math.min(now - last, 50) : 16
    last = now
    if (active) {
      x -= ((slow ? 0.015 : 0.045) + boost * 0.01) * dt
      boost *= 0.93
      if (x <= -width) x += width
      if (x > 0) x -= width
      track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`
    }
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
})()

/* ---------------------------------------- statement lit word by word */

;(() => {
  const el = $("[data-scrub]")
  if (!el) return
  const words = $$(".sw", el)
  if (reduceMotion) return words.forEach((w) => w.classList.add("is-on"))
  let lit = -1
  scrollHandlers.push(() => {
    const r = el.getBoundingClientRect()
    const start = innerHeight * 0.88
    const end = innerHeight * 0.4
    const p = clamp((start - r.top) / (start - end + r.height * 0.6), 0, 1)
    const n = Math.round(p * words.length)
    if (n === lit) return
    lit = n
    words.forEach((w, i) => w.classList.toggle("is-on", i < n))
  })
})()

/* --------------------------------------------------------------- counters */

;(() => {
  const nums = $$("[data-count]")
  if (reduceMotion) return
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        io.unobserve(entry.target)
        const el = entry.target
        const to = Number(el.dataset.count)
        const t0 = performance.now()
        const dur = 1800
        const step = (now) => {
          const t = clamp((now - t0) / dur, 0, 1)
          el.textContent = Math.round(to * (1 - Math.pow(2, -10 * t)))
          if (t < 1) requestAnimationFrame(step)
          else el.textContent = to
        }
        requestAnimationFrame(step)
      }
    },
    { threshold: 0.6 },
  )
  nums.forEach((el) => {
    el.textContent = "0"
    io.observe(el)
  })
})()

/* ------------------------------------------------------------------- tabs */

// Accessible tabs with roving tabindex and arrow-key navigation.
function tabs(root, tabSel, panelSel, onChange) {
  const list = $$(tabSel, root)
  const panels = $$(panelSel, root)
  function select(i, focus = false) {
    list.forEach((t, k) => {
      const on = k === i
      t.classList.toggle("is-active", on)
      t.setAttribute("aria-selected", String(on))
      t.tabIndex = on ? 0 : -1
      panels[k].hidden = !on
      panels[k].classList.toggle("is-active", on)
    })
    if (focus) list[i].focus()
    onChange?.(i)
  }
  list.forEach((t, i) => {
    t.addEventListener("click", () => select(i))
    t.addEventListener("keydown", (e) => {
      const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
      if (e.key in keys) select((i + keys[e.key] + list.length) % list.length, true)
      else if (e.key === "Home") select(0, true)
      else if (e.key === "End") select(list.length - 1, true)
      else return
      e.preventDefault()
    })
  })
  return select
}

// 360° phases, mirrored on the dial.
;(() => {
  const root = $("[data-phases]")
  if (!root) return
  const rings = $$("[data-ring-line]", root)
  const markers = $$("[data-marker]", root)
  const tags = $$("[data-tag]", root)
  const select = tabs(root, ".phase-tab", ".phase", (i) => {
    ;[rings, markers, tags].forEach((set) => set.forEach((el, k) => el.classList.toggle("is-active", k === i)))
  })
  tags[0].classList.add("is-active")
  $$("[data-ring]", root).forEach((hit) => hit.addEventListener("click", () => select(Number(hit.dataset.ring))))
})()

// Service formulas. Links anywhere on the page with data-goto-svc open one.
;(() => {
  const root = $("[data-svc-tabs]")
  if (!root) return
  const select = tabs(root, ".svc-tab", ".svc", (i) => {
    // Keep the active chip visible in the horizontal list on small screens.
    const tab = $$(".svc-tab", root)[i]
    const strip = tab.parentElement
    if (strip.scrollWidth > strip.clientWidth) {
      strip.scrollTo({ left: tab.offsetLeft - 16, behavior: reduceMotion ? "auto" : "smooth" })
    }
  })
  $$("[data-goto-svc]").forEach((a) => a.addEventListener("click", () => select(Number(a.dataset.gotoSvc))))
})()

/* --------------------------------------------------------- featured rail */

;(() => {
  const rail = $("[data-rail]")
  if (!rail) return
  const track = $("[data-rail-track]", rail)
  const bar = $("[data-rail-bar]", rail)
  const current = $("[data-rail-current]")
  const badge = $("[data-cursor]", rail)
  const items = [...track.children]

  const stepSize = () => items[1].offsetLeft - items[0].offsetLeft

  function update() {
    const max = track.scrollWidth - track.clientWidth
    const p = max > 0 ? track.scrollLeft / max : 1
    const visibleShare = track.clientWidth / track.scrollWidth
    bar.style.setProperty("--p", (visibleShare + (1 - visibleShare) * p).toFixed(4))
    current.textContent = String(clamp(Math.round(track.scrollLeft / stepSize()) + 1, 1, items.length)).padStart(2, "0")
  }
  track.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true })
  addEventListener("resize", update)
  update()

  const behavior = reduceMotion ? "auto" : "smooth"
  $("[data-rail-prev]").addEventListener("click", () => track.scrollBy({ left: -stepSize(), behavior }))
  $("[data-rail-next]").addEventListener("click", () => track.scrollBy({ left: stepSize(), behavior }))

  if (!finePointer) return

  // Drag to scroll with the mouse, with a little inertia on release.
  let down = null
  let moved = false
  track.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return
    down = { x: e.clientX, left: track.scrollLeft, t: performance.now(), v: 0, lastX: e.clientX }
    moved = false
  })
  addEventListener("pointermove", (e) => {
    badge.style.translate = `${e.clientX}px ${e.clientY}px`
    if (!down) return
    const dx = e.clientX - down.x
    if (!moved && Math.abs(dx) > 6) {
      moved = true
      track.classList.add("is-dragging")
    }
    if (moved) {
      down.v = e.clientX - down.lastX
      down.lastX = e.clientX
      track.scrollLeft = down.left - dx
    }
  })
  addEventListener("pointerup", () => {
    if (!down) return
    const v = down.v
    down = null
    if (!moved) return
    track.classList.remove("is-dragging")
    if (Math.abs(v) > 2 && !reduceMotion) track.scrollBy({ left: -v * 14, behavior: "smooth" })
  })
  // A drag must not count as a click on the card under the pointer.
  track.addEventListener(
    "click",
    (e) => {
      if (moved) {
        e.preventDefault()
        e.stopPropagation()
        moved = false
      }
    },
    true,
  )

  track.addEventListener("pointerenter", () => badge.classList.add("is-on"))
  track.addEventListener("pointerleave", () => badge.classList.remove("is-on"))
})()

/* -------------------------------------------------------------- portfolio */

const portfolio = (() => {
  const root = $("[data-portfolio]")
  if (!root) return null
  const PAGE = Number(root.dataset.page)
  const tiles = $$(".tile", root)
  const chips = $$("[data-filter]", root)
  const moreWrap = $(".portfolio__more", root)
  const moreBtn = $("[data-more]", root)
  const moreCount = $("[data-more-count]", root)
  let filter = "all"
  let shown = PAGE

  tiles.forEach((t) => t.classList.remove("is-more"))

  function render(animateFrom = 0) {
    let k = 0
    let matched = 0
    tiles.forEach((tile) => {
      const match = filter === "all" || tile.dataset.sector === filter
      const visible = match && matched < shown
      if (match) matched++
      const wasHidden = tile.classList.contains("is-hidden")
      tile.classList.toggle("is-hidden", !visible)
      tile.classList.remove("is-entering")
      if (visible && (wasHidden || animateFrom === 0) && matched > animateFrom && !reduceMotion) {
        void tile.offsetWidth
        tile.style.setProperty("--k", k++)
        tile.classList.add("is-entering")
      }
    })
    const left = matched - shown
    moreWrap.hidden = left <= 0
    moreCount.textContent = left > 0 ? `(${left})` : ""
  }

  function setFilter(next) {
    filter = next
    shown = PAGE
    chips.forEach((c) => {
      const on = c.dataset.filter === next
      c.classList.toggle("is-active", on)
      c.setAttribute("aria-pressed", String(on))
    })
    render()
  }

  chips.forEach((c) => c.addEventListener("click", () => setFilter(c.dataset.filter)))
  moreBtn.addEventListener("click", () => {
    const from = shown
    shown += PAGE
    render(from)
  })
  $$("[data-goto-filter]").forEach((a) => a.addEventListener("click", () => setFilter(a.dataset.gotoFilter)))

  // First paint keeps the server-rendered state; no entrance animation.
  tiles.forEach((tile, i) => tile.classList.toggle("is-hidden", i >= PAGE))
  moreCount.textContent = `(${tiles.length - PAGE})`
  return { setFilter }
})()

/* --------------------------------------------------------------- lightbox */

;(() => {
  const dialog = $("[data-lightbox]")
  if (!dialog) return
  const image = $("[data-lb-img]", dialog)
  const name = $("[data-lb-name]", dialog)
  const sector = $("[data-lb-sector]", dialog)
  const count = $("[data-lb-count]", dialog)
  let list = []
  let index = 0

  function show(i) {
    index = (i + list.length) % list.length
    const b = list[index]
    image.classList.remove("is-in")
    image.removeAttribute("src")
    image.srcset = b.dataset.srcset
    image.sizes = "100vw"
    image.src = b.dataset.full
    image.alt = b.dataset.name
    void image.offsetWidth
    image.classList.add("is-in")
    name.textContent = b.dataset.name
    sector.textContent = b.dataset.sectorLabel
    count.textContent = `${String(index + 1).padStart(2, "0")} / ${String(list.length).padStart(2, "0")}`
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-lb]")
    if (!b) return
    // Navigate within the group that was clicked: the rail, or the
    // currently filtered and visible portfolio tiles.
    const group = b.closest("[data-rail-track], [data-grid]")
    list = $$("[data-lb]", group).filter((x) => !x.closest(".is-hidden"))
    dialog.showModal()
    show(list.indexOf(b))
  })

  $("[data-lb-prev]", dialog).addEventListener("click", () => show(index - 1))
  $("[data-lb-next]", dialog).addEventListener("click", () => show(index + 1))
  $("[data-lb-close]", dialog).addEventListener("click", () => dialog.close())
  dialog.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") show(index - 1)
    if (e.key === "ArrowRight") show(index + 1)
  })
  // Click on the dark area around the photo closes.
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog || e.target.classList.contains("lb__stage")) dialog.close()
  })
  dialog.addEventListener("close", () => body.classList.remove("is-locked"))
  dialog.addEventListener("toggle", () => body.classList.toggle("is-locked", dialog.open))

  let sx = null
  const stage = $(".lb__stage", dialog)
  stage.addEventListener("pointerdown", (e) => (sx = e.clientX))
  stage.addEventListener("pointerup", (e) => {
    if (sx === null) return
    const dx = e.clientX - sx
    sx = null
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1))
  })
})()

/* --------------------------------------------------------------- parallax */

;(() => {
  if (reduceMotion) return
  const items = $$("[data-parallax]").map((el) => ({ el, frame: el.parentElement }))
  scrollHandlers.push(() => {
    for (const { el, frame } of items) {
      const r = frame.getBoundingClientRect()
      if (r.bottom < 0 || r.top > innerHeight) continue
      const p = (r.top + r.height / 2 - innerHeight / 2) / (innerHeight + r.height)
      el.style.transform = `translate3d(0, ${(p * r.height * 0.18).toFixed(1)}px, 0)`
    }
  })
})()

/* ------------------------------------------------------------ contact form */

;(() => {
  const form = $("[data-form]")
  if (!form) return
  // Optional form backend (e.g. Formspree, a serverless function). Without
  // one, the form opens the visitor's email app with the message filled in.
  const endpoint = import.meta.env.VITE_CONTACT_ENDPOINT
  const status = $("[data-form-status]", form)
  const note = $("[data-form-note]", form)
  const submit = $("button[type=submit] .btn__label", form)
  const submitText = submit.textContent
  const d = form.dataset
  if (endpoint) note.hidden = true

  function check(field) {
    const input = $("input, textarea", field)
    if (!input) return true
    const v = input.value.trim()
    let msg = ""
    if (input.required && !v) msg = d.msgRequired
    else if (input.type === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) msg = d.msgEmail
    field.classList.toggle("is-invalid", Boolean(msg))
    $(".field__err", field) && ($(".field__err", field).textContent = msg)
    input.setAttribute("aria-invalid", String(Boolean(msg)))
    return !msg
  }

  $$(".field", form).forEach((f) => $("input, textarea", f)?.addEventListener("blur", () => f.classList.contains("is-invalid") && check(f)))

  form.addEventListener("submit", async (e) => {
    e.preventDefault()
    const fields = $$(".field", form)
    const ok = fields.map(check).every(Boolean)
    if (!ok) return $(".is-invalid input, .is-invalid textarea", form)?.focus()

    const data = Object.fromEntries(new FormData(form))
    status.className = "form__status"
    status.textContent = ""

    if (!endpoint) {
      const labels = Object.fromEntries($$("label", form).map((l) => [l.htmlFor.replace("f-", ""), l.textContent.replace(" *", "")]))
      const lines = Object.entries(data)
        .filter(([, v]) => v)
        .map(([k, v]) => (k === "message" ? `\n${v}` : `${labels[k]} : ${v}`))
      const subject = `${d.subject} — ${data.company || data.name}`
      location.href = `mailto:${d.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`
      return
    }

    submit.textContent = d.msgSending
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error(String(res.status))
      form.reset()
      status.textContent = d.msgSuccess
    } catch {
      status.classList.add("is-error")
      status.innerHTML = `${d.msgError} <a href="mailto:${d.email}">${d.email}</a>`
    } finally {
      submit.textContent = submitText
    }
  })
})()

runScroll()
export { portfolio }
