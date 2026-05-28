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

// Public API routes — method-specific rules
// Format: { path, methods } — '*' means all methods
const PUBLIC_API_ROUTES: Array<{ path: string; methods: string[] | '*' }> = [
  { path: '/api/v1/auth/login',              methods: ['POST'] },   // staff login
  { path: '/api/v1/rooms',                   methods: ['GET'] },
  { path: '/api/v1/bookings',                methods: ['POST'] },   // online guest booking
  { path: '/api/v1/bookings/lookup',         methods: ['GET'] },
  { path: '/api/v1/payments/chapa-init',     methods: ['POST'] },   // guest payment init
  { path: '/api/v1/payments/chapa-webhook',  methods: '*' },        // Chapa server callback
  { path: '/api/v1/chatbot',                 methods: ['POST'] },
  { path: '/api/v1/feedback',                methods: ['POST', 'GET'] },
  { path: '/api/v1/config',                  methods: ['GET'] },
];

// Summary sub-routes that are public (guest-facing, no auth needed)
const PUBLIC_BOOKING_SUBROUTES = ['/summary'];

function isPublicBookingSubroute(pathname: string): boolean {
  // Match /api/v1/bookings/:id/<subroute>
  const match = pathname.match(/^\/api\/v1\/bookings\/[^/]+(\/.+)$/);
  if (!match) return false;
  return PUBLIC_BOOKING_SUBROUTES.includes(match[1]!);
}

function isPublicApiRoute(pathname: string, method: string): boolean {
  for (const route of PUBLIC_API_ROUTES) {
    const matches = pathname === route.path || pathname.startsWith(route.path + '/');
    if (!matches) continue;
    if (route.methods === '*') return true;
    if (route.methods.includes(method)) return true;
  }
  return false;
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

  // Skip auth for public API routes
  if (isApi && (isPublicApiRoute(pathname, request.method) || isPublicBookingSubroute(pathname))) {
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

  // Validate user via Supabase Auth server (getUser is secure; getSession is not)
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
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
    .eq('auth_id', user.id)
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
  response.headers.set('x-staff-id', user.id);

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/v1/:path*',
    // /api/cron/* is excluded — secured by CRON_SECRET Bearer token instead
  ],
};
