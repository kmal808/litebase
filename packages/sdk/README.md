# Litebase SDK

The official JavaScript/TypeScript SDK for Litebase - a lightweight alternative to Firebase and Supabase.

## Installation

```bash
npm install @litebase/sdk
# or
yarn add @litebase/sdk
# or
pnpm add @litebase/sdk
```

## Quick Start

```typescript
import { LitebaseClient } from '@litebase/sdk'

// Initialize the client
const client = new LitebaseClient({
  apiKey: 'your-api-key',
  projectId: 'your-project-id',
})

// Create a table
await client.createTable('users', {
  id: 'serial',
  name: 'text',
  email: 'text',
  created_at: 'timestamp',
})

// Insert data
await client.insert('users', [
  {
    name: 'John Doe',
    email: 'john@example.com',
  },
])

// Query data
const users = await client.query('users', {
  select: ['name', 'email'],
  where: { name: 'John Doe' },
})
```

## Features

- Project Management
- Table Creation and Management
- Data Operations (CRUD)
- Type-safe API with TypeScript
- Automatic Error Handling

## API Reference

### Initialization

```typescript
const client = new LitebaseClient({
  apiKey: string;      // Your API key
  projectId?: string;  // Project ID (required for most operations)
  baseUrl?: string;    // Custom API URL (defaults to http://localhost:3000)
});
```

### Project Management

```typescript
// Get project details
const project = await client.getProject()

// List all projects
const projects = await client.listProjects()

// Create a new project
const newProject = await client.createProject('My Project')
```

### Table Management

```typescript
// Create a table
const table = await client.createTable('users', {
  id: 'serial',
  name: 'text',
  email: 'text',
})

// List tables
const tables = await client.listTables()

// Get table details
const table = await client.getTable('users')
```

### Data Operations

```typescript
// Query data
const results = await client.query('users', {
  select: ['name', 'email'],
  where: { active: true },
  orderBy: 'created_at',
  limit: 10,
  offset: 0,
})

// Insert data
const inserted = await client.insert(
  'users',
  [{ name: 'John', email: 'john@example.com' }],
  {
    returning: ['id', 'created_at'],
  }
)

// Update data
const updated = await client.update(
  'users',
  { active: false },
  {
    where: { id: 1 },
    returning: ['id'],
  }
)

// Delete data
const deleted = await client.delete('users', {
  where: { id: 1 },
  returning: ['id'],
})
```

## Error Handling

The SDK includes built-in error handling:

```typescript
try {
  await client.query('non_existent_table')
} catch (error) {
  console.error(error.message) // Table not found
}
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Watch mode
npm run dev
```

## License

MIT
