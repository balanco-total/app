'use client'

import { useState, useEffect } from 'react'
import { Building2, Link2, Link2Off, RefreshCw, Loader2 } from 'lucide-react'
import type { BankConnection, ToastApi } from './types'

export default function BankConnectionsCard({ role, toast }: { role: string; toast: ToastApi }) {
  const [connections, setConnections] = useState<BankConnection[]>([])
  const [connectionsLoading, setConnectionsLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    fetch('/api/pluggy/connections')
      .then(r => r.json())
      .then((data: BankConnection[]) => { if (Array.isArray(data)) setConnections(data) })
      .catch(() => {})
      .finally(() => setConnectionsLoading(false))
  }, [])

  const loadPluggyScript = (): Promise<void> =>
    new Promise((resolve, reject) => {
      if (window.PluggyConnect) { resolve(); return }
      const script = document.createElement('script')
      script.src = 'https://cdn.pluggy.ai/pluggy-connect/v2.2.0/pluggy-connect.js'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Falha ao carregar Pluggy Connect.'))
      document.head.appendChild(script)
    })

  const handleConnectBank = async () => {
    setConnecting(true)
    try {
      const tokenRes = await fetch('/api/pluggy/connect-token', { method: 'POST' })
      const tokenJson = await tokenRes.json()
      if (!tokenRes.ok) { toast.error(tokenJson.error ?? 'Erro ao conectar.'); setConnecting(false); return }

      await loadPluggyScript()

      new window.PluggyConnect({
        connectToken: tokenJson.accessToken,
        onSuccess: async ({ item }) => {
          setSyncing(item.id)
          const syncRes = await fetch('/api/pluggy/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              itemId: item.id,
              connectorName: item.connector.name,
              connectorLogo: item.connector.logoImageUrl,
            }),
          })
          const syncJson = await syncRes.json()
          setSyncing(null)
          if (!syncRes.ok) { toast.error(syncJson.error ?? 'Erro ao sincronizar.'); return }
          toast.success(`${item.connector.name} conectado! ${syncJson.imported} transação(ões) importada(s).`)
          const connsRes = await fetch('/api/pluggy/connections')
          const connsJson = await connsRes.json()
          if (Array.isArray(connsJson)) setConnections(connsJson)
        },
        onError: () => { toast.error('Erro ao conectar banco.'); setConnecting(false) },
        onClose: () => setConnecting(false),
      }).init()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao abrir Pluggy Connect.')
      setConnecting(false)
    }
  }

  const handleSync = async (conn: BankConnection) => {
    if (syncing) return
    setSyncing(conn.item_id)
    const res = await fetch('/api/pluggy/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: conn.item_id, connectorName: conn.connector_name, connectorLogo: conn.connector_logo }),
    })
    const json = await res.json()
    setSyncing(null)
    if (!res.ok) { toast.error(json.error ?? 'Erro ao sincronizar.'); return }
    toast.success(`${json.imported} transação(ões) importada(s).`)
    setConnections(prev => prev.map(c =>
      c.id === conn.id ? { ...c, last_synced_at: json.connection?.last_synced_at ?? c.last_synced_at } : c
    ))
  }

  const handleRemoveConnection = async (conn: BankConnection) => {
    if (!confirm(`Remover a conexão com ${conn.connector_name ?? 'este banco'}? Os lançamentos importados não serão excluídos.`)) return
    const res = await fetch('/api/pluggy/connections', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: conn.id }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Erro ao remover conexão.'); return }
    setConnections(prev => prev.filter(c => c.id !== conn.id))
    toast.success(`Conexão com ${conn.connector_name ?? 'banco'} removida.`)
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
        <Building2 size={20} className="text-[#1B4332]" />
        Contas bancárias
      </h2>

      {connectionsLoading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
          <Loader2 size={16} className="animate-spin" />
          Carregando conexões...
        </div>
      ) : connections.length > 0 ? (
        <div className="space-y-3 mb-4">
          {connections.map(conn => (
            <div key={conn.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {conn.connector_logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={conn.connector_logo} alt={conn.connector_name ?? 'banco'} className="w-8 h-8 rounded-full object-contain bg-white border border-gray-100 shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                    <Building2 size={16} className="text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">{conn.connector_name ?? 'Banco'}</p>
                  <p className="text-xs text-gray-400">
                    {conn.last_synced_at
                      ? `Sincronizado ${new Date(conn.last_synced_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`
                      : 'Nunca sincronizado'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={() => handleSync(conn)}
                  disabled={!!syncing}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#1B4332]/10 text-[#1B4332] hover:bg-[#1B4332]/20 transition disabled:opacity-40 font-medium"
                >
                  {syncing === conn.item_id
                    ? <Loader2 size={13} className="animate-spin" />
                    : <RefreshCw size={13} />}
                  Sincronizar
                </button>
                {role === 'owner' && (
                  <button
                    onClick={() => handleRemoveConnection(conn)}
                    disabled={!!syncing}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-40 font-medium"
                  >
                    <Link2Off size={13} />
                    Remover
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 mb-4">
          Nenhuma conta bancária conectada. Conecte seu banco para importar transações automaticamente via Open Finance.
        </p>
      )}

      <button
        onClick={handleConnectBank}
        disabled={connecting || !!syncing}
        className="flex items-center gap-2 bg-[#1B4332] text-white px-5 py-2.5 rounded-lg hover:bg-[#163a2b] transition disabled:opacity-50 font-medium"
      >
        {connecting ? <Loader2 size={18} className="animate-spin" /> : <Link2 size={18} />}
        {connecting ? 'Abrindo...' : 'Conectar banco'}
      </button>
    </div>
  )
}
