# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BalançoTotal is a financial management web app. The README contains the full product specification (tech stack, business rules, database schema, and feature list) — read it before making architectural decisions.

## Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
```

## Architecture

### Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Icons**: Lucide React

### Route Structure

```
app/
  layout.tsx                       → root layout (global)
  (auth)/login/page.tsx            → /login (public)
  (auth)/signup/page.tsx           → /signup (public)
  (auth)/invite/page.tsx           → /invite (public, invite acceptance)
  (auth)/reset-password/page.tsx   → /reset-password (public)
  (app)/layout.tsx                 → auth guard for the app routes
  (app)/page.tsx                   → / (dashboard, passes user+profile+account to Dashboard)
  (app)/charts/page.tsx            → /charts
  (app)/users/page.tsx             → /users (owner only)
  (app)/profile/page.tsx           → /profile
  (app)/billing/page.tsx           → /billing (subscription page, accessible when trial expired)
  (app)/billing/success/page.tsx   → /billing/success (post-payment confirmation)
```

Route groups `(auth)` and `(app)` are invisible in URLs. The app lives at the root: `/` is the (auth-protected) dashboard. The marketing landing page is a separate repo/deploy. Middleware handles auth redirects first; `(app)/layout.tsx` is a belt-and-suspenders server-side guard.

### Components

- `components/ui/` — design system primitives (`Button`, `Input`, `Modal`, `Card`). See **Design System** section below.
- `components/Dashboard.tsx` — `'use client'`, main dashboard UI with all CRUD via Supabase browser client
- `components/ChartsPage.tsx` — `'use client'`, analytics charts (pie, bar, monthly trend)
- `components/UsersPage.tsx` — `'use client'`, member management (invite, disable, delete)
- `components/ProfilePage.tsx` — `'use client'`, profile settings, CSV/OFX import, data export
- `components/BillingPage.tsx` — `'use client'`, subscription page with Stripe Checkout redirect
- `components/BillingBanner.tsx` — `'use client'`, trial/subscription status banner shown in dashboard
- `components/ProfilePage.tsx` — `'use client'`, profile settings, CSV/OFX import, data export, Pluggy bank connections

### Shared utilities

- `lib/utils.ts` — single source of truth for `applyMask`, `parseMasked`, `MAX_CENTS`, `FIELD_PATTERN`. `components/dashboard/helpers.ts`, `components/accounts/helpers.ts`, `components/profile/parsers.ts` re-export from here — **do not duplicate these functions locally**. If you need a new shared helper, add it here.

### Supabase Utilities

- `utils/supabase/client.ts` — browser client (use in client components)
- `utils/supabase/server.ts` — server client (takes awaited `cookies()` as param)
- `utils/supabase/middleware.ts` — not used by middleware.ts; kept for reference
- `middleware.ts` — inlines Supabase client creation to refresh sessions, enforce auth redirects, and block expired/unsubscribed accounts (redirects to `/billing`)

### Database Migrations (`supabase/migrations/`)

All SQL files live in `supabase/migrations/` with the naming convention `YYYYMMDDHHMMSS_description.sql`. Run them in filename order (alphabetical = chronological).

**Migration naming rule:** every new migration file must start with the timestamp of creation in the format `YYYYMMDDHHMMSS_` (e.g. `20260515212405_add_column_foo.sql`). Never add SQL directly to an existing migration.

Current migrations in order:
1. `20260511000000_initial_schema.sql` — tables: accounts, profiles, categories, expenses
2. `20260511120000_invite_system.sql` — invite token + RPC functions
3. `20260512000000_add_is_disabled.sql` — `profiles.is_disabled` column
4. `20260512010000_fix_invite_owner_email.sql` — adds owner_email to get_invite_by_token
5. `20260512020000_billing.sql` — trial/subscription columns on accounts
6. `20260512030000_stripe.sql` — renames abacatepay_subscription_id → stripe_subscription_id
7. `20260512040000_pluggy.sql` — pluggy_transaction_id on expenses + bank_connections table
8. `20260513000000_financial_accounts.sql` — financial_accounts table + financial_account_id on expenses
9. `20260513010000_seed_carteira.sql` — handle_new_user creates default "Carteira" account
10. `20260515000000_balance_trigger.sql` — trigger to keep financial_accounts.balance in sync

Four tables: `accounts`, `profiles` (extends `auth.users`), `categories`, `expenses`.

- `profiles.id = auth.users.id` — same UUID
- `expenses.user_id` references `profiles.id` (not `auth.users`) to enable PostgREST join syntax: `.select('*, profiles(name)')`
- RLS on all tables; `get_my_account_id()` is `SECURITY DEFINER` to prevent RLS recursion
- `handle_new_user()` trigger on `auth.users` auto-creates account + profile on signup

### Auth Flow

1. Signup → `supabase.auth.signUp()` with `options.data.name` → trigger creates account + profile → client seeds default categories → redirect `/`
2. Invite → owner generates token (RPC `create_invite`) → guest visits `/invite?token=...` → creates account as member → redirect `/`
3. Login → `supabase.auth.signInWithPassword()` → redirect `/`
4. All protected requests: middleware calls `getUser()` (validates JWT server-side) → redirects to `/login` if unauthenticated; `(app)/layout.tsx` also checks `is_disabled` and signs out banned users

### Key Constraints

- Physical deletion only (no soft deletes)
- RLS on all tables — never bypass with service role key on client
- Members can only edit/delete their own expenses (enforced by RLS: `user_id = auth.uid()`)
- Billing: R$7.99/month, 34-day free trial

## Design System

The project has a minimal design system in `components/ui/`. **Use the primitives — do not reinvent buttons, inputs, modals, or card containers inline.**

### Color tokens (tailwind.config.js)

| Token            | Hex       | Use                                          |
|------------------|-----------|----------------------------------------------|
| `brand-500`      | `#1B4332` | primary brand (base)                         |
| `brand-600`      | `#163a2b` | primary hover                                |
| `brand-700`      | `#14332a` | primary active / darker variant              |
| `brand-{50..900}`| —         | full palette                                 |
| `accent`         | `#F5A623` | secondary brand (CTAs, badges)               |
| `accent-hover`   | `#e09510` | accent hover                                 |

