import { Router, Request, Response } from 'express'
import { PoolClient } from 'pg'
import { ProjectManager } from '../core/project-manager'
import {
  projectAuth,
  AuthenticatedRequest,
} from '../middleware/project-auth' // Import projectAuth and AuthenticatedRequest

// Interface for query options based on SDK (simplified for now)
interface QueryOptions {
  select?: string[]
  where?: Record<string, any>
  orderBy?: Record<string, 'ASC' | 'DESC'>
  limit?: number
  offset?: number
}

// Interface for insert options
interface InsertOptions {
  data: Record<string, any>[]
}

// Interface for update options
interface UpdateOptions {
  data: Record<string, any>
  where: Record<string, any>
}

// Interface for delete options
interface DeleteOptions {
  where: Record<string, any>
}

function buildWhereClause(
  where: Record<string, any> | undefined,
  startingIndex: number
): { text: string; values: any[] } {
  if (!where || Object.keys(where).length === 0) {
    return { text: '', values: [] }
  }
  const conditions = Object.keys(where).map((key, index) => {
    return `"${key}" = $${startingIndex + index}`
  })
  return {
    text: `WHERE ${conditions.join(' AND ')}`,
    values: Object.values(where),
  }
}

export function createDataRoutes(projectManager: ProjectManager): Router {
  const router = Router()
  const auth = projectAuth(projectManager) // Instantiate middleware

  router.use(auth) // Apply middleware to all routes in this router

  const getSchemaName = (projectId: string) => // This remains the same, projectId is validated before use
    `project_${projectId.replace(/-/g, '_')}`

  // Query data from a table
  router.post('/:projectId/tables/:tableName/query', async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest
    const { tableName } = req.params
    const paramProjectId: string = req.params.projectId
    const authenticatedProjectId = authReq.projectId
    
    if (!authenticatedProjectId || authenticatedProjectId !== paramProjectId) {
      return res.status(403).json({
        error:
          'Forbidden: API key does not grant access to the specified project.',
      })
    }
    
    const options: QueryOptions = req.body
    const schemaName = getSchemaName(authenticatedProjectId) // Use authenticatedProjectId
    let projectDbClient: PoolClient | undefined

    try {
      projectDbClient = await projectManager.getProjectClient(authenticatedProjectId) // Use authenticatedProjectId
      if (!projectDbClient) {
        return res.status(404).json({ error: 'Project not found or database client unavailable' })
      }

      let queryText = `SELECT ${
        options.select && options.select.length > 0
          ? options.select.map(f => `"${f}"`).join(', ')
          : '*'
      } FROM "${schemaName}"."${tableName}"`
      
      const values: any[] = []
      let paramIndex = 1

      if (options.where && Object.keys(options.where).length > 0) {
        const whereClause = buildWhereClause(options.where, paramIndex)
        queryText += ` ${whereClause.text}`
        values.push(...whereClause.values)
        paramIndex += whereClause.values.length
      }

      if (options.orderBy && Object.keys(options.orderBy).length > 0) {
        const orderByClauses = Object.entries(options.orderBy)
          .map(([field, direction]) => `"${field}" ${direction === 'DESC' ? 'DESC' : 'ASC'}`)
        if (orderByClauses.length > 0) {
          queryText += ` ORDER BY ${orderByClauses.join(', ')}`
        }
      }

      if (options.limit !== undefined) {
        queryText += ` LIMIT $${paramIndex++}`
        values.push(options.limit)
      }

      if (options.offset !== undefined) {
        queryText += ` OFFSET $${paramIndex++}`
        values.push(options.offset)
      }

      const result = await projectDbClient.query(queryText, values)
      res.json(result.rows)
    } catch (error: any) {
      console.error(`Error querying table ${tableName} in project ${authenticatedProjectId}:`, error) // Use authenticatedProjectId
      if (error.message && error.message.includes('relation') && error.message.includes('does not exist')) {
        return res.status(404).json({ error: `Table "${tableName}" not found in project "${authenticatedProjectId}"` }); // Use authenticatedProjectId
      }
      res.status(500).json({ error: 'Failed to query data' })
    } finally {
      if (projectDbClient) {
        projectDbClient.release()
      }
    }
  })

  // Insert data into a table
  router.post('/:projectId/tables/:tableName/rows', async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest
    const { tableName } = req.params
    const paramProjectId: string = req.params.projectId
    const authenticatedProjectId = authReq.projectId

    if (!authenticatedProjectId || authenticatedProjectId !== paramProjectId) {
      return res.status(403).json({
        error:
          'Forbidden: API key does not grant access to the specified project.',
      })
    }

    const { data }: InsertOptions = req.body
    const schemaName = getSchemaName(authenticatedProjectId) // Use authenticatedProjectId
    let projectDbClient: PoolClient | undefined

    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: 'Invalid input: data must be a non-empty array of records.' })
    }

    try {
      projectDbClient = await projectManager.getProjectClient(authenticatedProjectId) // Use authenticatedProjectId
      if (!projectDbClient) {
        return res.status(404).json({ error: 'Project not found or database client unavailable' })
      }

      await projectDbClient.query('BEGIN') // Start transaction

      const insertedRows: any[] = []
      for (const record of data) {
        const columns = Object.keys(record).map(col => `"${col}"`).join(', ')
        const valuePlaceholders = Object.keys(record).map((_, i) => `$${i + 1}`).join(', ')
        const values = Object.values(record)
        
        const queryText = `INSERT INTO "${schemaName}"."${tableName}" (${columns}) VALUES (${valuePlaceholders}) RETURNING *`
        const result = await projectDbClient.query(queryText, values)
        insertedRows.push(...result.rows)
      }

      await projectDbClient.query('COMMIT') // Commit transaction
      res.status(201).json(insertedRows)
    } catch (error: any) {
      if (projectDbClient) {
        await projectDbClient.query('ROLLBACK') // Rollback transaction on error
      }
      console.error(`Error inserting data into table ${tableName} in project ${authenticatedProjectId}:`, error) // Use authenticatedProjectId
      if (error.message && error.message.includes('relation') && error.message.includes('does not exist')) {
        return res.status(404).json({ error: `Table "${tableName}" not found in project "${authenticatedProjectId}"` }); // Use authenticatedProjectId
      }
       if (error.message && error.message.includes('column') && error.message.includes('does not exist')) {
        return res.status(400).json({ error: `Invalid column in input data: ${error.message}` }); // Use authenticatedProjectId
      }
      res.status(500).json({ error: 'Failed to insert data' })
    } finally {
      if (projectDbClient) {
        projectDbClient.release()
      }
    }
  })

  // Update data in a table
  router.put('/:projectId/tables/:tableName/rows', async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest
    const { tableName } = req.params
    const paramProjectId: string = req.params.projectId
    const authenticatedProjectId = authReq.projectId

    if (!authenticatedProjectId || authenticatedProjectId !== paramProjectId) {
      return res.status(403).json({
        error:
          'Forbidden: API key does not grant access to the specified project.',
      })
    }

    const { data, where }: UpdateOptions = req.body
    const schemaName = getSchemaName(authenticatedProjectId) // Use authenticatedProjectId
    let projectDbClient: PoolClient | undefined

    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Invalid input: data to update must be a non-empty object.' })
    }
    if (!where || typeof where !== 'object' || Object.keys(where).length === 0) {
      return res.status(400).json({ error: 'Invalid input: where clause must be a non-empty object for updates.' })
    }

    try {
      projectDbClient = await projectManager.getProjectClient(authenticatedProjectId) // Use authenticatedProjectId
      if (!projectDbClient) {
        return res.status(404).json({ error: 'Project not found or database client unavailable' })
      }

      const setClauses = Object.keys(data).map((key, i) => `"${key}" = $${i + 1}`)
      const values = Object.values(data)
      let paramIndex = values.length + 1

      const whereClause = buildWhereClause(where, paramIndex)
      if (!whereClause.text) {
         return res.status(400).json({ error: 'WHERE clause is mandatory for update operations to prevent accidental full table updates.' });
      }
      values.push(...whereClause.values)
      
      const queryText = `UPDATE "${schemaName}"."${tableName}" SET ${setClauses.join(', ')} ${whereClause.text} RETURNING *`
      
      const result = await projectDbClient.query(queryText, values)
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'No rows found matching the where criteria to update.'})
      }
      res.json(result.rows)
    } catch (error: any) {
      console.error(`Error updating data in table ${tableName} in project ${authenticatedProjectId}:`, error) // Use authenticatedProjectId
      if (error.message && error.message.includes('relation') && error.message.includes('does not exist')) {
        return res.status(404).json({ error: `Table "${tableName}" not found in project "${authenticatedProjectId}"` }); // Use authenticatedProjectId
      }
      if (error.message && error.message.includes('column') && error.message.includes('does not exist')) {
        return res.status(400).json({ error: `Invalid column in input data or where clause: ${error.message}` }); // Use authenticatedProjectId
      }
      res.status(500).json({ error: 'Failed to update data' })
    } finally {
      if (projectDbClient) {
        projectDbClient.release()
      }
    }
  })

  // Delete data from a table
  router.delete('/:projectId/tables/:tableName/rows', async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest
    const { tableName } = req.params
    const paramProjectId: string = req.params.projectId
    const authenticatedProjectId = authReq.projectId

    if (!authenticatedProjectId || authenticatedProjectId !== paramProjectId) {
      return res.status(403).json({
        error:
          'Forbidden: API key does not grant access to the specified project.',
      })
    }

    // Assuming where conditions are passed in the request body for DELETE as per SDK design
    const { where }: DeleteOptions = req.body 
    const schemaName = getSchemaName(authenticatedProjectId) // Use authenticatedProjectId
    let projectDbClient: PoolClient | undefined

    if (!where || typeof where !== 'object' || Object.keys(where).length === 0) {
      return res.status(400).json({ error: 'Invalid input: where clause must be a non-empty object for delete operations.' })
    }

    try {
      projectDbClient = await projectManager.getProjectClient(authenticatedProjectId) // Use authenticatedProjectId
      if (!projectDbClient) {
        return res.status(404).json({ error: 'Project not found or database client unavailable' })
      }

      const whereClause = buildWhereClause(where, 1)
      if (!whereClause.text) {
         return res.status(400).json({ error: 'WHERE clause is mandatory for delete operations to prevent accidental full table deletions.' });
      }
      const values = whereClause.values
      
      const queryText = `DELETE FROM "${schemaName}"."${tableName}" ${whereClause.text} RETURNING *`
      
      const result = await projectDbClient.query(queryText, values)
      if (result.rowCount === 0) {
          return res.status(404).json({ error: 'No rows found matching the where criteria to delete.'})
      }
      res.json(result.rows) // Or res.json({ message: `${result.rowCount} rows deleted`, deletedRows: result.rows })
    } catch (error: any) {
      console.error(`Error deleting data from table ${tableName} in project ${authenticatedProjectId}:`, error) // Use authenticatedProjectId
      if (error.message && error.message.includes('relation') && error.message.includes('does not exist')) {
        return res.status(404).json({ error: `Table "${tableName}" not found in project "${authenticatedProjectId}"` }); // Use authenticatedProjectId
      }
      if (error.message && error.message.includes('column') && error.message.includes('does not exist')) {
        return res.status(400).json({ error: `Invalid column in where clause: ${error.message}` }); // Use authenticatedProjectId
      }
      res.status(500).json({ error: 'Failed to delete data' })
    } finally {
      if (projectDbClient) {
        projectDbClient.release()
      }
    }
  })

  return router
}
