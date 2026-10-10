import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function SettingsPage() {
  useDocumentTitle('Platform settings')

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title="Settings"
        description="Super admin only."
      />

      <Card size="sm">
        <CardHeader>
          <CardTitle>Platform</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Maintenance mode and notification delivery are not connected yet. This page does not change the live platform.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
