# L'Intendant — website

Static marketing site for L'Intendant, replacing the PHP site at lintendant.com.
French at `/`, English at `/en/`. Built with Vite and vanilla JavaScript: the
pages are rendered to plain HTML at build time, with no framework shipped to
the browser.

| Production output | Size (gzip) |
| --- | --- |
| HTML per language | ~37 kB |
| CSS | ~11 kB |
| JS | ~4.5 kB |
| Font (Montserrat, Latin subset) | ~38 kB |
| Photos | responsive WebP, lazy-loaded, blur-up placeholders |

## Commands

```bash
npm install
npm run dev       # http://127.0.0.1:5190
npm run build     # -> dist/ (deploy this folder to any static host)
npm run preview   # serve dist/ locally
npm run images    # rebuild public/img from the legacy site export (see below)
```

## Where things live

```
src/content/fr.js, en.js   all copy, key for key in both languages
src/data/projects.js       the 77 portfolio projects (name, sector, source photo)
src/data/site.js           hero photos, lifecycle stage photos, featured projects, marquee, sector order, email
src/render/                HTML templates (page.js = document, sections.js = sections)
src/render/brand.js        wordmark + L' mark vectors (from the legacy site's inline SVG)
src/styles/main.css        design tokens and all styles
src/main.js                interactions (progressive enhancement)
vite.config.js             renders each HTML entry with src/render/page.js
```

To change text, edit `src/content/fr.js` and `src/content/en.js`. In titles,
`*word*` makes the word bold. In dev, the page reloads on save.

To add a project: add an entry to `src/data/projects.js`, put its photo in the
source folder, then run `npm run images`.

## Images

`scripts/build-images.mjs` reads the original photos from the saved legacy site
(`../Risk Management full-stack/src/assets/Origin Lintendant`, or another folder
via `IMAGES_SRC=...`), plus the photos supplied for the new site in `assets/`
(the team portraits used in the lifecycle section), and writes:

- `public/img/<slug>-<width>.webp` at several widths, never upscaled
- `src/data/images.generated.js` with sizes and blur placeholders
- `public/favicon.svg` and the social share image `public/og.jpg`
- `public/img/blueprint-<width>.webp` from the construction line drawing in
  `assets/hero-bg.png`, used as a CSS mask (`.bp` in the stylesheet) so each
  section can tint it

The generated files are committed, so building the site does not need the
source photos. Re-run the script only when photos change (`-- --force` to
redo everything).

## Contact form

With no configuration, submitting the form opens the visitor's email app with
the message addressed to info@lintendant.com. To receive submissions directly,
set a form endpoint that accepts a JSON POST (e.g. Formspree or a serverless
function) at build time:

```bash
VITE_CONTACT_ENDPOINT=https://formspree.io/f/xxxx npm run build
```

## Brand

Navy `#003865`, slate `#7C878E`, silver `#C7C9C8`, mist `#DEE1E3`, Montserrat.
The wordmark's slate apostrophe bar is reused as the eyebrow accent, and the
stem of the L' mark is used for bullets and separators.

Two vertical grid lines run from the header through every section to the
footer (`--gl-l` / `--gl-r` in `main.css`, on any element with the `lined`
class). On desktop they split the header into logo | menu | actions, and the
hero panel, the cost-time-performance equation, the stats and the footer
columns are aligned to them.
