"use client"

/**
 * app/dashboard/page.tsx — Protected prospecting dashboard.
 *
 * This is the main application view (previously at /).
 * The auth guard (middleware) ensures only authenticated users reach this page.
 * The fetch call to the backend now includes the JWT Authorization header.
 */

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"

import { AppHeader } from "@/components/app-header"
import { ResultsPanel } from "@/components/results-panel"
import { SearchForm } from "@/components/search-form"
import { useAuth } from "@/components/auth-provider"
import { createClient } from "@/utils/supabase/client"
import type { ProspectRequest, ProspectResult, SavedQuery, JobProgress } from "@/lib/types"
import { apiFetch } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

const INITIAL_FORM: ProspectRequest = {
  sector: "",
  pais: "",
  tamano_empresa: "",
  cargo_decision: "",
  dolor_cliente: "",
  propuesta_valor: "",
  limite_perfiles: 30,
  triggers_compra: "",
  casos_exito: "",
  keywords_industria: "",
}

const LS_KEYS = {
  form: "prospect_form_state",
  results: "prospect_results_state",
  jobId: "prospect_active_job_id",
} as const

// ── Polling config ──────────────────────────────────────────────────────────
// Exponential backoff: starts at POLL_MIN_MS, doubles each attempt, caps at POLL_MAX_MS.
// Total budget: ~300 s (5 minutes) before the soft-timeout fires.
const POLL_MIN_MS = 2_000   // 2 s  – initial interval
const POLL_MAX_MS = 10_000  // 10 s – maximum interval
const POLL_BUDGET_MS = 300_000 // 5 min total

