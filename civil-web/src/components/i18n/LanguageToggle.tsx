import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { setAppLocale } from '@/i18n/setAppLocale'
import { cn } from '@/lib/utils'
import { useLocaleStore } from '@/stores/localeStore'

type LanguageToggleProps = {
  className?: string
  /** Compact header control vs full-width menu style. */
  variant?: 'header' | 'menu'
}

export function LanguageToggle({ className, variant = 'header' }: LanguageToggleProps) {
  const { t } = useTranslation('account')
  const locale = useLocaleStore((state) => state.locale)

  function toggle() {
    setAppLocale(locale === 'en' ? 'ar' : 'en')
  }

  if (variant === 'menu') {
    return null
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn('shrink-0 gap-1.5 font-medium', className)}
      onClick={toggle}
      aria-label={t('toggleLanguage')}
      title={t('toggleLanguage')}
    >
      <Languages className="size-3.5" aria-hidden />
      <span className="tabular-nums">{locale === 'en' ? 'EN' : 'ع'}</span>
    </Button>
  )
}
