'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { User } from '@supabase/supabase-js'
import { PlusCircle, Users, Calendar, Trash2, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Profile = { id: string; name: string; account_id: string; role: string }
type Category = { id: string; account_id: string; name: string; color: string }
type Expense = {
  id: string
  account_id: string
  user_id: string
  description: string
  amount: number
  category_id: string | null
  date: string
  profiles: { name: string } | null
}

const MAX_CENTS = 100_000_000 // R$ 1.000.000,00

function applyMask(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  const cents = Math.min(parseInt(digits, 10), MAX_CENTS)
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parseMasked(value: string): number {
  return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0
}

const DEFAULT_CATEGORIES = [
  { name: 'Alimentação', color: 'bg-orange-500' },
  { name: 'Transporte', color: 'bg-blue-500' },
  { name: 'Saúde', color: 'bg-red-500' },
  { name: 'Lazer', color: 'bg-purple-500' },
  { name: 'Moradia', color: 'bg-green-500' },
  { name: 'Educação', color: 'bg-indigo-500' },
  { name: 'Vestuário', color: 'bg-pink-500' },
  { name: 'Outros', color: 'bg-gray-500' },
]

export default function Dashboard({ user, profile }: { user: User; profile: Profile }) {
  const supabase = createClient()
  const router = useRouter()

  const [members, setMembers] = useState<Profile[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [membersRes, categoriesRes, expensesRes] = await Promise.all([
      supabase.from('profiles').select('id, name, account_id, role').eq('account_id', profile.account_id),
      supabase.from('categories').select('*').eq('account_id', profile.account_id).order('name'),
      supabase.from('expenses').select('*, profiles(name)').eq('account_id', profile.account_id).order('date', { ascending: false }).limit(100),
    ])

    setMembers(membersRes.data ?? [])
    setExpenses(expensesRes.data ?? [])

    let cats = categoriesRes.data ?? []
    if (cats.length === 0) {
      const { data: seeded } = await supabase
        .from('categories')
        .insert(DEFAULT_CATEGORIES.map(c => ({ ...c, account_id: profile.account_id })))
        .select()
      cats = seeded ?? []
    }
    setCategories(cats)

    setLoading(false)
  }

  const addExpense = async () => {
    if (!description.trim() || !amount || !selectedCategory) {
      alert('Preencha todos os campos!')
      return
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        account_id: profile.account_id,
        user_id: profile.id,
        description: description.trim(),
        amount: parseMasked(amount),
        category_id: selectedCategory,
        date: new Date().toISOString(),
      })
      .select('*, profiles(name)')
      .single()

    if (error) {
      alert('Erro ao adicionar despesa.')
      return
    }

    setExpenses([data, ...expenses])
    setDescription('')
    setAmount('')
    setSelectedCategory('')
  }

  const deleteExpense = async (expenseId: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', expenseId)
    if (error) {
      alert('Erro ao excluir despesa.')
      return
    }
    setExpenses(expenses.filter(e => e.id !== expenseId))
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const getMonthlyExpenses = () =>
    expenses.filter(e => new Date(e.date).toISOString().slice(0, 7) === selectedMonth)

  const getCategorySummary = () => {
    const monthly = getMonthlyExpenses()
    return categories.map(cat => ({
      ...cat,
      total: monthly.filter(e => e.category_id === cat.id).reduce((sum, e) => sum + e.amount, 0),
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Carregando...</div>
      </div>
    )
  }

  const categorySummary = getCategorySummary()
  const monthlyExpenses = getMonthlyExpenses()
  const totalMonth = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">BalançoTotal</h1>
              <p className="text-gray-600 mt-1">Olá, {profile.name}!</p>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
                <Users size={20} className="text-gray-600" />
                <span className="text-gray-700 font-medium">{members.length} usuário(s)</span>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                <LogOut size={20} />
                Sair
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Expense Form */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <PlusCircle size={24} className="text-blue-600" />
              Nova Despesa
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                <input
                  type="text"
                  maxLength={60}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Supermercado"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valor (R$)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  onChange={e => setAmount(applyMask(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                        selectedCategory === cat.id
                          ? `${cat.color} text-white`
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={addExpense}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Adicionar Despesa
              </button>
            </div>
          </div>

          {/* Category Summary */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Resumo por Categoria</h2>
              <div className="flex items-center gap-2">
                <Calendar size={20} className="text-gray-600" />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600">Total do Mês</p>
              <p className="text-3xl font-bold text-blue-600">
                R$ {totalMonth.toFixed(2).replace('.', ',')}
              </p>
            </div>
            <div className="space-y-3">
              {categorySummary.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${cat.color}`}></div>
                    <span className="font-medium text-gray-700">{cat.name}</span>
                  </div>
                  <span className="font-bold text-gray-800">
                    R$ {cat.total.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Últimos Lançamentos</h2>
          <div className="space-y-2">
            {expenses.slice(0, 20).map(exp => {
              const category = categories.find(c => c.id === exp.category_id)
              const date = new Date(exp.date)
              return (
                <div key={exp.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-2 h-2 rounded-full ${category?.color ?? 'bg-gray-400'}`}></div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{exp.description}</p>
                      <p className="text-sm text-gray-500">
                        {exp.profiles?.name} • {date.toLocaleDateString('pt-BR')} às{' '}
                        {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${category?.color ?? 'bg-gray-400'} text-white`}>
                      {category?.name ?? 'Sem categoria'}
                    </span>
                    <span className="font-bold text-gray-800 min-w-[100px] text-right">
                      R$ {exp.amount.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  {exp.user_id === user.id && (
                    <button
                      onClick={() => deleteExpense(exp.id)}
                      className="ml-4 text-red-500 hover:text-red-700 transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              )
            })}
            {expenses.length === 0 && (
              <p className="text-center text-gray-500 py-8">Nenhuma despesa cadastrada ainda.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
