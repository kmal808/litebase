import { RequestClient } from '../utils/request'
import { QueryBuilder } from './query-builder'
import {
  SubscriptionManager,
  SubscriptionFilter,
  SubscriptionEvent,
} from './subscription-manager'
import {
  LitebaseConfig,
  Project,
  Table,
  QueryOptions,
  InsertOptions,
  UpdateOptions,
  DeleteOptions,
} from '../types'

export class LitebaseClient {
  private request: RequestClient
  private subscriptionManager: SubscriptionManager
  private projectId?: string

  constructor(config: LitebaseConfig) {
    this.request = new RequestClient(config)
    this.projectId = config.projectId
    this.subscriptionManager = new SubscriptionManager(
      config.baseUrl || 'http://localhost:3000',
      config.apiKey,
      config.projectId || ''
    )
  }

  // Real-time Subscriptions
  async connect(): Promise<void> {
    return this.subscriptionManager.connect()
  }

  subscribe(
    table: string,
    callback: (data: any) => void,
    filter: SubscriptionFilter = {}
  ): () => void {
    this.subscriptionManager.subscribe(table, filter)
    this.subscriptionManager.on(table, callback)
    return () => {
      this.subscriptionManager.unsubscribe(table)
      this.subscriptionManager.off(table, callback)
    }
  }

  onInsert(table: string, callback: (data: any) => void): () => void {
    return this.subscribe(table, callback, { event: ['INSERT'] })
  }

  onUpdate(table: string, callback: (data: any) => void): () => void {
    return this.subscribe(table, callback, { event: ['UPDATE'] })
  }

  onDelete(table: string, callback: (data: any) => void): () => void {
    return this.subscribe(table, callback, { event: ['DELETE'] })
  }

  // Project Management
  async getProject(): Promise<Project> {
    if (!this.projectId) {
      throw new Error('Project ID is required')
    }
    return this.request.get<Project>(`/api/projects/${this.projectId}`)
  }

  async listProjects(): Promise<Project[]> {
    return this.request.get<Project[]>('/api/projects')
  }

  async createProject(name: string): Promise<Project> {
    return this.request.post<Project>('/api/projects', { name })
  }

  // Table Management
  async createTable(name: string, schema: Record<string, any>): Promise<Table> {
    if (!this.projectId) {
      throw new Error('Project ID is required')
    }
    return this.request.post<Table>(`/api/projects/${this.projectId}/tables`, {
      name,
      schema,
    })
  }

  async listTables(): Promise<Table[]> {
    if (!this.projectId) {
      throw new Error('Project ID is required')
    }
    return this.request.get<Table[]>(`/api/projects/${this.projectId}/tables`)
  }

  async getTable(tableName: string): Promise<Table> {
    if (!this.projectId) {
      throw new Error('Project ID is required')
    }
    return this.request.get<Table>(
      `/api/projects/${this.projectId}/tables/${tableName}`
    )
  }

  // Query Builder
  from<T = any>(tableName: string): QueryBuilder<T> {
    return new QueryBuilder<T>(this, tableName)
  }

  // Data Operations
  async query<T = any>(
    tableName: string,
    options: QueryOptions = {}
  ): Promise<T[]> {
    if (!this.projectId) {
      throw new Error('Project ID is required')
    }
    return this.request.post<T[]>(
      `/api/projects/${this.projectId}/tables/${tableName}/query`,
      options
    )
  }

  async insert<T = any>(
    tableName: string,
    data: Record<string, any>[],
    options: InsertOptions = {}
  ): Promise<T[]> {
    if (!this.projectId) {
      throw new Error('Project ID is required')
    }
    return this.request.post<T[]>(
      `/api/projects/${this.projectId}/tables/${tableName}/rows`,
      { data, ...options }
    )
  }

  async update<T = any>(
    tableName: string,
    data: Record<string, any>,
    options: UpdateOptions = {}
  ): Promise<T[]> {
    if (!this.projectId) {
      throw new Error('Project ID is required')
    }
    return this.request.put<T[]>(
      `/api/projects/${this.projectId}/tables/${tableName}/rows`,
      { data, ...options }
    )
  }

  async delete<T = any>(
    tableName: string,
    options: DeleteOptions = {}
  ): Promise<T[]> {
    if (!this.projectId) {
      throw new Error('Project ID is required')
    }
    return this.request.delete<T[]>(
      `/api/projects/${this.projectId}/tables/${tableName}/rows`,
      { data: options }
    )
  }
}
