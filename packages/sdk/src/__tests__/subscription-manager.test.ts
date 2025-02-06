import { SubscriptionManager } from '../core/subscription-manager'
import WebSocket from 'ws'

jest.mock('ws')
const MockedWebSocket = WebSocket as jest.MockedClass<typeof WebSocket>

describe('SubscriptionManager', () => {
  let manager: SubscriptionManager
  let mockWs: jest.Mocked<WebSocket>
  let eventHandlers: Record<string, Function[]>

  beforeEach(() => {
    jest.useFakeTimers({ advanceTimers: true })

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
      removeAllListeners: jest.fn(),
    } as any

    MockedWebSocket.mockImplementation(() => mockWs)

    manager = new SubscriptionManager(
      'http://localhost:3000',
      'test-api-key',
      'test-project'
    )
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.clearAllMocks()
    jest.useRealTimers()
  })

  const flushPromisesAndTimers = async () => {
    await Promise.resolve() // Flush microtasks
    jest.runAllTimers() // Run all timers
    await Promise.resolve() // Flush microtasks again
  }

  describe('connect', () => {
    it('should establish WebSocket connection', async () => {
      const connectPromise = manager.connect()
      await flushPromisesAndTimers()
      eventHandlers.open[0]?.()
      await connectPromise

      expect(MockedWebSocket).toHaveBeenCalledWith(
        'ws://localhost:3000/realtime?apiKey=test-api-key&projectId=test-project'
      )
    })

    it('should handle connection errors', async () => {
      const newMockWs = {
        ...mockWs,
        readyState: WebSocket.CLOSED,
      }
      MockedWebSocket.mockImplementation(() => newMockWs)

      const error = new Error('Connection failed')
      const connectPromise = manager.connect()
      await flushPromisesAndTimers()
      eventHandlers.error[0]?.(error)

      await expect(connectPromise).rejects.toThrow('Connection failed')
    })

    it('should handle disconnection and attempt reconnect', async () => {
      // Initial connection
      const connectPromise = manager.connect()
      await flushPromisesAndTimers()
      eventHandlers.open[0]?.()
      await connectPromise

      // Set up subscription
      manager.subscribe('users', { event: ['INSERT'] })
      MockedWebSocket.mockClear()

      // Create new mock for reconnection
      const reconnectWs = {
        ...mockWs,
        send: jest.fn(),
      }
      MockedWebSocket.mockImplementation(() => reconnectWs)

      // Trigger disconnection and wait for reconnection attempt
      eventHandlers.close[0]?.()
      await flushPromisesAndTimers()

      // Verify reconnection behavior
      expect(MockedWebSocket).toHaveBeenCalledTimes(1)
      eventHandlers.open[0]?.()
      await flushPromisesAndTimers()

      expect(reconnectWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'subscribe',
          table: 'users',
          filter: { event: ['INSERT'] },
        })
      )
    }, 10000)
  })

  describe('subscribe', () => {
    beforeEach(async () => {
      const connectPromise = manager.connect()
      await flushPromisesAndTimers()
      eventHandlers.open[0]?.()
      await connectPromise
    })

    it('should throw error if WebSocket is not connected', () => {
      manager.disconnect()
      expect(() => manager.subscribe('users')).toThrow(
        'WebSocket is not connected'
      )
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

    it('should emit events when receiving messages', async () => {
      const callback = jest.fn()
      manager.on('users', callback)

      const message = {
        type: 'subscription',
        event: 'INSERT',
        table: 'users',
        data: { id: 1, name: 'John' },
        timestamp: '2024-01-28T00:00:00Z',
      }

      eventHandlers.message[0]?.(JSON.stringify(message))
      await flushPromisesAndTimers()

      expect(callback).toHaveBeenCalledWith(message)
    }, 10000)

    it('should handle invalid message format', async () => {
      const callback = jest.fn()
      manager.on('users', callback)

      eventHandlers.message[0]?.('invalid json')
      await flushPromisesAndTimers()

      expect(callback).not.toHaveBeenCalled()
    }, 10000)
  })

  describe('unsubscribe', () => {
    beforeEach(async () => {
      const connectPromise = manager.connect()
      await flushPromisesAndTimers()
      eventHandlers.open[0]?.()
      await connectPromise
    })

    it('should throw error if WebSocket is not connected', () => {
      manager.disconnect()
      expect(() => manager.unsubscribe('users')).toThrow(
        'WebSocket is not connected'
      )
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

    it('should remove subscription from internal map', async () => {
      // Set up subscription
      manager.subscribe('users')
      manager.unsubscribe('users')

      // Clear previous mock calls
      mockWs.send.mockClear()

      // Simulate disconnection and reconnection
      eventHandlers.close[0]?.()
      await flushPromisesAndTimers()

      // Trigger reconnection
      eventHandlers.open[0]?.()
      await flushPromisesAndTimers()

      // Verify no resubscription occurred
      expect(mockWs.send).not.toHaveBeenCalled()
    }, 10000)
  })

  describe('disconnect', () => {
    beforeEach(async () => {
      const connectPromise = manager.connect()
      await flushPromisesAndTimers()
      eventHandlers.open[0]?.()
      await connectPromise
    })

    it('should close WebSocket connection', () => {
      manager.disconnect()
      expect(mockWs.close).toHaveBeenCalled()
    })

    it('should clear subscriptions', async () => {
      // Set up subscription
      manager.subscribe('users')
      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'subscribe',
          table: 'users',
          filter: {},
        })
      )

      // Disconnect and verify
      manager.disconnect()
      expect(mockWs.close).toHaveBeenCalled()

      // Clear previous mock calls
      mockWs.send.mockClear()

      // Connect again
      const connectPromise = manager.connect()
      await flushPromisesAndTimers()
      eventHandlers.open[0]?.()
      await connectPromise

      // Verify no resubscription occurred
      expect(mockWs.send).not.toHaveBeenCalled()
    }, 10000)

    it('should handle multiple disconnects gracefully', () => {
      manager.disconnect()
      manager.disconnect()
      expect(mockWs.close).toHaveBeenCalledTimes(1)
    })
  })
})
