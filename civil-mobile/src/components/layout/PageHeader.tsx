import React from 'react'

import { Box } from '@/components/ui/box'
import { Heading } from '@/components/ui/heading'
import { HStack } from '@/components/ui/hstack'
import { Text } from '@/components/ui/text'
import { VStack } from '@/components/ui/vstack'

type PageHeaderProps = {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

/**
 * In-screen page / section title block (below the app Header).
 */
export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <HStack className={`mb-4 items-start justify-between ${className ?? ''}`} space="md">
      <VStack className="min-w-0 flex-1" space="xs">
        <Heading size="lg" className="text-foreground">
          {title}
        </Heading>
        {description ? (
          <Text size="sm" className="text-muted-foreground">
            {description}
          </Text>
        ) : null}
      </VStack>
      {action ? <Box className="shrink-0">{action}</Box> : null}
    </HStack>
  )
}

type SectionHeaderProps = {
  title: string
  description?: string
  className?: string
}

/** Lighter section divider title inside a screen. */
export function SectionHeader({ title, description, className }: SectionHeaderProps) {
  return (
    <VStack className={`mb-3 ${className ?? ''}`} space="xs">
      <Heading size="sm" className="text-foreground">
        {title}
      </Heading>
      {description ? (
        <Text size="xs" className="text-muted-foreground">
          {description}
        </Text>
      ) : null}
    </VStack>
  )
}
