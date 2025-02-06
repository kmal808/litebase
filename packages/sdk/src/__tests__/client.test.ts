import { LitebaseClient } from '../core/client'
import { RequestClient } from '../utils/request'
import {
  SubscriptionManager,
  SubscriptionFilter,
  SubscriptionEvent,
} from '../core/subscription-manager'

// Mock dependencies
jest.mock('../utils/request')
jest.mock('../core/subscription-manager')

describe('LitebaseClient', () => {
  let client: LitebaseClient
  let mockRequestClient: jest.Mocked<RequestClient>
  let mockSubscriptionManager: jest.Mocked<SubscriptionManager>

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks()

    // Create mock instances
    mockRequestClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    } as any

    mockSubscriptionManager = {
      connect: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    } as any

    // Mock the constructors
    ;(RequestClient as unknown as jest.Mock).mockImplementation(
      () => mockRequestClient
    )
    ;(SubscriptionManager as unknown as jest.Mock).mockImplementation(
      () => mockSubscriptionManager
    )

    // Create client instance
    client = new LitebaseClient({
      apiKey: 'test-api-key',
      projectId: 'test-project',
    })
  })

  describe('Project Management', () => {
    it('should get project details', async () => {
      const mockProject = {
        id: 'test-project',
        name: 'Test Project',
        created_at: new Date().toISOString(),
      }

      mockRequestClient.get.mockResolvedValue(mockProject)

      const project = await client.getProject()
      expect(project).toEqual(mockProject)
      expect(mockRequestClient.get).toHaveBeenCalledWith(
        '/api/projects/test-project'
      )
    })

    it('should list projects', async () => {
      const mockProjects = [
        { id: '1', name: 'Project 1' },
        { id: '2', name: 'Project 2' },
      ]

      mockRequestClient.get.mockResolvedValue(mockProjects)

      const projects = await client.listProjects()
      expect(projects).toEqual(mockProjects)
      expect(mockRequestClient.get).toHaveBeenCalledWith('/api/projects')
    })

    it('should create project', async () => {
      const mockProject = {
        id: 'new-project',
        name: 'New Project',
        created_at: new Date().toISOString(),
      }

      mockRequestClient.post.mockResolvedValue(mockProject)

      const project = await client.createProject('New Project')
      expect(project).toEqual(mockProject)
      expect(mockRequestClient.post).toHaveBeenCalledWith('/api/projects', {
        name: 'New Project',
      })
    })
  })

  describe('Table Management', () => {
    it('should create table', async () => {
      const mockTable = {
        name: 'users',
        schema: { id: 'uuid', name: 'text' },
      }

      mockRequestClient.post.mockResolvedValue(mockTable)

      const table = await client.createTable('users', {
        id: 'uuid',
        name: 'text',
      })
      expect(table).toEqual(mockTable)
      expect(mockRequestClient.post).toHaveBeenCalledWith(
        '/api/projects/test-project/tables',
        {
          name: 'users',
          schema: { id: 'uuid', name: 'text' },
        }
      )
    })

    it('should list tables', async () => {
      const mockTables = [
        { name: 'users', schema: {} },
        { name: 'posts', schema: {} },
      ]

      mockRequestClient.get.mockResolvedValue(mockTables)

      const tables = await client.listTables()
      expect(tables).toEqual(mockTables)
      expect(mockRequestClient.get).toHaveBeenCalledWith(
        '/api/projects/test-project/tables'
      )
    })

    it('should get table', async () => {
      const mockTable = { name: 'users', schema: {} }

      mockRequestClient.get.mockResolvedValue(mockTable)

      const table = await client.getTable('users')
      expect(table).toEqual(mockTable)
      expect(mockRequestClient.get).toHaveBeenCalledWith(
        '/api/projects/test-project/tables/users'
      )
    })
  })

  describe('Data Operations', () => {
    it('should query data', async () => {
      const mockData = [{ id: 1, name: 'Test' }]
      const queryOptions = { select: ['id', 'name'], where: { id: 1 } }

      mockRequestClient.post.mockResolvedValue(mockData)

      const result = await client.query('users', queryOptions)
      expect(result).toEqual(mockData)
      expect(mockRequestClient.post).toHaveBeenCalledWith(
        '/api/projects/test-project/tables/users/query',
        queryOptions
      )
    })

    it('should insert data', async () => {
      const mockData = [{ id: 1, name: 'Test' }]
      const insertData = [{ name: 'Test' }]

      mockRequestClient.post.mockResolvedValue(mockData)

      const result = await client.insert('users', insertData)
      expect(result).toEqual(mockData)
      expect(mockRequestClient.post).toHaveBeenCalledWith(
        '/api/projects/test-project/tables/users/rows',
        { data: insertData }
      )
    })

    it('should update data', async () => {
      const mockData = [{ id: 1, name: 'Updated' }]
      const updateData = { name: 'Updated' }
      const options = { where: { id: 1 } }

      mockRequestClient.put.mockResolvedValue(mockData)

      const result = await client.update('users', updateData, options)
      expect(result).toEqual(mockData)
      expect(mockRequestClient.put).toHaveBeenCalledWith(
        '/api/projects/test-project/tables/users/rows',
        { data: updateData, ...options }
      )
    })

    it('should delete data', async () => {
      const mockData = [{ id: 1 }]
      const options = { where: { id: 1 } }

      mockRequestClient.delete.mockResolvedValue(mockData)

      const result = await client.delete('users', options)
      expect(result).toEqual(mockData)
      expect(mockRequestClient.delete).toHaveBeenCalledWith(
        '/api/projects/test-project/tables/users/rows',
        { data: options }
      )
    })
  })

  describe('Real-time Subscriptions', () => {
    it('should connect websocket', async () => {
      await client.connect()
      expect(mockSubscriptionManager.connect).toHaveBeenCalled()
    })

    it('should subscribe to table changes', () => {
      const callback = jest.fn()
      const filter: SubscriptionFilter = {
        event: ['INSERT' as SubscriptionEvent],
      }

      const unsubscribe = client.subscribe('users', callback, filter)

      expect(mockSubscriptionManager.subscribe).toHaveBeenCalledWith(
        'users',
        filter
      )
      expect(mockSubscriptionManager.on).toHaveBeenCalledWith('users', callback)

      unsubscribe()

      expect(mockSubscriptionManager.unsubscribe).toHaveBeenCalledWith('users')
      expect(mockSubscriptionManager.off).toHaveBeenCalledWith(
        'users',
        callback
      )
    })

    it('should handle specific events', () => {
      const callback = jest.fn()

      client.onInsert('users', callback)
      expect(mockSubscriptionManager.subscribe).toHaveBeenCalledWith('users', {
        event: ['INSERT' as SubscriptionEvent],
      })

      client.onUpdate('users', callback)
      expect(mockSubscriptionManager.subscribe).toHaveBeenCalledWith('users', {
        event: ['UPDATE' as SubscriptionEvent],
      })

      client.onDelete('users', callback)
      expect(mockSubscriptionManager.subscribe).toHaveBeenCalledWith('users', {
        event: ['DELETE' as SubscriptionEvent],
      })
    })
  })

  describe('Error Handling', () => {
    it('should throw error when projectId is missing', async () => {
      client = new LitebaseClient({
        apiKey: 'test-api-key',
      })

      await expect(client.getProject()).rejects.toThrow(
        'Project ID is required'
      )
      await expect(client.createTable('test', {})).rejects.toThrow(
        'Project ID is required'
      )
      await expect(client.listTables()).rejects.toThrow(
        'Project ID is required'
      )
      await expect(client.getTable('test')).rejects.toThrow(
        'Project ID is required'
      )
      await expect(client.query('test')).rejects.toThrow(
        'Project ID is required'
      )
      await expect(client.insert('test', [])).rejects.toThrow(
        'Project ID is required'
      )
      await expect(client.update('test', {})).rejects.toThrow(
        'Project ID is required'
      )
      await expect(client.delete('test')).rejects.toThrow(
        'Project ID is required'
      )
    })

    it('should handle request errors', async () => {
      const error = new Error('Network error')
      mockRequestClient.get.mockRejectedValue(error)

      await expect(client.getProject()).rejects.toThrow('Network error')
    })
  })
})
