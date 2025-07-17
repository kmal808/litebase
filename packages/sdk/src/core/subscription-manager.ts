import WebSocket from 'ws'
import { EventEmitter } from 'events'

export type SubscriptionEvent = 'INSERT' | 'UPDATE' | 'DELETE'

export interface SubscriptionFilter {
  event?: SubscriptionEvent[]
  where?: Record<string, any>
}

export interface SubscriptionMessage {
  type: 'subscription'
  event: SubscriptionEvent
  table: string
  data: any
  timestamp: string
}

export class SubscriptionManager extends EventEmitter {
  private ws: WebSocket | null = null
  private subscriptions: Map<string, SubscriptionFilter> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectTimeout = 1000 // Start with 1 second
  private reconnectTimer?: NodeJS.Timeout

  constructor(
    private baseUrl: string,
    private apiKey: string,
    private projectId: string
  ) {
    super()
  }

  private getWebSocketUrl(): string {
    const wsUrl = this.baseUrl.replace(/^http/, 'ws')
    return `${wsUrl}/realtime?apiKey=${this.apiKey}&projectId=${this.projectId}`
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.getWebSocketUrl())

        if (this.ws.readyState === WebSocket.OPEN) {
          this.reconnectAttempts = 0
          this.reconnectTimeout = 1000
          this.resubscribe()
          resolve()
        }

        this.ws.on('open', () => {
          this.reconnectAttempts = 0
          this.reconnectTimeout = 1000
          this.resubscribe()
          resolve()
        })

        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            const message: SubscriptionMessage = JSON.parse(data.toString())
            if (message.type === 'subscription') {
              this.emit(`${message.table}:${message.event}`, message.data)
              this.emit(message.table, message) // Emit for all events on this table
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        })

        this.ws.on('close', () => {
          this.handleDisconnect()
        })

        this.ws.on('error', (error) => {
          console.error('WebSocket error:', error)
          if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
            reject(error)
          }
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  private handleDisconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      this.reconnectTimeout *= 2 // Exponential backoff
      console.log(`Reconnecting in ${this.reconnectTimeout}ms...`)
      this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectTimeout)
    } else {
      this.emit('disconnected')
      console.error('Max reconnection attempts reached')
    }
  }

  private resubscribe() {
    const ws = this.ws
    if (!ws) return

    // Resubscribe to all active subscriptions
    this.subscriptions.forEach((filter, table) => {
      const message = {
        type: 'subscribe',
        table,
        filter,
      }
      ws.send(JSON.stringify(message))
    })
  }

  subscribe(table: string, filter: SubscriptionFilter = {}) {
    if (!this.ws) {
      throw new Error('WebSocket is not connected')
    }

    this.subscriptions.set(table, filter)
    const message = {
      type: 'subscribe',
      table,
      filter,
    }
    this.ws.send(JSON.stringify(message))
  }

  unsubscribe(table: string) {
    if (!this.ws) {
      throw new Error('WebSocket is not connected')
    }

    this.subscriptions.delete(table)
    const message = {
      type: 'unsubscribe',
      table,
    }
    this.ws.send(JSON.stringify(message))
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }
    if (this.ws) {
      this.ws.removeAllListeners()
      this.ws.close()
      this.ws = null
      this.subscriptions.clear()
    }
  }
}
