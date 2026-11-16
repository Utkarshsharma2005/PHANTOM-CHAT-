import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const nonce = randomBytes(18).toString('base64');
  const isDevelopment = process.env.NODE_ENV === 'development';
  const apiOrigins = process.env.NEXT_PUBLIC_API_URL
    ? [new URL(process.env.NEXT_PUBLIC_API_URL).origin]
    : isDevelopment
      ? ['http://localhost:4000', 'http://127.0.0.1:4000']
      : ['https://*.onrender.com'];
  const websocketOrigins = process.env.NEXT_PUBLIC_WS_URL
    ? [new URL(process.env.NEXT_PUBLIC_WS_URL).origin]
    : apiOrigins.map(origin => origin.replace(/^http/, 'ws'));
  const connectSources = [...new Set(["'self'", ...apiOrigins, ...websocketOrigins])].join(' ');
  const contentSecurityPolicy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connectSources}`,
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    ...(process.env.NODE_ENV === 'production' ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', contentSecurityPolicy);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
