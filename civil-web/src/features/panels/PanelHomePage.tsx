import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useAuthStore } from '@/stores/authStore'

type PanelHomeProps = {
  title: string
  description: string
}

export function PanelHomePage({ title, description }: PanelHomeProps) {
  useDocumentTitle(title)
  const user = useAuthStore((s) => s.user)

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader className="mb-0" title={title} description={description} />
      {user ? (
        <Card size="sm" className="min-w-0">
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{user.email}</span> (
              {user.role})
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
