import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ req, token }) {
        // Public pages and all API routes are handled by their own auth checks.
        const publicPaths = ['/', '/auth'];
        const isPublic = publicPaths.some((path) =>
          req.nextUrl.pathname.startsWith(path)
        );
        if (isPublic || req.nextUrl.pathname.startsWith('/api')) return true;
        return token !== null;
      },
    },
  }
);

export const config = {
  matcher: ['/((?!_next|favicon.ico|api|public|assets).*)'],
};
