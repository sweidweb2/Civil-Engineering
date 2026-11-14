import { Separator } from '@/components/ui/separator'

import { StoreDownloadButton } from './public-home-shared'

const footerLinks = [
  { href: '#principles', label: 'Civil engineering principles' },
  { href: '#delivers', label: 'What this app delivers' },
  { href: '#why', label: 'Why our app' },
  { href: '#unified', label: 'From fragmented data into unified data' },
] as const

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-background text-foreground">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] lg:px-8">
        <div>
          <p className="text-sm font-semibold tracking-tight">Civil Engineering</p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            A workspace for civil projects, costs, providers, and workers. The app does not take
            orders, payments, or hires.
          </p>
        </div>
        <nav aria-label="On this page">
          <p className="text-sm font-semibold tracking-tight">On this page</p>
          <ul className="mt-3 flex flex-col gap-2">
            {footerLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="text-sm font-semibold tracking-tight">Get the app</p>
          <div className="mt-3 flex flex-col items-start gap-3">
            <StoreDownloadButton store="apple" />
            <StoreDownloadButton store="play" />
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6 lg:px-8">
        <Separator />
        <p className="pt-6 text-xs text-muted-foreground">Civil engineering, kept in one record.</p>
      </div>
    </footer>
  )
}
