/* eslint-disable react-refresh/only-export-components */
import * as React from "react"

import { apiFetch } from "@/lib/api"

interface Session {
  token: string
  username: string
}

interface AuthContextValue {
  session: Session | null
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined)

function readStoredSession(): Session | null {
  const token = localStorage.getItem("token")
  const username = localStorage.getItem("username")
  if (!token || !username) return null
  return { token, username }
}

interface AuthResponse {
  token: string
  user: { id: string; username: string }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(() => readStoredSession())

  const persist = React.useCallback((next: Session) => {
    localStorage.setItem("token", next.token)
    localStorage.setItem("username", next.username)
    setSession(next)
  }, [])

  const login = React.useCallback(
    async (username: string, password: string) => {
      const data = await apiFetch<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: { username, password },
        auth: false,
      })
      persist({ token: data.token, username: data.user.username })
    },
    [persist]
  )

  const register = React.useCallback(
    async (username: string, password: string) => {
      const data = await apiFetch<AuthResponse>("/api/auth/register", {
        method: "POST",
        body: { username, password },
        auth: false,
      })
      persist({ token: data.token, username: data.user.username })
    },
    [persist]
  )

  const logout = React.useCallback(() => {
    localStorage.removeItem("token")
    localStorage.removeItem("username")
    setSession(null)
  }, [])

  const value = React.useMemo(
    () => ({ session, login, register, logout }),
    [session, login, register, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
