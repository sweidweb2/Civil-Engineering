import { Copy } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { TableCell } from '@/components/ui/table'

import type { AdminUserRow, UserStatus, VerificationStatus } from '../admin.types'
import { ellipsis } from '../lib/text'

async function copyValue(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.message(`${label} copied`)
  } catch {
    toast.error(`Could not copy ${label.toLowerCase()}`)
  }
}

function CopyButton({ value, label }: { value: string; label: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={`Copy ${label}`}
      className="shrink-0 text-muted-foreground"
      onClick={(event) => {
        event.stopPropagation()
        void copyValue(value, label)
      }}
    >
      <Copy />
    </Button>
  )
}

function displayName(row: AdminUserRow): string | null {
  return (
    row.profile.displayName ||
    [row.profile.firstName, row.profile.lastName].filter(Boolean).join(' ') ||
    null
  )
}

export function StatusBadge({ status }: { status: UserStatus }) {
  return <Badge variant={status === 'ACTIVE' ? 'default' : 'outline'}>{status}</Badge>
}

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  return <Badge variant={status === 'verified' ? 'default' : 'outline'}>{status}</Badge>
}

export function UserAttributeCells({
  row,
  showRoleStatus = true,
  onToggleStatus,
}: {
  row: AdminUserRow
  showRoleStatus?: boolean
  onToggleStatus?: (id: string) => void
}) {
  const name = displayName(row)

  return (
    <>
      <TableCell title={name ?? undefined} className="max-w-36 truncate">
        {ellipsis(name, 22)}
      </TableCell>
      <TableCell title={row.email} className="max-w-52">
        <div className="flex min-w-0 items-center gap-1">
          <span className="min-w-0 truncate">{ellipsis(row.email, 24)}</span>
          <CopyButton value={row.email} label="Email" />
        </div>
      </TableCell>
      <TableCell title={row.profile.phone ?? undefined} className="max-w-36">
        <div className="flex min-w-0 items-center gap-1">
          <span className="min-w-0 truncate">{ellipsis(row.profile.phone, 16)}</span>
          {row.profile.phone ? <CopyButton value={row.profile.phone} label="Phone" /> : null}
        </div>
      </TableCell>
      {showRoleStatus ? (
        <>
          <TableCell>
            <Badge variant="outline">{row.role}</Badge>
          </TableCell>
          <TableCell>
            {onToggleStatus ? (
              <div
                className="flex items-center gap-2"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <Switch
                  size="sm"
                  checked={row.status === 'ACTIVE'}
                  aria-label={`${row.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} ${row.email}`}
                  onCheckedChange={() => onToggleStatus(row.id)}
                />
                <span className="text-xs text-muted-foreground">
                  {row.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                </span>
              </div>
            ) : (
              <StatusBadge status={row.status} />
            )}
          </TableCell>
        </>
      ) : null}
    </>
  )
}

export const USER_TABLE_HEADERS = ['Name', 'Email', 'Phone', 'Role', 'Status'] as const
export const WORKER_TABLE_HEADERS = ['Name', 'Email', 'Phone'] as const
