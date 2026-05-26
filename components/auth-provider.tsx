"use client"

/**
 * components/auth-provider.tsx — Proveedor de Contexto de Autenticación.
 *
 * Envuelve la aplicación para proveer:
 *   - Estado actual de la sesión y usuario
 *   - Rol del usuario (desde la tabla user_profiles, con degradación a 'client')
 *   - Estado de carga (isLoading) para evitar bloqueos en la hidratación
 *   - Función signOut para cerrar sesión
 *
 * Escucha los cambios de estado de autenticación de Supabase (login, logout, refresco)
 * y mantiene el árbol de React sincronizado de forma resiliente.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import type { Session, User, AuthChangeEvent } from "@supabase/supabase-js"

// ── Tipos ──
interface AuthContextValue {
  session: Session | null
  user: User | null
  role: string | null
  isLoading: boolean
  setIsLoading: (isLoading: boolean) => void
  signOut: () => Promise<void>
}

// ── Contexto ──
const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  role: null,
  isLoading: true,
  setIsLoading: () => { },
  signOut: async () => { },
})

// ── Hook personalizado ──
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de un <AuthProvider>")
  }
  return ctx
}

// ── Proveedor ──
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // createBrowserClient is naturally a singleton on the client
  const supabase = createClient()

  // Obtener el rol del usuario desde la tabla user_profiles
  const fetchRole = useCallback(
    async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("id", userId)
          .single()

        if (error) {
          console.warn("[Auth] No se pudo obtener el rol del usuario, asignando 'client':", error.message)
          setRole("client")
          return
        }

        setRole(data?.role ?? "client")
      } catch (err) {
        console.error("[Auth] Excepción al obtener el rol, asignando 'client':", err)
        setRole("client")
      }
    },
    [supabase]
  )

  useEffect(() => {
    let resolved = false

    // [Sec-Driven] Safety timeout: if session initialization hangs for > 5 seconds,
    // force-stop the loading state and resolve the session as null (unauthenticated).
    // This prevents `authLoading` from getting permanently stuck at `true` under dormant tabs,
    // offline states, or corrupted/expired Supabase local storage.
    const authTimeout = setTimeout(() => {
      if (!resolved) {
        console.warn("[Auth] Initialization timed out (5s). Resolving state to unauthenticated.")
        setIsLoading(false)
        setSession(null)
        setUser(null)
        setRole(null)
      }
    }, 5000)

    // onAuthStateChange fires an INITIAL_SESSION event immediately upon mount.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, currentSession: Session | null) => {
      resolved = true
      clearTimeout(authTimeout) // Clear safety timeout if auth resolves successfully

      setSession(currentSession)
      setUser(currentSession?.user ?? null)

      if (currentSession?.user) {
        await fetchRole(currentSession.user.id)
      } else {
        setRole(null)
      }

      setIsLoading(false)

      // [Sec-Driven] Refresh the Next.js router cache on every meaningful auth transition:
      // - SIGNED_IN / SIGNED_OUT : obvious state changes
      // - TOKEN_REFRESHED        : Supabase silently issued a new JWT; flush old SSR cache
      //                           so client-side fetches immediately use the new access_token
      //                           from context and avoid 401s during long sessions.
      // - USER_UPDATED           : email/password change; context must re-sync immediately.
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        router.refresh()
      }
    })

    return () => {
      clearTimeout(authTimeout)
      subscription.unsubscribe()
    }
  }, [supabase, fetchRole, router])

  const signOut = useCallback(async () => {
    try {
      setIsLoading(true)
      console.log("[Auth] Initiating resilient signOut. Purging Supabase cookies and local state...")
      
      // 1. Perform background Supabase sign out FIRST to ensure cookies/storage are cleared synchronously
      await supabase.auth.signOut()
      
      // 2. Clear state variables cleanly
      setSession(null)
      setUser(null)
      setRole(null)
      
      // 3. Navigate to login safely
      router.push("/login")
    } catch (err) {
      console.error("[Auth] Error during resilient signOut. Forcing redirect to /login anyway:", err)
      // Fallback clean state and redirect even on failure
      setSession(null)
      setUser(null)
      setRole(null)
      router.push("/login")
    } finally {
      setIsLoading(false)
    }
  }, [supabase, router])


  return (
    <AuthContext.Provider value={{ session, user, role, isLoading, setIsLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
