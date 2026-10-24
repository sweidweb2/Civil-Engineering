import { useEffect, useState } from 'react'
import { cn } from 'cn'
import { UserRound } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

import { ProviderMainInfoPanel } from './components/ProviderMainInfoPanel'

type ProfileSection = 'main'

const SECTIONS: Array<{
  id: ProfileSection
  label: string
  description: string
  icon: typeof UserRound
}> = [
  {
    id: 'main',
    label: 'Main info',
    description: 'Account, password, and brand image',
    icon: UserRound,
  },
]

function sectionFromParam(value: string | null): ProfileSection {
  return value === 'main' ? 'main' : 'main'
}

export function ProviderProfilePage() {
  useDocumentTitle('Profile')
  const [searchParams, setSearchParams] = useSearchParams()
  const [section, setSection] = useState<ProfileSection>(() =>
    sectionFromParam(searchParams.get('tab')),
  )

  useEffect(() => {
    setSection(sectionFromParam(searchParams.get('tab')))
  }, [searchParams])

  function selectSection(next: ProfileSection) {
    setSection(next)
    setSearchParams(next === 'main' ? {} : { tab: next }, { replace: true })
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title="Profile"
        description="Manage your account details, password, and brand image."
      />

      <div className="grid min-w-0 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
        <Card size="sm" className="h-fit lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <p className="text-sm text-muted-foreground">Choose a section to edit.</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 p-2 pt-0">
            {SECTIONS.map((item) => {
              const Icon = item.icon
              const isActive = section === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectSection(item.id)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
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
                </button>
              )
            })}
          </CardContent>
        </Card>

        <div className="min-w-0">
          {section === 'main' ? <ProviderMainInfoPanel /> : null}
        </div>
      </div>
    </div>
  )
}
