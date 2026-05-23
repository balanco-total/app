'use client'

import { useState } from 'react'
import { User, Lock, Check, Loader2 } from 'lucide-react'
import PasswordInput from '@/components/PasswordInput'
import Button from '@/components/ui/Button'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { FIELD_PATTERN } from './parsers'
import type { Profile } from './types'

export default function PersonalInfoCard({ profile, email }: { profile: Profile; email: string }) {
  const supabase = createClient()
  const router = useRouter()

  const [name, setName] = useState(profile.name)
  const [nameSaving, setNameSaving] = useState(false)
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null)

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
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword })
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

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
      <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
        <User size={20} className="text-brand-500" />
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
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <Button
              type="submit"
              size="sm"
              disabled={nameSaving || name.trim() === profile.name}
              className="px-4 font-medium"
            >
              {nameSaving ? <Loader2 size={18} className="animate-spin" /> : 'Salvar'}
            </Button>
          </div>
        </div>
        {nameMsg && (
          <p className={`text-sm flex items-center gap-1 ${nameMsg.ok ? 'text-green-600' : 'text-brand-500'}`}>
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
          <PasswordInput
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            maxLength={40}
            placeholder="••••••••"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
          <div className="flex gap-2">
            <PasswordInput
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              maxLength={40}
              placeholder="••••••••"
              wrapperClassName="flex-1"
            />
            <Button
              type="submit"
              size="sm"
              disabled={passwordSaving || !currentPassword || !newPassword}
              className="px-4 font-medium"
            >
              {passwordSaving ? <Loader2 size={18} className="animate-spin" /> : 'Alterar'}
            </Button>
          </div>
        </div>
        {passwordMsg && (
          <p className={`text-sm flex items-center gap-1 ${passwordMsg.ok ? 'text-green-600' : 'text-brand-500'}`}>
            {passwordMsg.ok && <Check size={14} />}
            {passwordMsg.text}
          </p>
        )}
      </form>
    </div>
  )
}
