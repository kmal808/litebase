import { LitebaseClient } from './core/client'
export { LitebaseClient }

// Expose on window object for CDN usage
declare global {
  interface Window {
    LitebaseSDK: {
      LitebaseClient: typeof LitebaseClient
    }
  }
}

if (typeof window !== 'undefined') {
  window.LitebaseSDK = {
    LitebaseClient,
  }
}

export * from './types'
