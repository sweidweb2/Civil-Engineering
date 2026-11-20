import type { WkTone } from '@/features/worker/ui/palette'
import { intlLocale } from '@/lib/locale'
import type { ProviderStatus } from '@/services/providers'
import type { ReviewStatus } from '@/services/reviews'
import type { UserStatus } from '@/services/users'

/** Admin status → pill tone (green palette). */
export const USER_TONE: Record<UserStatus, WkTone> = {
  ACTIVE: 'green',
  PENDING: 'amber',
  INACTIVE: 'neutral',
}

export const PROVIDER_TONE: Record<ProviderStatus, WkTone> = {
  APPROVED: 'green',
  PENDING: 'amber',
  SUSPENDED: 'red',
}

export const REVIEW_TONE: Record<ReviewStatus, WkTone> = {
  PENDING: 'amber',
  ACCEPTED: 'green',
  REJECTED: 'red',
}

/** "19 Nov 2026" in the app language (Western digits). */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(intlLocale(), { day: 'numeric', month: 'short', year: 'numeric' })
}
