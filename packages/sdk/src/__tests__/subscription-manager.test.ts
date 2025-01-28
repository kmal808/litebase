import { SubscriptionManager } from '../core/subscription-manager'
import WebSocket from 'ws'

jest.mock('ws')
const MockedWebSocket = WebSocket as jest.MockedClass<typeof WebSocket>

describe('SubscriptionManager', () => {
  let manager: SubscriptionManager
  let mockWs: jest.Mocked<WebSocket>
  let eventHandlers: Record<string, Function[]>

  beforeEach(() => {
    eventHandlers = {
      open: [],
      message: [],
      error: [],
      close: [],
    }

    mockWs = {
      on: jest.fn().mockImplementation((event: string, handler: Function) => {
        eventHandlers[event].push(handler)
        return mockWs
      }),
      send: jest.fn(),
      close: jest.fn(),
      readyState: WebSocket.OPEN,
    } as any

    MockedWebSocket.mockImplementation(() => mockWs)

    manager = new SubscriptionManager(
      'http://localhost:3000',
      'test-api-key',
      'test-project'
    )
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('connect', () => {
    it('should establish WebSocket connection', async () => {
      const connectPromise = manager.connect()

      // Simulate successful connection
      eventHandlers.open[0]?.()

      await connectPromise
      expect(MockedWebSocket).toHaveBeenCalledWith(
        'ws://localhost:3000/realtime?apiKey=test-api-key&projectId=test-project'
      )
    })

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed')
      const connectPromise = manager.connect()

      // Simulate connection error
      eventHandlers.error[0]?.(error)

      await expect(connectPromise).rejects.toThrow('Connection failed')
    })
  })

  describe('subscribe', () => {
    beforeEach(async () => {
      const connectPromise = manager.connect()
      eventHandlers.open[0]?.()
      await connectPromise
    })

    it('should send subscription message', () => {
      manager.subscribe('users', { event: ['INSERT'] })

      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'subscribe',
          table: 'users',
          filter: { event: ['INSERT'] },
        })
      )
    })

    it('should emit events when receiving messages', () => {
      const callback = jest.fn()
      manager.on('users', callback)

      // Simulate receiving a message
      const message = {
        type: 'subscription',
        event: 'INSERT',
        table: 'users',
        data: { id: 1, name: 'John' },
        timestamp: '2024-01-28T00:00:00Z',
      }

      eventHandlers.message[0]?.(JSON.stringify(message))

      expect(callback).toHaveBeenCalledWith(message)
    })
  })

  describe('unsubscribe', () => {
    beforeEach(async () => {
      const connectPromise = manager.connect()
      eventHandlers.open[0]?.()
      await connectPromise
    })

    it('should send unsubscribe message', () => {
      manager.subscribe('users')
      manager.unsubscribe('users')

      expect(mockWs.send).toHaveBeenLastCalledWith(
        JSON.stringify({
          type: 'unsubscribe',
          table: 'users',
        })
      )
    })
  })

  describe('disconnect', () => {
    beforeEach(async () => {
      const connectPromise = manager.connect()
      eventHandlers.open[0]?.()
      await connectPromise
    })

    it('should close WebSocket connection', () => {
      manager.disconnect()
      expect(mockWs.close).toHaveBeenCalled()
    })
  })
})
