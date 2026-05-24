# BalançoTotal

Aplicação web de controle financeiro com suporte a múltiplos usuários por conta, análise por categoria e importação de extratos.

---

## Stack

- **Framework:** Next.js 14 (App Router)
- **UI:** Tailwind CSS + Lucide React
- **Backend:** Supabase (PostgreSQL + Auth)
- **Linguagem:** TypeScript

---

## Comandos

```bash
npm run dev      # Servidor de desenvolvimento (http://localhost:3000)
npm run build    # Build de produção
npm run start    # Servidor de produção
npm run lint     # ESLint
```

---

## Estrutura de rotas

```
app/
  page.tsx                           → / (landing page, público)
  (auth)/login/page.tsx              → /login (público)
  (auth)/signup/page.tsx             → /signup (público)
  (auth)/invite/page.tsx             → /invite (público, aceite de convite)
  (auth)/reset-password/page.tsx     → /reset-password (público)
  (app)/app/layout.tsx               → guard de auth para /app
  (app)/app/page.tsx                 → /app (dashboard)
  (app)/app/charts/page.tsx          → /app/charts
  (app)/app/users/page.tsx           → /app/users (somente owner)
  (app)/app/profile/page.tsx         → /app/profile
  (app)/app/billing/page.tsx         → /app/billing (assinatura; acessível mesmo com trial expirado)
  (app)/app/billing/success/page.tsx → /app/billing/success (confirmação pós-pagamento)
```

---

## Autenticação

### Cadastro
- Campos: nome, e-mail, senha.
- Auto-registro cria conta como **owner**.
- Aceite de convite cria o usuário como **member** na conta do convidante.
- Rate limit: 10 cadastros/hora por IP.

### Login
- E-mail + senha via Supabase Auth (JWT).
- Sessão persistente gerenciada pelo middleware.

### Recuperação de senha
- Usuário informa o e-mail e recebe link de redefinição.
- Mensagem padrão exibida independentemente de o e-mail existir (proteção contra enumeração).

### Fluxo de convite
- Token UUID com validade de 34 dias.
- Owner gera o link; convidado acessa `/invite?token=...` e cria sua conta.
- Convite pendente anterior para o mesmo e-mail é revogado automaticamente ao gerar um novo.

---

## Contas e usuários

### Estrutura
- Cada usuário pertence a **uma única conta**.
- Conta tem 1 owner e N members.

### Papéis
| Ação | Owner | Member |
|---|---|---|
| Criar lançamento | ✓ | ✓ |
| Editar/excluir lançamento próprio | ✓ | ✓ |
| Editar/excluir lançamento de outro | ✓ | ✗ |
| Gerenciar categorias | ✓ | ✗ |
| Gerenciar usuários | ✓ | ✗ |
| Exportar/importar dados | ✓ | ✗ |
| Excluir todos os lançamentos | ✓ | ✗ |
| Excluir conta | ✓ | ✗ |

### Gerenciamento de members (owner only)
- **Desativar/reativar:** bloqueia o login via ban no Supabase Auth.
- **Excluir member:** duas opções — migrar lançamentos para o owner ou excluir permanentemente junto com os lançamentos.
- Rate limit: 20 ações/minuto por usuário.

---

## Categorias

- Escopo por conta (não globais).
- Nome único por conta (case-insensitive).
- Mínimo 3 caracteres, máximo 60.
- Cor atribuída automaticamente de uma paleta de 12 cores.
- Exclusão física; lançamentos associados ficam sem categoria (`NULL`).
- Rate limit: 20 criações/minuto por usuário.

---

## Lançamentos

### Tipos
- **Pagamento** (vermelho)
- **Recebimento** (verde)

### Campos
- Descrição (mín. 1 char)
- Tipo (pagamento | recebimento)
- Valor total (máx. R$ 1.000.000,00)
- Categoria (opcional)
- Conta financeira (opcional; ex.: Carteira, Nubank)
- Data de emissão (opcional; aceita de 1 ano atrás até 90 dias no futuro)
- Quantidade de parcelas (1–99)
- Status de pagamento (pago | pendente)

