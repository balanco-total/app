import type { Metadata } from 'next'
import Link from 'next/link'
import Logo from '@/components/Logo'
import {
  LayoutDashboard,
  Users,
  BarChart3,
  FileUp,
  Tags,
  Check,
  ArrowRight,
  TrendingUp,
  Shield,
  Smartphone,
  X,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'BalançoTotal — Controle de despesas pessoais',
  description:
    'Anote suas despesas, acompanhe por categoria e importe o extrato do seu banco. Para uso pessoal e familiar — não é um sistema contábil.',
}

const features = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard em tempo real',
    description:
      'Veja o saldo do mês, total de recebimentos e pagamentos. Despesa por categoria com percentuais e os últimos lançamentos da conta.',
  },
  {
    icon: BarChart3,
    title: 'Gráficos analíticos',
    description:
      'Pizza por categoria, barras por usuário e tendência de 9 meses. Veja de onde vem e para onde vai o seu dinheiro.',
  },
  {
    icon: FileUp,
    title: 'Importação de extratos',
    description:
      'Suba arquivos OFX (extrato do banco) ou CSV. O sistema identifica automaticamente categorias e formatos de data.',
  },
  {
    icon: Tags,
    title: 'Categorias personalizadas',
    description:
      'Crie suas próprias categorias com cores distintas. Filtre, analise e exporte seus dados por categoria.',
  },
  {
    icon: Smartphone,
    title: 'PWA instalável',
    description:
      'Instale como aplicativo no celular ou desktop. Funciona como app nativo, sem precisar da loja.',
  },
]

const steps = [
  {
    number: '1',
    title: 'Crie sua conta',
    description: 'Cadastro em menos de 1 minuto. Sem cartão de crédito. 7 dias grátis para explorar tudo.',
  },
  {
    number: '2',
    title: 'Registre seus lançamentos',
    description: 'Adicione pagamentos e recebimentos manualmente ou importe do seu extrato bancário em segundos.',
  },
  {
    number: '3',
    title: 'Acompanhe os resultados',
    description: 'Monitore o saldo, veja para onde o dinheiro está indo e tome decisões melhores no dia a dia.',
  },
]

