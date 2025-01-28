import { Router } from 'express'
import { PoolClient } from 'pg'
import { TableManager } from '../core/table-manager'

export function createTableRoutes(client: PoolClient): Router {
  const router = Router()
  const tableManager = new TableManager(client)

  // Create a new table
  router.post('/:projectId/tables', async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId)
      const tableDefinition = req.body

      // Validate table definition
      if (
        !tableDefinition.name ||
        !tableDefinition.columns ||
        !Array.isArray(tableDefinition.columns)
      ) {
        return res.status(400).json({ error: 'Invalid table definition' })
      }

      // Create schema if it doesn't exist
      await tableManager.createProjectSchema(projectId)

      // Create the table
      await tableManager.createTable(projectId, tableDefinition)

      res.status(201).json({
        message: 'Table created successfully',
        table: tableDefinition,
      })
    } catch (error) {
      console.error('Error creating table:', error)
      res.status(500).json({ error: 'Failed to create table' })
    }
  })

  // List all tables in a project
  router.get('/:projectId/tables', async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId)
      const tables = await tableManager.listTables(projectId)
      res.json(tables)
    } catch (error) {
      console.error('Error listing tables:', error)
      res.status(500).json({ error: 'Failed to list tables' })
    }
  })

  // Get table definition
  router.get('/:projectId/tables/:tableName', async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId)
      const { tableName } = req.params

      const definition = await tableManager.getTableDefinition(
        projectId,
        tableName
      )
      if (!definition) {
        return res.status(404).json({ error: 'Table not found' })
      }

      res.json(definition)
    } catch (error) {
      console.error('Error getting table definition:', error)
      res.status(500).json({ error: 'Failed to get table definition' })
    }
  })

  return router
}
