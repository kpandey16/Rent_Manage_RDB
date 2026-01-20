import createMiddleware from 'next-intl/middleware';
import { locales } from './src/i18n';

export default createMiddleware({
  // A list of all locales that are supported
  locales,

  // Used when no locale matches
  defaultLocale: 'en',

  // Always use locale prefix (e.g., /en/dashboard, /hi/dashboard)
  localePrefix: 'always'
});

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(hi|en)/:path*']
};