**Rules:**
- **Never hardcode `#1B4332`, `#163a2b`, `#F5A623` (or any brand hex) in className.** Use `bg-brand-500`, `text-brand-600`, `focus:ring-brand-500`, `bg-brand-500/10`, etc.
- The only legitimate hex literals for these colors are: SVG `fill`/`stroke` attributes (e.g. `components/Logo.tsx`) and `<meta name="theme-color">` in `app/layout.tsx`. Nothing else.
- If you need a brand shade that doesn't exist in the palette, **extend `tailwind.config.js`** — don't introduce a one-off `[#xxxxxx]` arbitrary value.
- Standard Tailwind colors (`bg-red-600`, `text-gray-700`, `bg-emerald-600`, etc.) are fine; the rule applies only to brand colors.

### Primitives

#### `<Button>` — `components/ui/Button.tsx`

```tsx
<Button
  variant="primary" | "secondary" | "destructive"  // default: primary
  size="sm" | "md" | "lg"                          // default: md
  isLoading={boolean}                              // shows spinner, disables
  fullWidth={boolean}
  icon={<Icon />}                                  // leading icon
  // …native button props (onClick, disabled, type, etc.)
/>
```

- `primary` → `bg-brand-500 hover:bg-brand-600 text-white` (the most common CTA)
- `secondary` → `bg-gray-100 hover:bg-gray-200 text-gray-700` (cancel, dismiss)
- `destructive` → `bg-red-600 hover:bg-red-700 text-white` (confirm-delete, irreversible)
- Sizes: `sm` = `px-3 py-2`, `md` = `px-4 py-2.5`, `lg` = `px-5 py-3`. Text size inherits from context; pass `className="text-sm"` if the surrounding context calls for it.
- For a leading icon, prefer the `icon` prop over composing inside `children` — it keeps the gap/alignment consistent.
- For "loading with spinner" use `isLoading={loading}`. Don't manually toggle a Loader2 inside children.
- **When NOT to use `<Button>`**: text-only links (e.g. "Voltar ao login", "Esqueceu a senha?"), buttons with a deliberately non-standard color (e.g. the `bg-red-900` "Apagar conta" in DangerZoneCard, the emerald CTA in BillingPage), and icon-only utility buttons (close `X`, copy, paginator chevrons).

#### `<Input>` — `components/ui/Input.tsx`

```tsx
<Input
  label="E-mail"
  error="Mensagem"                       // shows below, switches focus ring to red
  variant="default" | "danger"           // default: default (brand ring)
  // …native input props
/>
```

- Encapsulates label + input + error message. Use for plain text/email/number inputs in forms.
- **When NOT to use `<Input>`**: password fields (use `<PasswordInput>`), masked currency inputs in modals (Dashboard expense modals), `<select>` elements, `<textarea>`, native date pickers, and inputs whose visual treatment differs structurally (inline edit fields, inputs with adornments).

#### `<Modal>` — `components/ui/Modal.tsx`

```tsx
<Modal
  open={boolean}
  onClose={() => void}                   // called on backdrop click + Escape
  size="sm" | "md" | "lg"                // max-w-sm / md / lg
  title="..."                            // optional, renders bold h3
  showClose={boolean}                    // optional X icon top-right
>
  {content}
</Modal>
```

