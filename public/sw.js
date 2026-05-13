const CACHE_NAME = 'balancototal-v2'
const STATIC_ASSETS = ['/icon.svg', '/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignora requisições de API e Supabase
  if (url.pathname.startsWith('/api') || url.hostname.includes('supabase')) return

  // Navegações HTML sempre via rede — o middleware precisa rodar para renovar
  // o token Supabase e redirecionar corretamente (auth, billing, etc.)
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request))
    return
  }

  // Assets estáticos: cache-first
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  )
})
