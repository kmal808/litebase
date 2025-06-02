import express from 'express'
import { Pool } from 'pg'
import dotenv from 'dotenv'
import { v4 as uuidv4 } from 'uuid'
import { RestApiGenerator } from './api/rest-generator'
import { createTableRoutes } from './api/table-routes'
import http from 'http' // Import http
import { createDataRoutes } from './api/data-routes'
import { ProjectManager } from '../core/project-manager'
import { RealtimeManager } from '../core/realtime-manager' // Import RealtimeManager
import { DatabaseConfig } from './api/types'

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
    // Initialize ProjectManager
    const projectManager = new ProjectManager(dbConfig as DatabaseConfig)
    await projectManager.initialize()

    // Create project routes
    app.post('/api/projects', async (req, res) => {
      try {
        const { name } = req.body
        if (!name) {
          return res.status(400).json({ error: 'Project name is required' })
        }

        const apiKey = uuidv4() // Generate a unique API key
        const projectConfig = { apiKey }
        const newProject = await projectManager.createProject(name, projectConfig)

        res.status(201).json(newProject)
      } catch (error) {
        console.error('Error in POST /api/projects:', error)
        res.status(500).json({ error: 'Failed to create project' })
      }
    })

    app.get('/api/projects', async (req, res) => {
      try {
        const projects = await projectManager.listProjects()
        res.json(projects)
      } catch (error) {
        console.error('Error in GET /api/projects:', error)
        res.status(500).json({ error: 'Failed to fetch projects' })
      }
    })

    // Mount table management routes, passing ProjectManager
    app.use('/api/projects', createTableRoutes(projectManager))

    // Mount data manipulation routes, passing ProjectManager
    app.use('/api/projects', createDataRoutes(projectManager))

    // The RestApiGenerator for the 'projects' table itself is no longer needed.
    // Project creation and listing are handled by specific ProjectManager routes.
    // Dynamic table/data routes handle project-specific tables, not the projects table.

    // Initialize RealtimeManager
    const realtimeManager = new RealtimeManager(projectManager, pool) // Pass pool

    const port = process.env.PORT || 3000
    const httpServer = app.listen(port, () => {
      console.log(`Server running on port ${port}`)
    })

    realtimeManager.initialize(httpServer) // Initialize RealtimeManager with the HTTP server
  } catch (error) {
    console.error('Failed to initialize server:', error)
    process.exit(1)
  }
}

initializeServer()
