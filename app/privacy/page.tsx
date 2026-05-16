import Link from 'next/link'
import Logo from '@/components/Logo'

export const metadata = {
  title: 'Política de Privacidade — BalançoTotal',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 py-4 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/"><Logo width={110} height={34} /></Link>
          <Link href="/signup" className="text-sm text-[#1B4332] font-semibold hover:underline">
            Criar conta
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Política de Privacidade</h1>
        <p className="text-sm text-gray-400 mb-10">Última atualização: maio de 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Quem somos</h2>
            <p>
              O <strong>BalançoTotal</strong> é um serviço de gerenciamento financeiro pessoal e familiar
              operado por seus desenvolvedores (<strong>Controlador de Dados</strong>). Esta Política descreve
              como coletamos, usamos, armazenamos e protegemos suas informações pessoais, em conformidade
              com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">2. Dados que coletamos</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Cadastro:</strong> nome e endereço de e-mail fornecidos no momento do registro.</li>
              <li><strong>Dados financeiros:</strong> despesas, categorias e contas financeiras que você cadastra voluntariamente.</li>
              <li><strong>Conexões bancárias:</strong> quando você conecta uma conta bancária via Pluggy, recebemos transações e saldos diretamente da instituição financeira, com sua autorização expressa.</li>
              <li><strong>Dados de pagamento:</strong> assinatura processada pela Stripe; não armazenamos dados de cartão — eles ficam integralmente na Stripe.</li>
              <li><strong>Dados técnicos:</strong> endereço IP, tipo de navegador e logs de acesso para fins de segurança e diagnóstico.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">3. Finalidade e base legal</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Finalidade</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Base legal (LGPD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-3">Prestar o serviço de controle financeiro</td>
                    <td className="px-4 py-3">Execução de contrato (art. 7º, V)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Processar pagamento da assinatura</td>
                    <td className="px-4 py-3">Execução de contrato (art. 7º, V)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Conectar contas bancárias via Pluggy</td>
                    <td className="px-4 py-3">Consentimento (art. 7º, I)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Enviar comunicações sobre o serviço</td>
                    <td className="px-4 py-3">Legítimo interesse (art. 7º, IX)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Segurança e prevenção de fraudes</td>
                    <td className="px-4 py-3">Legítimo interesse (art. 7º, IX)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Compartilhamento com terceiros</h2>
            <p>Seus dados são compartilhados apenas com os seguintes parceiros, estritamente para operar o serviço:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>Supabase</strong> — banco de dados e autenticação (servidores na nuvem).</li>
              <li><strong>Stripe</strong> — processamento de pagamentos e gestão de assinatura.</li>
              <li><strong>Pluggy</strong> — agregador de dados bancários, acionado somente com sua autorização.</li>
            </ul>
            <p className="mt-3">Não vendemos, alugamos nem cedemos seus dados a terceiros para fins de publicidade ou marketing.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Retenção de dados</h2>
            <p>
              Mantemos seus dados enquanto sua conta estiver ativa. Ao cancelar ou excluir sua conta,
              os dados pessoais e financeiros são removidos permanentemente de nossos sistemas em até
              30 dias, salvo obrigação legal de retenção (ex: registros fiscais).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">6. Seus direitos como titular</h2>
            <p>Nos termos da LGPD, você tem direito a:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Confirmar a existência de tratamento de seus dados.</li>
              <li>Acessar os dados que temos sobre você.</li>
              <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
              <li>Solicitar a exclusão de dados tratados com base em consentimento.</li>
              <li>Revogar o consentimento a qualquer momento.</li>
              <li>Solicitar a portabilidade dos seus dados.</li>
            </ul>
            <p className="mt-3">Para exercer qualquer desses direitos, entre em contato pelo e-mail indicado na seção 8.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">7. Segurança</h2>
            <p>
              Adotamos medidas técnicas e organizacionais adequadas para proteger seus dados, incluindo
              criptografia em trânsito (TLS), autenticação via JWT com validação server-side e controle
              de acesso por Row-Level Security no banco de dados. Nenhum sistema é 100% seguro; em caso
              de incidente relevante, notificaremos os titulares afetados conforme a LGPD.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">8. Contato</h2>
            <p>
              Dúvidas, solicitações ou reclamações relacionadas a esta Política podem ser enviadas para:{' '}
              <a href="mailto:privacidade@balancototal.com.br" className="text-[#1B4332] underline">
                privacidade@balancototal.com.br
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">9. Alterações</h2>
            <p>
              Podemos atualizar esta Política periodicamente. Alterações relevantes serão comunicadas
              por e-mail ou aviso no app com pelo menos 15 dias de antecedência. O uso continuado do
              serviço após essa data implica aceitação das novas condições.
            </p>
          </section>

        </div>
      </main>

      <footer className="border-t border-gray-100 py-8 px-6 mt-8">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-400">
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-gray-600 transition">Privacidade</Link>
            <Link href="/terms" className="hover:text-gray-600 transition">Termos de Uso</Link>
          </div>
          <p className="text-xs">© {new Date().getFullYear()} BalançoTotal. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
