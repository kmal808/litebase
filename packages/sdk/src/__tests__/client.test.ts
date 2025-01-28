import { LitebaseClient } from '../core/client'
import axios from 'axios'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('LitebaseClient', () => {
  let client: LitebaseClient

  beforeEach(() => {
    client = new LitebaseClient({
      apiKey: 'test-api-key',
      projectId: 'test-project',
    })
    jest.clearAllMocks()
  })

  describe('Project Management', () => {
    it('should get project details', async () => {
      const mockProject = {
        id: 1,
        name: 'Test Project',
        api_key: 'test-key',
        created_at: '2024-01-28T00:00:00Z',
        updated_at: '2024-01-28T00:00:00Z',
      }

      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue({ data: mockProject }),
        interceptors: {
          response: {
            use: jest.fn(),
          },
        },
      } as any)

      const project = await client.getProject()
      expect(project).toEqual(mockProject)
    })

    it('should list projects', async () => {
      const mockProjects = [
        {
          id: 1,
          name: 'Test Project 1',
          api_key: 'test-key-1',
          created_at: '2024-01-28T00:00:00Z',
          updated_at: '2024-01-28T00:00:00Z',
        },
        {
          id: 2,
          name: 'Test Project 2',
          api_key: 'test-key-2',
          created_at: '2024-01-28T00:00:00Z',
          updated_at: '2024-01-28T00:00:00Z',
        },
      ]

      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue({ data: mockProjects }),
        interceptors: {
          response: {
            use: jest.fn(),
          },
        },
      } as any)

      const projects = await client.listProjects()
      expect(projects).toEqual(mockProjects)
    })
  })

  describe('Table Management', () => {
    it('should create a table', async () => {
      const mockTable = {
        name: 'users',
        schema: {
          id: 'serial',
          name: 'text',
        },
        created_at: '2024-01-28T00:00:00Z',
        updated_at: '2024-01-28T00:00:00Z',
      }

      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue({ data: mockTable }),
        interceptors: {
          response: {
            use: jest.fn(),
          },
        },
      } as any)

      const table = await client.createTable('users', {
        id: 'serial',
        name: 'text',
      })
      expect(table).toEqual(mockTable)
    })
  })

  describe('Data Operations', () => {
    it('should query data', async () => {
      const mockData = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ]

      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue({ data: mockData }),
        interceptors: {
          response: {
            use: jest.fn(),
          },
        },
      } as any)

      const result = await client.query('users', {
        select: ['id', 'name'],
        where: { id: 1 },
      })
      expect(result).toEqual(mockData)
    })

    it('should insert data', async () => {
      const mockData = [{ id: 1, name: 'John' }]

      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue({ data: mockData }),
        interceptors: {
          response: {
            use: jest.fn(),
          },
        },
      } as any)

      const result = await client.insert('users', [{ name: 'John' }])
      expect(result).toEqual(mockData)
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
    })
  })
})
