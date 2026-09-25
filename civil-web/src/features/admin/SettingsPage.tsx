import { useState } from 'react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function SettingsPage() {
  useDocumentTitle('Platform settings')
  const [underMaintenance, setUnderMaintenance] = useState(false)
  const [allowNotifications, setAllowNotifications] = useState(true)

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title="Settings"
        description="Platform-wide switches. UI only for now."
      />

      <Card size="sm">
        <CardHeader>
          <CardTitle>Platform</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="maintenance">Under maintenance</Label>
            <Switch
              id="maintenance"
              checked={underMaintenance}
              onCheckedChange={(checked) => {
                setUnderMaintenance(checked)
                toast.message(checked ? 'Maintenance on (UI only)' : 'Maintenance off (UI only)')
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="notifications">Allow notifications</Label>
            <Switch
              id="notifications"
              checked={allowNotifications}
              onCheckedChange={(checked) => {
                setAllowNotifications(checked)
                toast.message(
                  checked ? 'Notifications allowed (UI only)' : 'Notifications blocked (UI only)',
                )
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