### Parcelamento
- Valor dividido igualmente entre as parcelas.
- Cada parcela é um registro independente na tabela `expenses`.
- Parcelas de meses subsequentes calculadas a partir da data base; datas inválidas (ex.: 31 de fevereiro) são ajustadas para o último dia do mês.
- Parcelas importadas de OFX/CSV entram como **pagas**.

### Ações sobre lançamentos
- **Marcar como pago:** permite editar o valor pago no momento da confirmação.
- **Excluir:** exclusão física, irreversível, com confirmação.
- Subusuário só pode editar/excluir lançamentos criados por ele mesmo (RLS).

### Rate limit de criação
- 60 requisições/minuto por usuário.

---

## Dashboard

- Filtro por mês (mês/ano) com navegação anterior/próximo.
- **Cards de resumo:** total de recebimentos, total de pagamentos e saldo do mês (somente lançamentos pagos).
- **Despesa por categoria:** lista de categorias com valor total e percentual sobre o total de pagamentos do mês.
- **Lançamentos recentes:** últimos 20 lançamentos do mês, com usuário, categoria, valor, data e status.
- Indicação visual de tipo por cor (vermelho = pagamento, verde = recebimento).

---

## Gráficos (`/charts`)

- Filtro por mês com navegação.
- **Pizza por categoria:** distribuição percentual de pagamentos por categoria no mês.
- **Barras por usuário:** total gasto por membro da conta no mês.
- **Tendência mensal:** janela de 9 meses (4 anteriores + atual + 4 seguintes), mês corrente destacado em vermelho; meses futuros exibem apenas receitas/pagamentos lançados.
- Valores exibidos em formato pt-BR; números ≥ 1.000 abreviados com "k".

---

## Contas

- Cada conta pode ter N contas (ex.: Carteira, Nubank, Itaú).
- Uma conta "Carteira" é criada automaticamente no cadastro.
- O saldo de cada conta financeira é mantido em sincronia por trigger: atualizado automaticamente quando lançamentos pagos são inseridos, editados ou excluídos.
- Lançamentos podem ser vinculados a uma conta financeira (campo opcional).

---

## Assinatura

- Trial gratuito de 34 dias a partir do cadastro.
- Após o trial: plano mensal R$ 7,99/mês via Stripe.
- Middleware bloqueia todas as rotas `/app/*` (exceto `/app/billing`) quando o trial expira e a assinatura não está ativa.
- O dashboard exibe um banner com dias restantes de trial e botão "Assinar" para o owner.
- **Status possíveis:** `trialing` | `active` | `past_due` | `canceled`.
- Fluxo: `POST /api/billing/subscribe` → Stripe Checkout → webhook confirma pagamento → status atualizado para `active`.

---

## Open Finance (Pluggy)

- Owner pode conectar contas bancárias via Pluggy na tela de Perfil.
- Transações importadas do banco são sincronizadas como lançamentos (`pluggy_transaction_id` evita duplicatas).
- Conexões armazenadas na tabela `bank_connections`.

---

## Perfil (`/profile`)

### Edição de nome
- Máximo 60 caracteres.
- Rate limit: 10 alterações/minuto.

### Alteração de senha
- Requer senha atual (re-autenticação via Supabase).
- Nova senha: 6–40 caracteres.

### Exportação de dados (CSV)
- Exporta todos os lançamentos da conta.
- Formato: UTF-8 com BOM, delimitador ponto-e-vírgula.
- Colunas: data, tipo, valor, descrição, categoria, usuário.

### Importação de lançamentos (CSV / OFX)
- **CSV:** detecta automaticamente delimitador (vírgula ou ponto-e-vírgula).
  - Formatos de data aceitos: `DD/MM/YYYY`, `YYYY-MM-DD`.
  - Parseamento de valor: ignora `R$`, espaços, trata ponto/vírgula como separadores decimais/milhar.
  - Categoria casada por nome (case-insensitive); sem correspondência → categoria "Outros".
- **OFX:** parseamento de transações `<STMTTRN>`.
  - Formato de data: `YYYYMMDD`.
  - Valor positivo → recebimento; negativo → pagamento.
- Limite: 1.000 lançamentos por importação.
- Todos os lançamentos importados entram como **pagos**.
- Rate limit: 5 importações/hora por usuário.

