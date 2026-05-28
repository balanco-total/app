import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // O callback de auth do Supabase pode chegar em / com code/error nos searchParams.
  if (pathname === '/') {
    const error = request.nextUrl.searchParams.get('error')
    const code = request.nextUrl.searchParams.get('code')
    if (error) return NextResponse.redirect(new URL('/confirm', request.url))
    if (code) {
      const url = new URL('/api/auth/callback', request.url)
      url.searchParams.set('code', code)
      return NextResponse.redirect(url)
    }
    // sem code/error: cai no guard de auth + billing abaixo (/ agora é o dashboard)
  }

  let supabaseResponse = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Always call getUser() — refreshes the session and validates the JWT
  const { data: { user } } = await supabase.auth.getUser()

  // Routes accessible without a session
  const isPublicRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/confirm') ||
    pathname.startsWith('/invite') ||
    pathname.startsWith('/api/')

  // Routes where an already-authenticated user should be sent to the app instead
  const isLoginRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/invite')

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone()
    url.pathname = path
    const response = NextResponse.redirect(url)
    // Forward refreshed session cookies so the redirect target sees the updated session
    supabaseResponse.cookies.getAll().forEach(({ name, value }) =>
      response.cookies.set(name, value)
    )
    return response
  }

  if (!user && !isPublicRoute) return redirectTo('/login')
  if (user && isLoginRoute) return redirectTo('/')

  // Billing guard: block access to protected app routes (except /billing) when trial expired and no active subscription
  const isProtectedAppRoute =
    !isPublicRoute &&
    !pathname.startsWith('/billing')

  if (user && isProtectedAppRoute) {
    const { data: billingData } = await supabase
      .from('profiles')
      .select('accounts(subscription_status, trial_ends_at)')
      .eq('id', user.id)
      .single()

    const acc = (billingData?.accounts as unknown as { subscription_status: string; trial_ends_at: string } | null)
    if (acc) {
      const trialActive = acc.subscription_status === 'trialing' && new Date(acc.trial_ends_at) > new Date()
      const subscribed = acc.subscription_status === 'active'
      if (!trialActive && !subscribed) return redirectTo('/billing')
    }
  }

  // Must return supabaseResponse — it carries the refreshed session cookies
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
