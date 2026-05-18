'use client'

import { useEffect, useRef, useState } from 'react'
import { Users, LogOut, PieChart, User as UserIcon, CreditCard, Landmark } from 'lucide-react'
import Link from 'next/link'
import Logo from '../Logo'
import { getInitials, getAvatarColor } from './helpers'
import { useAuth } from '@/contexts/AuthContext'

type HeaderProfile = {
  name: string
  role: string
}

type Props = {
  profile: HeaderProfile
}

export default function DashboardHeader({ profile }: Props) {
  const { signOut } = useAuth()
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

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
      <div className="flex justify-between items-center">
        <Link href="/app">
          <Logo height={40} width={130} />
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/app/charts"
            className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
            title="Ver gráficos"
          >
            <PieChart size={20} className="text-gray-600" />
            <span className="text-gray-700 font-medium hidden sm:inline">Gráficos</span>
          </Link>

          <Link
            href="/app/accounts"
            className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
            title="Contas financeiras"
          >
            <Landmark size={20} className="text-gray-600" />
            <span className="text-gray-700 font-medium hidden sm:inline">Contas</span>
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

                <Link
                  href="/app/accounts"
                  onClick={() => setShowAvatarMenu(false)}
                  className="sm:hidden flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition text-sm"
                >
                  <Landmark size={16} className="text-gray-400" />
                  Contas
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
                  onClick={signOut}
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
  )
}