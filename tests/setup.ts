// Test setup for Edge Functions
import { TextEncoder, TextDecoder } from 'util'

// Simple environment setup
process.env.SUPABASE_URL = 'https://test-project.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io'
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-redis-token'

// Mock Deno environment
Object.assign(globalThis, {
  Deno: {
    env: {
      get: (key: string) => process.env[key] || ''
    }
  }
})

// Mock crypto if needed
if (!globalThis.crypto) {
  Object.assign(globalThis, {
    crypto: {
      randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9)
    }
  })
}

// Mock TextEncoder/TextDecoder for Deno compatibility
Object.assign(globalThis, {
  TextEncoder,
  TextDecoder
})

console.log('Test environment initialized') 