- The backdrop click and Escape both invoke `onClose`. **For destructive operations in progress**, gate it: `onClose={loading ? () => {} : actualClose}` so the user can't accidentally dismiss mid-delete.
- Don't recreate `fixed inset-0 bg-black/50 ...` wrappers inline; always wrap in `<Modal>`.

#### `<Card>` — `components/ui/Card.tsx`

```tsx
<Card
  padding="sm" | "md" | "lg"             // p-4 / p-6 / p-8 (default: md)
  shadow="none" | "sm" | "md" | "lg" | "xl"   // default: lg
>
  {content}
</Card>
```

- Use for any `bg-white rounded-2xl shadow-* p-*` container. Common pattern for auth pages and dashboard sections.

### Performance patterns

- **Don't `.find()` inside a render loop.** When you need to look up by id repeatedly (e.g. `categories.find(c => c.id === expense.category_id)` for each row), build a `Map` with `useMemo` once and use `.get()`:
  ```tsx
  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories])
  // then in render:
  const category = exp.category_id ? categoryMap.get(exp.category_id) : undefined
  ```
- **Wrap derived data in `useMemo`** when it traverses a list (filter/map/reduce/sort) and the source list isn't trivially small. `Dashboard.tsx` is the canonical example — see `categorySummary`, `totalMonth`, `totalUnpaid`.
- New images sourced from URLs should use `next/image` (with `unoptimized` when the host is a third-party CDN like Pluggy whose domain isn't allowlisted in `next.config.js`).
- **Fetch initial data server-side, pass as props — don't fetch on mount.** Mobile FCP/LCP were "Poor" (~4.4s/4.95s) because `Dashboard.tsx` started with `loading=true` and ran its Supabase queries in a `useEffect` on mount: the server only rendered a spinner, and real content waited for JS download → hydration → round-trips. The server component (`app/(app)/page.tsx`) now fetches everything in one `Promise.all` and passes `initial*` props; the client component initializes `useState` from those props (`loading` removed entirely) so the server renders real content into the HTML. **When adding a new app page, follow this pattern: fetch in the server `page.tsx`, seed defaults server-side, and hydrate client state from props instead of fetching on mount.** Keep `useEffect` fetches only for data that changes after mount (e.g. `fetchMonthlySummary` on month change — guarded by a first-render ref so it doesn't refetch the server-provided initial month).
- **Code-split interaction-only and heavy client components with `next/dynamic`** to shrink the initial route bundle. In `Dashboard.tsx`, `ExpenseForm`/`RecentExpenses` load as separate chunks (SSR kept) and `CategoryExpensesAside` uses `{ ssr: false }` (it only renders when a category is clicked). `recharts` is heavy and isolated to `/charts` — never import chart components into the dashboard path.
- **Keep global client JS off the critical path.** `InstallPrompt` (PWA prompt) loads via `components/InstallPromptLoader.tsx`, a thin `'use client'` wrapper that does `dynamic(..., { ssr: false })` — needed because `ssr: false` dynamic imports aren't allowed directly in the Server Component root layout.

### Billing Flow (Stripe)

- `accounts` table has `trial_ends_at`, `subscription_status` (`trialing` | `active` | `past_due` | `canceled`), `stripe_subscription_id`
- Middleware blocks all protected app routes (except `/billing`) when trial expired AND not `active`
- `POST /api/billing/subscribe` — creates a Stripe Checkout Session (`mode: 'subscription'`), passes `client_reference_id: account_id` and `customer_email`; returns hosted checkout URL
- `POST /api/billing/webhook` — receives Stripe events; verifies `stripe-signature` header with `stripe.webhooks.constructEvent()`; uses admin client to update `accounts`
  - `checkout.session.completed` → `active`, stores `stripe_subscription_id`
  - `customer.subscription.updated` → maps Stripe status to our status
  - `customer.subscription.deleted` → `canceled`
  - `invoice.payment_failed` → `past_due`
- Dashboard shows `BillingBanner` for non-active accounts (days remaining + "Assinar" button for owner)
- `STRIPE_PRICE_ID` must be a pre-created recurring price (R$7.99/month) in the Stripe dashboard

## Setup Required (One-time)

1. Run all files in `supabase/migrations/` in order (alphabetical = chronological) in the Supabase SQL Editor
2. Disable email confirmation: Supabase Dashboard → Authentication → Providers → Email → uncheck "Confirm email"
3. In Stripe dashboard: create a recurring price (R$7.99/month, BRL) → copy Price ID to `STRIPE_PRICE_ID`
4. In Stripe dashboard: create a webhook endpoint pointing to `https://seudominio.com/api/billing/webhook`, subscribe to events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed` → copy signing secret to `STRIPE_WEBHOOK_SECRET`
5. In Pluggy dashboard: create an application → copy Client ID and Secret to `PLUGGY_CLIENT_ID` / `PLUGGY_CLIENT_SECRET`
