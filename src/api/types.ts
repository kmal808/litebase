export interface Project {
  id: string
  name: string
  schema_name: string
  created_at: Date
  updated_at: Date
  config: ProjectConfig
}

export interface ProjectConfig {
  auth: AuthConfig
  api: ApiConfig
  schema: SchemaDefinition
}

export interface AuthConfig {
  enableEmailAuth: boolean
  enableGithubAuth?: boolean
  customProviders?: AuthProvider[]
}

export interface ApiConfig {
  enableREST: boolean
  enableGraphQL?: boolean
  customEndpoints?: EndpointDefinition[]
}

export interface AuthProvider {
  name: string
  type: 'oauth' | 'custom'
  config: Record<string, unknown>
}

export interface EndpointDefinition {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  handler: string // Reference to a function name
  auth?: boolean
}

export interface SchemaDefinition {
  [tableName: string]: {
    [columnName: string]: ColumnDefinition
  }
}

export interface ColumnDefinition {
  type: string
  nullable?: boolean
  unique?: boolean
  default?: unknown
  references?: {
    table: string
    column: string
  }
}

export interface DatabaseConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
}

export interface ServiceError extends Error {
  code?: string
  status?: number
  details?: unknown
}
