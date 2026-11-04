import { useEffect, useState } from "react"
import { Navigate, useLocation, useNavigate } from "react-router"
import { api, isDemo } from "../api/index.js"
import Icon from "../components/Icon.jsx"
import { Alert, AuthScreen, Field } from "../components/ui.jsx"
import { useAuth } from "../lib/auth.jsx"
import { initials } from "../lib/format.js"
import { ROLES } from "../lib/roles.js"
import { microsoftSignIn } from "../lib/supabase.js"

function DemoLogin({ onDone }) {
  const [accounts, setAccounts] = useState([])
  useEffect(() => {
    api.auth.accounts().then(setAccounts)
  }, [])

  return (
    <AuthScreen
      title="Mode démonstration"
      description="Le registre fonctionne ici sans serveur, sur une copie locale des données. Choisissez un rôle pour voir ce que chacun peut faire."
    >
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
                {ROLES[account.role].label} · {ROLES[account.role].description}
              </span>
            </span>
            <Icon name="arrow_right" className="size-4 text-muted" />
          </button>
        ))}
      </div>
      <p className="mt-6 text-xs leading-relaxed text-muted">
        Pour la version réelle, configurez Supabase dans <code>.env.local</code> (voir le README) : connexion par courriel ou compte Microsoft, données
        protégées par rôle.
      </p>
    </AuthScreen>
  )
}

export default function Login() {
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
    <AuthScreen
      title="Connexion"
      description="Registre des risques et enjeux du Bureau de projet."
      footer="Pas encore d'accès ? Demandez à un administrateur du Bureau de projet de vous inviter."
    >
      {microsoftSignIn && (
        <>
          <button type="button" className="btn btn-secondary w-full" onClick={() => api.auth.signInWithMicrosoft().catch((failure) => setError(failure.message))}>
            <svg viewBox="0 0 21 21" className="size-4" aria-hidden="true">
              <rect x="1" y="1" width="9" height="9" fill="#f25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
              <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
            </svg>
            Continuer avec Microsoft
          </button>
          <div className="my-5 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-[var(--line)]"></span>ou<span className="h-px flex-1 bg-[var(--line)]"></span>
          </div>
        </>
      )}

      {sent ? (
        <Alert tone="success">
          Un lien de connexion a été envoyé à <strong>{email}</strong>. Ouvrez-le sur cet appareil.
        </Alert>
      ) : (
        <form className="grid gap-4" onSubmit={submit}>
          <Field label="Courriel" htmlFor="email">
            <input id="email" className="input" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          {mode === "password" && (
            <Field label="Mot de passe" htmlFor="password">
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
            {busy ? "Connexion…" : mode === "password" ? "Se connecter" : "Recevoir un lien de connexion"}
          </button>
          <button type="button" className="btn btn-ghost w-full" onClick={() => setMode(mode === "password" ? "link" : "password")}>
            {mode === "password" ? "Recevoir plutôt un lien par courriel" : "Utiliser un mot de passe"}
          </button>
        </form>
      )}
    </AuthScreen>
  )
}
