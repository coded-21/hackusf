import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });

  // Refresh session if expired
  await supabase.auth.getSession();

  const { data: { user } } = await supabase.auth.getUser();

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
    request.nextUrl.pathname.startsWith('/profile')
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