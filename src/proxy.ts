import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export default async function proxy(request: NextRequest) {
    // Log to verify proxy is running
    console.log('[Proxy] Running for path:', request.nextUrl.pathname)

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
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Refreshing the auth token - this is critical for session persistence
    // Wrap in try-catch to handle stale/invalid refresh tokens gracefully
    try {
        const { data: { user }, error } = await supabase.auth.getUser()
        console.log('[Proxy] Session refresh result:', user ? 'valid' : 'no user', error?.message || '')
    } catch (error) {
        // If refresh token is invalid, the client-side auth will handle redirect to login
        console.log('[Proxy] Session refresh failed:', error)
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
         * - login page
         * - static assets
         */
        '/((?!api|_next/static|_next/image|favicon.ico|login).*)',
    ],
}
