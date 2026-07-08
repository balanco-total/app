'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { CreditCard as CreditCardIcon, PlusCircle } from 'lucide-react'
import { useToast, Toasts, useConfirm, ConfirmModal } from './toast'
import LoadingPage from './LoadingPage'
import BillingBanner from './BillingBanner'
import DashboardHeader from './dashboard/DashboardHeader'
import CardForm from './cards/CardForm'
import CardList from './cards/CardList'
import Button from './ui/Button'
import type { Profile, Account, CreditCard, CreditCardWithUsage } from './cards/types'

export default function CardsPage({ profile, account }: { profile: Profile; account: Account }) {
  const supabase = createClient()

  const [cards, setCards] = useState<CreditCardWithUsage[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null)
  const [saving, setSaving] = useState(false)
  const [formKey, setFormKey] = useState(0)

  const { toasts, toast, dismiss } = useToast()
  const { confirmState, showConfirm, handleConfirm, handleCancel } = useConfirm()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [cardsRes, invoicesRes] = await Promise.all([
      supabase.from('credit_cards').select('*').eq('account_id', profile.account_id).order('created_at', { ascending: true }),
      supabase.from('credit_card_invoices').select('credit_card_id, total').eq('account_id', profile.account_id).is('paid_at', null),
    ])

    const usedByCard = new Map<string, number>()
    for (const inv of invoicesRes.data ?? []) {
      usedByCard.set(inv.credit_card_id, (usedByCard.get(inv.credit_card_id) ?? 0) + inv.total)
    }
    setCards((cardsRes.data ?? []).map(c => ({ ...c, used: usedByCard.get(c.id) ?? 0 })))
    setLoading(false)
  }

  const openCreate = () => {
    setEditingCard(null)
    setFormKey(k => k + 1)
    setShowForm(true)
  }

  const openEdit = (card: CreditCard) => {
    setEditingCard(card)
    setFormKey(k => k + 1)
    setShowForm(true)
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditingCard(null)
  }

  const saveCard = async (description: string, creditLimit: number, closingDay: number, dueDay: number) => {
    if (!description.trim()) { toast.error('Descrição é obrigatória.'); return }
    if (description.trim().length > 60) { toast.error('Descrição deve ter no máximo 60 caracteres.'); return }
    if (creditLimit < 0 || creditLimit > 1_000_000) { toast.error('Limite deve ser entre R$ 0,00 e R$ 1.000.000,00.'); return }
    if (!Number.isInteger(closingDay) || closingDay < 1 || closingDay > 31) { toast.error('Dia de fechamento deve ser entre 1 e 31.'); return }
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) { toast.error('Dia de vencimento deve ser entre 1 e 31.'); return }

    setSaving(true)

    if (editingCard) {
      const { error } = await supabase
        .from('credit_cards')
        .update({ description: description.trim(), credit_limit: creditLimit, closing_day: closingDay, due_day: dueDay })
        .eq('id', editingCard.id)

      if (error) {
        toast.error(error.code === '23505' ? 'Já existe um cartão com essa descrição.' : 'Erro ao atualizar cartão.')
        setSaving(false)
        return
      }

      setCards(prev => prev.map(c =>
        c.id === editingCard.id
          ? { ...c, description: description.trim(), credit_limit: creditLimit, closing_day: closingDay, due_day: dueDay }
          : c
      ))
      toast.success('Cartão atualizado.')
    } else {
      const { data, error } = await supabase
        .from('credit_cards')
        .insert({ account_id: profile.account_id, description: description.trim(), credit_limit: creditLimit, closing_day: closingDay, due_day: dueDay })
        .select()
        .single()

      if (error) {
        toast.error(error.code === '23505' ? 'Já existe um cartão com essa descrição.' : 'Erro ao criar cartão.')
        setSaving(false)
        return
      }

      setCards(prev => [...prev, { ...data, used: 0 }])
      toast.success('Cartão criado.')
    }

    setSaving(false)
    setShowForm(false)
    setEditingCard(null)
  }

  const deleteCard = (card: CreditCardWithUsage) => {
    showConfirm({
      title: `Excluir cartão "${card.description}"?`,
      body: 'As faturas e os lançamentos vinculados a este cartão também serão excluídos. Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      onConfirm: async () => {
        const { error } = await supabase.from('credit_cards').delete().eq('id', card.id)
        if (error) { toast.error('Erro ao excluir cartão.'); return }
        setCards(prev => prev.filter(c => c.id !== card.id))
      },
    })
  }

  if (loading) return <LoadingPage />

  return (
    <div className="min-h-screen bg-white dark:bg-dm-surface p-4">
      <div className="max-w-4xl mx-auto">
        <DashboardHeader profile={profile} />
        {account && (
          <BillingBanner
            subscriptionStatus={account.subscription_status}
            trialEndsAt={account.trial_ends_at}
            isOwner={profile.role === 'owner'}
          />
        )}

        <div className="bg-white dark:bg-dm-card rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-dm-text flex items-center gap-2">
              <CreditCardIcon size={22} className="text-brand-500 dark:text-brand-200" />
              Cartões
            </h2>
            {!showForm && (
              <Button size="sm" icon={<PlusCircle size={16} />} onClick={openCreate} className="px-4 text-sm font-medium">
                Novo cartão
              </Button>
            )}
          </div>

          {showForm && (
            <CardForm
              key={formKey}
              editingCard={editingCard}
              saving={saving}
              onSave={saveCard}
              onCancel={cancelForm}
            />
          )}

          <CardList
            cards={cards}
            showForm={showForm}
            onCreate={openCreate}
            onEdit={openEdit}
            onDelete={deleteCard}
          />
        </div>
      </div>

      <Toasts toasts={toasts} dismiss={dismiss} />
      {confirmState && <ConfirmModal {...confirmState} onConfirm={handleConfirm} onCancel={handleCancel} />}
    </div>
  )
}
