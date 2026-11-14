import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

type TablePagerProps = {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}

export function TablePager({ page, totalPages, total, onPageChange }: TablePagerProps) {
  const { t } = useTranslation('common')

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground tabular-nums">
        {t('pager.pageOf', { page, totalPages, total })}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {t('previous')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          {t('next')}
        </Button>
      </div>
    </div>
  )
}
