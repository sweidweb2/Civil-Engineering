import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { GuestOnly } from '@/components/auth'
import { ContentSkeleton } from '@/components/feedback/skeletons'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'

export function PendingApprovalPage() {
  const { t } = useTranslation(['auth', 'common'])
  useDocumentTitle(t('auth:pendingTitle'))

  return (
    <GuestOnly>
      <div className="home-canvas flex min-h-svh items-center justify-center bg-background px-4 text-foreground">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-5 pt-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">{t('auth:pendingTitle')}</h1>
              <p className="text-sm text-muted-foreground">{t('auth:pendingDescription')}</p>
            </div>

            <div
              className="rounded-xl border border-border bg-muted/30 p-4"
              role="status"
              aria-busy="true"
              aria-label={t('auth:pendingWaiting')}
            >
              <ContentSkeleton />
            </div>

            <p className="text-center text-sm text-muted-foreground">{t('auth:pendingHint')}</p>

            <Link to="/login" className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}>
              {t('auth:backToSignIn')}
            </Link>
          </CardContent>
        </Card>
      </div>
    </GuestOnly>
  )
}
