import express from 'express'
import { Pool } from 'pg'
import dotenv from 'dotenv'
import { v4 as uuidv4 } from 'uuid'
import { RestApiGenerator } from './api/rest-generator'
import { createTableRoutes } from './api/table-routes'

dotenv.config()

const app = express()
app.use(express.json())

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'litebase',
  password: process.env.DB_PASSWORD || 'litebase',
  database: process.env.DB_NAME || 'litebase',
}

const pool = new Pool(dbConfig)

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' })
})

// Initialize system tables and start server
async function initializeServer() {
  try {
    const client = await pool.connect()

    // Create projects table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        api_key VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create project routes
    app.post('/api/projects', async (req, res) => {
      try {
        const { name } = req.body
        if (!name) {
          return res.status(400).json({ error: 'Project name is required' })
        }

        const apiKey = uuidv4() // Generate a unique API key
        const result = await client.query(
          'INSERT INTO projects (name, api_key) VALUES ($1, $2) RETURNING *',
          [name, apiKey]
        )

        res.status(201).json(result.rows[0])
      } catch (error) {
        console.error('Error in POST /api/projects:', error)
        res.status(500).json({ error: 'Failed to create project' })
      }
    })

    app.get('/api/projects', async (req, res) => {
      try {
        const result = await client.query(
          'SELECT * FROM projects ORDER BY created_at DESC'
        )
        res.json(result.rows)
      } catch (error) {
        console.error('Error in GET /api/projects:', error)
        res.status(500).json({ error: 'Failed to fetch projects' })
      }
    })

    // Add table management routes
    app.use('/api/projects', createTableRoutes(client))

    // Create REST API routes for projects
    const restApiGenerator = new RestApiGenerator(client)
    app.use('/api/projects', restApiGenerator.generateApi('projects'))

    const port = process.env.PORT || 3000
    app.listen(port, () => {
      console.log(`Server running on port ${port}`)
    })
  } catch (error) {
    console.error('Failed to initialize server:', error)
    process.exit(1)
  }
}

initializeServer()
