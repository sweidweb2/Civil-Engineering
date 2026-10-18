import { useDocumentTitle } from '@/hooks/useDocumentTitle'

import { CtaSection } from './components/CtaSection'
import { DeliversSection } from './components/DeliversSection'
import { PrinciplesSection } from './components/PrinciplesSection'
import { PublicFooter } from './components/PublicFooter'
import { PublicHeader } from './components/PublicHeader'
import { PublicHero } from './components/PublicHero'
import { UnifiedSection } from './components/UnifiedSection'
import { WhySection } from './components/WhySection'

export function PublicHomePage() {
  useDocumentTitle('Civil Engineering')

  return (
    <div className="home-canvas min-h-svh bg-background text-foreground">
      <PublicHeader />
      <main>
        <PublicHero />
        <PrinciplesSection />
        <DeliversSection />
        <WhySection />
        <UnifiedSection />
        <CtaSection />
      </main>
      <PublicFooter />
    </div>
  )
}
