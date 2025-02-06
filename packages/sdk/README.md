# Litebase SDK

The official JavaScript/TypeScript SDK for Litebase - a lightweight alternative to Firebase and Supabase.

## Installation

```bash
npm install @kvrt/litebase-client-sdk
# or
yarn add @kvrt/litebase-client-sdk
# or
pnpm add @kvrt/litebase-client-sdk
```

## Quick Start

```typescript
import { LitebaseClient } from '@kvrt/litebase-client-sdk'

// Initialize the client
const client = new LitebaseClient({
  apiKey: 'your-api-key',
  projectId: 'your-project-id',
  baseUrl: 'http://localhost:3000', // Optional, defaults to http://localhost:3000
})

// Connect for real-time features
await client.connect()

// Create a table
await client.createTable('tasks', {
  id: { type: 'uuid', primary: true },
  title: { type: 'string' },
  status: { type: 'string' },
  created_at: { type: 'timestamp', default: 'now()' },
})

// Insert data
const [task] = await client.insert('tasks', [
  {
    title: 'My first task',
    status: 'pending',
  },
])

// Query data
const tasks = await client.query('tasks', {
  orderBy: { created_at: 'desc' },
})

// Subscribe to real-time updates
const unsubscribe = client.subscribe('tasks', (event) => {
  console.log('Task updated:', event.data)
})

// Cleanup subscription when done
unsubscribe()
```

## Features

- Project Management
- Table Creation and Schema Management
- Data Operations (CRUD)
- Real-time Subscriptions via WebSocket
- Type-safe API with TypeScript
- Automatic Error Handling and Reconnection

## API Reference

### Initialization

```typescript
const client = new LitebaseClient({
  apiKey: string;      // Your API key
  projectId?: string;  // Project ID (required for most operations)
  baseUrl?: string;    // Custom API URL (defaults to http://localhost:3000)
});

// Connect WebSocket for real-time features
await client.connect();
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
// Create a table with schema
const table = await client.createTable('tasks', {
  id: { type: 'uuid', primary: true },
  title: { type: 'string' },
  description: { type: 'string', nullable: true },
  status: { type: 'string' },
  created_at: { type: 'timestamp', default: 'now()' },
})

// List tables
const tables = await client.listTables()

// Get table details
const table = await client.getTable('tasks')
```

### Data Operations

```typescript
// Query data with filters and ordering
const results = await client.query('tasks', {
  where: { status: 'pending' },
  orderBy: { created_at: 'desc' },
  limit: 10,
  offset: 0,
})

// Insert data with returning fields
const [task] = await client.insert('tasks', [
  {
    title: 'New task',
    status: 'pending',
  },
])

// Update data
const updated = await client.update(
  'tasks',
  { status: 'completed' },
  { where: { id: task.id } }
)

// Delete data
const deleted = await client.delete('tasks', {
  where: { id: task.id },
})
```

### Real-time Subscriptions

```typescript
// Subscribe to all changes on a table
const unsubscribe = client.subscribe('tasks', (event) => {
  console.log('Event type:', event.type) // 'INSERT' | 'UPDATE' | 'DELETE'
  console.log('Changed data:', event.data)
})

// Subscribe with filters
const filteredUnsubscribe = client.subscribe(
  'tasks',
  (event) => {
    console.log('Pending task changed:', event.data)
  },
  { where: { status: 'pending' } }
)

// Cleanup subscriptions when done
unsubscribe()
filteredUnsubscribe()
```

## Error Handling

The SDK includes built-in error handling and automatic WebSocket reconnection:

```typescript
try {
  await client.query('non_existent_table')
} catch (error) {
  if (error.code === 'TABLE_NOT_FOUND') {
    console.error('Table does not exist')
  }
}

// WebSocket connection status
client.onConnectionChange((status) => {
  console.log('Connection status:', status)
})
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
