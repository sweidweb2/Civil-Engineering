import { Languages } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { Section, SegmentedControl } from '@/components/kit'
import { directionNeedsRestart } from '@/i18n'
import { showBlockingAlert } from '@/services/feedback'
import { type AppLanguage, useLanguageStore } from '@/stores/languageStore'

const OPTIONS: { value: AppLanguage; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' },
]

/** Language switcher. Arabic also flips the layout, which needs an app restart on phones. */
export function LanguagePicker() {
  const { t } = useTranslation()
  const language = useLanguageStore((s) => s.language)
  const setLanguage = useLanguageStore((s) => s.setLanguage)

  function onChange(value: string) {
    const next = value as AppLanguage
    setLanguage(next)
    if (directionNeedsRestart(next)) {
      showBlockingAlert(t('account.restartTitle'), t('account.restartBody'))
    }
  }

  return (
    <Section
      title={t('account.language')}
      description={t('account.languageHint')}
      icon={Languages}
      tone="info"
    >
      <SegmentedControl options={OPTIONS} value={language} onChange={onChange} />
    </Section>
  )
}
