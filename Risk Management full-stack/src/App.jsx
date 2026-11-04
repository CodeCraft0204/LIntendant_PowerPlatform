import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { lazy, Suspense, useState } from "react"
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router"
import Layout from "./components/Layout.jsx"
import { AuthScreen, EmptyState, FullScreenLoader, PageSpinner } from "./components/ui.jsx"
import { AuthProvider, useAuth } from "./lib/auth.jsx"
import { canOpen, SECTIONS } from "./lib/roles.js"
import Dashboard from "./pages/Dashboard.jsx"
import Login from "./pages/Login.jsx"

const Register = lazy(() => import("./pages/Register.jsx"))
const RiskPage = lazy(() => import("./pages/RiskPage.jsx"))
const Projects = lazy(() => import("./pages/Projects.jsx"))
const ProjectPage = lazy(() => import("./pages/ProjectPage.jsx"))
const Reference = lazy(() => import("./pages/Reference.jsx"))
const Admin = lazy(() => import("./pages/Admin.jsx"))

function AwaitingAccess() {
  const { profile, signOut, reloadProfile } = useAuth()
  const [checking, setChecking] = useState(false)
  const paused = profile?.active === false

  return (
    <AuthScreen
      icon={paused ? "lock" : "clock"}
      title={paused ? "Votre accès est suspendu" : "Presque prêt"}
      description={
        paused
          ? `${profile?.email ?? "Ce compte"} ne peut pas ouvrir le registre pour le moment. Communiquez avec un administrateur.`
          : `Votre compte${profile?.email ? ` (${profile.email})` : ""} est créé. Un administrateur doit maintenant vous attribuer un rôle.`
      }
    >
      <div className="grid gap-3">
        {!paused && (
          <button
            type="button"
            className="btn btn-primary w-full"
            disabled={checking}
            onClick={async () => {
              setChecking(true)
              await reloadProfile()
              setChecking(false)
            }}
          >
            {checking ? "Vérification…" : "Vérifier de nouveau"}
          </button>
        )}
        <button type="button" className="btn btn-secondary w-full" onClick={signOut}>
          Se déconnecter
        </button>
      </div>
    </AuthScreen>
  )
}

// Everything behind sign-in: members with an active role get the layout.
function Gate() {
  const { session, profile, role } = useAuth()
  const location = useLocation()

  if (session === undefined || (session && profile === undefined)) return <FullScreenLoader />
  if (!session) return <Navigate to="/connexion" replace state={{ from: location.pathname + location.search }} />
  if (!role) return <AwaitingAccess />
  return <Layout />
}

function Guarded({ path, children }) {
  const { role } = useAuth()
  const section = SECTIONS.find((item) => item.path === path)
  if (section && !canOpen(section, role)) {
    return (
      <div className="page-inner page-body">
        <EmptyState icon="lock" title="Section non disponible pour votre rôle">
          Communiquez avec un administrateur si vous avez besoin d'accéder à {section.label.toLowerCase()}.
        </EmptyState>
      </div>
    )
  }
  return <Suspense fallback={<PageSpinner />}>{children}</Suspense>
}

const newQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: true, retry: 1 } } })

export default function App() {
  const [queryClient] = useState(newQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/connexion" element={<Login />} />
            <Route element={<Gate />}>
              <Route index element={<Dashboard />} />
              <Route path="risques" element={<Guarded path="/risques"><Register /></Guarded>} />
              <Route path="risques/nouveau" element={<Guarded path="/risques"><RiskPage /></Guarded>} />
              <Route path="risques/:id" element={<Guarded path="/risques"><RiskPage /></Guarded>} />
              <Route path="projets" element={<Guarded path="/projets"><Projects /></Guarded>} />
              <Route path="projets/:number" element={<Guarded path="/projets"><ProjectPage /></Guarded>} />
              <Route path="reference" element={<Guarded path="/reference"><Reference /></Guarded>} />
              <Route path="administration" element={<Guarded path="/administration"><Admin /></Guarded>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
