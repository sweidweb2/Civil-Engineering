import React from 'react'
import { ScrollView, type ScrollViewProps } from 'react-native'

import { Box } from '@/components/ui/box'

type ScreenContainerProps = {
  children: React.ReactNode
  className?: string
  contentClassName?: string
  /** When true, wraps children in a ScrollView. */
  scroll?: boolean
  scrollProps?: Omit<ScrollViewProps, 'children' | 'contentContainerStyle'>
}

/**
 * Standard screen body with horizontal padding.
 * Prefer this over raw Views for feature screens.
 */
export function ScreenContainer({
  children,
  className,
  contentClassName,
  scroll = false,
  scrollProps,
}: ScreenContainerProps) {
  if (scroll) {
    return (
      <ScrollView
        className={`flex-1 bg-background ${className ?? ''}`}
        keyboardShouldPersistTaps="handled"
        {...scrollProps}
      >
        <Box className={`px-4 py-4 ${contentClassName ?? ''}`}>{children}</Box>
      </ScrollView>
    )
  }

  return (
    <Box className={`flex-1 bg-background px-4 py-4 ${className ?? ''} ${contentClassName ?? ''}`}>
      {children}
    </Box>
  )
}
