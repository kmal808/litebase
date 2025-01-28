import { PoolClient } from 'pg'
import { SchemaDefinition, ColumnDefinition } from '../api/types'

export class SchemaManager {
  constructor(private client: PoolClient) {}

  async createTable(
    tableName: string,
    columns: Record<string, ColumnDefinition>
  ): Promise<void> {
    const columnDefinitions = Object.entries(columns)
      .map(([name, def]) => this.columnToSQL(name, def))
      .join(',\n')

    await this.client.query(`
      CREATE TABLE IF NOT EXISTS "${tableName}" (
        ${columnDefinitions}
      );
    `)

    // Create indexes for unique columns
    for (const [name, def] of Object.entries(columns)) {
      if (def.unique) {
        await this.client.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS "${tableName}_${name}_unique"
          ON "${tableName}" ("${name}");
        `)
      }
    }
  }

  async dropTable(tableName: string): Promise<void> {
    await this.client.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE;`)
  }

  async addColumn(
    tableName: string,
    columnName: string,
    definition: ColumnDefinition
  ): Promise<void> {
    await this.client.query(`
      ALTER TABLE "${tableName}"
      ADD COLUMN ${this.columnToSQL(columnName, definition)};
    `)

    if (definition.unique) {
      await this.client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "${tableName}_${columnName}_unique"
        ON "${tableName}" ("${columnName}");
      `)
    }
  }

  async removeColumn(tableName: string, columnName: string): Promise<void> {
    await this.client.query(`
      ALTER TABLE "${tableName}"
      DROP COLUMN "${columnName}";
    `)
  }

  async createSchema(schema: SchemaDefinition): Promise<void> {
    for (const [tableName, columns] of Object.entries(schema)) {
      await this.createTable(tableName, columns)
    }
  }

  private columnToSQL(name: string, definition: ColumnDefinition): string {
    let sql = `"${name}" ${this.mapType(definition.type)}`

    if (definition.nullable === false) {
      sql += ' NOT NULL'
    }

    if (definition.default !== undefined) {
      sql += ` DEFAULT ${this.formatDefault(definition.default)}`
    }

    if (definition.references) {
      sql += ` REFERENCES "${definition.references.table}"("${definition.references.column}")`
    }

    return sql
  }

  private mapType(type: string): string {
    const typeMap: Record<string, string> = {
      string: 'TEXT',
      number: 'NUMERIC',
      integer: 'INTEGER',
      boolean: 'BOOLEAN',
      date: 'TIMESTAMP WITH TIME ZONE',
      json: 'JSONB',
      uuid: 'UUID',
    }

    return typeMap[type.toLowerCase()] || type.toUpperCase()
  }

  private formatDefault(value: unknown): string {
    if (typeof value === 'string') {
      return `'${value}'`
    }
    if (value === null) {
      return 'NULL'
    }
    if (typeof value === 'object') {
      return `'${JSON.stringify(value)}'::jsonb`
    }
    return String(value)
  }
}
