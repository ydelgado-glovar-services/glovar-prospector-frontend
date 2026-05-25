// Data Contract — shared between frontend and backend.
// The frontend is "dumb": it only captures this payload and sends it to /api/v1/prospect.

export type CompanySize = "1-50" | "51-200" | "201-500" | "500+"

export interface ProspectRequest {
  mi_empresa: string
  sector: string
  pais: string
  tamano_empresa: CompanySize | ""
  cargo_decision: string
  dolor_cliente: string
  propuesta_valor: string
  limite_perfiles?: number
  triggers_compra?: string
  casos_exito?: string
  keywords_industria?: string
  exclusion_list?: string[]  // [Spec-Driven] O(n) blacklist — maps to SearchParams.exclusion_list in FastAPI
}

export interface ProspectResult {
  id?: string
  nombre_lead: string
  empresa: string
  cargo: string
  linkedin_url: string
  razonamiento_filtro: string
  trigger_noticia: string
  mensaje_generado: string
  es_calificado: boolean
  guardado_en_db: boolean
  email?: string
  telefono?: string
  url_noticia?: string | null
}

export interface SavedQuery {
  id: string
  user_id: string
  query_name: string
  search_params: ProspectRequest
  created_at: string
  updated_at: string
}

export interface JobProgress {
  phase: string
  processed: number
  total: number
  progress_percentage?: number
}
