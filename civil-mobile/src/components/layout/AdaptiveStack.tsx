import React from 'react'
import { useWindowDimensions } from 'react-native'

import { HStack } from '@/components/ui/hstack'
import { VStack } from '@/components/ui/vstack'

type AdaptiveStackProps = {
  children: React.ReactNode
  /** Width at which layout switches from column → row. */
  breakpoint?: number
  space?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
  className?: string
}

/**
 * Responsive primitive: stacks vertically on narrow screens, horizontally above breakpoint.
 */
export function AdaptiveStack({
  children,
  breakpoint = 768,
  space = 'md',
  className,
}: AdaptiveStackProps) {
  const { width } = useWindowDimensions()
  const isWide = width >= breakpoint

  if (isWide) {
    return (
      <HStack className={className} space={space}>
        {children}
      </HStack>
    )
  }

  return (
    <VStack className={className} space={space}>
      {children}
    </VStack>
  )
}
