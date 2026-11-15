import { useColorScheme } from '@/hooks/use-color-scheme'
import type { ColorPalette } from '@/theme/colors'
import { colors } from '@/theme/colors'

/** Palette for the active color scheme (for props that cannot take `className`). */
export function useThemeColors(): ColorPalette {
  return useColorScheme() === 'dark' ? colors.dark : colors.light
}
