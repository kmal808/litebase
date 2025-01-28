import { Router, Request, Response } from 'express'
import { PoolClient } from 'pg'
import { SchemaDefinition, ColumnDefinition } from './types'

export class RestApiGenerator {
  private client: PoolClient

  constructor(client: PoolClient) {
    this.client = client
  }

  generateApi(tableName: string): Router {
    const router = Router()

    // GET /api/[table] - List all records with pagination, sorting, and filtering
    router.get('/', async (req: Request, res: Response) => {
      try {
        const page = parseInt(req.query.page as string) || 1
        const limit = parseInt(req.query.limit as string) || 10
        const offset = (page - 1) * limit
        const sortBy = (req.query.sortBy as string) || 'id'
        const sortOrder = (
          (req.query.sortOrder as string) || 'ASC'
        ).toUpperCase()

        let query = `SELECT * FROM ${tableName}`
        const values: any[] = []
        let paramIndex = 1

        // Add filtering
        if (req.query.filter) {
          const filters = req.query.filter as Record<string, string>
          const filterClauses: string[] = []

          Object.entries(filters).forEach(([key, value]) => {
            filterClauses.push(`${key} = $${paramIndex}`)
            values.push(value)
            paramIndex++
          })

          if (filterClauses.length > 0) {
            query += ` WHERE ${filterClauses.join(' AND ')}`
          }
        }

        // Add sorting
        query += ` ORDER BY ${sortBy} ${sortOrder}`

        // Add pagination
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
        values.push(limit, offset)

        const result = await this.client.query(query, values)
        res.json(result.rows)
      } catch (error) {
        console.error('Error in GET /', error)
        res.status(500).json({ error: 'Internal server error' })
      }
    })

    // GET /api/[table]/:id - Get a single record
    router.get('/:id', async (req: Request, res: Response) => {
      try {
        const result = await this.client.query(
          `SELECT * FROM ${tableName} WHERE id = $1`,
          [req.params.id]
        )

        if (result.rows.length === 0) {
          res.status(404).json({ error: 'Record not found' })
          return
        }

        res.json(result.rows[0])
      } catch (error) {
        console.error('Error in GET /:id', error)
        res.status(500).json({ error: 'Internal server error' })
      }
    })

    // POST /api/[table] - Create a new record
    router.post('/', async (req: Request, res: Response) => {
      try {
        const { id, ...data } = req.body
        const columns = Object.keys(data)
        const values = Object.values(data)
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ')

        const result = await this.client.query(
          `INSERT INTO ${tableName} (${columns.join(
            ', '
          )}) VALUES (${placeholders}) RETURNING *`,
          values
        )

        res.status(201).json(result.rows[0])
      } catch (error) {
        console.error('Error in POST /', error)
        res.status(500).json({ error: 'Internal server error' })
      }
    })

    // PATCH /api/[table]/:id - Update a record
    router.patch('/:id', async (req: Request, res: Response) => {
      try {
        const { id, ...data } = req.body
        const updates = Object.entries(data)
          .map(([key, _], i) => `${key} = $${i + 1}`)
          .join(', ')
        const values = [...Object.values(data), req.params.id]

        const result = await this.client.query(
          `UPDATE ${tableName} SET ${updates} WHERE id = $${values.length} RETURNING *`,
          values
        )

        if (result.rows.length === 0) {
          res.status(404).json({ error: 'Record not found' })
          return
        }

        res.json(result.rows[0])
      } catch (error) {
        console.error('Error in PATCH /:id', error)
        res.status(500).json({ error: 'Internal server error' })
      }
    })

    // DELETE /api/[table]/:id - Delete a record
    router.delete('/:id', async (req: Request, res: Response) => {
      try {
        const result = await this.client.query(
          `DELETE FROM ${tableName} WHERE id = $1 RETURNING *`,
          [req.params.id]
        )

        if (result.rows.length === 0) {
          res.status(404).json({ error: 'Record not found' })
          return
        }

        res.json({ message: 'Record deleted successfully' })
      } catch (error) {
        console.error('Error in DELETE /:id', error)
        res.status(500).json({ error: 'Internal server error' })
      }
    })

    return router
  }

  // Helper method to generate OpenAPI documentation for the endpoints
  generateOpenApiDocs(
    tableName: string,
    schema: Record<string, ColumnDefinition>
  ) {
    return {
      paths: {
        [`/api/${tableName}`]: {
          get: {
            summary: `List ${tableName}`,
            parameters: [
              {
                name: 'limit',
                in: 'query',
                schema: { type: 'integer', default: 50 },
              },
              {
                name: 'offset',
                in: 'query',
                schema: { type: 'integer', default: 0 },
              },
              {
                name: 'sort',
                in: 'query',
                schema: { type: 'string', enum: Object.keys(schema) },
              },
              {
                name: 'order',
                in: 'query',
                schema: {
                  type: 'string',
                  enum: ['asc', 'desc'],
                  default: 'asc',
                },
              },
            ],
            responses: {
              '200': {
                description: `List of ${tableName}`,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'array',
                          items: { type: 'object', properties: schema },
                        },
                        count: { type: 'integer' },
                        limit: { type: 'integer' },
                        offset: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
          post: {
            summary: `Create ${tableName}`,
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: schema,
                  },
                },
              },
            },
            responses: {
              '201': {
                description: 'Created successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: schema,
                    },
                  },
                },
              },
            },
          },
        },
      },
    }
  }
}
