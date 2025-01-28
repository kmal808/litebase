# Litebase

A lightweight alternative to Firebase and Supabase. Self-hosted, open-source Backend-as-a-Service.

## Features

- 🚀 Instant API
- 📦 Real-time Subscriptions
- 🔒 Authentication & Authorization
- 🎯 Type-safe SDK
- 📱 Admin Dashboard
- 🛠 Self-hosted

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/litebase
cd litebase

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start services
docker compose up -d
```

Visit `http://localhost:8080` to access the admin dashboard.

### Option 2: NPM Package Only

```bash
npm install @litebase/sdk
```

```typescript
import { LitebaseClient } from '@litebase/sdk'

const client = new LitebaseClient({
  apiKey: 'your-api-key',
  projectId: 'your-project-id',
})

// Create a table
await client.createTable('users', {
  id: 'serial',
  name: 'text',
  email: 'text',
})

// Insert data
await client.from('users').insert({ name: 'John', email: 'john@example.com' })

// Query with real-time updates
client
  .from('users')
  .select('name', 'email')
  .where({ name: 'John' })
  .subscribe((users) => {
    console.log('Users updated:', users)
  })
```

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │
│  Litebase  │     │   API &     │     │  Postgres   │
│    SDK     │ --> │  WebSocket  │ --> │  Database   │
│            │     │   Server    │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Deployment

### Self-hosted

1. Clone the repository
2. Configure environment variables
3. Run with Docker Compose
4. (Optional) Set up reverse proxy with Nginx/Caddy

### Cloud Providers

Deployment guides available for:

- AWS
- DigitalOcean
- Google Cloud
- Azure

## Documentation

- [Getting Started](./docs/getting-started.md)
- [API Reference](./docs/api-reference.md)
- [SDK Documentation](./docs/sdk.md)
- [Deployment Guide](./docs/deployment.md)
- [Examples](./examples)

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT
