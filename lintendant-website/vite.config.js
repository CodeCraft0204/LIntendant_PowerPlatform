import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { defineConfig } from "vite"

// Each HTML entry is an empty shell; this plugin replaces it with the page
// rendered by src/render/page.js for that entry's language. It runs before
// Vite's own HTML processing ("pre"), so the stylesheet and script tags the
// renderer emits are bundled and hashed as usual.
const PAGES = { "/index.html": "fr", "/en/index.html": "en" }
const RENDER_ENTRY = "/src/render/page.js"
const WATCHED = /[\/]src[\/](render|content|data)[\/]/

function renderPages() {
  let server
  return {
    name: "lintendant-render",
    configureServer(s) {
      server = s
    },
    transformIndexHtml: {
      order: "pre",
      async handler(_html, ctx) {
        const lang = PAGES[ctx.path]
        if (!lang) throw new Error(`No language mapped for ${ctx.path}`)
        // Dev loads through Vite so edits to content/render files are picked
        // up without a restart; the build imports the module directly.
        const mod = server
          ? await server.ssrLoadModule(RENDER_ENTRY)
          : await import(pathToFileURL(resolve(`.${RENDER_ENTRY}`)).href)
        return mod.renderPage(lang)
      },
    },
    handleHotUpdate({ file, server }) {
      if (!WATCHED.test(file)) return
      server.ws.send({ type: "full-reload" })
      return []
    },
  }
}

// 0.0.0.0 binds to all interfaces so the dev server is reachable over a VPN
// or from a VPS. Use HOST env var to override (e.g. HOST=127.0.0.1 npm run dev
// to restrict to loopback only).
const HOST = process.env.HOST ?? "0.0.0.0"
const PORT = Number(process.env.PORT ?? 5191)

export default defineConfig({
  plugins: [renderPages()],
  server: { host: HOST, port: PORT, strictPort: false },
  preview: { host: HOST, port: PORT, strictPort: false },
  build: {
    rolldownOptions: {
      input: {
        fr: resolve("index.html"),
        en: resolve("en/index.html"),
      },
    },
  },
})
