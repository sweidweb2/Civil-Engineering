import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function DirectoryPage() {
  useDocumentTitle('Directory')

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title="Directory"
        description="Materials, equipment, and workers."
      />
      <Card size="sm" className="min-w-0">
        <CardContent>
          <p className="text-sm text-muted-foreground">No directory items yet.</p>
        </CardContent>
      </Card>
    </div>
  )
}
