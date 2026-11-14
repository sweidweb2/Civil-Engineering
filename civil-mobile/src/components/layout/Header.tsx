import React from 'react'

import { Box } from '@/components/ui/box'
import { Heading } from '@/components/ui/heading'
import { HStack } from '@/components/ui/hstack'
import { Text } from '@/components/ui/text'

type HeaderProps = {
  title: string
  subtitle?: string
  leftSlot?: React.ReactNode
  rightSlot?: React.ReactNode
  className?: string
}

/**
 * App / screen header bar. Keep actions domain-agnostic via slots.
 */
export function Header({ title, subtitle, leftSlot, rightSlot, className }: HeaderProps) {
  return (
    <HStack
      className={`items-center justify-between border-b border-border bg-background px-4 py-3 ${className ?? ''}`}
      space="md"
    >
      <HStack className="min-w-0 flex-1 items-center" space="sm">
        {leftSlot}
        <Box className="min-w-0 flex-1">
          <Heading size="md" className="text-foreground" isTruncated>
            {title}
          </Heading>
          {subtitle ? (
            <Text size="sm" className="text-muted-foreground" isTruncated>
              {subtitle}
            </Text>
          ) : null}
        </Box>
      </HStack>
      {rightSlot ? (
        <HStack className="shrink-0 items-center" space="sm">
          {rightSlot}
        </HStack>
      ) : null}
    </HStack>
  )
}
