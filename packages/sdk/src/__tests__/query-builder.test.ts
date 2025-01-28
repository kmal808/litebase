import { QueryBuilder } from '../core/query-builder'
import { QueryOptions } from '../types'

interface MockClient {
  query: jest.Mock
  insert: jest.Mock
  update: jest.Mock
  delete: jest.Mock
}

describe('QueryBuilder', () => {
  let mockClient: MockClient
  let builder: QueryBuilder

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    }
    builder = new QueryBuilder(mockClient as any, 'users')
  })

  describe('select', () => {
    it('should build select query', async () => {
      const mockData = [{ id: 1, name: 'John' }]
      mockClient.query.mockResolvedValue(mockData)

      const result = await builder
        .select('id', 'name')
        .where({ age: { gt: 18 } })
        .orderBy('name', 'desc')
        .limit(10)
        .offset(0)
        .execute()

      expect(mockClient.query).toHaveBeenCalledWith('users', {
        select: ['id', 'name'],
        where: { age: { gt: 18 } },
        orderBy: 'name desc',
        limit: 10,
        offset: 0,
      } as QueryOptions)
      expect(result).toEqual(mockData)
    })
  })

  describe('insert', () => {
    it('should insert single record', async () => {
      const mockData = [{ id: 1, name: 'John' }]
      mockClient.insert.mockResolvedValue(mockData)

      const result = await builder.returning('id').insert({ name: 'John' })

      expect(mockClient.insert).toHaveBeenCalledWith(
        'users',
        [{ name: 'John' }],
        {
          returning: ['id'],
        }
      )
      expect(result).toEqual(mockData)
    })

    it('should insert multiple records', async () => {
      const mockData = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ]
      mockClient.insert.mockResolvedValue(mockData)

      const result = await builder
        .returning('id')
        .insert([{ name: 'John' }, { name: 'Jane' }])

      expect(mockClient.insert).toHaveBeenCalledWith(
        'users',
        [{ name: 'John' }, { name: 'Jane' }],
        { returning: ['id'] }
      )
      expect(result).toEqual(mockData)
    })
  })

  describe('update', () => {
    it('should update records with where clause', async () => {
      const mockData = [{ id: 1, name: 'John Updated' }]
      mockClient.update.mockResolvedValue(mockData)

      const result = await builder
        .where({ id: 1 })
        .returning('id', 'name')
        .update({ name: 'John Updated' })

      expect(mockClient.update).toHaveBeenCalledWith(
        'users',
        { name: 'John Updated' },
        {
          where: { id: 1 },
          returning: ['id', 'name'],
        }
      )
      expect(result).toEqual(mockData)
    })
  })

  describe('delete', () => {
    it('should delete records with where clause', async () => {
      const mockData = [{ id: 1 }]
      mockClient.delete.mockResolvedValue(mockData)

      const result = await builder.where({ id: 1 }).returning('id').delete()

      expect(mockClient.delete).toHaveBeenCalledWith('users', {
        where: { id: 1 },
        returning: ['id'],
      })
      expect(result).toEqual(mockData)
    })
  })
})
