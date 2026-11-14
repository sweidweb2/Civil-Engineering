import { useEffect, useMemo, useState } from 'react'
import { ListOrdered, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ManageStepsPage } from '@/features/steps/ManageStepsPage'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'

import { PmProfileAdditionalPanel } from './components/PmProfileAdditionalPanel'
import { PmProfileGeneralPanel } from './components/PmProfileGeneralPanel'

type SettingsSection = 'profile' | 'steps'

function sectionFromParam(value: string | null): SettingsSection {
  return value === 'steps' ? 'steps' : 'profile'
}

export function PmSettingsPage() {
  const { t } = useTranslation('pm')
  useDocumentTitle(t('settings'))
  const [searchParams, setSearchParams] = useSearchParams()
  const [section, setSection] = useState<SettingsSection>(() =>
    sectionFromParam(searchParams.get('tab')),
  )

  const sections = useMemo(
    () =>
      [
        {
          id: 'profile' as const,
          label: t('profile'),
          description: t('profileDescription'),
          icon: UserRound,
        },
        {
          id: 'steps' as const,
          label: t('steps'),
          description: t('stepsDescription'),
          icon: ListOrdered,
        },
      ] as const,
    [t],
  )

  useEffect(() => {
    setSection(sectionFromParam(searchParams.get('tab')))
  }, [searchParams])

  function selectSection(next: SettingsSection) {
    setSection(next)
    setSearchParams(next === 'profile' ? {} : { tab: next }, { replace: true })
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader className="mb-0" title={t('settings')} description={t('settingsDescription')} />

      <div className="grid min-w-0 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
        <Card size="sm" className="h-fit lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle>{t('settings')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('chooseSection')}</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 p-2 pt-0">
            {sections.map((item) => {
              const Icon = item.icon
              const isActive = section === item.id
              return (
                <Button
                  key={item.id}
                  type="button"
                  variant="ghost"
                  onClick={() => selectSection(item.id)}
                  className={cn(
                    'h-auto w-full items-start justify-start gap-3 rounded-lg px-3 py-2.5 text-start',
                    isActive
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">{item.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </Button>
              )
            })}
          </CardContent>
        </Card>

        <div className="min-w-0">
          {section === 'profile' ? (
            <div className="flex min-w-0 flex-col gap-6">
              <PmProfileGeneralPanel />
              <PmProfileAdditionalPanel />
            </div>
          ) : null}
          {section === 'steps' ? <ManageStepsPage embedded /> : null}
        </div>
      </div>
    </div>
  )
}
