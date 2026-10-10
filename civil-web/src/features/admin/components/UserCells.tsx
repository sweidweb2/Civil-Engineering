import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from 'cn'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { TableCell } from '@/components/ui/table'

import type { AdminUserRow, UserStatus, VerificationStatus } from '../admin.types'
import { ellipsis } from '../lib/text'
import { roleLabel, userStatusLabel } from '../usersStore'

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

const AVATAR_TONES = [
  'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200',
  'bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-200',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200',
  'bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-200',
  'bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-200',
  'bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-200',
  'bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-200',
  'bg-cyan-100 text-cyan-800 dark:bg-cyan-400/15 dark:text-cyan-200',
  'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-400/15 dark:text-fuchsia-200',
] as const

function avatarTone(seed: string): string {
  let hash = 0
  for (const char of seed) hash = (hash + char.charCodeAt(0)) % AVATAR_TONES.length
  return AVATAR_TONES[hash] ?? AVATAR_TONES[0]
}

function nameInitial(name: string): string {
  const letter = name.trim().charAt(0)
  return letter ? letter.toUpperCase() : '?'
}

function statusText(status: UserStatus): string {
  return userStatusLabel(status)
}

export function StatusBadge({ status }: { status: UserStatus }) {
  return <Badge variant={status === 'ACTIVE' ? 'default' : 'outline'}>{statusText(status)}</Badge>
}

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  return <Badge variant={status === 'verified' ? 'default' : 'outline'}>{status}</Badge>
}

export function UserAttributeCells({
  row,
  showRoleStatus = true,
  showAvatar = false,
  onToggleStatus,
}: {
  row: AdminUserRow
  showRoleStatus?: boolean
  showAvatar?: boolean
  onToggleStatus?: (id: string) => void
}) {
  const label = displayName(row)
  const avatarName = label || row.email

  return (
    <>
      <TableCell title={(showAvatar ? avatarName : label) ?? undefined} className={showAvatar ? 'max-w-56' : 'max-w-36 truncate'}>
        {showAvatar ? (
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                avatarTone(row.id),
              )}
            >
              {nameInitial(avatarName)}
            </span>
            <span className="min-w-0 truncate font-medium">{ellipsis(avatarName, 28)}</span>
          </div>
        ) : (
          ellipsis(label, 22)
        )}
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
            <Badge variant="outline">{roleLabel(row.role)}</Badge>
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
                <span className="text-xs text-muted-foreground">{statusText(row.status)}</span>
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
