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
  (auth)/login/page.tsx          → /login (público)
  (auth)/signup/page.tsx         → /signup (público)
  (auth)/invite/page.tsx         → /invite (público, aceite de convite)
  (auth)/reset-password/page.tsx → /reset-password (público)
  (app)/layout.tsx               → guard de auth para /
  (app)/page.tsx                 → / (dashboard)
  (app)/charts/page.tsx          → /charts
  (app)/users/page.tsx           → /users (somente owner)
  (app)/profile/page.tsx         → /profile
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
- Token UUID com validade de 7 dias.
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
- **Resumo por categoria:** lista de categorias com valor total e percentual sobre o total de pagamentos do mês.
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

## Schema do banco (`supabase/schema.sql`)

Quatro tabelas principais:

| Tabela | Descrição |
|---|---|
| `accounts` | Container compartilhado por todos os usuários de uma conta |
| `profiles` | Estende `auth.users`; armazena nome, papel (owner/member) e flag `disabled` |
| `categories` | Categorias por conta; nome único case-insensitive |
| `expenses` | Lançamentos; `user_id` referencia `profiles.id` |

- `profiles.id = auth.users.id` (mesmo UUID).
- Trigger `handle_new_user()` em `auth.users` cria automaticamente account + profile no cadastro.
- Convites gerenciados por RPC (`create_invite`, `get_invite_by_token`) em `supabase/invites.sql`.

---

## Setup (primeira vez)

1. Executar `supabase/schema.sql` no SQL Editor do Supabase.
2. Executar `supabase/invites.sql` no SQL Editor do Supabase.
3. Desativar confirmação de e-mail: Supabase Dashboard → Authentication → Providers → Email → desmarcar "Confirm email".
