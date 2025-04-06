import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });

  // Refresh session if expired
  await supabase.auth.getSession();

  const { data: { user } } = await supabase.auth.getUser();

  // Public paths for testing/debugging (only in dev mode)
  const isTestPath = process.env.NODE_ENV === 'development' && (
    request.nextUrl.pathname.startsWith('/test-pdf') ||
    request.nextUrl.pathname.startsWith('/api/test-pdf') ||
    request.nextUrl.pathname.startsWith('/api/test-endpoints')
  );

  if (isTestPath) {
    console.log('Allowing access to test path:', request.nextUrl.pathname);
    return res;
  }

  // API routes protection
  if (
    request.nextUrl.pathname.startsWith('/api/parse-document') ||
    request.nextUrl.pathname.startsWith('/api/summarize') ||
    request.nextUrl.pathname.startsWith('/api/chat')
  ) {
    if (!user) {
      console.log('API auth failed:', request.nextUrl.pathname);
      // If user is not signed in, return unauthorized
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return res;
  }

  // Auth routes handling
  if (request.nextUrl.pathname.startsWith('/auth')) {
    if (user) {
      // If user is signed in and tries to access auth pages, redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return res;
  }

  // Protected routes handling
  if (
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/profile') ||
    request.nextUrl.pathname.startsWith('/course')
  ) {
    if (!user) {
      // If user is not signed in, redirect to login
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}; 