import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// "virtual:demo-seed" is the SharePoint backup for the demo mode
// (src/demo/seed.generated.json, built by `npm run demo:seed`). It is only
// bundled when the app runs without Supabase (or with VITE_DEMO=1); a
// Supabase build gets `null`, so client data never ships with it.
//
// `npm test` always takes the demo path, regardless of what's in .env.local:
// a real Supabase project configured there for `npm run dev` must not make
// test results depend on whoever's machine runs them. This reads env files
// straight from disk, which is a different mechanism from the `test.env`
// override below (that one only reaches `import.meta.env` inside app code,
// not this plugin), so both need to know to treat "test" mode as demo mode.
function demoSeed(mode) {
  const id = "\0demo-seed"
  const file = resolve("src/demo/seed.generated.json")
  return {
    name: "lintendant-demo-seed",
    resolveId: (source) => (source === "virtual:demo-seed" ? id : undefined),
    load(source) {
      if (source !== id) return
      const env = mode === "test" ? {} : loadEnv(mode, process.cwd(), "")
      const supabase = Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_PUBLISHABLE_KEY) && env.VITE_DEMO !== "1"
      if (supabase || !existsSync(file)) return "export default null"
      this.addWatchFile(file)
      return `export default ${readFileSync(file, "utf8")}`
    },
  }
}

// By default Vite/Node resolve the bare hostname "localhost" to a single
// address (on this machine, the IPv6 loopback ::1 — `netstat` shows the dev
// server listening only on [::1]:5180). A VPN client or a system-wide proxy
// commonly disables or reroutes IPv6 without touching IPv4, which makes that
// default binding unreachable while the VPN/proxy is active, even though
// "localhost" still looks correct in the browser's address bar.
//
// Binding explicitly to the literal IPv4 loopback address sidesteps that: it
// never depends on how "localhost" resolves, or on IPv6 being usable, so the
// dev server stays reachable with the VPN/proxy on or off. The HMR
// WebSocket is pinned the same way, so it isn't left to re-resolve
// "localhost" in the browser and hit the same problem independently.
const LOOPBACK = "127.0.0.1"
const PORT = 5180

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), demoSeed(mode)],
  server: {
    host: LOOPBACK,
    port: PORT,
    strictPort: true,
    hmr: { host: LOOPBACK, clientPort: PORT },
  },
  preview: {
    host: LOOPBACK,
    port: PORT,
    strictPort: true,
  },
  test: {
    environment: "node",
    // Reaches `import.meta.env` in app code (src/lib/supabase.js), so the
    // demo backend is picked even when .env.local has real Supabase values.
    env: { VITE_DEMO: "1" },
  },
}))
