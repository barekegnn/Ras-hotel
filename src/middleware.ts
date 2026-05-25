// ============================================================
// Next.js Middleware — Authentication & RBAC
// src/middleware.ts
//
// Enforces JWT authentication on all /dashboard/* and /api/v1/* routes.
// Role-based access control: Managers have full access;
// Receptionists are blocked from reports and settings routes.
// Requirements 11.3
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// Routes accessible only to managers
const MANAGER_ONLY_ROUTES = [
  '/dashboard/reports',
  '/dashboard/settings',
  '/api/v1/reports',
  '/api/v1/staff',
  '/api/v1/config',
  '/api/v1/payments/pending',
];

// Public API routes (no auth required)
const PUBLIC_API_ROUTES = [
  '/api/v1/rooms',
  '/api/v1/bookings/lookup',
  '/api/v1/payments/webhook',
  '/api/v1/payments/initiate',
  '/api/v1/chatbot',
  '/api/v1/feedback',
  '/api/v1/config',
];

function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  ) && !pathname.startsWith('/api/v1/reports') && !pathname.startsWith('/api/v1/staff');
}

function isManagerOnlyRoute(pathname: string): boolean {
  return MANAGER_ONLY_ROUTES.some((route) => pathname.startsWith(route));
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  // Only protect dashboard and API routes
  const isDashboard = pathname.startsWith('/dashboard');
  const isApi = pathname.startsWith('/api/v1');

  if (!isDashboard && !isApi) return response;

  // Skip auth for public API routes (GET only for most)
  if (isApi && isPublicApiRoute(pathname) && request.method === 'GET') {
    return response;
  }
  if (pathname === '/api/v1/payments/webhook' ||
      pathname === '/api/v1/payments/initiate' ||
      pathname.match(/^\/api\/v1\/feedback\//)) {
    return response;
  }

  // Build Supabase client with cookie handling
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Validate session
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    // API route: return 401
    if (isApi) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }
    // Dashboard: redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Fetch user role from staff_accounts
  const { data: staffAccount } = await supabase
    .from('staff_accounts')
    .select('role, is_active')
    .eq('id', session.user.id)
    .single();

  // Inactive or no account
  if (!staffAccount || !staffAccount.is_active) {
    await supabase.auth.signOut();
    if (isApi) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Account inactive' } },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login?reason=inactive', request.url));
  }

  // Manager-only routes: reject receptionists
  if (isManagerOnlyRoute(pathname) && staffAccount.role !== 'manager') {
    if (isApi) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Manager role required' } },
        { status: 403 }
      );
    }
    return NextResponse.redirect(new URL('/dashboard?error=forbidden', request.url));
  }

  // Add role to request headers for downstream use
  response.headers.set('x-staff-role', staffAccount.role);
  response.headers.set('x-staff-id', session.user.id);

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/v1/:path*',
  ],
};
