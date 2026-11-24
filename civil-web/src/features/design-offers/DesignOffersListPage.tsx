import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { PageHeader } from '@/components/layout'
import { buttonVariants } from '@/components/ui/button'
import { DesignOffersGrid } from '@/features/design-offers/DesignOffersGrid'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'

export function DesignOffersListPage() {
  const { t } = useTranslation(['designOffers', 'common'])
  useDocumentTitle(t('designOffers:documentTitle'))

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('designOffers:title')}
        description={t('designOffers:description')}
        actions={
          <Link
            to="/admin/design-offers/new"
            className={cn(buttonVariants(), 'inline-flex items-center gap-2')}
          >
            <Plus className="size-4" />
            {t('designOffers:newOffer')}
          </Link>
        }
      />
      <DesignOffersGrid mode="admin" />
    </div>
  )
}
