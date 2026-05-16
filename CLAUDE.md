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
  page.tsx                           → / (landing page, public)
  layout.tsx                         → root layout (global)
  (auth)/login/page.tsx              → /login (public)
  (auth)/signup/page.tsx             → /signup (public)
  (auth)/invite/page.tsx             → /invite (public, invite acceptance)
  (auth)/reset-password/page.tsx     → /reset-password (public)
  (app)/app/layout.tsx               → auth guard for /app/*
  (app)/app/page.tsx                 → /app (dashboard, passes user+profile+account to Dashboard)
  (app)/app/charts/page.tsx          → /app/charts
  (app)/app/users/page.tsx           → /app/users (owner only)
  (app)/app/profile/page.tsx         → /app/profile
  (app)/app/billing/page.tsx         → /app/billing (subscription page, accessible when trial expired)
  (app)/app/billing/success/page.tsx → /app/billing/success (post-payment confirmation)
```

Route groups `(auth)` and `(app)` are invisible in URLs. `/` is the public landing page; the app lives under `/app`. Middleware handles auth redirects first; `(app)/app/layout.tsx` is a belt-and-suspenders server-side guard.

### Components

- `components/Dashboard.tsx` — `'use client'`, main dashboard UI with all CRUD via Supabase browser client
- `components/ChartsPage.tsx` — `'use client'`, analytics charts (pie, bar, monthly trend)
- `components/UsersPage.tsx` — `'use client'`, member management (invite, disable, delete)
- `components/ProfilePage.tsx` — `'use client'`, profile settings, CSV/OFX import, data export
- `components/BillingPage.tsx` — `'use client'`, subscription page with Stripe Checkout redirect
- `components/BillingBanner.tsx` — `'use client'`, trial/subscription status banner shown in dashboard
- `components/ProfilePage.tsx` — `'use client'`, profile settings, CSV/OFX import, data export, Pluggy bank connections

### Supabase Utilities

- `utils/supabase/client.ts` — browser client (use in client components)
- `utils/supabase/server.ts` — server client (takes awaited `cookies()` as param)
- `utils/supabase/middleware.ts` — not used by middleware.ts; kept for reference
- `middleware.ts` — inlines Supabase client creation to refresh sessions, enforce auth redirects, and block expired/unsubscribed accounts (redirects to `/app/billing`)

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

1. Signup → `supabase.auth.signUp()` with `options.data.name` → trigger creates account + profile → client seeds default categories → redirect `/app`
2. Invite → owner generates token (RPC `create_invite`) → guest visits `/invite?token=...` → creates account as member → redirect `/app`
3. Login → `supabase.auth.signInWithPassword()` → redirect `/app`
4. All `/app/*` requests: middleware calls `getUser()` (validates JWT server-side) → redirects to `/login` if unauthenticated; `(app)/app/layout.tsx` also checks `is_disabled` and signs out banned users

### Key Constraints

- Physical deletion only (no soft deletes)
- RLS on all tables — never bypass with service role key on client
- Members can only edit/delete their own expenses (enforced by RLS: `user_id = auth.uid()`)
- Billing: R$7.99/month, 7-day free trial

### Billing Flow (Stripe)

- `accounts` table has `trial_ends_at`, `subscription_status` (`trialing` | `active` | `past_due` | `canceled`), `stripe_subscription_id`
- Middleware blocks all `/app/*` routes (except `/app/billing`) when trial expired AND not `active`
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
