/**
 * Short-lived verification state (codes expire after 10 minutes).
 * On Netlify this is Netlify Blobs — the platform's built-in key-value
 * storage, not a database. For local tests only, VERIFICATION_STORE=memory
 * keeps it in process memory.
 */
import { getStore } from '@netlify/blobs'
import type { KV } from './verification'

const memory = new Map<string, unknown>()

export function storeFromEnv(): KV {
  if (process.env.VERIFICATION_STORE === 'memory') {
    return {
      get: async <T,>(k: string) => (memory.has(k) ? (structuredClone(memory.get(k)) as T) : null),
      set: async (k, v) => void memory.set(k, structuredClone(v)),
      delete: async (k) => void memory.delete(k),
    }
  }
  const s = getStore({ name: 'email-verification', consistency: 'strong' })
  return {
    get: async <T,>(k: string) => ((await s.get(k, { type: 'json' })) as T | null) ?? null,
    set: async (k, v) => void (await s.setJSON(k, v)),
    delete: async (k) => void (await s.delete(k)),
  }
}
