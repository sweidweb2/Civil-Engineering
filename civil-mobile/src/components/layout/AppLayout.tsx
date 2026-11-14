import React from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Box } from '@/components/ui/box'

type AppLayoutProps = {
  children: React.ReactNode
  className?: string
  /** When false, skips top safe-area padding (e.g. under a custom header). */
  edges?: {
    top?: boolean
    bottom?: boolean
  }
}

/**
 * Root application chrome: flex fill + safe-area padding.
 * Domain screens compose inside this (or ScreenContainer).
 */
export function AppLayout({
  children,
  className,
  edges = { top: true, bottom: true },
}: AppLayoutProps) {
  const insets = useSafeAreaInsets()

  return (
    <Box
      className={`flex-1 bg-background ${className ?? ''}`}
      style={{
        paddingTop: edges.top === false ? 0 : insets.top,
        paddingBottom: edges.bottom === false ? 0 : insets.bottom,
      }}
    >
      {children}
    </Box>
  )
}
