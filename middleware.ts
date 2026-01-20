import createMiddleware from 'next-intl/middleware';

// Define locales directly here to avoid edge runtime issues
export const locales = ['en', 'hi'] as const;

export default createMiddleware({
  // A list of all locales that are supported
  locales: locales,

  // Used when no locale matches
  defaultLocale: 'en',

  // Always use locale prefix (e.g., /en/dashboard, /hi/dashboard)
  localePrefix: 'always'
});

export const config = {
  // Match all pathnames except for
  // - api routes
  // - _next (Next.js internals)
  // - files with extensions (e.g. favicon.ico)
  matcher: ['/((?!api|_next|.*\\..*).*)']
};
