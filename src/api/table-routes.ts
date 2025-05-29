import { Router, Request } from 'express' // Added Request
import { PoolClient } from 'pg' // Keep for type annotation
import { TableManager } from '../core/table-manager'
import { ProjectManager } from '../core/project-manager'
import {
  projectAuth,
  AuthenticatedRequest,
} from '../middleware/project-auth' // Import projectAuth and AuthenticatedRequest

export function createTableRoutes(projectManager: ProjectManager): Router {
  const router = Router()
  const auth = projectAuth(projectManager) // Instantiate middleware

  router.use(auth) // Apply middleware to all routes in this router

  // Create a new table
  router.post('/:projectId/tables', async (req: Request, res) => {
    const authReq = req as AuthenticatedRequest
    let projectDbClient: PoolClient | undefined
    try {
      const paramProjectId: string = req.params.projectId
      const authenticatedProjectId = authReq.projectId

      if (!authenticatedProjectId || authenticatedProjectId !== paramProjectId) {
        return res.status(403).json({
          error:
            'Forbidden: API key does not grant access to the specified project.',
        })
      }

      const tableDefinition = req.body

      // Validate table definition
      if (
        !tableDefinition.name ||
        !tableDefinition.columns ||
        !Array.isArray(tableDefinition.columns)
      ) {
        return res.status(400).json({ error: 'Invalid table definition' })
      }

      projectDbClient = await projectManager.getProjectClient(authenticatedProjectId) // Use authenticatedProjectId
      if (!projectDbClient) {
        // This case should ideally be caught by projectAuth if project doesn't exist for API key
        return res.status(404).json({ error: 'Project not found or database client unavailable' })
      }
      const tableManager = new TableManager(projectDbClient)

      // Create schema if it doesn't exist (TableManager now uses string projectId)
      await tableManager.createProjectSchema(authenticatedProjectId) // Use authenticatedProjectId

      // Create the table
      await tableManager.createTable(authenticatedProjectId, tableDefinition) // Use authenticatedProjectId

      res.status(201).json({
        message: 'Table created successfully',
        table: tableDefinition,
      })
    } catch (error: any) {
      console.error('Error creating table:', error)
      if (error.message && error.message.includes('Project not found')) { // This might be redundant if getProjectClient throws
        return res.status(404).json({ error: 'Project not found' })
      }
      res.status(500).json({ error: 'Failed to create table' })
    } finally {
      if (projectDbClient) {
        projectDbClient.release()
      }
    }
  })

  // Delete a table
  router.delete('/:projectId/tables/:tableName', async (req: Request, res) => {
    const authReq = req as AuthenticatedRequest
    let projectDbClient: PoolClient | undefined
    try {
      const paramProjectId: string = req.params.projectId
      const authenticatedProjectId = authReq.projectId
      const { tableName } = req.params

      if (!authenticatedProjectId || authenticatedProjectId !== paramProjectId) {
        return res.status(403).json({
          error:
            'Forbidden: API key does not grant access to the specified project.',
        })
      }

      projectDbClient = await projectManager.getProjectClient(authenticatedProjectId)
      if (!projectDbClient) {
        // This case should ideally be caught by projectAuth if project doesn't exist for API key
        return res.status(404).json({ error: 'Project not found or database client unavailable' })
      }
      const tableManager = new TableManager(projectDbClient)

      await tableManager.deleteTable(authenticatedProjectId, tableName)

      res.status(200).json({
        message: `Table "${tableName}" and its associated trigger deleted successfully from project "${authenticatedProjectId}".`,
      })
    } catch (error: any) {
      console.error(`Error deleting table in project:`, error)
      // Check if the error message indicates the table or schema was not found,
      // which might be considered a successful deletion if the goal is idempotency.
      // However, TableManager's deleteTable already uses IF EXISTS, so a specific "not found"
      // error from TableManager itself is unlikely unless it re-throws a more specific one.
      // For now, a general 500 for other errors.
      if (error.message && error.message.includes('Project not found')) {
         return res.status(404).json({ error: 'Project not found' })
      }
      // If TableManager re-throws an error that indicates "table not found",
      // we might want to return a 404 here.
      // e.g., if (error.code === 'TABLE_NOT_FOUND_ERROR_CODE_FROM_TABLE_MANAGER')
      res.status(500).json({ error: `Failed to delete table "${req.params.tableName}"` })
    } finally {
      if (projectDbClient) {
        projectDbClient.release()
      }
    }
  })

  // List all tables in a project
  router.get('/:projectId/tables', async (req: Request, res) => {
    const authReq = req as AuthenticatedRequest
    let projectDbClient: PoolClient | undefined
    try {
      const paramProjectId: string = req.params.projectId
      const authenticatedProjectId = authReq.projectId

      if (!authenticatedProjectId || authenticatedProjectId !== paramProjectId) {
        return res.status(403).json({
          error:
            'Forbidden: API key does not grant access to the specified project.',
        })
      }

      projectDbClient = await projectManager.getProjectClient(authenticatedProjectId) // Use authenticatedProjectId
      if (!projectDbClient) {
        return res.status(404).json({ error: 'Project not found or database client unavailable' })
      }
      const tableManager = new TableManager(projectDbClient)

      const tables = await tableManager.listTables(authenticatedProjectId) // Use authenticatedProjectId
      res.json(tables)
    } catch (error: any) {
      console.error('Error listing tables:', error)
      if (error.message && error.message.includes('Project not found')) {
        return res.status(404).json({ error: 'Project not found' })
      }
      res.status(500).json({ error: 'Failed to list tables' })
    } finally {
      if (projectDbClient) {
        projectDbClient.release()
      }
    }
  })

  // Get table definition
  router.get('/:projectId/tables/:tableName', async (req: Request, res) => {
    const authReq = req as AuthenticatedRequest
    let projectDbClient: PoolClient | undefined
    try {
      const paramProjectId: string = req.params.projectId
      const authenticatedProjectId = authReq.projectId
      const { tableName } = req.params

      if (!authenticatedProjectId || authenticatedProjectId !== paramProjectId) {
        return res.status(403).json({
          error:
            'Forbidden: API key does not grant access to the specified project.',
        })
      }

      projectDbClient = await projectManager.getProjectClient(authenticatedProjectId) // Use authenticatedProjectId
      if (!projectDbClient) {
        return res.status(404).json({ error: 'Project not found or database client unavailable' })
      }
      const tableManager = new TableManager(projectDbClient)

      const definition = await tableManager.getTableDefinition(
        authenticatedProjectId, // Use authenticatedProjectId
        tableName
      )
      if (!definition) {
        return res.status(404).json({ error: 'Table not found' })
      }

      res.json(definition)
    } catch (error: any) {
      console.error('Error getting table definition:', error)
      if (error.message && error.message.includes('Project not found')) {
        return res.status(404).json({ error: 'Project not found' })
      }
      res.status(500).json({ error: 'Failed to get table definition' })
    } finally {
      if (projectDbClient) {
        projectDbClient.release()
      }
    }
  })

  return router
}
