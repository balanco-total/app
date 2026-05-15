'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { User, Lock, Download, Upload, FileText, AlertCircle, X, Trash2, Check, Loader2, Building2, RefreshCw, Link2, Link2Off, Users, LogOut, User as UserIcon, CreditCard, PieChart } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useToast, Toasts } from './toast'
import Logo from './Logo'
import BillingBanner from './BillingBanner'

type Profile = { id: string; name: string; account_id: string; role: string }
type Account = { id: string; trial_ends_at: string; subscription_status: string } | null

const AVATAR_COLORS = ['#3b82f6','#22c55e','#a855f7','#f97316','#ef4444','#14b8a6','#6366f1','#ec4899']

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function getAvatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

const FIELD_PATTERN = /[^a-zA-Z0-9\-\/\. À-ÿ]/g

type ParsedRow = {
  description: string
  amount: number
  category_name: string
  date: string
  raw_date: string
}

type BankConnection = {
  id: string
  item_id: string
  connector_name: string | null
  connector_logo: string | null
  last_synced_at: string | null
  created_at: string
}

declare global {
  interface Window {
    PluggyConnect: new (opts: {
      connectToken: string
      onSuccess: (data: { item: { id: string; connector: { name: string; logoImageUrl: string } } }) => void
      onError?: (err: unknown) => void
      onClose?: () => void
    }) => { init(): void }
  }
}

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function parseAmount(raw: string): number | null {
  const s = raw.replace(/[R$+\s]/g, '').replace(/^-/, '').trim()
  const hasDot = s.includes('.')
  const hasComma = s.includes(',')
  let value: number
  if (hasDot && hasComma) {
    value = parseFloat(s.replace(/\./g, '').replace(',', '.'))
  } else if (hasComma) {
    value = parseFloat(s.replace(',', '.'))
  } else {
    value = parseFloat(s)
  }
  if (!isFinite(value) || value <= 0) return null
  return Math.round(Math.abs(value) * 100) / 100
}

