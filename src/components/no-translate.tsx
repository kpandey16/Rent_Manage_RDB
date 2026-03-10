import { ReactNode } from 'react';

/**
 * Wraps content that should NOT be translated by browser translation
 * Use for: names, room numbers, amounts, specific terms
 *
 * @example
 * <NoTranslate>Ramesh Kumar</NoTranslate>
 * <NoTranslate>Room 5</NoTranslate>
 */
export function NoTranslate({ children }: { children: ReactNode }) {
  return <span translate="no">{children}</span>;
}

/**
 * Alternative: Component for names specifically
 */
export function TenantName({ children }: { children: ReactNode }) {
  return <span translate="no" className="font-medium">{children}</span>;
}

/**
 * Alternative: Component for room numbers
 */
export function RoomNumber({ children }: { children: ReactNode }) {
  return <span translate="no">{children}</span>;
}