export default function DashboardPage() {
  const { session, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const isSessionReady = !authLoading && !!session

  const [form, setForm] = useState<ProspectRequest>(INITIAL_FORM)
  const [results, setResults] = useState<ProspectResult[]>([])
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [activeQueryId, setActiveQueryId] = useState<string | null>(null)
  const [searchTimestamp, setSearchTimestamp] = useState<number>(Date.now())

  // Timeout-fallback state — shown when polling exhausts its budget
  const [isTimedOut, setIsTimedOut] = useState(false)
  const [timedOutJobId, setTimedOutJobId] = useState<string | null>(null)

  // Granular progress for the progress bar
  const [jobProgress, setJobProgress] = useState<JobProgress>({ phase: "", processed: 0, total: 0 })

  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pollStartRef = useRef<number>(0)       // wall-clock start of the current poll
  const pollIntervalRef = useRef<number>(POLL_MIN_MS) // current backoff interval
  const lastProgressHash = useRef<string>("") // prevent re-render loops

  // Clean up polling timer on unmount
  useEffect(() => {
    return () => {
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current)
      }
    }
  }, [])

  // Redirect to login if no session (client-side fallback, middleware handles SSR)
  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/login")
    }
  }, [authLoading, session, router])

  // Cargar estado inicial desde localStorage en el cliente al montar
  // Si había un job activo antes de que el usuario recargara la página, lo retomamos.
  useEffect(() => {
    try {
      const savedForm = localStorage.getItem(LS_KEYS.form)
      if (savedForm) setForm(JSON.parse(savedForm))

      const savedResults = localStorage.getItem(LS_KEYS.results)
      if (savedResults) {
        const parsedResults = JSON.parse(savedResults)
        setResults(parsedResults)
        if (parsedResults.length > 0) setHasSearched(true)
      }
    } catch (err) {
      console.error("[Frontend] Error cargando estado desde localStorage:", err)
    } finally {
      setIsInitialized(true)
    }
  }, [])

  // [State Recovery] — After auth is ready, check for an in-progress job from before a page refresh.
  useEffect(() => {
    if (!session || !isInitialized) return
    const savedJobId = localStorage.getItem(LS_KEYS.jobId)
    if (!savedJobId) return

    console.log(`[Frontend] Recuperando job en curso desde localStorage: ${savedJobId}`)
    toast({
      title: "Retomando prospección",
      description: "Se detectó una búsqueda en curso. Reconectando...",
    })
    setIsLoading(true)
    setIsTimedOut(false)
    setTimedOutJobId(null)
    pollJob(savedJobId, session.access_token)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isInitialized])

  const fetchQueries = async () => {
    try {
      const supabase = createClient()
      const { data: { session: currentSession } } = await supabase.auth.getSession()

      if (!currentSession?.access_token) {
        console.error("[Frontend] No valid session for fetching queries.")
        router.push("/login")
        return
      }

      const response = await apiFetch("/api/v1/queries", {
        token: currentSession.access_token,
      })

      if (response.status === 401) {
        console.error("[Frontend] Token expirado al obtener consultas. Redirigiendo...")
        toast({
          variant: "destructive",
          title: "Sesión expirada",
          description: "Tu sesión ha expirado, por favor inicia sesión nuevamente.",
        })
        router.push("/login")
        return
      }

      if (response.ok) {
        const data = await response.json()
        setSavedQueries(data)
      } else {
        console.error(`[Frontend] Error HTTP ${response.status} al obtener consultas`)
      }
    } catch (err) {
      console.error("[Frontend] Error fetching queries:", err)
    }
  }

  // Effect to fetch queries when session is ready
  useEffect(() => {
    if (session) {
      fetchQueries()
    }
  }, [session])

  // Guardar estado del formulario cuando cambie, solo después de inicializar
  useEffect(() => {
    if (!isInitialized) return
    try {
      localStorage.setItem(LS_KEYS.form, JSON.stringify(form))
    } catch (err) {
      console.error("[Frontend] Error guardando form en localStorage:", err)
    }
  }, [form, isInitialized])

  // Guardar resultados cuando cambien, solo después de inicializar
  useEffect(() => {
    if (!isInitialized) return
    try {
      localStorage.setItem(LS_KEYS.results, JSON.stringify(results))
    } catch (err) {
      console.error("[Frontend] Error guardando resultados en localStorage:", err)
    }
  }, [results, isInitialized])

  const handleChange = (patch: Partial<ProspectRequest>) => {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  const handleClear = () => {
    resetSystemState()
    setForm(INITIAL_FORM)
  }

  const resetSystemState = () => {
    console.log("[Frontend] Executing Hard Reset of system state.")
    try {
      localStorage.removeItem(LS_KEYS.form)
      localStorage.removeItem(LS_KEYS.results)
      localStorage.removeItem(LS_KEYS.jobId)
    } catch (err) {
      console.error("[Frontend] Error clearing localStorage on hard reset:", err)
    }

    if (pollingTimerRef.current) {
      clearTimeout(pollingTimerRef.current)
      pollingTimerRef.current = null
    }

    setResults([])
    setIsLoading(false)
    setJobProgress({ phase: "", processed: 0, total: 0 })
    setIsTimedOut(false)
    setTimedOutJobId(null)
    setHasSearched(false)
    setActiveQueryId(null)
    setSearchTimestamp(Date.now())
  }

  // ── UPDATED: fetch explícitamente refresca y verifica la sesión y el token ──
  const handleSubmit = async () => {
    // Force reset at the very beginning to clear any stale/frozen states synchronously
    resetSystemState()

    const { sector, pais, tamano_empresa, cargo_decision, dolor_cliente, propuesta_valor } = form

    // Validate ONLY the required fields.
    if (!sector?.trim() || !pais?.trim() || !tamano_empresa?.trim() || !cargo_decision?.trim() || !dolor_cliente?.trim() || !propuesta_valor?.trim()) {
      try {
        toast({
          variant: "destructive",
          title: "Campos incompletos",
          description: "Por favor, completa todos los campos requeridos del formulario.",
        })
      } catch (e) {
        console.error("[Frontend] Error showing incomplete fields toast:", e)
      }
      return
    }

    setIsLoading(true)
    setJobProgress({ phase: "Iniciando prospección", processed: 0, total: 0 })

    let jobStarted = false

    try {
      // ── Synchronization buffer ───────────────────────────────────────────────
      // Allow React's reconciler to catch up before the next API fetch.
      await new Promise((resolve) => setTimeout(resolve, 100))

      // [Error Boundary]: Pre-flight serialization check
      let bodyPayload;
      try {
        bodyPayload = JSON.stringify(form);
      } catch (err) {
        console.error("[Frontend] Error de serialización pre-flight:", err);
        throw err;
      }

      // Obtenemos la sesión más reciente llamando a getSession() directamente en el cliente
      const supabase = createClient()
      const { data: { session: currentSession } } = await supabase.auth.getSession()

      const accessToken = currentSession?.access_token
      if (!accessToken) {
        console.error("[Frontend] No access token available. Redirecting to login.")
        router.push("/login")
        return
      }

      console.log("[Frontend] Enviando solicitud de prospección (autenticada):", form)

      const response = await apiFetch("/api/v1/prospect", {
        method: "POST",
        token: accessToken,
        body: bodyPayload,
      })

      if (response.status === 401) {
        console.error("[Frontend] Token inválido o expirado en el backend. Redirigiendo a login.")
        router.push("/login")
        return
      }

      if (!response.ok) {
        const errorBody = await response.text()
        console.error(`[Frontend] Error HTTP ${response.status}:`, errorBody)
        throw new Error(`Error del servidor: ${response.status}`)
      }

      const data = await response.json()

      if (data.job_id) {
        console.log(`[Frontend] Job iniciado con ID: ${data.job_id}. Iniciando polling...`)
        try {
          toast({
            title: "Prospección en curso",
            description: "Buscando y evaluando perfiles. Este proceso puede tomar varios minutos...",
          })
        } catch (e) {
          console.error("[Frontend] Error showing running job toast:", e)
        }
        jobStarted = true
        pollJob(data.job_id, accessToken)
      } else {
        // Fallback para ejecución síncrona
        const leads: ProspectResult[] = data.leads ?? []
        console.log(`[Frontend] Prospección síncrona completada.`)
        setResults(leads)
        setHasSearched(true)
      }
    } catch (criticalError) {
      console.error("[Frontend] Uncaught error in handleSubmit:", criticalError)
      try {
        toast({
          variant: "destructive",
          title: "Error inesperado",
          description: "Ocurrió un error crítico al iniciar la prospección.",
        })
      } catch (e) {
        console.error("[Frontend] Error showing critical error toast:", e)
      }
    } finally {
      // Ensure the UI never hangs indefinitely if the API errors before job starts
      if (!jobStarted) {
        setIsLoading(false)
      }
    }
  }

  /**
   * pollJob — Resilient job polling with exponential backoff and 5-minute budget.
   *
   * • Backoff: starts at POLL_MIN_MS (2 s), doubles each attempt, caps at POLL_MAX_MS (10 s).
   * • Budget:  300 s total. On soft-timeout it surfaces a manual-retry UI instead of
   *            hard-failing, so users can keep waiting or manually trigger one final check.
   * • Recovery: job_id is persisted in localStorage so a page refresh can resume polling.
   */
  const pollJob = useCallback(async (jobId: string, accessToken: string) => {
    // Persist job id for state recovery across page refreshes
    try { localStorage.setItem(LS_KEYS.jobId, jobId) } catch { /* ignore */ }

    // Reset backoff counters for this poll session
    pollStartRef.current = Date.now()
    pollIntervalRef.current = POLL_MIN_MS

    const checkStatus = async () => {
      try {
        const response = await apiFetch(`/api/v1/prospect/job/${jobId}`, {
          token: accessToken,
        })

        if (response.status === 401) {
          console.error("[Frontend] Token inválido durante el polling.")
          try { localStorage.removeItem(LS_KEYS.jobId) } catch { /* ignore */ }
          router.push("/login")
          return
        }

        if (!response.ok) {
          throw new Error(`Error polling job: ${response.status}`)
        }

        const data = await response.json()
        const elapsed = Date.now() - pollStartRef.current

        if (data.status === "completed") {
          console.log(`[Frontend] ✅ Job completado (${Math.round(elapsed / 1000)} s): ${jobId}`)
          const leads: ProspectResult[] = data.result?.leads ?? []
          try { localStorage.removeItem(LS_KEYS.jobId) } catch { /* ignore */ }

          // ── Safety net: backend returned "completed" but 0 leads (should now be "error", but guard anyway) ──
          if (leads.length === 0) {
            setResults([])
            setHasSearched(true)
            setIsLoading(false)
            setIsTimedOut(false)
            setTimedOutJobId(null)
            setJobProgress({ phase: "", processed: 0, total: 0 })
            if (pollingTimerRef.current) {
              clearTimeout(pollingTimerRef.current)
              pollingTimerRef.current = null
            }
            toast({
              variant: "destructive",
              title: "⚠️ No se encontraron leads",
              description: "No se encontraron leads. Intenta ampliar tus criterios de búsqueda o verifica el scraper.",
            })
            return
          }

          setResults(leads)
          setHasSearched(true)
          setIsLoading(false)
          setIsTimedOut(false)
          setTimedOutJobId(null)
          setJobProgress({ phase: "Completado", processed: data.processed_leads ?? leads.length, total: data.total_leads ?? leads.length })
          if (pollingTimerRef.current) {
            clearTimeout(pollingTimerRef.current)
            pollingTimerRef.current = null
          }
          toast({
            title: "✅ Prospección completada",
            description: `Se encontraron ${leads.length} leads.`,
          })
          return
        }

        if (data.status === "error") {
          // ── Explicit zero-profile termination from the backend ──
          console.warn(`[Frontend] ⚠️ Job terminó con 0 perfiles (cookie/match): ${jobId}`, data.error)
          try { localStorage.removeItem(LS_KEYS.jobId) } catch { /* ignore */ }
          toast({
            variant: "destructive",
            title: "⚠️ No se encontraron leads",
            description: data.error ?? "No se encontraron leads. Intenta ampliar tus criterios de búsqueda o verifica el scraper.",
          })
          setResults([])
          setHasSearched(true)
          setIsLoading(false)
          setIsTimedOut(false)
          setTimedOutJobId(null)
          setJobProgress({ phase: "", processed: 0, total: 0 })
          if (pollingTimerRef.current) {
            clearTimeout(pollingTimerRef.current)
            pollingTimerRef.current = null
          }
          return
        }

        if (data.status === "failed") {
          console.error(`[Frontend] ❌ Job fallido: ${jobId}`, data.error)
          try { localStorage.removeItem(LS_KEYS.jobId) } catch { /* ignore */ }
          toast({
            variant: "destructive",
            title: "Error en la prospección",
            description: data.error || "Ocurrió un error procesando los perfiles.",
          })
          setResults([])
          setHasSearched(true)
          setIsLoading(false)
          setIsTimedOut(false)
          setTimedOutJobId(null)
          setJobProgress({ phase: "", processed: 0, total: 0 })
          if (pollingTimerRef.current) {
            clearTimeout(pollingTimerRef.current)
            pollingTimerRef.current = null
          }
          return
        }

        // ── Still pending / processing ────────────────────────────────────────────
        // Update granular progress in a Main-Thread-Safe way
        const newPhase = data.current_phase ?? ""
        const newProcessed = data.processed_leads ?? 0
        const newTotal = data.total_leads ?? 0
        const currentProgressKey = `${newPhase}-${newProcessed}-${newTotal}`

        if (lastProgressHash.current !== currentProgressKey) {
          lastProgressHash.current = currentProgressKey
          setJobProgress({
            phase: newPhase,
            processed: newProcessed,
            total: newTotal,
          })
        }
        // Check if we've exhausted the total 5-minute budget
        if (elapsed >= POLL_BUDGET_MS) {
          console.warn(`[Frontend] ⏳ Budget agotado (${Math.round(elapsed / 1000)} s). Job: ${jobId}`)
          // Soft-timeout: surface manual-retry UI, keep job_id in localStorage
          setIsLoading(false)
          setIsTimedOut(true)
          setTimedOutJobId(jobId)
          if (pollingTimerRef.current) {
            clearTimeout(pollingTimerRef.current)
            pollingTimerRef.current = null
          }
          toast({
            title: "⏳ El backend sigue trabajando",
            description: "Puedes seguir esperando o cargar los resultados manualmente.",
          })
          return
        }

        // Exponential backoff — double interval, cap at POLL_MAX_MS
        const nextInterval = Math.min(pollIntervalRef.current * 2, POLL_MAX_MS)
        pollIntervalRef.current = nextInterval
        console.log(
          `[Frontend] Polling job ${jobId} — elapsed: ${Math.round(elapsed / 1000)} s, ` +
          `next check in: ${nextInterval / 1000} s`
        )
        pollingTimerRef.current = setTimeout(checkStatus, nextInterval)

      } catch (error) {
        console.error("[Frontend] Error al consultar estado del job:", error)
        toast({
          variant: "destructive",
          title: "Error de conexión",
          description: "Perdimos la conexión con el servidor. Puedes intentar cargar los resultados manualmente.",
        })
        // Don't remove jobId so the user can still retry
        setIsLoading(false)
        setIsTimedOut(true)
        setTimedOutJobId(jobId)
      }
    }

    checkStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, toast])

  /**
   * handleManualCheck — triggered by the "Seguir esperando" / "Cargar resultados" button.
   * Performs a single immediate status check on the timed-out job.
   */
  const handleManualCheck = useCallback(async () => {
    if (!timedOutJobId || !session?.access_token) return

    setIsTimedOut(false)
    setIsLoading(true)
    toast({ title: "Consultando resultados...", description: "Revisando el estado del job en el backend." })

    try {
      const response = await apiFetch(`/api/v1/prospect/job/${timedOutJobId}`, {
        token: session.access_token,
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()

      if (data.status === "completed") {
        const leads: ProspectResult[] = data.result?.leads ?? []
        try { localStorage.removeItem(LS_KEYS.jobId) } catch { /* ignore */ }
        setResults(leads)
        setHasSearched(true)
        setIsLoading(false)
        setTimedOutJobId(null)
        toast({ title: "✅ Resultados listos", description: `${leads.length} leads encontrados.` })
      } else if (data.status === "failed") {
        try { localStorage.removeItem(LS_KEYS.jobId) } catch { /* ignore */ }
        setIsLoading(false)
        setTimedOutJobId(null)
        setHasSearched(true)
        toast({ variant: "destructive", title: "Job fallido", description: data.error || "Error procesando la búsqueda." })
      } else {
        // Still running — resume backoff polling from current position
        pollJob(timedOutJobId, session.access_token)
      }
    } catch (err) {
      console.error("[Frontend] Error en comprobación manual:", err)
      setIsLoading(false)
      setIsTimedOut(true)
      toast({ variant: "destructive", title: "Error de conexión", description: "No se pudo conectar al servidor." })
    }
  }, [timedOutJobId, session, pollJob, toast])

  // --- Handlers de Historial ---

  const handleSaveQuery = async (name: string, isOverwrite: boolean = false, existingId?: string) => {
    if (!session) return

    try {
      let response;
      if (isOverwrite && existingId) {
        response = await apiFetch(`/api/v1/queries/${existingId}`, {
          method: "PUT",
          token: session.access_token,
          body: JSON.stringify({ query_name: name, search_params: form }),
        })
      } else {
        response = await apiFetch("/api/v1/queries", {
          method: "POST",
          token: session.access_token,
          body: JSON.stringify({ query_name: name, search_params: form }),
        })
      }

      if (response.ok) {
        const data = await response.json()
        if (!isOverwrite) {
          setActiveQueryId(data.id)
        }
        toast({
          title: "Consulta guardada",
          description: "Tu consulta ha sido guardada en la nube.",
        })
        fetchQueries()
      } else {
        const errData = await response.text()
        console.error("[Frontend] Error guardando consulta:", errData)
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo guardar la consulta.",
        })
      }
    } catch (err) {
      console.error("[Frontend] Error en la petición de guardar consulta:", err)
    }
  }

  const handleLoadQuery = (query: SavedQuery) => {
    // [Safety Mechanism]: Clean history loading without triggering side effects
    setForm(query.search_params)
    setActiveQueryId(query.id)
    setResults([])
    setHasSearched(false)
  }

  const handleDeleteQuery = async (id: string) => {
    if (!session) return
    try {
      const response = await apiFetch(`/api/v1/queries/${id}`, {
        method: "DELETE",
        token: session.access_token,
      })
      if (response.ok) {
        toast({
          title: "Consulta eliminada",
          description: "La consulta fue eliminada correctamente.",
        })
        fetchQueries()
      } else {
        toast({
          variant: "destructive",
          title: "Error al eliminar",
          description: "No se pudo eliminar la consulta.",
        })
      }
    } catch (err) {
      console.error("[Frontend] Error al eliminar consulta:", err)
    }
  }

  // Show nothing while auth is loading (middleware handles the real guard)
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Cargando sesión...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <AppHeader />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 md:px-6 md:py-8">
        <div className="mb-4 flex items-center justify-end">
          <button
            onClick={resetSystemState}
            className="text-xs font-medium text-red-500 hover:text-red-600 hover:underline flex items-center gap-1"
            title="Usa este botón si la aplicación se queda cargando de forma infinita."
          >
            Force Reset
          </button>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
          <SearchForm
            values={form}
            isLoading={isLoading}
            isSessionReady={isSessionReady}
            onChange={handleChange}
            onSubmit={handleSubmit}
            onClear={handleClear}
          />
          <ResultsPanel
            key={searchTimestamp}
            results={results}
            isLoading={isLoading}
            hasSearched={hasSearched}
            formData={form}
            savedQueries={savedQueries}
            activeQueryId={activeQueryId}
            onSaveQuery={handleSaveQuery}
            onLoadQuery={handleLoadQuery}
            onDeleteQuery={handleDeleteQuery}
            isTimedOut={isTimedOut}
            onManualCheck={handleManualCheck}
            jobProgress={jobProgress}
          />
        </div>
      </main>
    </div>
  )
}
