import assert from 'node:assert/strict'
import type { NextFunction, Request, Response } from 'express'
import { assertValidIdentifier } from '../utils/identifiers'
import { projectAuth } from '../middleware/project-auth'

async function testIdentifierValidation() {
  assert.doesNotThrow(() =>
    assertValidIdentifier('valid_table_name_1', 'table name')
  )
  assert.throws(
    () => assertValidIdentifier('bad-table-name', 'table name'),
    /Invalid table name/
  )
}

async function testProjectAuthRejectsMissingKey() {
  const middleware = projectAuth({
    getProjectByApiKey: async () => null,
  } as any)

  const req = {
    headers: {},
  } as unknown as Request

  let statusCode = 200
  let responseBody: unknown = null

  const res = {
    status(code: number) {
      statusCode = code
      return this
    },
    json(body: unknown) {
      responseBody = body
      return this
    },
  } as unknown as Response

  let nextCalled = false
  const next: NextFunction = () => {
    nextCalled = true
  }

  await middleware(req as any, res, next)

  assert.equal(statusCode, 401)
  assert.deepEqual(responseBody, { error: 'API key required' })
  assert.equal(nextCalled, false)
}

async function testProjectAuthAcceptsValidKey() {
  const middleware = projectAuth({
    getProjectByApiKey: async (apiKey: string) =>
      apiKey === 'valid-key' ? { id: 'project-1' } : null,
  } as any)

  const req = {
    headers: {
      'x-api-key': 'valid-key',
    },
  } as unknown as Request

  const res = {
    status() {
      return this
    },
    json() {
      return this
    },
  } as unknown as Response

  let nextCalled = false
  const next: NextFunction = () => {
    nextCalled = true
  }

  await middleware(req as any, res, next)

  assert.equal(nextCalled, true)
  assert.equal((req as any).projectId, 'project-1')
}

async function run() {
  await testIdentifierValidation()
  await testProjectAuthRejectsMissingKey()
  await testProjectAuthAcceptsValidKey()
  console.log('Smoke tests passed.')
}

run().catch((error) => {
  console.error('Smoke tests failed:', error)
  process.exit(1)
})
