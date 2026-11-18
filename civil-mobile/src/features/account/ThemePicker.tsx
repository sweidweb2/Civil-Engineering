import { useTranslation } from 'react-i18next'

import { Section, SegmentedControl } from '@/components/kit'
import { type ThemeMode, useThemeStore } from '@/stores/themeStore'

const MODES: ThemeMode[] = ['system', 'light', 'dark']

/** Appearance switcher: follow the device, or force light or dark. */
export function ThemePicker() {
  const { t } = useTranslation()
  const options = MODES.map((value) => ({ value, label: t(`account.theme.${value}`) }))
  const mode = useThemeStore((s) => s.mode)
  const setMode = useThemeStore((s) => s.setMode)

  return (
    <Section title={t('account.appearance')} description={t('account.appearanceHint')}>
      <SegmentedControl
        options={options}
        value={mode}
        onChange={(value) => setMode(value as ThemeMode)}
      />
    </Section>
  )
}
