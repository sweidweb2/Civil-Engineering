import { useEffect, useState } from 'react'
import { FileText, ListOrdered, UserRound } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { cn } from 'cn'

import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { ManageStepsPage } from '@/features/admin/ManageStepsPage'

import { PmProfileAdditionalPanel } from './components/PmProfileAdditionalPanel'
import { PmProfileGeneralPanel } from './components/PmProfileGeneralPanel'

type SettingsSection = 'profile' | 'steps'

const SECTIONS: Array<{
  id: SettingsSection
  label: string
  description: string
  icon: typeof UserRound
}> = [
  {
    id: 'profile',
    label: 'Profile',
    description: 'Account and professional details',
    icon: UserRound,
  },
  {
    id: 'steps',
    label: 'Steps',
    description: 'Templates assigned to new projects',
    icon: ListOrdered,
  },
]

function sectionFromParam(value: string | null): SettingsSection {
  return value === 'steps' ? 'steps' : 'profile'
}

export function PmSettingsPage() {
  useDocumentTitle('Settings')
  const [searchParams, setSearchParams] = useSearchParams()
  const [section, setSection] = useState<SettingsSection>(() =>
    sectionFromParam(searchParams.get('tab')),
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
      <PageHeader
        className="mb-0"
        title="Settings"
        description="Manage your profile and project step templates."
      />

      <div className="grid min-w-0 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
        <Card size="sm" className="h-fit lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle>Settings</CardTitle>
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
          {section === 'profile' ? (
            <Tabs defaultValue="general" className="min-w-0 gap-4">
              <TabsList>
                <TabsTrigger value="general">
                  <UserRound className="size-3.5" />
                  General
                </TabsTrigger>
                <TabsTrigger value="additional">
                  <FileText className="size-3.5" />
                  Additional info
                </TabsTrigger>
              </TabsList>
              <TabsContent value="general" className="min-w-0">
                <PmProfileGeneralPanel />
              </TabsContent>
              <TabsContent value="additional" className="min-w-0">
                <PmProfileAdditionalPanel />
              </TabsContent>
            </Tabs>
          ) : null}
          {section === 'steps' ? <ManageStepsPage embedded /> : null}
        </div>
      </div>
    </div>
  )
}
