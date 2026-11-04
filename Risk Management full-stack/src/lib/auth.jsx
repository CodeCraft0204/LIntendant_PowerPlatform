import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { api } from "../api/index.js"

const AuthContext = createContext(null)

// The signed-in member. `session` and `profile` are undefined while loading
// and null when there is none. `role` is null until an admin grants one, or
// when the member is paused.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(undefined)

  useEffect(() => {
    let alive = true
    api.auth.getSession().then((next) => alive && setSession(next))
    const unsubscribe = api.auth.onChange((next) => setSession(next))
    return () => {
      alive = false
      unsubscribe()
    }
  }, [])

  const userId = session?.user?.id

  const loadProfile = useCallback(async () => {
    if (!userId) return setProfile(null)
    try {
      setProfile((await api.auth.getProfile(userId)) ?? null)
    } catch {
      setProfile(null)
    }
  }, [userId])

  const sessionKnown = session !== undefined
  useEffect(() => {
    if (!sessionKnown) return
    setProfile(undefined)
    loadProfile()
  }, [sessionKnown, loadProfile])

  const value = {
    session,
    profile,
    role: profile?.active ? profile.role : null,
    reloadProfile: loadProfile,
    signOut: () => api.auth.signOut(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
