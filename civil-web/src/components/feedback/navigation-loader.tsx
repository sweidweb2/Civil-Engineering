import { useEffect, useLayoutEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { LoaderGrid } from '@/components/ui/loader-grid'

function isInternalAppLink(anchor: HTMLAnchorElement, currentPath: string, currentSearch: string) {
  if (anchor.target === '_blank' || anchor.hasAttribute('download')) return false
  const href = anchor.getAttribute('href')
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return false
  }
  let url: URL
  try {
    url = new URL(href, window.location.origin)
  } catch {
    return false
  }
  if (url.origin !== window.location.origin) return false
  if (url.pathname === currentPath && url.search === currentSearch) return false
  return true
}

/**
 * Route-transition overlay. Shows on internal navigation start; hides as soon as
 * the new location commits (min display 0ms — may not appear on instant loads).
 */
export function NavigationLoader() {
  const location = useLocation()
  const [active, setActive] = useState(false)

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = (event.target as Element | null)?.closest?.('a')
      if (!(anchor instanceof HTMLAnchorElement)) return
      if (!isInternalAppLink(anchor, location.pathname, location.search)) return
      setActive(true)
    }

    const onPopState = () => setActive(true)

    document.addEventListener('click', onClick, true)
    window.addEventListener('popstate', onPopState)
    return () => {
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('popstate', onPopState)
    }
  }, [location.pathname, location.search])

  useLayoutEffect(() => {
    setActive(false)
  }, [location.key])

  if (!active) return null

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center bg-background/40"
      aria-live="polite"
      aria-busy="true"
    >
      <LoaderGrid />
    </div>
  )
}
