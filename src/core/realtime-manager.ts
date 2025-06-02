import { WebSocketServer, WebSocket } from 'ws'
import http from 'http'
import { URL } from 'url'
import { Pool, PoolClient } from 'pg' // Import Pool and PoolClient
import { ProjectManager } from './project-manager'
// Project type might not be directly needed here anymore unless for specific checks
// import { Project } from '../api/types';

// Extend WebSocket to store projectId
interface AuthenticatedWebSocket extends WebSocket {
  projectId: string
}

export class RealtimeManager {
  private projectManager: ProjectManager
  private pool: Pool // Store the pool
  private wss!: WebSocketServer
  private dbListenerClient: PoolClient | null = null // Client for LISTEN/NOTIFY
  private subscriptions: Map<string, Map<string, Set<AuthenticatedWebSocket>>>

  constructor(projectManager: ProjectManager, pool: Pool) { // Accept pool
    this.projectManager = projectManager
    this.pool = pool // Store pool
    this.subscriptions = new Map()
    console.log('RealtimeManager constructed with ProjectManager and Pool')
  }

  async initialize(server: http.Server): Promise<void> { // Made async
    this.wss = new WebSocketServer({ noServer: true })
    console.log('WebSocketServer created with noServer: true')

    // Setup database listener client
    try {
      this.dbListenerClient = await this.pool.connect()
      this.dbListenerClient.on('error', (err) => {
        console.error('Database listener client error:', err)
        // Implement reconnection logic or graceful shutdown if necessary
        this.dbListenerClient?.release() // Release the client
        this.dbListenerClient = null // Mark as disconnected
        // Potentially try to reconnect after a delay
        // For now, just log and release
      })

      await this.dbListenerClient.query('LISTEN litebase_changes')
      console.log('Successfully listening for "litebase_changes" notifications.')

      this.dbListenerClient.on('notification', (msg) => {
        if (msg.channel === 'litebase_changes' && msg.payload) {
          try {
            const payload = JSON.parse(msg.payload)
            console.log('Received notification:', payload)

            const schemaName = payload.schema_name
            if (schemaName && typeof schemaName === 'string' && schemaName.startsWith('project_')) {
              const projectIdWithUnderscores = schemaName.substring('project_'.length)
              // Convert project_uuid_with_underscores back to uuid-with-hyphens
              const projectId = projectIdWithUnderscores.replace(/_/g, '-')
              
              this.broadcast(projectId, payload.table_name, payload)
            } else {
              console.warn('Notification received for non-project schema or missing schema_name:', payload)
            }
          } catch (e) {
            console.error('Error parsing notification payload:', e)
          }
        }
      })
    } catch (err) {
      console.error('Failed to set up database listener client:', err)
      // Realtime features related to DB changes will be unavailable
    }

    server.on('upgrade', async (request, socket, head) => {
      console.log('Received upgrade request for WebSocket')
      if (!request.url) {
        console.log('Upgrade request has no URL. Destroying socket.')
        socket.destroy()
        return
      }

      const { searchParams } = new URL(request.url, `http://${request.headers.host}`)
      const apiKey = searchParams.get('apiKey')
      const queryProjectId = searchParams.get('projectId')

      if (!apiKey || !queryProjectId) {
        console.log('API key or projectId missing in query parameters. Destroying socket.')
        socket.destroy()
        return
      }

      try {
        const project = await this.projectManager.getProjectByApiKey(apiKey)
        if (!project || project.id !== queryProjectId) {
          console.log(`Authentication failed for API key: ${apiKey} and project ID: ${queryProjectId}. Destroying socket.`)
          socket.destroy()
          return
        }

        console.log(`Project ${project.id} authenticated for WebSocket connection.`)

        this.wss.handleUpgrade(request, socket, head, (ws) => {
          const authenticatedWs = ws as AuthenticatedWebSocket
          authenticatedWs.projectId = project.id // Store projectId on the WebSocket connection
          this.wss.emit('connection', authenticatedWs, request)
        })
      } catch (error) {
        console.error('Error during WebSocket upgrade authentication:', error)
        socket.destroy()
      }
    })

    this.wss.on('connection', (ws: AuthenticatedWebSocket, request) => {
      const { projectId } = ws 
      console.log(`WebSocket client connected for project: ${projectId}, URL: ${request.url}`)

      // Initialize project subscriptions if not present
      if (!this.subscriptions.has(projectId)) {
        this.subscriptions.set(projectId, new Map())
      }

      ws.on('message', (message) => {
        console.log(`Received message from project ${projectId}: ${message}`)
        // Here, parse message for subscription requests, e.g., { type: 'subscribe', table: 'my_table' }
        // For now, just logging.
        try {
          const parsedMessage = JSON.parse(message.toString())
          if (parsedMessage.type === 'subscribe' && parsedMessage.table) {
            this.handleSubscription(ws, projectId, parsedMessage.table)
          } else if (parsedMessage.type === 'unsubscribe' && parsedMessage.table) {
            this.handleUnsubscription(ws, projectId, parsedMessage.table)
          }
        } catch (e) {
            console.error(`Failed to parse message from project ${projectId}: ${message}`, e)
        }
      })

      ws.on('close', () => {
        console.log(`WebSocket client disconnected from project: ${projectId}`)
        this.cleanupSubscriptions(ws, projectId)
      })

      ws.on('error', (error) => {
        console.error(`WebSocket error for project ${projectId}:`, error)
        // Consider also cleaning up subscriptions here if the connection is abruptly terminated.
        this.cleanupSubscriptions(ws, projectId)
      })
    })
    console.log('RealtimeManager initialized, WebSocket server setup, and DB listener active.')
  }

