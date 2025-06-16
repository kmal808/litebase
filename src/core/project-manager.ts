import { Pool, PoolClient, QueryResult } from 'pg'
import { v4 as uuidv4 } from 'uuid'
import {
  Project,
  ProjectConfig,
  DatabaseConfig,
  ServiceError,
} from '../api/types'

interface ProjectRow {
  id: string
  name: string
  schema_name: string
  created_at: Date
  updated_at: Date
  config: ProjectConfig
}

export class ProjectManager {
  private pool: Pool
  private systemSchemaName = 'litebase_system'

  constructor(config: DatabaseConfig) {
    this.pool = new Pool(config)
  }

  async initialize(): Promise<void> {
    const client = await this.pool.connect()
    try {
      // Create system schema if it doesn't exist
      await client.query(`
        CREATE SCHEMA IF NOT EXISTS ${this.systemSchemaName};
        
        CREATE TABLE IF NOT EXISTS ${this.systemSchemaName}.projects (
          id UUID PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          schema_name VARCHAR(255) NOT NULL UNIQUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          config JSONB NOT NULL
        );
      `)
    } finally {
      client.release()
    }
  }

  async getProjectByApiKey(apiKey: string): Promise<Project | null> {
    const result = await this.pool.query<ProjectRow>(
      `
      SELECT * FROM ${this.systemSchemaName}.projects 
      WHERE config->>'apiKey' = $1
      `,
      [apiKey]
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      id: row.id,
      name: row.name,
      schema_name: row.schema_name,
      created_at: row.created_at,
      updated_at: row.updated_at,
      config: row.config,
    }
  }

  async createProject(name: string, config: ProjectConfig): Promise<Project> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')

      const projectId = uuidv4()
      const schemaName = `project_${projectId.replace(/-/g, '_')}`

      // Create new schema for the project
      await client.query(`CREATE SCHEMA ${schemaName}`)

      // Insert project record
      const result = await client.query<ProjectRow>(
        `
        INSERT INTO ${this.systemSchemaName}.projects 
        (id, name, schema_name, config) 
        VALUES ($1, $2, $3, $4)
        RETURNING *
        `,
        [projectId, name, schemaName, JSON.stringify(config)]
      )

      await client.query('COMMIT')

      return {
        id: result.rows[0].id,
        name: result.rows[0].name,
        schema_name: result.rows[0].schema_name,
        created_at: result.rows[0].created_at,
        updated_at: result.rows[0].updated_at,
        config: result.rows[0].config,
      }
    } catch (error) {
      await client.query('ROLLBACK')
      throw this.handleError(error)
    } finally {
      client.release()
    }
  }

  async getProject(projectId: string): Promise<Project | null> {
    const result = await this.pool.query<ProjectRow>(
      `
      SELECT * FROM ${this.systemSchemaName}.projects 
      WHERE id = $1
      `,
      [projectId]
    )

    if (result.rows.length === 0) {
      return null
    }

    return {
      id: result.rows[0].id,
      name: result.rows[0].name,
      schema_name: result.rows[0].schema_name,
      created_at: result.rows[0].created_at,
      updated_at: result.rows[0].updated_at,
      config: result.rows[0].config,
    }
  }

  async listProjects(): Promise<Project[]> {
    const result = await this.pool.query<ProjectRow>(
      `SELECT * FROM ${this.systemSchemaName}.projects ORDER BY created_at DESC`
    )

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      schema_name: row.schema_name,
      created_at: row.created_at,
      updated_at: row.updated_at,
      config: row.config,
    }))
  }

  async deleteProject(projectId: string): Promise<void> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')

      // Get project info
      const project = await this.getProject(projectId)
      if (!project) {
        throw new Error('Project not found')
      }

      // Drop the project schema
      await client.query(`DROP SCHEMA ${project.schema_name} CASCADE`)

      // Delete project record
      await client.query(
        `DELETE FROM ${this.systemSchemaName}.projects WHERE id = $1`,
        [projectId]
      )

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw this.handleError(error)
    } finally {
      client.release()
    }
  }

  private handleError(error: unknown): ServiceError {
    const serviceError: ServiceError = new Error(
      error instanceof Error ? error.message : 'Unknown error'
    )
    if (error instanceof Error) {
      serviceError.code = (error as any).code
    }
    serviceError.status = 500
    serviceError.details = error
    return serviceError
  }

  async getProjectClient(projectId: string): Promise<PoolClient> {
    const project = await this.getProject(projectId)
    if (!project) {
      throw new Error('Project not found')
    }

    const client = await this.pool.connect()
    await client.query(`SET search_path TO ${project.schema_name},public`)
    return client
  }
}
