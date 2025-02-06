import axios from 'axios'
import { RequestClient } from '../utils/request'
import { LitebaseConfig } from '../types'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('RequestClient', () => {
  let client: RequestClient
  let mockAxiosInstance: any

  beforeEach(() => {
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        response: {
          use: jest.fn(),
        },
      },
    }

    mockedAxios.create.mockReturnValue(mockAxiosInstance)

    const config: LitebaseConfig = {
      baseUrl: 'http://test.com',
      apiKey: 'test-api-key',
      projectId: 'test-project',
    }

    client = new RequestClient(config)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create axios instance with correct config', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://test.com',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-api-key',
        },
      })
    })

    it('should use default baseUrl if not provided', () => {
      const configWithoutBaseUrl: LitebaseConfig = {
        apiKey: 'test-api-key',
        projectId: 'test-project',
      }

      new RequestClient(configWithoutBaseUrl)

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:3000',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-api-key',
        },
      })
    })
  })

  describe('HTTP methods', () => {
    const testPath = '/test'
    const testData = { key: 'value' }
    const testConfig = { timeout: 5000 }

    it('should make GET request', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: testData })
      await client.get(testPath, testConfig)
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(testPath, testConfig)
    })

    it('should make POST request', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: testData })
      await client.post(testPath, testData, testConfig)
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        testPath,
        testData,
        testConfig
      )
    })

    it('should make PUT request', async () => {
      mockAxiosInstance.put.mockResolvedValue({ data: testData })
      await client.put(testPath, testData, testConfig)
      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        testPath,
        testData,
        testConfig
      )
    })

    it('should make DELETE request', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: testData })
      await client.delete(testPath, testConfig)
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
        testPath,
        testConfig
      )
    })
  })

  describe('error handling', () => {
    let successHandler: any
    let errorHandler: any

    beforeEach(() => {
      // Get the success and error handlers from the interceptor
      ;[successHandler, errorHandler] =
        mockAxiosInstance.interceptors.response.use.mock.calls[0]
    })

    it('should handle response error with message', () => {
      const errorMessage = 'Test error message'
      const error = {
        response: {
          data: {
            message: errorMessage,
          },
        },
      }

      expect(() => errorHandler(error)).toThrow(errorMessage)
    })

    it('should handle response error without message', () => {
      const error = {
        response: {
          data: {},
        },
      }

      expect(() => errorHandler(error)).toThrow('An error occurred')
    })

    it('should handle network error', () => {
      const networkError = new Error('Network error')
      expect(() => errorHandler(networkError)).toThrow('Network error')
    })

    it('should return response data on success', () => {
      const responseData = { data: { key: 'value' } }
      expect(successHandler(responseData)).toEqual({ key: 'value' })
    })
  })
})