const planFeatures = [
  'Lançamentos ilimitados',
  'Múltiplos usuários na conta',
  'Dashboard e gráficos analíticos',
  'Importação OFX e CSV',
  'Exportação de dados',
  'Categorias personalizadas',
  'Parcelamento automático',
  'Acesso via PWA (app nativo)',
  'Suporte por e-mail',
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo width={145} height={45} />
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-[#1B4332] transition px-3 py-2"
            >
              Entrar
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold bg-[#1B4332] text-white px-4 py-2 rounded-lg hover:bg-[#163a2b] transition"
            >
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 pt-20 pb-28 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block bg-[#1B4332]/10 text-[#1B4332] text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            7 dias grátis · Sem cartão de crédito
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 leading-tight mb-6">
            Anote suas despesas e{' '}
            <span className="text-[#1B4332]">saiba para onde</span>{' '}
            o dinheiro vai
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            BalançoTotal é uma ferramenta de controle de despesas para uso pessoal e familiar.
            Simples, sem complicação — não é um sistema contábil nem um ERP.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 bg-[#1B4332] text-white text-base font-semibold px-7 py-4 rounded-xl hover:bg-[#163a2b] transition shadow-lg shadow-[#1B4332]/20"
            >
              Começar grátis agora
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 text-base font-semibold px-7 py-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition"
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* Social proof bar */}
      <div className="bg-[#1B4332] py-4 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 text-white/90 text-sm font-medium">
          <span className="flex items-center gap-2"><Check className="w-4 h-4 text-[#F5A623]" /> Sem cartão de crédito</span>
          <span className="flex items-center gap-2"><Check className="w-4 h-4 text-[#F5A623]" /> Cancele quando quiser</span>
          <span className="flex items-center gap-2"><Check className="w-4 h-4 text-[#F5A623]" /> Suporte por e-mail</span>
          <span className="flex items-center gap-2"><Check className="w-4 h-4 text-[#F5A623]" /> Dados protegidos</span>
        </div>
      </div>

      {/* Features */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">
              O que você encontra aqui
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Do lançamento manual à importação do extrato do banco — tudo focado em controle pessoal de gastos.
            </p>
          </div>
          {/* Card destaque — Compartilhe com a família */}
          <div className="bg-[#1B4332] rounded-2xl p-8 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <span className="inline-block bg-[#F5A623] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-3">
                Para toda a família
              </span>
              <h3 className="text-xl font-black text-white mb-2">Compartilhe com a família</h3>
              <p className="text-white/75 leading-relaxed">
                Convide cônjuge, parceiro ou quem mora com você. Cada pessoa lança os próprios gastos
                e você tem uma visão unificada de tudo — sem misturar, sem perder controle.
              </p>
            </div>
            <div className="hidden lg:flex flex-col gap-2 text-sm flex-shrink-0">
              {['Convite por link', 'Cada um vê o próprio', 'Visão consolidada'].map(item => (
                <span key={item} className="flex items-center gap-2 text-white/80">
                  <Check className="w-4 h-4 text-[#F5A623]" /> {item}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="bg-gray-50 rounded-2xl p-6 hover:bg-emerald-50 hover:shadow-md transition group"
              >
                <div className="w-11 h-11 bg-[#1B4332]/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#1B4332]/15 transition">
                  <Icon className="w-5 h-5 text-[#1B4332]" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Para quem é */}
      <section className="py-16 px-4 sm:px-6 bg-amber-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-10 text-center">
            Para quem é o BalançoTotal?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-emerald-100">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-4">Serve para você se…</p>
              <ul className="space-y-3">
                {[
                  'Quer anotar seus gastos do mês e saber o saldo',
                  'Precisa acompanhar despesas parceladas',
                  'Quer importar o extrato do banco sem trabalho manual',
                  'Divide as contas com cônjuge ou família',
                  'Quer ver seus gastos organizados por categoria',
                  'É autônomo e quer controlar o fluxo pessoal',
                ].map(item => (
                  <li key={item} className="flex items-start gap-3 text-sm text-gray-700">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-[#1B4332]" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-red-100">
              <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-4">Não serve se você precisa de…</p>
              <ul className="space-y-3">
                {[
                  'Sistema contábil ou ERP empresarial',
                  'Emissão de notas fiscais (NF-e/NFS-e)',
                  'Gestão de estoque ou ordens de serviço',
                  'Relatórios contábeis e DRE',
                  'Integração com sistemas fiscais',
                  'Múltiplas empresas ou CNPJs',
                ].map(item => (
                  <li key={item} className="flex items-start gap-3 text-sm text-gray-500">
                    <div className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <X className="w-3 h-3 text-red-400" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">
              Comece em 3 passos
            </h2>
            <p className="text-gray-500 text-lg">Sem configuração complexa. Do zero ao controle financeiro em minutos.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map(({ number, title, description }) => (
              <div key={number} className="text-center">
                <div className="w-14 h-14 bg-[#1B4332] text-white rounded-2xl flex items-center justify-center text-2xl font-black mx-auto mb-5 shadow-lg shadow-[#1B4332]/20">
                  {number}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Extra highlights */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 text-sm font-semibold px-3 py-1.5 rounded-full mb-6">
              <TrendingUp className="w-4 h-4" />
              Análise financeira
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-5">
              Entenda para onde vai o seu dinheiro
            </h2>
            <p className="text-gray-500 text-lg leading-relaxed mb-6">
              O dashboard mostra saldo do mês, categorias mais impactantes e tendência dos últimos 9 meses.
              Tudo atualizado em tempo real conforme você lança.
            </p>
            <ul className="space-y-3">
              {['Gráfico de pizza por categoria', 'Barras de gastos por usuário', 'Tendência mensal de 9 meses', 'Saldo de pagamentos x recebimentos'].map(item => (
                <li key={item} className="flex items-center gap-3 text-gray-600 text-sm">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#1B4332]" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="bg-gradient-to-br from-[#1B4332] to-emerald-700 rounded-2xl p-8 text-white shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <span className="text-white/70 text-sm">Maio 2025</span>
                <span className="bg-white/10 text-xs px-2 py-1 rounded">Saldo</span>
              </div>
              <div className="text-4xl font-black mb-1">R$ 3.420,00</div>
              <div className="text-white/60 text-sm mb-8">saldo do mês</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-white/60 text-xs mb-1">Recebimentos</div>
                  <div className="text-green-300 font-bold text-lg">R$ 8.200</div>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-white/60 text-xs mb-1">Pagamentos</div>
                  <div className="text-red-300 font-bold text-lg">R$ 4.780</div>
                </div>
              </div>
              <div className="mt-6 space-y-2">
                {[
                  { label: 'Alimentação', pct: 42, color: 'bg-orange-400' },
                  { label: 'Moradia', pct: 28, color: 'bg-blue-400' },
                  { label: 'Transporte', pct: 18, color: 'bg-purple-400' },
                  { label: 'Outros', pct: 12, color: 'bg-gray-400' },
                ].map(({ label, pct, color }) => (
                  <div key={label} className="flex items-center gap-3 text-sm">
                    <div className={`w-2 h-2 rounded-full ${color} flex-shrink-0`} />
                    <span className="text-white/80 flex-1">{label}</span>
                    <span className="text-white/60">{pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Import highlight */}
      <section className="py-24 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="ml-2 text-xs text-gray-400">extrato.ofx</span>
              </div>
              <div className="p-5 space-y-3 text-sm">
                {[
                  { date: '05/05', desc: 'Supermercado Extra', value: '-R$ 312,50', type: 'out' },
                  { date: '08/05', desc: 'Salário', value: '+R$ 5.000,00', type: 'in' },
                  { date: '10/05', desc: 'Conta de luz', value: '-R$ 89,90', type: 'out' },
                  { date: '15/05', desc: 'Farmácia', value: '-R$ 43,20', type: 'out' },
                  { date: '20/05', desc: 'Freelance', value: '+R$ 1.200,00', type: 'in' },
                ].map(({ date, desc, value, type }) => (
                  <div key={desc} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-xs w-10">{date}</span>
                      <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                        <div className={`w-2 h-2 rounded-full ${type === 'in' ? 'bg-green-500' : 'bg-red-400'}`} />
                      </div>
                      <span className="text-gray-700">{desc}</span>
                    </div>
                    <span className={`font-semibold ${type === 'in' ? 'text-green-600' : 'text-red-500'}`}>{value}</span>
                  </div>
                ))}
                <div className="pt-2">
                  <div className="bg-[#1B4332] text-white text-center text-xs font-semibold py-2.5 rounded-lg">
                    5 lançamentos importados
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-semibold px-3 py-1.5 rounded-full mb-6">
              <FileUp className="w-4 h-4" />
              Importação inteligente
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-5">
              Importe o extrato do seu banco
            </h2>
            <p className="text-gray-500 text-lg leading-relaxed mb-6">
              Suba o arquivo OFX ou CSV direto do internet banking. O sistema reconhece o formato,
              identifica categorias automaticamente e popula seus lançamentos em segundos.
            </p>
            <ul className="space-y-3">
              {['Suporte a OFX (Bradesco, Itaú, Nubank…)', 'Suporte a CSV com delimitador auto-detectado', 'Categorias identificadas por nome (case-insensitive)', 'Até 1.000 lançamentos por importação'].map(item => (
                <li key={item} className="flex items-center gap-3 text-gray-600 text-sm">
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-blue-600" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="py-16 px-4 sm:px-6 bg-[#1B4332]">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Seus dados protegidos</h3>
              <p className="text-white/70 leading-relaxed">
                Autenticação via JWT com Supabase, Row-Level Security ativo em todas as tabelas e queries
                parametrizadas. Nenhum dado financeiro é compartilhado entre contas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="planos" className="py-24 px-4 sm:px-6">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">
              Um plano. Simples assim.
            </h2>
            <p className="text-gray-500 text-lg">Tudo incluso. Sem surpresas na fatura.</p>
          </div>
          <div className="relative bg-white border-2 border-[#1B4332] rounded-2xl p-8 shadow-2xl shadow-[#1B4332]/10">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="bg-[#F5A623] text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide">
                7 dias grátis
              </span>
            </div>
            <div className="text-center mb-8">
              <div className="text-5xl font-black text-gray-900 mb-1">
                R$ 7<span className="text-3xl">,99</span>
              </div>
              <div className="text-gray-400 text-sm">por mês · cobrado mensalmente</div>
            </div>
            <ul className="space-y-3 mb-8">
              {planFeatures.map(feature => (
                <li key={feature} className="flex items-center gap-3 text-gray-700 text-sm">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#1B4332]" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="block w-full bg-[#1B4332] text-white text-center font-bold py-4 rounded-xl hover:bg-[#163a2b] transition shadow-lg shadow-[#1B4332]/20 text-base"
            >
              Começar teste grátis
            </Link>
            <p className="text-center text-xs text-gray-400 mt-4">
              Sem cartão de crédito para começar. Cancele quando quiser.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 sm:px-6 bg-gradient-to-br from-emerald-50 to-green-100">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-5">
            Pronto para ter o controle?
          </h2>
          <p className="text-gray-600 text-lg mb-8">
            Crie sua conta agora e explore todos os recursos por 7 dias sem pagar nada.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-[#1B4332] text-white font-bold text-base px-8 py-4 rounded-xl hover:bg-[#163a2b] transition shadow-lg shadow-[#1B4332]/20"
          >
            Criar conta grátis
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo width={120} height={37} />
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link href="/login" className="hover:text-gray-600 transition">Entrar</Link>
            <Link href="/signup" className="hover:text-gray-600 transition">Cadastrar</Link>
            <Link href="/privacy" className="hover:text-gray-600 transition">Privacidade</Link>
            <Link href="/terms" className="hover:text-gray-600 transition">Termos</Link>
          </div>
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} BalançoTotal. Todos os direitos reservados.
          </p>
        </div>
      </footer>

    </div>
  )
}
