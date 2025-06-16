import { Pool, PoolClient } from 'pg'

interface ColumnDefinition {
  name: string
  type: string
  length?: number
  nullable?: boolean
  primaryKey?: boolean
  unique?: boolean
  default?: string
  references?: {
    table: string
    column: string
  }
}

interface TableDefinition {
  name: string
  columns: ColumnDefinition[]
}

export class TableManager {
  private client: PoolClient

  constructor(client: PoolClient) {
    this.client = client
  }

  async createProjectSchema(projectId: string): Promise<void> {
    const schemaName = `project_${projectId.replace(/-/g, '_')}`
    await this.client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`)
  }

  async createTable(
    projectId: string,
    tableDefinition: TableDefinition
  ): Promise<void> {
    const schemaName = `project_${projectId.replace(/-/g, '_')}`

    // Build column definitions
    const columnDefs = tableDefinition.columns
      .map((col) => {
        let def = `"${col.name}" ${col.type}`

        // Add length if specified (e.g., varchar(255))
        if (col.length) {
          def += `(${col.length})`
        }

        // Add constraints
        if (col.primaryKey) {
          def += ' PRIMARY KEY'
        }
        if (col.unique) {
          def += ' UNIQUE'
        }
        if (col.nullable === false) {
          def += ' NOT NULL'
        }
        if (col.default) {
          def += ` DEFAULT ${col.default}`
        }
        if (col.references) {
          def += ` REFERENCES ${schemaName}.${col.references.table}(${col.references.column})`
        }

        return def
      })
      .join(', ')

    // Create table query
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS "${schemaName}"."${tableDefinition.name}" (
        ${columnDefs}
      )
    `

    await this.client.query(createTableQuery)
    console.log(`Table "${schemaName}"."${tableDefinition.name}" created successfully.`)

    // Create the trigger for real-time notifications
    const triggerName = `lt_realtime_trigger_${tableDefinition.name}`
    // Ensure tableDefinition.name is sanitized or only contains valid characters for a trigger name if not already quoted.
    // However, trigger names might not need quoting if they follow standard identifier rules.
    // For safety, if tableDefinition.name can be arbitrary, it should be quoted or sanitized.
    // Here, we assume tableDefinition.name is a valid identifier fragment.
    
    const createTriggerQuery = `
      CREATE TRIGGER "${triggerName}"
      AFTER INSERT OR UPDATE OR DELETE ON "${schemaName}"."${tableDefinition.name}"
      FOR EACH ROW EXECUTE FUNCTION litebase_notify_change();
    `
    try {
      await this.client.query(createTriggerQuery)
      console.log(`Trigger "${triggerName}" created successfully on table "${schemaName}"."${tableDefinition.name}".`)
    } catch (triggerError) {
      console.error(`Failed to create trigger "${triggerName}" on table "${schemaName}"."${tableDefinition.name}":`, triggerError)
      // Depending on desired behavior, you might want to re-throw the error
      // or attempt to roll back the table creation if this is part of a transaction.
      // For now, just logging the error.
    }
  }

  async listTables(projectId: string): Promise<string[]> {
    const schemaName = `project_${projectId.replace(/-/g, '_')}`
    const result = await this.client.query(
      `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = $1
    `,
      [schemaName]
    )

    return result.rows.map((row) => row.table_name)
  }

  async getTableDefinition(
    projectId: string,
    tableName: string
  ): Promise<TableDefinition | null> {
    const schemaName = `project_${projectId.replace(/-/g, '_')}`

    // Get column information
    const result = await this.client.query(
      `
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default,
        pk.constraint_type as primary_key,
        uk.constraint_type as unique_key
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT kcu.column_name, tc.constraint_type
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = $1
          AND tc.table_name = $2
      ) pk ON c.column_name = pk.column_name
      LEFT JOIN (
        SELECT kcu.column_name, tc.constraint_type
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'UNIQUE'
          AND tc.table_schema = $1
          AND tc.table_name = $2
      ) uk ON c.column_name = uk.column_name
      WHERE c.table_schema = $1
        AND c.table_name = $2
    `,
      [schemaName, tableName]
    )

    if (result.rows.length === 0) {
      return null
    }

    const columns: ColumnDefinition[] = result.rows.map((row) => ({
      name: row.column_name,
      type: row.data_type,
      length: row.character_maximum_length,
      nullable: row.is_nullable === 'YES',
      primaryKey: row.primary_key === 'PRIMARY KEY',
      unique: row.unique_key === 'UNIQUE',
      default: row.column_default,
    }))

    return {
      name: tableName,
      columns,
    }
  }

  async deleteTable(projectId: string, tableName: string): Promise<void> {
    const schemaName = `project_${projectId.replace(/-/g, '_')}`
    const triggerName = `lt_realtime_trigger_${tableName}` // Assuming tableName is safe for use in trigger name

    try {
      // Drop the trigger first
      const dropTriggerQuery = `DROP TRIGGER IF EXISTS "${triggerName}" ON "${schemaName}"."${tableName}";`
      await this.client.query(dropTriggerQuery)
      console.log(`Trigger "${triggerName}" on table "${schemaName}"."${tableName}" dropped successfully or did not exist.`)

      // Then drop the table
      const dropTableQuery = `DROP TABLE IF EXISTS "${schemaName}"."${tableName}";`
      await this.client.query(dropTableQuery)
      console.log(`Table "${schemaName}"."${tableName}" dropped successfully or did not exist.`)
    } catch (error) {
      console.error(`Error deleting table "${tableName}" or its trigger "${triggerName}" in schema "${schemaName}":`, error)
      // Re-throw the error to allow the caller to handle it, potentially with a more user-friendly message
      // or specific HTTP status codes in the route handler.
      throw error
    }
  }
}
