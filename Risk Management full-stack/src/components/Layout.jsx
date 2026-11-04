import { useEffect, useState } from "react"
import { Link, NavLink, Outlet, useLocation } from "react-router"
import { isDemo } from "../api/index.js"
import { useRisks } from "../api/hooks.js"
import { useAuth } from "../lib/auth.jsx"
import { initials } from "../lib/format.js"
import { canOpen, ROLES, SECTIONS } from "../lib/roles.js"
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
      <aside id="menu" className={`sidebar ${menuOpen ? "is-open" : ""}`.trim()} aria-label="Navigation principale">
        <div className="sidebar-head">
          <Link to="/" className="min-w-0" aria-label="Tableau de bord">
            <LogoLockup collapsed={collapsed} />
          </Link>
          <button
            type="button"
            className="sidebar-icon-btn hidden lg:grid"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Déplier le menu" : "Replier le menu"}
            title={collapsed ? "Déplier le menu" : "Replier le menu"}
          >
            <Icon name="panel_left" className="size-[18px]" />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Sections">
          {SECTIONS.filter((section) => canOpen(section, role)).map((section) => (
            <NavLink
              key={section.path}
              to={section.path}
              end={section.path === "/"}
              className="nav-link"
              title={collapsed ? section.label : undefined}
            >
              <Icon name={section.icon} />
              {!collapsed && <span className="truncate">{section.label}</span>}
              {!collapsed && section.path === "/risques" && toRate > 0 && (
                <span className="nav-count" title={`${toRate} élément(s) à recoter`}>
                  {toRate}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {isDemo && !collapsed && (
          <div className="mx-4 rounded-md border border-white/15 bg-white/5 px-3 py-2.5 text-[11px] leading-relaxed text-[#c9d5df]">
            <span className="font-bold text-white">Mode démonstration.</span> Les données restent dans ce navigateur.
          </div>
        )}

        <div className="sidebar-foot">
          <span className="avatar" title={collapsed ? name : undefined}>
            {initials(name)}
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="truncate text-xs text-[var(--sidebar-muted)]">{ROLES[role].label}</p>
            </div>
          )}
          <div className={collapsed ? "grid gap-1" : "flex gap-0.5"}>
            <button
              type="button"
              className="sidebar-icon-btn"
              onClick={toggle}
              aria-label={theme === "dark" ? "Thème clair" : "Thème sombre"}
              title={theme === "dark" ? "Thème clair" : "Thème sombre"}
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} className="size-4" />
            </button>
            <button type="button" className="sidebar-icon-btn" onClick={signOut} aria-label="Se déconnecter" title="Se déconnecter">
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
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            <Icon name={menuOpen ? "close" : "menu"} className="size-5" />
          </button>
          <LogoMark className="size-7 rounded-[2px] ring-1 ring-white/15" />
          <span className="text-sm font-bold">Risques et enjeux</span>
        </div>
        <main>
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  )
}
