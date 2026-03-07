import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export default async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, {
                            ...options,
                            // Enforce secure cookie attributes for auth tokens:
                            // httpOnly  — prevents JavaScript (XSS) from reading the cookie
                            // secure    — cookie only sent over HTTPS (skipped in development)
                            // sameSite  — mitigates CSRF by restricting cross-site sending
                            httpOnly: true,
                            secure: process.env.NODE_ENV === 'production',
                            sameSite: 'lax',
                        })
                    )
                },
            },
        }
    )

    // Refresh the auth token — required for session persistence with SSR.
    // If the refresh token is invalid/expired, clear the stale auth cookies
    // and redirect to login so the user is not stuck in a broken loop.
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
        const code = (error as { code?: string }).code

        // auth_session_missing — no cookies at all (logged-out visitor, first visit).
        // Not an error; just means no user. The !user check below handles the redirect.
        if (code === 'auth_session_missing') {
            // Silently continue — no cookies to clear, login redirect handled below.
        } else if (
            code === 'refresh_token_not_found' ||
            code === 'refresh_token_already_used' ||
            code === 'invalid_refresh_token'
        ) {
            // Clear all Supabase auth cookies so the error stops on the next request
            const loginUrl = request.nextUrl.clone()
            loginUrl.pathname = '/login'

            const redirectResponse = NextResponse.redirect(loginUrl)

            // Delete known Supabase auth cookie patterns
            request.cookies.getAll().forEach(({ name }) => {
                if (
                    name.startsWith('sb-') ||
                    name.includes('supabase') ||
                    name.includes('-auth-token')
                ) {
                    redirectResponse.cookies.delete(name)
                }
            })

            return redirectResponse
        }
    }

    // Protect authenticated routes — redirect unauthenticated users to /login.
    //
    // IMPORTANT: Only redirect plain GET navigation requests.
    // - Server Actions are POST requests with a `Next-Action` header.
    //   Redirecting them returns a 302 where Next.js expects an action response,
    //   producing "An unexpected response was received from the server."
    // - RSC payload fetches (initiated by the router during client transitions)
    //   carry a `Rsc: 1` or `Next-Router-State-Tree` header.
    //   Redirecting those also confuses the client router.
    // Both categories should be allowed through unauthenticated; they will
    // naturally fail at the route/component level or trigger the client-side
    // auth state change → redirect flow.
    const isServerAction = request.headers.has('next-action')
    const isRSCRequest =
        request.headers.has('rsc') ||
        request.headers.has('next-router-state-tree')
    const isNavigationRequest =
        request.method === 'GET' && !isServerAction && !isRSCRequest

    const isProtectedPath =
        !request.nextUrl.pathname.startsWith('/login') &&
        !request.nextUrl.pathname.startsWith('/guest-access')

    if (!user && isProtectedPath && isNavigationRequest) {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = '/login'
        return NextResponse.redirect(loginUrl)
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all routes except:
         * - api routes (they handle their own auth)
         * - _next (static files)
         * - favicon.ico
         * - static assets
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
}