  public async disconnectListener(): Promise<void> {
    if (this.dbListenerClient) {
      try {
        // Optionally, you might want to execute UNLISTEN litebase_changes here
        // await this.dbListenerClient.query('UNLISTEN litebase_changes');
        this.dbListenerClient.release()
        this.dbListenerClient = null
        console.log('Database listener client released.')
      } catch (err) {
        console.error('Error releasing database listener client:', err)
      }
    }
  }
  
  private handleSubscription(ws: AuthenticatedWebSocket, projectId: string, tableName: string): void {
    const projectSubscriptions = this.subscriptions.get(projectId)
    if (!projectSubscriptions) return; // Should not happen if initialized in 'connection'

    if (!projectSubscriptions.has(tableName)) {
      projectSubscriptions.set(tableName, new Set())
    }
    projectSubscriptions.get(tableName)!.add(ws)
    console.log(`Project ${projectId}: Client subscribed to table ${tableName}`)
    // Send confirmation or initial data if needed
    ws.send(JSON.stringify({ type: 'subscribed', table: tableName, status: 'success' }))
  }

  private handleUnsubscription(ws: AuthenticatedWebSocket, projectId: string, tableName: string): void {
    const projectSubscriptions = this.subscriptions.get(projectId)
    if (!projectSubscriptions || !projectSubscriptions.has(tableName)) return

    projectSubscriptions.get(tableName)!.delete(ws)
    if (projectSubscriptions.get(tableName)!.size === 0) {
        projectSubscriptions.delete(tableName)
    }
    console.log(`Project ${projectId}: Client unsubscribed from table ${tableName}`)
     ws.send(JSON.stringify({ type: 'unsubscribed', table: tableName, status: 'success' }))
  }

  private cleanupSubscriptions(ws: AuthenticatedWebSocket, projectId: string): void {
    const projectSubscriptions = this.subscriptions.get(projectId)
    if (!projectSubscriptions) return

    projectSubscriptions.forEach((tableSubscriptions, tableName) => {
      if (tableSubscriptions.delete(ws)) {
        console.log(`Project ${projectId}: Cleaned up subscription for table ${tableName} on disconnect.`)
      }
      if (tableSubscriptions.size === 0) {
        projectSubscriptions.delete(tableName)
      }
    })

    if (projectSubscriptions.size === 0) {
      this.subscriptions.delete(projectId)
    }
  }

  // Stub for broadcast method
  public broadcast(projectId: string, tableName: string, data: any): void {
    console.log(
      `Broadcasting to project ${projectId}, table ${tableName}:`,
      JSON.stringify(data)
    )
    const projectSubscriptions = this.subscriptions.get(projectId)
    if (!projectSubscriptions || !projectSubscriptions.has(tableName)) {
      console.log(`No subscriptions for project ${projectId}, table ${tableName}. Nothing to broadcast.`)
      return
    }

    const tableSubscribers = projectSubscriptions.get(tableName)!
    tableSubscribers.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'data', table: tableName, payload: data }))
      }
    })
    console.log(`Broadcasted to ${tableSubscribers.size} clients for table ${tableName} in project ${projectId}.`)
  }
}
