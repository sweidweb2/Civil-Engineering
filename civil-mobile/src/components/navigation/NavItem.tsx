import React from 'react'

import { HStack } from '@/components/ui/hstack'
import { Pressable } from '@/components/ui/pressable'
import { Text } from '@/components/ui/text'

type NavItemProps = {
  label: string
  icon?: React.ReactNode
  isActive?: boolean
  onPress?: () => void
  className?: string
}

/**
 * Domain-agnostic nav row / link chrome.
 * Wire routing (Expo Router) at the call site.
 */
export function NavItem({ label, icon, isActive, onPress, className }: NavItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!isActive }}
      className={`rounded-md px-3 py-2 ${isActive ? 'bg-accent' : ''} ${className ?? ''}`}
      onPress={onPress}
    >
      <HStack className="items-center" space="sm">
        {icon}
        <Text className={isActive ? 'text-accent-foreground font-medium' : 'text-foreground'}>
          {label}
        </Text>
      </HStack>
    </Pressable>
  )
}
