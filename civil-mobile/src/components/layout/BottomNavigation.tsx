import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

export type BottomNavItem = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  isActive?: boolean;
  onPress?: () => void;
};

type BottomNavigationProps = {
  items: BottomNavItem[];
  className?: string;
};

/**
 * Domain-agnostic bottom tab chrome.
 * Prefer Expo Router NativeTabs for primary app navigation when available;
 * use this for secondary / feature-local bottom bars.
 */
export function BottomNavigation({ items, className }: BottomNavigationProps) {
  const insets = useSafeAreaInsets();

  return (
    <HStack
      className={`items-stretch justify-around border-t border-border bg-background px-2 pt-2 ${className ?? ''}`}
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
    >
      {items.map((item) => (
        <Pressable
          key={item.key}
          accessibilityRole="button"
          accessibilityState={{ selected: !!item.isActive }}
          className="flex-1 items-center py-1"
          onPress={item.onPress}
        >
          <VStack className="items-center" space="xs">
            {item.icon}
            <Text
              size="xs"
              className={
                item.isActive ? 'text-primary font-medium' : 'text-muted-foreground'
              }
            >
              {item.label}
            </Text>
          </VStack>
        </Pressable>
      ))}
    </HStack>
  );
}
