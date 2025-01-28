import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { LitebaseConfig } from '../types'

export class RequestClient {
  private client: AxiosInstance

  constructor(config: LitebaseConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl || 'http://localhost:3000',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
    })

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        if (error.response) {
          throw new Error(error.response.data.message || 'An error occurred')
        }
        throw error
      }
    )
  }

  async get<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    return this.client.get(path, config)
  }

  async post<T>(
    path: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.client.post(path, data, config)
  }

  async put<T>(
    path: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.client.put(path, data, config)
  }

  async delete<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    return this.client.delete(path, config)
  }
}
