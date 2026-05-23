import Link from 'next/link'
import Logo from '@/components/Logo'

export const metadata = {
  title: 'Termos de Uso — BalançoTotal',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 py-4 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/"><Logo width={110} height={34} /></Link>
          <Link href="/signup" className="text-sm text-brand-500 font-semibold hover:underline">
            Criar conta
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Termos de Uso</h1>
        <p className="text-sm text-gray-400 mb-10">Última atualização: maio de 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Aceitação dos termos</h2>
            <p>
              Ao criar uma conta ou usar o <strong>BalançoTotal</strong>, você declara ter lido,
              compreendido e concordado com estes Termos de Uso e com nossa{' '}
              <Link href="/privacy" className="text-brand-500 underline">Política de Privacidade</Link>.
              Se você não concordar com alguma parte, não utilize o serviço.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">2. Descrição do serviço</h2>
            <p>
              O BalançoTotal é uma plataforma de controle de despesas pessoais e familiares que permite
              registrar gastos, categorizar transações, importar extratos bancários (OFX/CSV), conectar
              contas bancárias via open finance e compartilhar o acesso com membros da família ou grupo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">3. Plano e pagamento</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>O serviço oferece um <strong>período de teste gratuito de 7 dias</strong>, sem necessidade de cartão de crédito.</li>
              <li>Após o período de teste, a assinatura custa <strong>R$&nbsp;7,99/mês</strong>, cobrada mensalmente via Stripe.</li>
              <li>O plano contempla uma conta (grupo familiar/pessoal) com múltiplos membros.</li>
              <li>O não pagamento na data de vencimento pode resultar na suspensão do acesso ao app.</li>
              <li>Os preços podem ser reajustados com aviso prévio de 30 dias por e-mail.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Cancelamento e reembolso</h2>
            <p>
              Você pode cancelar sua assinatura a qualquer momento nas configurações da conta ou
              entrando em contato conosco. O cancelamento encerra a cobrança na próxima renovação;
              o acesso permanece ativo até o final do período já pago.
            </p>
            <p className="mt-3">
              Não oferecemos reembolso proporcional por períodos não utilizados, exceto quando exigido
              pelo Código de Defesa do Consumidor (CDC — Lei nº 8.078/1990).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Responsabilidades do usuário</h2>
            <p>Ao usar o BalançoTotal, você se compromete a:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Fornecer informações verdadeiras no cadastro.</li>
              <li>Manter a confidencialidade de sua senha.</li>
              <li>Usar o serviço somente para fins pessoais e lícitos.</li>
              <li>Não compartilhar acesso com pessoas de fora do seu grupo familiar ou autorizado.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">6. Proibições de uso</h2>
            <p>É vedado:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Usar o serviço para atividades ilegais ou fraudulentas.</li>
              <li>Tentar acessar dados de outros usuários ou contornar medidas de segurança.</li>
              <li>Realizar engenharia reversa, scraping ou uso automatizado sem autorização.</li>
              <li>Revender ou sublicenciar o acesso ao serviço.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">7. Limitação de responsabilidade</h2>
            <p>
              O BalançoTotal é uma ferramenta de organização pessoal. Não prestamos assessoria financeira,
              contábil ou jurídica. As informações exibidas são baseadas exclusivamente nos dados que você
              cadastra. Não nos responsabilizamos por decisões financeiras tomadas com base no uso do app.
            </p>
            <p className="mt-3">
              Na máxima extensão permitida por lei, nossa responsabilidade total por quaisquer danos
              fica limitada ao valor pago nos últimos 3 meses de assinatura.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">8. Disponibilidade do serviço</h2>
            <p>
              Nos esforçamos para manter o serviço disponível continuamente, mas não garantimos
              disponibilidade ininterrupta. Podemos realizar manutenções programadas com aviso prévio
              sempre que possível. Interrupções não planejadas não geram direito a reembolso.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">9. Propriedade intelectual</h2>
            <p>
              Todo o código, design, marca e conteúdo do BalançoTotal são de propriedade de seus
              desenvolvedores. Os dados financeiros que você insere pertencem a você; concedemos
              licença limitada apenas para operar o serviço.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">10. Alterações e encerramento</h2>
            <p>
              Podemos alterar, suspender ou encerrar o serviço com aviso prévio de 30 dias.
              Em caso de encerramento definitivo, forneceremos meios para exportar seus dados
              antes da desativação.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">11. Lei aplicável e foro</h2>
            <p>
              Estes Termos são regidos pelas leis brasileiras. Fica eleito o foro da comarca
              de domicílio do usuário para resolver quaisquer disputas, nos termos do CDC.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">12. Contato</h2>
            <p>
              Dúvidas sobre estes Termos:{' '}
              <a href="mailto:contato@balancototal.com.br" className="text-brand-500 underline">
                contato@balancototal.com.br
              </a>
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
