import { useTranslations } from '@/hooks/use-translations';

interface DisplayNameProps {
  name: string;
  nameHi?: string | null;
  className?: string;
}

/**
 * Smart name display component
 * - Shows Hindi name when language is Hindi (if available)
 * - Falls back to English name
 * - Respects NoTranslate principles
 *
 * @example
 * <DisplayName name="Ramesh Kumar" nameHi="रमेश कुमार" />
 */
export function DisplayName({ name, nameHi, className }: DisplayNameProps) {
  const { locale } = useTranslations();

  // Show Hindi name if available and language is Hindi
  const displayName = locale === 'hi' && nameHi ? nameHi : name;

  return (
    <span translate="no" className={className}>
      {displayName}
    </span>
  );
}

/**
 * Compact variant - returns string only
 */
export function getDisplayName(name: string, nameHi?: string | null, locale?: string): string {
  return locale === 'hi' && nameHi ? nameHi : name;
}
