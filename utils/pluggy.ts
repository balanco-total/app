export const PLUGGY_BASE = 'https://api.pluggy.ai'

export async function getPluggyApiKey(): Promise<string> {
  const res = await fetch(`${PLUGGY_BASE}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: process.env.PLUGGY_CLIENT_ID,
      clientSecret: process.env.PLUGGY_CLIENT_SECRET,
    }),
  })
  if (!res.ok) throw new Error(`Pluggy /auth failed: ${res.status}`)
  const data = await res.json()
  if (!data.apiKey) throw new Error('Pluggy /auth: missing apiKey in response')
  return data.apiKey as string
}
