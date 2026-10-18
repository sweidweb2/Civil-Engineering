import { useSearchParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

import { RegistrationQueue } from './RegistrationApprovalsPage'
import { VerificationQueue } from './WorkerVerificationPage'

const VIEWS = [
  { value: 'registrations', label: 'Registrations' },
  { value: 'verification', label: 'Verification' },
] as const

type QueueView = (typeof VIEWS)[number]['value']

function queueView(value: string | null): QueueView {
  return value === 'verification' ? 'verification' : 'registrations'
}

export function UserQueuePage() {
  useDocumentTitle('User queue')
  const [params, setParams] = useSearchParams()
  const view = queueView(params.get('view'))

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title="User queue"
        description="Approve project managers, providers, and workers, then move workers through marketplace verification."
      />

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
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {view === 'verification' ? <VerificationQueue /> : <RegistrationQueue />}
    </div>
  )
}