function parseDateStr(raw: string): { iso: string; display: string } | null {
  const br = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (br) {
    const d = parseInt(br[1]), m = parseInt(br[2]), y = parseInt(br[3])
    const date = new Date(y, m - 1, d)
    if (date.getDate() !== d || date.getMonth() !== m - 1) return null
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    return { iso, display: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}` }
  }
  const isoM = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoM) {
    const [, y, m, d] = isoM
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
    if (date.getDate() !== parseInt(d)) return null
    return { iso: `${y}-${m}-${d}`, display: `${d}/${m}/${y}` }
  }
  const ofxM = raw.trim().match(/^(\d{4})(\d{2})(\d{2})/)
  if (ofxM) {
    const [, y, m, d] = ofxM
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
    if (date.getDate() !== parseInt(d)) return null
    return { iso: `${y}-${m}-${d}`, display: `${d}/${m}/${y}` }
  }
  return null
}

function parseCSVLine(line: string, delim: string): string[] {
  const cells: string[] = []
  let i = 0
  while (i < line.length) {
    if (line[i] === '"') {
      let j = i + 1, field = ''
      while (j < line.length) {
        if (line[j] === '"' && line[j + 1] === '"') { field += '"'; j += 2 }
        else if (line[j] === '"') { j++; break }
        else { field += line[j++] }
      }
      cells.push(field)
      if (line[j] === delim) j++
      i = j
    } else {
      const end = line.indexOf(delim, i)
      if (end === -1) { cells.push(line.slice(i)); break }
      cells.push(line.slice(i, end))
      i = end + 1
    }
  }
  return cells
}

function parseCSV(text: string): ParsedRow[] {
  const cleaned = text.replace(/^﻿/, '')
  const lines = cleaned.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length < 2) return []

  const delim = (lines[0].match(/;/g) ?? []).length >= (lines[0].match(/,/g) ?? []).length ? ';' : ','
  const headers = parseCSVLine(lines[0], delim).map(h => stripAccents(h.toLowerCase().trim()))

  const findCol = (candidates: string[]) =>
    candidates.reduce<number>((found, c) => found >= 0 ? found : headers.indexOf(c), -1)

  const dateIdx = findCol(['data', 'date', 'data lancamento', 'data do lancamento', 'dt', 'data transacao', 'data pagamento'])
  const amtIdx = findCol(['valor', 'amount', 'value', 'vlr', 'debito', 'credito', 'debit', 'credit', 'montante'])
  const descIdx = findCol(['descricao', 'description', 'memo', 'historico', 'lancamento', 'complemento', 'detalhe', 'movimento'])
  const catIdx = findCol(['categoria', 'category', 'cat'])

  if (dateIdx < 0 || amtIdx < 0 || descIdx < 0) return []

  const rows: ParsedRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i], delim)
    const rawDate = cells[dateIdx]?.trim() ?? ''
    const rawAmt = cells[amtIdx]?.trim() ?? ''
    const desc = cells[descIdx]?.trim() ?? ''
    const cat = catIdx >= 0 ? cells[catIdx]?.trim() ?? '' : ''

    const parsedDate = parseDateStr(rawDate)
    const amount = parseAmount(rawAmt)
    if (!parsedDate || !amount || !desc) continue

    rows.push({ description: desc, amount, category_name: cat, date: parsedDate.iso, raw_date: parsedDate.display })
  }
  return rows
}

function extractOFXTag(block: string, tag: string): string {
  const xml = block.match(new RegExp(`<${tag}[^>]*>(.*?)<\\/${tag}>`, 'is'))
  if (xml) return xml[1].trim()
  const sgml = block.match(new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i'))
  return sgml ? sgml[1].trim() : ''
}

function parseOFX(text: string): ParsedRow[] {
  const rows: ParsedRow[] = []
  const parts = text.split(/<STMTTRN>/i).slice(1)
  for (const part of parts) {
    const end = part.search(/<\/STMTTRN>|<\/BANKTRANLIST>/i)
    const block = end >= 0 ? part.slice(0, end) : part

    const dtPosted = extractOFXTag(block, 'DTPOSTED')
    const trnAmt = extractOFXTag(block, 'TRNAMT')
    const memo = extractOFXTag(block, 'MEMO') || extractOFXTag(block, 'NAME')

    if (!dtPosted || !trnAmt || !memo) continue

    const parsedDate = parseDateStr(dtPosted)
    if (!parsedDate) continue
    const amount = parseAmount(trnAmt)
    if (!amount) continue

    const description = memo.replace(/[\x00-\x1F\x7F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)
    if (!description) continue

    rows.push({ description, amount, category_name: '', date: parsedDate.iso, raw_date: parsedDate.display })
  }
  return rows
}

export default function ProfilePage({ profile, email, account }: { profile: Profile; email: string; account: Account }) {
  const supabase = createClient()
  const router = useRouter()

  const [showAvatarMenu, setShowAvatarMenu] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setShowAvatarMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const [name, setName] = useState(profile.name)
  const [nameSaving, setNameSaving] = useState(false)
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [csvLoading, setCsvLoading] = useState(false)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteMsg, setDeleteMsg] = useState('')

  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false)
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState('')
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false)
  const [deleteAccountMsg, setDeleteAccountMsg] = useState('')

  const [isDragging, setIsDragging] = useState(false)
  const [importFileName, setImportFileName] = useState('')
  const [importRows, setImportRows] = useState<ParsedRow[]>([])
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState('')
  const [importResult, setImportResult] = useState<{ count: number } | null>(null)

  const [connections, setConnections] = useState<BankConnection[]>([])
  const [connectionsLoading, setConnectionsLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)

  const { toasts, toast, dismiss } = useToast()

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault()
    setNameMsg(null)
    setNameSaving(true)

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const json = await res.json()

    if (!res.ok) {
      setNameMsg({ ok: false, text: json.error ?? 'Erro ao salvar.' })
    } else {
      setNameMsg({ ok: true, text: 'Nome atualizado com sucesso.' })
      router.refresh()
    }
    setNameSaving(false)
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMsg(null)

    if (newPassword.length < 6) {
      setPasswordMsg({ ok: false, text: 'A senha deve ter no mínimo 6 caracteres.' })
      return
    }
    if (newPassword.length > 40) {
      setPasswordMsg({ ok: false, text: 'A senha deve ter no máximo 40 caracteres.' })
      return
    }

    setPasswordSaving(true)

    // Re-authenticate to verify current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    })

    if (signInError) {
      setPasswordMsg({ ok: false, text: 'Senha atual incorreta.' })
      setPasswordSaving(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setPasswordMsg({ ok: false, text: error.message })
    } else {
      setPasswordMsg({ ok: true, text: 'Senha alterada com sucesso.' })
      setCurrentPassword('')
      setNewPassword('')
    }
    setPasswordSaving(false)
  }

  const downloadCSV = async () => {
    setCsvLoading(true)

    const { data } = await supabase
      .from('expenses')
      .select('date, amount, description, categories(name), profiles(name)')
      .eq('account_id', profile.account_id)
      .order('date', { ascending: false })

    if (!data || data.length === 0) {
      toast.warn('Nenhum lançamento encontrado.')
      setCsvLoading(false)
      return
    }

    const headers = ['Data', 'Valor', 'Descrição', 'Categoria', 'Usuário']
    const rows = data.map(e => [
      new Date(e.date).toLocaleDateString('pt-BR'),
      (e.amount as number).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      e.description as string,
      (e.categories as {name:string}[])[0].name ?? '',
      (e.profiles as {name:string}[])[0].name ?? '',
    ])

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n')

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Lancamentos_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setCsvLoading(false)
  }

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

  const resetImport = () => {
    setImportRows([])
    setImportFileName('')
    setImportError('')
    setImportResult(null)
  }

  const processFile = (file: File) => {
    setImportError('')
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'csv' && ext !== 'ofx') {
      setImportError('Formato não suportado. Use .csv ou .ofx.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer
      let text: string
      if (ext === 'ofx') {
        try { text = new TextDecoder('windows-1252').decode(buffer) }
        catch { text = new TextDecoder('utf-8').decode(buffer) }
      } else {
        text = new TextDecoder('utf-8').decode(buffer)
      }
      const rows = ext === 'csv' ? parseCSV(text) : parseOFX(text)
      if (rows.length === 0) {
        setImportError('Nenhum lançamento encontrado. Verifique o formato do arquivo.')
        return
      }
      setImportFileName(file.name)
      setImportRows(rows)
    }
    reader.readAsArrayBuffer(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  const handleImport = async () => {
    setImportLoading(true)
    setImportError('')
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: importRows }),
    })
    const json = await res.json()
    if (!res.ok) {
      setImportError(json.error ?? 'Erro ao importar.')
      setImportLoading(false)
      return
    }
    setImportResult({ count: json.count })
    setImportLoading(false)
  }

  const confirmDeleteAccount = async () => {
    if (deleteAccountConfirm !== 'APAGAR CONTA') return
    setDeleteAccountLoading(true)
    setDeleteAccountMsg('')

    const res = await fetch('/api/profile/account', { method: 'DELETE' })
    const json = await res.json()

    if (!res.ok) {
      setDeleteAccountMsg(json.error ?? 'Erro ao apagar a conta.')
      setDeleteAccountLoading(false)
      return
    }

    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const confirmDeleteData = async () => {
    if (deleteConfirm !== 'EXCLUIR') return
    setDeleteLoading(true)
    setDeleteMsg('')

    const res = await fetch('/api/profile/data', { method: 'DELETE' })
    const json = await res.json()

    if (!res.ok) {
      setDeleteMsg(json.error ?? 'Erro ao excluir os dados.')
      setDeleteLoading(false)
      return
    }

    setShowDeleteModal(false)
    setDeleteConfirm('')
    setDeleteLoading(false)
    router.push('/app')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-7xl mx-auto">

        {/* Header — identical to Dashboard */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <Link href="/app"><Logo height={40} width={130} /></Link>
            <div className="flex items-center gap-3">
              <Link
                href="/app/charts"
                className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
                title="Ver gráficos"
              >
                <PieChart size={20} className="text-gray-600" />
                <span className="text-gray-700 font-medium">Gráficos</span>
              </Link>
              {profile.role === 'owner' ? (
                <Link
                  href="/app/users"
                  className="hidden sm:flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
                >
                  <Users size={20} className="text-gray-600" />
                  <span className="text-gray-700 font-medium">Usuários</span>
                </Link>
              ) : (
                <div className="hidden sm:flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
                  <Users size={20} className="text-gray-600" />
                  <span className="text-gray-700 font-medium">Usuários</span>
                </div>
              )}
              <div className="relative" ref={avatarRef}>
                <button
                  onClick={() => setShowAvatarMenu(v => !v)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow hover:opacity-90 transition"
                  style={{ backgroundColor: getAvatarColor(profile.name) }}
                  title={profile.name}
                >
                  {getInitials(profile.name)}
                </button>
                {showAvatarMenu && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                    <Link
                      href="/app/profile"
                      onClick={() => setShowAvatarMenu(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition text-sm"
                    >
                      <UserIcon size={16} className="text-gray-400" />
                      {profile.name}
                    </Link>
                    <Link
                      href="/app/plan"
                      onClick={() => setShowAvatarMenu(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition text-sm"
                    >
                      <CreditCard size={16} className="text-gray-400" />
                      Meu plano
                    </Link>
                    {profile.role === 'owner' ? (
                      <Link
                        href="/app/users"
                        onClick={() => setShowAvatarMenu(false)}
                        className="sm:hidden flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition text-sm"
                      >
                        <Users size={16} className="text-gray-400" />
                        Usuários
                      </Link>
                    ) : (
                      <div className="sm:hidden flex items-center gap-3 px-4 py-2.5 text-gray-500 text-sm">
                        <Users size={16} className="text-gray-400" />
                        Usuários
                      </div>
                    )}
                    <hr className="border-gray-100" />
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-red-600 hover:bg-red-50 transition text-sm"
                    >
                      <LogOut size={16} />
                      Sair
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {account && (
          <BillingBanner
            subscriptionStatus={account.subscription_status}
            trialEndsAt={account.trial_ends_at}
            isOwner={profile.role === 'owner'}
          />
        )}

        <div className="max-w-2xl mx-auto space-y-6">

        {/* Page title */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-800">Perfil</h1>
          <p className="text-gray-500 text-sm mt-0.5">{email}</p>
        </div>

        {/* Personal info */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <User size={20} className="text-[#1B4332]" />
            Informações pessoais
          </h2>

          <form onSubmit={saveName} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value.replace(FIELD_PATTERN, ''))}
                  maxLength={60}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B4332] focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={nameSaving || name.trim() === profile.name}
                  className="px-4 py-2 bg-[#1B4332] text-white rounded-lg hover:bg-[#163a2b] transition disabled:opacity-40 font-medium"
                >
                  {nameSaving ? <Loader2 size={18} className="animate-spin" /> : 'Salvar'}
                </button>
              </div>
            </div>
            {nameMsg && (
              <p className={`text-sm flex items-center gap-1 ${nameMsg.ok ? 'text-green-600' : 'text-[#1B4332]'}`}>
                {nameMsg.ok && <Check size={14} />}
                {nameMsg.text}
              </p>
            )}
          </form>

          <hr className="border-gray-100" />

          <form onSubmit={changePassword} className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Lock size={15} className="text-gray-400" />
              Alterar senha
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha atual</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                maxLength={40}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B4332] focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  maxLength={40}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B4332] focus:border-transparent"
                  placeholder="••••••••"
                />
                <button
                  type="submit"
                  disabled={passwordSaving || !currentPassword || !newPassword}
                  className="px-4 py-2 bg-[#1B4332] text-white rounded-lg hover:bg-[#163a2b] transition disabled:opacity-40 font-medium"
                >
                  {passwordSaving ? <Loader2 size={18} className="animate-spin" /> : 'Alterar'}
                </button>
              </div>
            </div>
            {passwordMsg && (
              <p className={`text-sm flex items-center gap-1 ${passwordMsg.ok ? 'text-green-600' : 'text-[#1B4332]'}`}>
                {passwordMsg.ok && <Check size={14} />}
                {passwordMsg.text}
              </p>
            )}
          </form>
        </div>

        {/* Data export */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
            <Download size={20} className="text-[#1B4332]" />
            Exportar dados
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Baixe todos os lançamentos da conta em formato CSV (compatível com Excel).
            Colunas: data, valor, descrição, categoria, usuário.
          </p>
          <button
            onClick={downloadCSV}
            disabled={csvLoading}
            className="flex items-center gap-2 bg-[#1B4332] text-white px-5 py-2.5 rounded-lg hover:bg-[#163a2b] transition disabled:opacity-50 font-medium"
          >
            {csvLoading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            {csvLoading ? 'Gerando CSV...' : 'Baixar CSV'}
          </button>
        </div>

        {/* Bank connections — Pluggy Open Finance */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
            <Building2 size={20} className="text-[#1B4332]" />
            Contas Bancárias
          </h2>

          {connectionsLoading ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
              <Loader2 size={16} className="animate-spin" />
              Carregando conexões...
            </div>
          ) : connections.length > 0 ? (
            <div className="space-y-3 mb-4">
              {connections.map(conn => (
                <div key={conn.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                  {conn.connector_logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={conn.connector_logo} alt={conn.connector_name ?? 'banco'} className="w-8 h-8 rounded-full object-contain bg-white border border-gray-100" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
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
                  {profile.role === 'owner' && (
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

        {/* Import */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
            <Upload size={20} className="text-[#1B4332]" />
            Importar lançamentos
          </h2>

          {importResult ? (
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
              <Check size={20} className="text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-700">{importResult.count} lançamento(s) importado(s) com sucesso.</p>
                <button onClick={resetImport} className="text-sm text-green-600 hover:underline mt-1">
                  Importar outro arquivo
                </button>
              </div>
            </div>
          ) : importRows.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">{importRows.length}</span> lançamentos encontrados em{' '}
                  <span className="font-medium text-gray-700">{importFileName}</span>
                </p>
                <button onClick={resetImport} className="text-gray-400 hover:text-gray-600 transition">
                  <X size={16} />
                </button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Data</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Descrição</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Valor</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Categoria</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {importRows.slice(0, 10).map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-gray-500 whitespace-nowrap text-xs">{row.raw_date}</td>
                        <td className="px-3 py-2 text-gray-800 max-w-[180px] truncate">{row.description}</td>
                        <td className="px-3 py-2 text-gray-800 text-right whitespace-nowrap">
                          {row.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 max-w-[120px] truncate">
                          {row.category_name
                            ? <span className="text-gray-600">{row.category_name}</span>
                            : <span className="text-gray-300 italic text-xs">sem categoria</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importRows.length > 10 && (
                  <p className="text-xs text-gray-400 text-center py-2 border-t border-gray-50">
                    e mais {importRows.length - 10} lançamentos
                  </p>
                )}
              </div>

              <p className="text-xs text-gray-400">
                Categorias serão vinculadas pelo nome. As que não tiverem correspondência serão atribuídas à categoria <strong className="text-gray-500">Outros</strong> (criada automaticamente se não existir).
              </p>

              {importError && (
                <p className="text-sm text-[#1B4332]/80 flex items-center gap-1.5">
                  <AlertCircle size={14} className="shrink-0" />
                  {importError}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleImport}
                  disabled={importLoading}
                  className="flex items-center gap-2 bg-[#1B4332] text-white px-5 py-2.5 rounded-lg hover:bg-[#163a2b] transition disabled:opacity-50 font-medium"
                >
                  {importLoading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                  {importLoading ? 'Importando...' : `Importar ${importRows.length} lançamentos`}
                </button>
                <button
                  onClick={resetImport}
                  disabled={importLoading}
                  className="px-5 py-2.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition font-medium"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                Suporta arquivos <strong>CSV</strong> (exportados pelo BalançoTotal ou de outros sistemas) e{' '}
                <strong>OFX</strong> (extratos bancários). Categorias sem correspondência são atribuídas a <strong>Outros</strong>.
              </p>
              <label
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition
                  ${isDragging ? 'border-[#1B4332] bg-green-50' : 'border-gray-200 hover:border-[#1B4332]/40 hover:bg-gray-50'}`}
                onDragEnter={e => { e.preventDefault(); setIsDragging(true) }}
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false) }}
                onDrop={handleDrop}
              >
                <FileText size={32} className={isDragging ? 'text-[#1B4332]' : 'text-gray-300'} />
                <p className="mt-2 font-medium text-gray-600">Arraste um arquivo aqui</p>
                <p className="text-sm text-gray-400">ou clique para selecionar</p>
                <p className="text-xs text-gray-300 mt-1">.csv · .ofx</p>
                <input
                  type="file"
                  accept=".csv,.ofx"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              {importError && (
                <p className="text-sm text-red-600 flex items-center gap-1.5 mt-3">
                  <AlertCircle size={14} className="shrink-0" />
                  {importError}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Danger zone (owner only) */}
        {profile.role === 'owner' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-red-100">
            <h2 className="text-lg font-bold text-red-600 flex items-center gap-2 mb-4">
              <Trash2 size={20} />
              Zona de perigo
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Remove permanentemente <strong>todos os lançamentos</strong> da conta.
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => { setShowDeleteModal(true); setDeleteConfirm(''); setDeleteMsg('') }}
                className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-lg hover:bg-red-700 transition font-medium"
              >
                <Trash2 size={18} />
                Excluir todos os lançamentos
              </button>
              <button
                onClick={() => { setShowDeleteAccountModal(true); setDeleteAccountConfirm(''); setDeleteAccountMsg('') }}
                className="flex items-center gap-2 bg-red-900 text-white px-5 py-2.5 rounded-lg hover:bg-red-950 transition font-medium"
              >
                <Trash2 size={18} />
                Apagar conta permanentemente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Excluir todos os lançamentos</h3>
            <p className="text-gray-600 text-sm mb-4">
              Esta ação é <strong>irreversível</strong> e removerá todos os lançamentos de todos os
              membros da conta.
            </p>
            <p className="text-sm text-gray-700 mb-2">
              Digite <strong className="text-red-600">EXCLUIR</strong> para confirmar:
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4 font-mono"
              placeholder="EXCLUIR"
              autoFocus
            />
            {deleteMsg && (
              <p className="text-sm text-red-600 mb-3">{deleteMsg}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={confirmDeleteData}
                disabled={deleteConfirm !== 'EXCLUIR' || deleteLoading}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-40"
              >
                {deleteLoading ? 'Excluindo...' : 'Confirmar exclusão'}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
                className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete account modal */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-red-700 mb-2">Apagar conta permanentemente</h3>
            <p className="text-gray-600 text-sm mb-2">
              Esta ação é <strong>irreversível</strong> e irá remover:
            </p>
            <ul className="text-sm text-gray-600 list-disc list-inside mb-4 space-y-1">
              <li>Todos os lançamentos</li>
              <li>Todas as categorias</li>
              <li>Todos os membros e seus acessos</li>
              <li>A conta inteira</li>
            </ul>
            <p className="text-sm text-gray-700 mb-2">
              Digite <strong className="text-red-700">APAGAR CONTA</strong> para confirmar:
            </p>
            <input
              type="text"
              value={deleteAccountConfirm}
              onChange={e => setDeleteAccountConfirm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4 font-mono"
              placeholder="APAGAR CONTA"
              autoFocus
            />
            {deleteAccountMsg && (
              <p className="text-sm text-red-600 mb-3">{deleteAccountMsg}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={confirmDeleteAccount}
                disabled={deleteAccountConfirm !== 'APAGAR CONTA' || deleteAccountLoading}
                className="flex-1 bg-red-900 text-white py-2.5 rounded-lg font-semibold hover:bg-red-950 transition disabled:opacity-40"
              >
                {deleteAccountLoading ? 'Apagando...' : 'Apagar conta'}
              </button>
              <button
                onClick={() => setShowDeleteAccountModal(false)}
                disabled={deleteAccountLoading}
                className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <Toasts toasts={toasts} dismiss={dismiss} />
        </div>
      </div>
  )
}
