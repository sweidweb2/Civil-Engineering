import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

import { RegistrationQueue } from './RegistrationApprovalsPage'
import { VerificationQueue } from './WorkerVerificationPage'

const VIEWS = [
  { value: 'registrations', labelKey: 'queue.registrations' },
  { value: 'verification', labelKey: 'queue.verification' },
] as const

type QueueView = (typeof VIEWS)[number]['value']

function queueView(value: string | null): QueueView {
  return value === 'verification' ? 'verification' : 'registrations'
}

export function UserQueuePage() {
  const { t } = useTranslation('admin')
  useDocumentTitle(t('queue.title'))
  const [params, setParams] = useSearchParams()
  const view = queueView(params.get('view'))

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader className="mb-0" title={t('queue.title')} description={t('queue.description')} />

      <Tabs
        value={view}
        onValueChange={(value) => {
          if (value !== 'registrations' && value !== 'verification') return
          setParams(value === 'verification' ? { view: 'verification' } : {}, { replace: true })
        }}
      >
        <TabsList>
          {VIEWS.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {t(item.labelKey)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {view === 'verification' ? <VerificationQueue /> : <RegistrationQueue />}
    </div>
  )
}
