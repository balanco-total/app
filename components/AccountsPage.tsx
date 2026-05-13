'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { User } from '@supabase/supabase-js'
import { Landmark, PlusCircle, Pencil, Trash2, LogOut, Users, PieChart, Star, Home, User as UserIcon, CreditCard, ChevronDown, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast, Toasts, useConfirm, ConfirmModal } from './toast'
import Logo from './Logo'
import BillingBanner from './BillingBanner'

type Profile = { id: string; name: string; account_id: string; role: string }
type Account = { id: string; trial_ends_at: string; subscription_status: string } | null
type FinancialAccount = {
  id: string
  account_id: string
  name: string
  description: string | null
  balance: number
  is_default: boolean
  created_at: string
}

const MAX_CENTS = 100_000_000

function applyMask(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  const cents = Math.min(parseInt(digits, 10), MAX_CENTS)
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parseMasked(value: string): number {
  return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0
}

const AVATAR_COLORS = ['#3b82f6', '#22c55e', '#a855f7', '#f97316', '#ef4444', '#14b8a6', '#6366f1', '#ec4899']

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function getAvatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

export default function AccountsPage({ profile, account }: { profile: Profile; account: Account }) {
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

  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formBalance, setFormBalance] = useState('')
  const [saving, setSaving] = useState(false)

  const { toasts, toast, dismiss } = useToast()
  const { confirmState, showConfirm, handleConfirm, handleCancel } = useConfirm()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data } = await supabase
      .from('financial_accounts')
      .select('*')
      .eq('account_id', profile.account_id)
      .order('created_at', { ascending: true })

    let accounts = data ?? []
    if (accounts.length === 0) {
      const { data: seeded } = await supabase
        .from('financial_accounts')
        .insert({ account_id: profile.account_id, name: 'Carteira', is_default: true })
        .select()
        .single()
      if (seeded) accounts = [seeded]
    }

    setFinancialAccounts(accounts)
    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const openCreate = () => {
    setEditingAccount(null)
    setFormName('')
    setFormDescription('')
    setFormBalance('')
    setShowForm(true)
  }

  const openEdit = (acc: FinancialAccount) => {
    setEditingAccount(acc)
    setFormName(acc.name)
    setFormDescription(acc.description ?? '')
    setFormBalance(acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
    setShowForm(true)
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditingAccount(null)
  }

  const saveAccount = async () => {
    const name = formName.trim()
    if (!name) { toast.error('Nome é obrigatório.'); return }
    if (name.length > 60) { toast.error('Nome deve ter no máximo 60 caracteres.'); return }

    const balance = parseMasked(formBalance)
    if (formBalance && (balance < 0 || balance > 1_000_000)) {
      toast.error('Saldo deve ser entre R$ 0,00 e R$ 1.000.000,00.')
      return
    }

    const description = formDescription.trim() || null

    setSaving(true)

    if (editingAccount) {
      const { error } = await supabase
        .from('financial_accounts')
        .update({ name, description, balance })
        .eq('id', editingAccount.id)

      if (error) {
        if (error.code === '23505') {
          toast.error('Já existe uma conta com esse nome.')
        } else {
          toast.error('Erro ao atualizar conta.')
        }
        setSaving(false)
        return
      }

      setFinancialAccounts(prev => prev.map(a => a.id === editingAccount.id ? { ...a, name, description, balance } : a))
      toast.success('Conta atualizada.')
    } else {
      const isFirst = financialAccounts.length === 0
      const { data, error } = await supabase
        .from('financial_accounts')
        .insert({ account_id: profile.account_id, name, description, balance, is_default: isFirst })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          toast.error('Já existe uma conta com esse nome.')
        } else {
          toast.error('Erro ao criar conta.')
        }
        setSaving(false)
        return
      }

      setFinancialAccounts(prev => [...prev, data])
      toast.success('Conta criada.')
    }

    setSaving(false)
    setShowForm(false)
    setEditingAccount(null)
  }

  const setDefault = async (id: string) => {
    const { error: e1 } = await supabase
      .from('financial_accounts')
      .update({ is_default: false })
      .eq('account_id', profile.account_id)
    if (e1) { toast.error('Erro ao atualizar conta padrão.'); return }

    const { error: e2 } = await supabase
      .from('financial_accounts')
      .update({ is_default: true })
      .eq('id', id)
    if (e2) { toast.error('Erro ao atualizar conta padrão.'); return }

    setFinancialAccounts(prev => prev.map(a => ({ ...a, is_default: a.id === id })))
    toast.success('Conta padrão atualizada.')
  }

  const deleteAccount = (acc: FinancialAccount) => {
    showConfirm({
      title: `Excluir conta "${acc.name}"?`,
      body: 'As despesas vinculadas permanecerão, mas perderão o vínculo com esta conta.',
      confirmLabel: 'Excluir',
      onConfirm: async () => {
        const { error } = await supabase.from('financial_accounts').delete().eq('id', acc.id)
        if (error) { toast.error('Erro ao excluir conta.'); return }

        const remaining = financialAccounts.filter(a => a.id !== acc.id)
        setFinancialAccounts(remaining)

        if (acc.is_default && remaining.length > 0) {
          await setDefault(remaining[0].id)
        }
      },
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Logo />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <Link href="/app"><Logo height={40} width={130} /></Link>
            <div className="flex items-center gap-3">
              <Link
                href="/app"
                className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
                title="Voltar ao dashboard"
              >
                <Home size={20} className="text-gray-600" />
                <span className="text-gray-700 font-medium">Dashboard</span>
              </Link>
              <Link
                href="/app/charts"
                className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
                title="Ver gráficos"
              >
                <PieChart size={20} className="text-gray-600" />
                <span className="text-gray-700 font-medium hidden sm:inline">Gráficos</span>
              </Link>

              {/* Avatar dropdown */}
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

        {/* Main card */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Landmark size={22} className="text-[#1B4332]" />
              Contas Financeiras
            </h2>
            {!showForm && (
              <button
                onClick={openCreate}
                className="flex items-center gap-2 bg-[#1B4332] text-white px-4 py-2 rounded-lg hover:bg-[#14332a] transition text-sm font-medium"
              >
                <PlusCircle size={16} />
                Nova conta
              </button>
            )}
          </div>

          {/* Form */}
          {showForm && (
            <div className="mb-6 p-5 bg-gray-50 rounded-xl border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                {editingAccount ? 'Editar conta' : 'Nova conta'}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome</label>
                  <input
                    type="text"
                    maxLength={60}
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                    placeholder="Ex: Nubank, Caixa, Carteira"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrição (opcional)</label>
                  <input
                    type="text"
                    maxLength={120}
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                    placeholder="Ex: Conta corrente principal"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Saldo inicial (R$)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formBalance}
                    onChange={e => setFormBalance(applyMask(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                    placeholder="0,00"
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={saveAccount}
                    disabled={saving}
                    className="flex-1 bg-[#1B4332] text-white py-2.5 rounded-lg font-semibold hover:bg-[#14332a] transition disabled:opacity-50 text-sm"
                  >
                    {saving ? 'Salvando…' : editingAccount ? 'Salvar alterações' : 'Criar conta'}
                  </button>
                  <button
                    onClick={cancelForm}
                    className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-200 transition text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* List */}
          {financialAccounts.length === 0 && !showForm ? (
            <div className="text-center py-12">
              <Landmark size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Nenhuma conta cadastrada ainda.</p>
              <p className="text-gray-400 text-xs mt-1">Adicione uma conta para associar aos seus lançamentos.</p>
              <button
                onClick={openCreate}
                className="mt-4 flex items-center gap-2 bg-[#1B4332] text-white px-4 py-2 rounded-lg hover:bg-[#14332a] transition text-sm font-medium mx-auto"
              >
                <PlusCircle size={16} />
                Criar primeira conta
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {financialAccounts.map(acc => (
                <div key={acc.id} className={`p-4 rounded-xl border transition ${acc.is_default ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${acc.is_default ? 'bg-green-100' : 'bg-gray-200'}`}>
                        <Landmark size={16} className={acc.is_default ? 'text-green-600' : 'text-gray-500'} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-800">{acc.name}</span>
                          {acc.is_default && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <Star size={10} />
                              padrão
                            </span>
                          )}
                        </div>
                        {acc.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{acc.description}</p>
                        )}
                        <p className="text-sm font-semibold text-gray-700 mt-1">
                          R$ {acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!acc.is_default && financialAccounts.length > 1 && (
                        <button
                          onClick={() => setDefault(acc.id)}
                          title="Tornar padrão"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-white hover:text-green-700 hover:border-green-200 border border-transparent transition"
                        >
                          <Star size={13} />
                          <span className="hidden sm:inline">Tornar padrão</span>
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(acc)}
                        title="Editar conta"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white transition"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => deleteAccount(acc)}
                        title="Excluir conta"
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-white transition"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Toasts toasts={toasts} dismiss={dismiss} />
      {confirmState && <ConfirmModal {...confirmState} onConfirm={handleConfirm} onCancel={handleCancel} />}
    </div>
  )
}
