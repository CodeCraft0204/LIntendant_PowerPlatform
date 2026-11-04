import { useEffect, useState } from "react"
import { Link, NavLink, Outlet, useLocation } from "react-router"
import { isDemo } from "../api/index.js"
import { useRisks } from "../api/hooks.js"
import { useAuth } from "../lib/auth.jsx"
import { initials } from "../lib/format.js"
import { useI18n } from "../i18n/index.js"
import { canOpen, SECTIONS } from "../lib/roles.js"
import useTheme from "../lib/useTheme.js"
import Icon from "./Icon.jsx"
import { LogoLockup, LogoMark } from "./Logo.jsx"
import { Toaster } from "./ui.jsx"

const COLLAPSE_KEY = "lintendant-sidebar-collapsed"

const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1"
  } catch {
    return false
  }
}

// Navy sidebar (fixed on large screens, a drawer on small ones), as in the
// L'Intendant ERP, and the page area.
export default function Layout() {
  const { profile, role, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const { t } = useI18n()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const { data: risks } = useRisks()

  // Block bodies: an effect must return nothing or a cleanup function. Recent
  // Chrome makes window.scrollTo() return a Promise, which React would then
  // call as the cleanup ("destroy is not a function").
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, value ? "0" : "1")
      } catch {
        // Not remembered in private mode; still applies for this visit.
      }
      return !value
    })
  }

  const toRate = risks?.filter((risk) => risk.needs_rating).length ?? 0
  const name = profile.full_name || profile.email

  return (
    <div className={`shell ${collapsed ? "is-collapsed" : ""}`.trim()}>
      <aside id="menu" className={`sidebar ${menuOpen ? "is-open" : ""}`.trim()} aria-label={t("nav.main")}>
        <div className="sidebar-head">
          <Link to="/" className="min-w-0" aria-label={t("section./")}>
            <LogoLockup collapsed={collapsed} />
          </Link>
          <button
            type="button"
            className="sidebar-icon-btn hidden lg:grid"
            onClick={toggleCollapsed}
            aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
            title={collapsed ? t("nav.expand") : t("nav.collapse")}
          >
            <Icon name="panel_left" className="size-[18px]" />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label={t("nav.sections")}>
          {SECTIONS.filter((section) => canOpen(section, role)).map((section) => (
            <NavLink
              key={section.path}
              to={section.path}
              end={section.path === "/"}
              className="nav-link"
              title={collapsed ? t(`section.${section.path}`) : undefined}
            >
              <Icon name={section.icon} />
              {!collapsed && <span className="truncate">{t(`section.${section.path}`)}</span>}
              {!collapsed && section.path === "/risques" && toRate > 0 && (
                <span className="nav-count" title={t("nav.toRate", { count: toRate })}>
                  {toRate}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {isDemo && !collapsed && (
          <div className="mx-4 rounded-md border border-white/15 bg-white/5 px-3 py-2.5 text-[11px] leading-relaxed text-[#c9d5df]">
            <span className="font-bold text-white">{t("nav.demoTitle")}</span> {t("nav.demoText")}
          </div>
        )}

        <div className="sidebar-foot">
          <span className="avatar" title={collapsed ? name : undefined}>
            {initials(name)}
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="truncate text-xs text-[var(--sidebar-muted)]">{t(`role.${role}`)}</p>
            </div>
          )}
          <div className={collapsed ? "grid gap-1" : "flex gap-0.5"}>
            <button
              type="button"
              className="sidebar-icon-btn"
              onClick={toggle}
              aria-label={theme === "dark" ? t("nav.lightTheme") : t("nav.darkTheme")}
              title={theme === "dark" ? t("nav.lightTheme") : t("nav.darkTheme")}
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} className="size-4" />
            </button>
            <button type="button" className="sidebar-icon-btn" onClick={signOut} aria-label={t("common.signOut")} title={t("common.signOut")}>
              <Icon name="log_out" className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} aria-hidden="true"></div>}

      <div className="main">
        <div className="topbar">
          <button
            type="button"
            className="sidebar-icon-btn"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="menu"
            aria-label={menuOpen ? t("nav.close") : t("nav.open")}
          >
            <Icon name={menuOpen ? "close" : "menu"} className="size-5" />
          </button>
          <LogoMark className="size-7 rounded-[2px] ring-1 ring-white/15" />
          <span className="text-sm font-bold">{t("app.subtitle")}</span>
        </div>
        <main>
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  )
}
