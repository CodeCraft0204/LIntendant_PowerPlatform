import { useEffect, useState, useSyncExternalStore } from "react"
import { Link } from "react-router"
import { t, useI18n } from "../i18n/index.js"
import Icon from "./Icon.jsx"
import { LogoMark, LogoWordmark } from "./Logo.jsx"

// Page title band, as in the ERP: small uppercase context line, bold title,
// muted description, status and "Retour" on the right.
export function PageHeader({ eyebrow, title, subtitle, actions, back }) {
  useI18n()
  return (
    <div className="page-band">
      <div className="page-inner page-header">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {(actions || back) && (
          <div className="flex flex-wrap items-center gap-2.5">
            {actions}
            {back && (
              <Link to={back.to} className="back-link">
                <Icon name="arrow_left" className="size-3.5" />
                {back.label ?? t("common.back")}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function Page({ children }) {
  return <div className="page-inner page-body">{children}</div>
}

export function StatCard({ label, value, sub, to, tone, children }) {
  const body = (
    <>
      <p className="eyebrow">{label}</p>
      <p className="stat-value" style={tone ? { color: `var(--${tone})` } : undefined}>
        {value}
      </p>
      {sub && <p className="stat-sub">{sub}</p>}
      {children}
    </>
  )
  return to ? (
    <Link to={to} className="card stat">
      {body}
    </Link>
  ) : (
    <div className="card stat">{body}</div>
  )
}

export function Card({ title, actions, children, className = "", bodyClassName = "card-body" }) {
  return (
    <section className={`card ${className}`.trim()}>
      {(title || actions) && (
        <header className="card-head">
          {title && <h2 className="card-title">{title}</h2>}
          {actions}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}

export function Field({ label, htmlFor, required, hint, error, children, className = "" }) {
  return (
    <div className={`field ${className}`.trim()}>
      {label && (
        <label htmlFor={htmlFor} className="field-label">
          {label}
          {required && (
            <span className="req" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <p className="field-error" id={htmlFor ? `${htmlFor}-error` : undefined}>
          {error}
        </p>
      ) : (
        hint && <p className="field-hint">{hint}</p>
      )}
    </div>
  )
}

export function Alert({ tone = "error", children, icon }) {
  if (!children) return null
  const glyph = icon ?? { error: "alert_triangle", warn: "alert_triangle", info: "info", success: "check_circle" }[tone]
  return (
    <div className={`alert alert-${tone}`} role={tone === "error" ? "alert" : "status"}>
      <Icon name={glyph} />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function EmptyState({ icon = "info", title, children, action }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-accent-soft text-accent dark:text-link">
        <Icon name={icon} className="size-5" />
      </span>
      <h2 className="mt-4 text-base font-bold text-ink">{title}</h2>
      {children && <div className="mt-1.5 max-w-lg text-sm leading-relaxed text-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function FullScreenLoader({ label }) {
  useI18n()
  return (
    <div className="grid min-h-svh place-items-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <LogoMark className="size-11 rounded-[3px]" />
        <span className="spinner" aria-hidden="true"></span>
        <span className="text-sm text-muted">{label ?? t("loader.register")}…</span>
      </div>
    </div>
  )
}

export function PageSpinner() {
  useI18n()
  return (
    <div className="grid min-h-[50vh] place-items-center" role="status" aria-label={t("loader.page")}>
      <span className="spinner"></span>
    </div>
  )
}

export function Skeleton({ className = "h-4 w-full" }) {
  return <span className={`skeleton block ${className}`} aria-hidden="true"></span>
}

// Sign-in and access screens: navy brand panel on the left (hidden on small
// screens), the form on the right.
export function AuthScreen({ title, description, children, footer, icon }) {
  useI18n()
  return (
    <main className="grid min-h-svh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="relative hidden overflow-hidden bg-[#003865] p-12 text-white lg:flex lg:flex-col" aria-hidden="true">
        <LogoWordmark className="h-[44px] w-auto self-start" />
        <div className="mt-auto max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a7b7c5]">{t("auth.panelEyebrow")}</p>
          <p className="mt-3 text-[28px] font-bold leading-snug">{t("auth.panelTitle")}</p>
          <p className="mt-3 text-[15px] leading-relaxed text-[#c9d5df]">{t("auth.panelText")}</p>
        </div>
        <svg viewBox="75 75 1350 1350" className="pointer-events-none absolute -right-24 -bottom-24 size-[26rem] opacity-[0.12]">
          <polygon points="462,338 660,338 660,944 462,1142" fill="#FFFFFF" />
          <polygon points="680,964 1038,964 1038,1162 482,1162" fill="#7C878E" />
          <rect x="1038" y="75" width="102" height="364" fill="#7C878E" />
        </svg>
      </aside>

      <section className="flex flex-col bg-surface px-6 py-10 sm:px-12">
        <div className="m-auto w-full max-w-sm">
          <LogoMark className="mb-8 size-12 rounded-[3px] lg:hidden" />
          {icon && (
            <span className="mb-5 grid size-11 place-items-center rounded-full bg-accent-soft text-accent dark:text-link">
              <Icon name={icon} className="size-5" />
            </span>
          )}
          <h1 className="text-2xl font-bold text-ink">{title}</h1>
          {description && <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>}
          <div className="mt-7">{children}</div>
          {footer && <div className="mt-8 border-t border-line pt-6 text-center text-sm text-muted">{footer}</div>}
        </div>
        <p className="mt-10 text-center text-xs text-muted">
          © {new Date().getFullYear()} L'Intendant · {t("auth.legal")}
        </p>
      </section>
    </main>
  )
}

// Toasts: `toast("Enregistré")` from anywhere, <Toaster /> once in the layout.
let current = null
const subscribers = new Set()
let timer = null

export function toast(message) {
  current = { message, id: Date.now() }
  subscribers.forEach((notify) => notify())
  clearTimeout(timer)
  timer = setTimeout(() => {
    current = null
    subscribers.forEach((notify) => notify())
  }, 3200)
}

export function Toaster() {
  const value = useSyncExternalStore(
    (notify) => {
      subscribers.add(notify)
      return () => subscribers.delete(notify)
    },
    () => current
  )
  if (!value) return null
  return (
    <div className="toast" role="status" aria-live="polite" key={value.id}>
      <Icon name="check_circle" className="size-4 shrink-0" />
      {value.message}
    </div>
  )
}

export function useDebounced(value, delay = 200) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(handle)
  }, [value, delay])
  return debounced
}
