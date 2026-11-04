import { useEffect, useState } from "react"

const BROWSER_COLORS = { light: "#003865", dark: "#061a2c" }
const KEY = "lintendant-theme"

const currentTheme = () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light")

// Light (default, like the ERP) and dark themes; the choice is remembered in
// this browser. index.html applies the saved theme before first paint.
export default function useTheme() {
  const [theme, setTheme] = useState(currentTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", BROWSER_COLORS[theme])
  }, [theme])

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark"
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // Storage can be unavailable (private mode); the theme still applies for this visit.
    }
    setTheme(next)
  }

  return { theme, toggle }
}
