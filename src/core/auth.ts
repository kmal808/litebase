import { PoolClient } from 'pg'
import { sign, verify } from 'jsonwebtoken'
import { hash, compare } from 'bcrypt'
import { AuthConfig } from '../api/types'

export interface User {
  id: string
  email: string
  password_hash: string
  created_at: Date
  updated_at: Date
  metadata?: Record<string, unknown>
}

export interface AuthToken {
  userId: string
  projectId: string
  type: 'access' | 'refresh'
}

export class AuthManager {
  private readonly SALT_ROUNDS = 10
  private readonly ACCESS_TOKEN_EXPIRY = '15m'
  private readonly REFRESH_TOKEN_EXPIRY = '7d'

  constructor(
    private client: PoolClient,
    private config: AuthConfig,
    private jwtSecret: string
  ) {}

  async initialize(): Promise<void> {
    // Create users table
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB
      );

      CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
    `)
  }

  async createUser(
    email: string,
    password: string,
    metadata?: Record<string, unknown>
  ): Promise<User> {
    const passwordHash = await hash(password, this.SALT_ROUNDS)

    const result = await this.client.query<User>(
      `
      INSERT INTO users (email, password_hash, metadata)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [email, passwordHash, metadata ? JSON.stringify(metadata) : null]
    )

    return result.rows[0]
  }

  async authenticate(
    email: string,
    password: string
  ): Promise<{ accessToken: string; refreshToken: string } | null> {
    const result = await this.client.query<User>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    )

    const user = result.rows[0]
    if (!user) {
      return null
    }

    const isValid = await compare(password, user.password_hash)
    if (!isValid) {
      return null
    }

    return this.generateTokens(user.id)
  }

  async refreshToken(
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string } | null> {
    try {
      const payload = verify(refreshToken, this.jwtSecret) as AuthToken
      if (payload.type !== 'refresh') {
        return null
      }

      // Verify user still exists
      const result = await this.client.query<User>(
        'SELECT id FROM users WHERE id = $1',
        [payload.userId]
      )

      if (result.rows.length === 0) {
        return null
      }

      return this.generateTokens(payload.userId)
    } catch {
      return null
    }
  }

  async validateToken(token: string): Promise<AuthToken | null> {
    try {
      return verify(token, this.jwtSecret) as AuthToken
    } catch {
      return null
    }
  }

  private generateTokens(userId: string): {
    accessToken: string
    refreshToken: string
  } {
    const accessToken = sign(
      { userId, type: 'access' } as AuthToken,
      this.jwtSecret,
      { expiresIn: this.ACCESS_TOKEN_EXPIRY }
    )

    const refreshToken = sign(
      { userId, type: 'refresh' } as AuthToken,
      this.jwtSecret,
      { expiresIn: this.REFRESH_TOKEN_EXPIRY }
    )

    return { accessToken, refreshToken }
  }

  async updateUser(
    userId: string,
    updates: Partial<Omit<User, 'id' | 'password_hash'>>
  ): Promise<User> {
    const setClause = Object.entries(updates)
      .map(([key, _], index) => `${key} = $${index + 2}`)
      .join(', ')

    const result = await this.client.query<User>(
      `
      UPDATE users
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
      `,
      [userId, ...Object.values(updates)]
    )

    return result.rows[0]
  }

  async deleteUser(userId: string): Promise<void> {
    await this.client.query('DELETE FROM users WHERE id = $1', [userId])
  }
}
