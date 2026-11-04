import { useEffect, useState } from "react"
import { Navigate, useLocation, useNavigate } from "react-router"
import { api, isDemo } from "../api/index.js"
import Icon from "../components/Icon.jsx"
import { Alert, AuthScreen, Field } from "../components/ui.jsx"
import { useI18n } from "../i18n/index.js"
import { useAuth } from "../lib/auth.jsx"
import { initials } from "../lib/format.js"
import { microsoftSignIn } from "../lib/supabase.js"

function DemoLogin({ onDone }) {
  const { t } = useI18n()
  const [accounts, setAccounts] = useState([])
  useEffect(() => {
    api.auth.accounts().then(setAccounts)
  }, [])

  return (
    <AuthScreen title={t("auth.demoTitle")} description={t("auth.demoText")}>
      <div className="grid gap-2.5">
        {accounts.map((account) => (
          <button
            key={account.id}
            type="button"
            className="card flex items-center gap-3 px-4 py-3 text-left transition hover:border-[var(--line-strong)] hover:shadow-[var(--shadow-pop)]"
            onClick={async () => {
              await api.auth.signInAs(account.id)
              onDone()
            }}
          >
            <span className="avatar">{initials(account.full_name)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-ink">{account.full_name}</span>
              <span className="block truncate text-xs text-muted">
                {t(`role.${account.role}`)} · {t(`roleDescription.${account.role}`)}
              </span>
            </span>
            <Icon name="arrow_right" className="size-4 text-muted" />
          </button>
        ))}
      </div>
      <p className="mt-6 text-xs leading-relaxed text-muted">{t("auth.demoNote")}</p>
    </AuthScreen>
  )
}

export default function Login() {
  const { t } = useI18n()
  const { session } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mode, setMode] = useState("password")
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const target = location.state?.from ?? "/"
  if (session) return <Navigate to={target} replace />
  if (isDemo) return <DemoLogin onDone={() => navigate(target, { replace: true })} />

  const submit = async (event) => {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === "password") await api.auth.signInWithPassword(email, password)
      else {
        await api.auth.signInWithLink(email)
        setSent(true)
      }
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthScreen title={t("auth.title")} description={t("auth.description")} footer={t("auth.noAccess")}>
      {microsoftSignIn && (
        <>
          <button type="button" className="btn btn-secondary w-full" onClick={() => api.auth.signInWithMicrosoft().catch((failure) => setError(failure.message))}>
            <svg viewBox="0 0 21 21" className="size-4" aria-hidden="true">
              <rect x="1" y="1" width="9" height="9" fill="#f25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
              <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
            </svg>
            {t("auth.microsoft")}
          </button>
          <div className="my-5 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-[var(--line)]"></span>
            {t("auth.or")}
            <span className="h-px flex-1 bg-[var(--line)]"></span>
          </div>
        </>
      )}

      {sent ? (
        <Alert tone="success">{t("auth.linkSent", { email })}</Alert>
      ) : (
        <form className="grid gap-4" onSubmit={submit}>
          <Field label={t("auth.email")} htmlFor="email">
            <input id="email" className="input" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          {mode === "password" && (
            <Field label={t("auth.password")} htmlFor="password">
              <input
                id="password"
                className="input"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
          )}
          <Alert>{error}</Alert>
          <button type="submit" className="btn btn-primary w-full" disabled={busy}>
            {busy ? t("auth.signingIn") : mode === "password" ? t("auth.signIn") : t("auth.sendLink")}
          </button>
          <button type="button" className="btn btn-ghost w-full" onClick={() => setMode(mode === "password" ? "link" : "password")}>
            {mode === "password" ? t("auth.useLink") : t("auth.usePassword")}
          </button>
        </form>
      )}
    </AuthScreen>
  )
}
