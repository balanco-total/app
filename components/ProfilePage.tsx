'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { ArrowLeft, User, Lock, Download, Trash2, Check, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Profile = { id: string; name: string; account_id: string; role: string }

const FIELD_PATTERN = /[^a-zA-Z0-9\-\/\. À-ÿ]/g

export default function ProfilePage({ profile, email }: { profile: Profile; email: string }) {
  const supabase = createClient()
  const router = useRouter()

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
      alert('Nenhum lançamento encontrado.')
      setCsvLoading(false)
      return
    }

    const headers = ['Data', 'Valor', 'Descrição', 'Categoria', 'Usuário']
    const rows = data.map(e => [
      new Date(e.date).toLocaleDateString('pt-BR'),
      (e.amount as number).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      e.description as string,
      (e.categories as any)?.name ?? '',
      (e.profiles as any)?.name ?? '',
    ])

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n')

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lancamentos_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setCsvLoading(false)
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
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 transition text-gray-600"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Perfil</h1>
              <p className="text-gray-500 text-sm">{email}</p>
            </div>
          </div>
        </div>

        {/* Personal info */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <User size={20} className="text-blue-600" />
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
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={nameSaving || name.trim() === profile.name}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-40 font-medium"
                >
                  {nameSaving ? <Loader2 size={18} className="animate-spin" /> : 'Salvar'}
                </button>
              </div>
            </div>
            {nameMsg && (
              <p className={`text-sm flex items-center gap-1 ${nameMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
                <button
                  type="submit"
                  disabled={passwordSaving || !currentPassword || !newPassword}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-40 font-medium"
                >
                  {passwordSaving ? <Loader2 size={18} className="animate-spin" /> : 'Alterar'}
                </button>
              </div>
            </div>
            {passwordMsg && (
              <p className={`text-sm flex items-center gap-1 ${passwordMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
                {passwordMsg.ok && <Check size={14} />}
                {passwordMsg.text}
              </p>
            )}
          </form>
        </div>

        {/* Data export */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
            <Download size={20} className="text-blue-600" />
            Exportar dados
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Baixe todos os lançamentos da conta em formato CSV (compatível com Excel).
            Colunas: data, valor, descrição, categoria, usuário.
          </p>
          <button
            onClick={downloadCSV}
            disabled={csvLoading}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
          >
            {csvLoading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            {csvLoading ? 'Gerando CSV...' : 'Baixar CSV'}
          </button>
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
    </div>
  )
}
