import { Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Input } from '@/components/ui/input'

import type { PanelNavItem } from './PanelShell'

type PortalPageSearchProps = {
  nav: PanelNavItem[]
}

export function PortalPageSearch({ nav }: PortalPageSearchProps) {
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return nav
    return nav.filter((item) => item.label.toLowerCase().includes(q))
  }, [nav, query])

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  function goTo(item: PanelNavItem) {
    navigate(item.to)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative w-full min-w-0">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && matches[0]) {
            event.preventDefault()
            goTo(matches[0])
          }
          if (event.key === 'Escape') {
            setOpen(false)
          }
        }}
        placeholder="Search pages…"
        aria-label="Search portal pages"
        aria-expanded={open}
        aria-controls="portal-page-search-results"
        className="bg-muted pl-8"
      />
      {open ? (
        <ul
          id="portal-page-search-results"
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg bg-popover p-1 text-sm shadow-md ring-1 ring-foreground/10"
        >
          {matches.length === 0 ? (
            <li className="px-2 py-1.5 text-muted-foreground">No pages match.</li>
          ) : (
            matches.map((item) => (
              <li key={item.to}>
                <button
                  type="button"
                  role="option"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted"
                  onClick={() => goTo(item)}
                >
                  <item.icon className="size-3.5 shrink-0 text-primary" />
                  <span className="truncate">{item.label}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  )
}
