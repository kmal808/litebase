import { QueryOptions } from '../types'

interface LitebaseClientInterface {
  query<T>(tableName: string, options: QueryOptions): Promise<T[]>
  insert<T>(
    tableName: string,
    data: Record<string, any>[],
    options: { returning: string[] }
  ): Promise<T[]>
  update<T>(
    tableName: string,
    data: Record<string, any>,
    options: { where: Record<string, any>; returning: string[] }
  ): Promise<T[]>
  delete<T>(
    tableName: string,
    options: { where: Record<string, any>; returning: string[] }
  ): Promise<T[]>
}

export class QueryBuilder<T = any> {
  private _select: string[] = ['*']
  private _where: Record<string, any> = {}
  private _orderBy: Record<string, 'ASC' | 'DESC'> = {}
  private _limit?: number
  private _offset?: number
  private _returning: string[] = []

  constructor(
    private client: LitebaseClientInterface,
    private tableName: string
  ) {}

  /**
   * Select specific columns
   * @example
   * query.select('id', 'name', 'email')
   */
  select(...fields: string[]): this {
    this._select = fields
    return this
  }

  /**
   * Add where conditions
   * @example
   * query.where({ name: 'John', age: { gt: 18 } })
   */
  where(conditions: Record<string, any>): this {
    this._where = { ...this._where, ...conditions }
    return this
  }

  /**
   * Add order by clause
   * @example
   * query.orderBy('created_at', 'desc')
  */
  orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): this {
    this._orderBy[field] = direction.toUpperCase() as 'ASC' | 'DESC'
    return this
  }

  /**
   * Set limit
   * @example
   * query.limit(10)
   */
  limit(limit: number): this {
    this._limit = limit
    return this
  }

  /**
   * Set offset
   * @example
   * query.offset(10)
   */
  offset(offset: number): this {
    this._offset = offset
    return this
  }

  /**
   * Specify returning fields for mutations
   * @example
   * query.returning('id', 'created_at')
   */
  returning(...fields: string[]): this {
    this._returning = fields
    return this
  }

  /**
   * Execute the query
   */
  async execute(): Promise<T[]> {
    const options: QueryOptions = {
      select: this._select,
      where: this._where,
      orderBy: this._orderBy,
      limit: this._limit,
      offset: this._offset,
    }

    return this.client.query<T>(this.tableName, options)
  }

  /**
   * Insert records
   * @example
   * query.insert({ name: 'John', email: 'john@example.com' })
   */
  async insert(
    data: Record<string, any> | Record<string, any>[]
  ): Promise<T[]> {
    const records = Array.isArray(data) ? data : [data]
    return this.client.insert<T>(this.tableName, records, {
      returning: this._returning,
    })
  }

  /**
   * Update records
   * @example
   * query.where({ id: 1 }).update({ name: 'John' })
   */
  async update(data: Record<string, any>): Promise<T[]> {
    return this.client.update<T>(this.tableName, data, {
      where: this._where,
      returning: this._returning,
    })
  }

  /**
   * Delete records
   * @example
   * query.where({ id: 1 }).delete()
   */
  async delete(): Promise<T[]> {
    return this.client.delete<T>(this.tableName, {
      where: this._where,
      returning: this._returning,
    })
  }
}