### Exclusão de todos os lançamentos
- Somente owner.
- Requer digitar `EXCLUIR` para confirmar.
- Rate limit: 3 operações/hora.

### Exclusão de conta
- Somente owner.
- Requer digitar `APAGAR CONTA` para confirmar.
- Exclui fisicamente: todos os members, lançamentos, categorias e a própria conta.
- Rate limit: 3 operações/hora.

---

## Segurança

- **RLS** ativo em todas as tabelas; sem bypass por service role no cliente.
- Apenas queries parametrizadas ou via Supabase client/RPC — proibido SQL com template string.
- `get_my_account_id()` como `SECURITY DEFINER` para evitar recursão de RLS.
- Rate limiting em memória em todas as rotas de API (por IP e por usuário).
- Proteção contra enumeração de e-mails na recuperação de senha.

---

## PWA

- Web App Manifest configurado.
- Theme color: `#1B4332`.
- Suporte a instalação em dispositivos móveis (iOS e Android).
- Status bar translúcida no iOS.

---

## Schema do banco

Migrations em `supabase/migrations/` (executar em ordem alfabética = cronológica).

| Tabela | Descrição |
|---|---|
| `accounts` | Container compartilhado por todos os usuários de uma conta |
| `profiles` | Estende `auth.users`; armazena nome, papel (owner/member) e flag `is_disabled` |
| `categories` | Categorias por conta; nome único case-insensitive |
| `expenses` | Lançamentos; `user_id` referencia `profiles.id` |
| `financial_accounts` | Contas por account (ex.: Carteira, Nubank); saldo mantido por trigger |
| `bank_connections` | Conexões Open Finance via Pluggy |

- `profiles.id = auth.users.id` (mesmo UUID).
- Trigger `handle_new_user()` em `auth.users` cria automaticamente account + profile + conta "Carteira" no cadastro.
- Convites gerenciados por RPC (`create_invite`, `get_invite_by_token`).
- Saldo de `financial_accounts.balance` atualizado automaticamente por trigger ao inserir/editar/excluir lançamentos pagos.

---

## Setup (primeira vez)

### Banco de dados

Execute todos os arquivos de `supabase/migrations/` em ordem alfabética no SQL Editor do Supabase:

| Arquivo | O que faz |
|---|---|
| `20260511000000_initial_schema.sql` | Schema base (tabelas, RLS, trigger de cadastro) |
| `20260511120000_invite_system.sql` | Sistema de convites (RPC) |
| `20260512000000_add_is_disabled.sql` | Coluna `is_disabled` em profiles |
| `20260512010000_fix_invite_owner_email.sql` | Corrige `get_invite_by_token` para retornar e-mail do owner |
| `20260512020000_billing.sql` | Colunas de trial/assinatura em accounts |
| `20260512030000_stripe.sql` | Renomeia coluna para `stripe_subscription_id` |
| `20260512040000_pluggy.sql` | `pluggy_transaction_id` em expenses + tabela `bank_connections` |
| `20260513000000_financial_accounts.sql` | Tabela `financial_accounts` + `financial_account_id` em expenses |
| `20260513010000_seed_carteira.sql` | Trigger cria conta "Carteira" automaticamente no cadastro |
| `20260515000000_balance_trigger.sql` | Trigger de saldo em `financial_accounts` |

### Supabase

- Desativar confirmação de e-mail: Dashboard → Authentication → Providers → Email → desmarcar "Confirm email".

### Stripe

- Criar preço recorrente (R$ 7,99/mês, BRL) → copiar Price ID para `STRIPE_PRICE_ID`.
- Criar webhook apontando para `https://seudominio.com/api/billing/webhook` com os eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed` → copiar signing secret para `STRIPE_WEBHOOK_SECRET`.

### Pluggy

- Criar aplicação no dashboard Pluggy → copiar Client ID e Secret para `PLUGGY_CLIENT_ID` / `PLUGGY_CLIENT_SECRET`.

### Novas migrations

Toda nova migration deve ser criada em `supabase/migrations/` com o nome no formato `YYYYMMDDHHMMSS_descricao.sql`.
