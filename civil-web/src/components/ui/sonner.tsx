import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
  XIcon,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import type { CSSProperties } from 'react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

import { useIsRtl } from '@/stores/localeStore'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'light' } = useTheme()
  const isRtl = useIsRtl()
  const sonnerTheme: ToasterProps['theme'] = theme === 'dark' ? 'dark' : 'light'

  return (
    <Sonner
      theme={sonnerTheme}
      dir={isRtl ? 'rtl' : 'ltr'}
      className="toaster group"
      closeButton
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
        close: <XIcon className="size-3.5" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as CSSProperties
      }
      toastOptions={{
        closeButton: true,
        closeButtonAriaLabel: 'Dismiss notification',
        classNames: {
          toast: 'cn-toast border-s-4',
          success: '!border-s-success',
          error: '!border-s-destructive',
          warning: '!border-s-warning',
          info: '!border-s-info',
          closeButton:
            'border-border bg-background text-foreground hover:bg-muted hover:text-foreground',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
