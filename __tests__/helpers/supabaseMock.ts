/**
 * Test helper: builds a chainable Supabase mock that mirrors the bits of the
 * supabase-js fluent API the codebase actually uses (`from`, `select`, `insert`,
 * `update`, `eq`, `ilike`, `maybeSingle`, `single`, plus `auth.getUser`,
 * `auth.signOut`, `auth.signUp`, `auth.admin.*`).
 *
 * Usage:
 *   const supabase = makeSupabase({ user: {...}, fromResponses: { profiles: [{...}] } })
 *
 * Each call to `.from(table)` returns a query builder. Chained `.select/.eq/...`
 * are no-ops that return the same builder; terminal `.single()` / `.maybeSingle()`
 * / `await builder` returns the first response queued for that table.
 */

type Resp = { data?: unknown; error?: unknown }

export type SupabaseMockOptions = {
  user?: { id: string; email?: string } | null
  // Responses queued per table, in FIFO order. Each call drains one.
  fromResponses?: Record<string, Resp[]>
  signUpResponse?: Resp
  signOutResponse?: Resp
  adminAuth?: {
    deleteUser?: (id: string) => Promise<Resp>
    updateUserById?: (id: string, body: unknown) => Promise<Resp>
  }
}

export function makeSupabase(opts: SupabaseMockOptions = {}) {
  const responses: Record<string, Resp[]> = JSON.parse(JSON.stringify(opts.fromResponses ?? {}))

  function next(table: string): Resp {
    const queue = responses[table] ?? []
    return queue.shift() ?? { data: null, error: null }
  }

  function makeBuilder(table: string) {
    // Captured filters for assertions
    const calls: { method: string; args: unknown[] }[] = []

    const builder: Record<string, unknown> = {
      _calls: calls,
      _table: table,
      select: jest.fn((...args: unknown[]) => { calls.push({ method: 'select', args }); return builder }),
      insert: jest.fn((...args: unknown[]) => { calls.push({ method: 'insert', args }); return builder }),
      update: jest.fn((...args: unknown[]) => { calls.push({ method: 'update', args }); return builder }),
      delete: jest.fn((...args: unknown[]) => { calls.push({ method: 'delete', args }); return builder }),
      upsert: jest.fn((...args: unknown[]) => { calls.push({ method: 'upsert', args }); return builder }),
      eq: jest.fn((...args: unknown[]) => { calls.push({ method: 'eq', args }); return builder }),
      neq: jest.fn((...args: unknown[]) => { calls.push({ method: 'neq', args }); return builder }),
      ilike: jest.fn((...args: unknown[]) => { calls.push({ method: 'ilike', args }); return builder }),
      in: jest.fn((...args: unknown[]) => { calls.push({ method: 'in', args }); return builder }),
      order: jest.fn((...args: unknown[]) => { calls.push({ method: 'order', args }); return builder }),
      limit: jest.fn((...args: unknown[]) => { calls.push({ method: 'limit', args }); return builder }),
      maybeSingle: jest.fn(() => Promise.resolve(next(table))),
      single: jest.fn(() => Promise.resolve(next(table))),
      // Allow `await builder` to resolve (terminal without `.single`)
      then: (resolve: (v: Resp) => unknown) => resolve(next(table)),
    }
    return builder
  }

  const supabase = {
    from: jest.fn((table: string) => makeBuilder(table)),
    auth: {
      getUser: jest.fn(async () => ({ data: { user: opts.user ?? null }, error: null })),
      signUp: jest.fn(async () => opts.signUpResponse ?? { data: null, error: null }),
      signInWithPassword: jest.fn(async () => ({ data: null, error: null })),
      signOut: jest.fn(async () => opts.signOutResponse ?? { error: null }),
      admin: {
        deleteUser: jest.fn(opts.adminAuth?.deleteUser ?? (async () => ({ error: null }))),
        updateUserById: jest.fn(opts.adminAuth?.updateUserById ?? (async () => ({ error: null }))),
      },
    },
  }

  return supabase
}

export type MockSupabase = ReturnType<typeof makeSupabase>
