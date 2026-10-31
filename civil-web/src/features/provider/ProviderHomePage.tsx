import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { buttonVariants } from '@/components/ui/button'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

import { ProviderFocusSection } from './ProviderFocusSection'

/** Light mint matches the hero SVG canvas; dark uses the theme background. */
const PROVIDER_HOME_BG = 'bg-[#f7fbf9] dark:bg-background'

export function ProviderHomePage() {
  const { t } = useTranslation(['provider', 'common'])
  useDocumentTitle(t('provider:home.documentTitle'))
  const user = useAuthStore((state) => state.user)
  const displayName =
    user?.profile?.displayName ||
    [user?.profile?.firstName, user?.profile?.lastName].filter(Boolean).join(' ') ||
    user?.email ||
    t('provider:home.fallbackName')
  const firstName = displayName.split(' ')[0]

  return (
    <div
      className={cn(
        'relative -mx-4 -mt-6 flex min-h-[calc(100svh-3.5rem)] min-w-0 flex-col pb-6 sm:-mx-6 sm:min-h-[calc(100svh-4rem)] lg:-mx-8',
        PROVIDER_HOME_BG,
      )}
    >
      <section
        aria-labelledby="provider-hero-title"
        className="relative flex min-h-[32rem] flex-col items-stretch overflow-hidden lg:min-h-[36rem] lg:flex-row lg:items-center"
      >
        <div className="relative z-10 flex w-full max-w-2xl shrink-0 flex-col justify-center gap-5 px-4 py-12 sm:px-6 lg:ms-[7%] lg:max-w-xl lg:px-8 xl:max-w-2xl">
          <p className="text-sm font-medium tracking-[0.14em] text-primary uppercase">
            {t('provider:home.eyebrow')}
          </p>
          <h1
            id="provider-hero-title"
            className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
          >
            {t('provider:home.heroTitle', { name: firstName })}
          </h1>
          <p className="max-w-lg text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            {t('provider:home.heroBody')}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/provider/listings" className={cn(buttonVariants({ size: 'lg' }))}>
              {t('provider:home.manageListings')}
            </Link>
            <Link
              to="/provider/analytics"
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
            >
              {t('provider:home.viewAnalytics')}
            </Link>
          </div>
          {user ? (
            <p className="pt-2 text-base text-muted-foreground">
              <Trans
                i18nKey="common:signedInAs"
                values={{ email: user.email }}
                components={{ strong: <span className="font-medium text-foreground" /> }}
              />
            </p>
          ) : null}
        </div>

        <img
          data-theme-asset="light"
          src="/illustrations/minimal-green-dashboard.svg"
          alt=""
          aria-hidden
          className="mx-auto mt-2 mb-8 h-auto w-[min(100%,26rem)] object-contain px-4 lg:absolute lg:end-0 lg:top-0 lg:bottom-auto lg:mx-0 lg:my-0 lg:mb-0 lg:mt-0 lg:h-[115%] lg:w-auto lg:max-w-[78%] lg:origin-top-right lg:scale-110 lg:object-contain lg:object-right-top lg:pe-0"
        />
        <img
          data-theme-asset="dark"
          src="/illustrations/minimal-green-dashboard-dark.jpg?v=1"
          alt=""
          aria-hidden
          className="mx-auto mt-2 mb-8 h-auto w-[min(100%,26rem)] object-contain px-4 lg:absolute lg:end-0 lg:top-0 lg:bottom-auto lg:mx-0 lg:my-0 lg:mb-0 lg:mt-0 lg:h-[115%] lg:w-auto lg:max-w-[78%] lg:origin-top-right lg:scale-110 lg:object-contain lg:object-right-top lg:pe-0"
        />
      </section>

      <div className="px-4 pt-0 sm:px-6 lg:px-8">
        <ProviderFocusSection />
      </div>
    </div>
  )
}
