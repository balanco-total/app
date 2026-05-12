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
  (app)/app/page.tsx                 → /app (dashboard, passes user+profile to Dashboard)
  (app)/app/charts/page.tsx          → /app/charts
  (app)/app/users/page.tsx           → /app/users (owner only)
  (app)/app/profile/page.tsx         → /app/profile
```

Route groups `(auth)` and `(app)` are invisible in URLs. `/` is the public landing page; the app lives under `/app`. Middleware handles auth redirects first; `(app)/app/layout.tsx` is a belt-and-suspenders server-side guard.

### Components

- `components/Dashboard.tsx` — `'use client'`, main dashboard UI with all CRUD via Supabase browser client
- `components/ChartsPage.tsx` — `'use client'`, analytics charts (pie, bar, monthly trend)
- `components/UsersPage.tsx` — `'use client'`, member management (invite, disable, delete)
- `components/ProfilePage.tsx` — `'use client'`, profile settings, CSV/OFX import, data export

### Supabase Utilities

- `utils/supabase/client.ts` — browser client (use in client components)
- `utils/supabase/server.ts` — server client (takes awaited `cookies()` as param)
- `utils/supabase/middleware.ts` — not used by middleware.ts; kept for reference
- `middleware.ts` — inlines Supabase client creation to refresh sessions and enforce auth redirects

### Database Schema (`supabase/schema.sql`)

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
- Billing: R$7.99/month, 7-day free trial (not yet implemented)

## Setup Required (One-time)

1. Run `supabase/schema.sql` in Supabase SQL Editor
2. Disable email confirmation: Supabase Dashboard → Authentication → Providers → Email → uncheck "Confirm email"
