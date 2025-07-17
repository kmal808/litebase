export interface LitebaseConfig {
  apiKey: string
  projectId?: string
  baseUrl?: string
}

export interface Project {
  id: number
  name: string
  api_key: string
  created_at: string
  updated_at: string
}

export interface Table {
  name: string
  schema: Record<string, any>
  created_at: string
  updated_at: string
}

export interface QueryOptions {
  select?: string[]
  where?: Record<string, any>
  orderBy?: Record<string, 'ASC' | 'DESC'>
  limit?: number
  offset?: number
}

export interface InsertOptions {
  returning?: string[]
}

export interface UpdateOptions extends InsertOptions {
  where?: Record<string, any>
}

export interface DeleteOptions extends InsertOptions {
  where?: Record<string, any>
}
