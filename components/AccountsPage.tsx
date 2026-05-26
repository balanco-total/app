'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Landmark, PlusCircle } from 'lucide-react'
import { useToast, Toasts, useConfirm, ConfirmModal } from './toast'
import LoadingPage from './LoadingPage'
import BillingBanner from './BillingBanner'
import DashboardHeader from './dashboard/DashboardHeader'
import AccountForm from './accounts/AccountForm'
import AccountList from './accounts/AccountList'
import Button from './ui/Button'
import type { Profile, Account, FinancialAccount } from './accounts/types'

export default function AccountsPage({ profile, account }: { profile: Profile; account: Account }) {
  const supabase = createClient()

  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null)
  const [saving, setSaving] = useState(false)
  const [formKey, setFormKey] = useState(0)

  const { toasts, toast, dismiss } = useToast()
  const { confirmState, showConfirm, handleConfirm, handleCancel } = useConfirm()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData() }, [])

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

  const openCreate = () => {
    setEditingAccount(null)
    setFormKey(k => k + 1)
    setShowForm(true)
  }

  const openEdit = (acc: FinancialAccount) => {
    setEditingAccount(acc)
    setFormKey(k => k + 1)
    setShowForm(true)
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditingAccount(null)
  }

  const saveAccount = async (name: string, description: string | null, balance: number) => {
    if (!name.trim()) { toast.error('Nome é obrigatório.'); return }
    if (name.trim().length > 60) { toast.error('Nome deve ter no máximo 60 caracteres.'); return }
    if (balance < 0 || balance > 1_000_000) {
      toast.error('Saldo deve ser entre R$ 0,00 e R$ 1.000.000,00.')
      return
    }

    setSaving(true)

    if (editingAccount) {
      const { error } = await supabase
        .from('financial_accounts')
        .update({ name: name.trim(), description, balance })
        .eq('id', editingAccount.id)

      if (error) {
        toast.error(error.code === '23505' ? 'Já existe uma conta com esse nome.' : 'Erro ao atualizar conta.')
        setSaving(false)
        return
      }

      setFinancialAccounts(prev => prev.map(a =>
        a.id === editingAccount.id ? { ...a, name: name.trim(), description, balance } : a
      ))
      toast.success('Conta atualizada.')
    } else {
      const isFirst = financialAccounts.length === 0
      const { data, error } = await supabase
        .from('financial_accounts')
        .insert({ account_id: profile.account_id, name: name.trim(), description, balance, is_default: isFirst })
        .select()
        .single()

      if (error) {
        toast.error(error.code === '23505' ? 'Já existe uma conta com esse nome.' : 'Erro ao criar conta.')
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

  if (loading) return <LoadingPage />

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-4xl mx-auto">
        <DashboardHeader profile={profile} />
        {account && (
          <BillingBanner
            subscriptionStatus={account.subscription_status}
            trialEndsAt={account.trial_ends_at}
            isOwner={profile.role === 'owner'}
          />
        )}

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Landmark size={22} className="text-brand-500" />
              Contas
            </h2>
            {!showForm && (
              <Button
                size="sm"
                icon={<PlusCircle size={16} />}
                onClick={openCreate}
                className="px-4 text-sm font-medium"
              >
                Nova conta
              </Button>
            )}
          </div>

          {showForm && (
            <AccountForm
              key={formKey}
              editingAccount={editingAccount}
              saving={saving}
              onSave={saveAccount}
              onCancel={cancelForm}
            />
          )}

          <AccountList
            financialAccounts={financialAccounts}
            showForm={showForm}
            onCreate={openCreate}
            onEdit={openEdit}
            onDelete={deleteAccount}
            onSetDefault={setDefault}
          />
        </div>
      </div>

      <Toasts toasts={toasts} dismiss={dismiss} />
      {confirmState && <ConfirmModal {...confirmState} onConfirm={handleConfirm} onCancel={handleCancel} />}
    </div>
  )
}
