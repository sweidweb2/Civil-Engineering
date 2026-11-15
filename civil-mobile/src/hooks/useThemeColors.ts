import { useColorScheme } from '@/hooks/use-color-scheme'
import { useThemeStore } from '@/stores/themeStore'
import type { ColorPalette } from '@/theme/colors'
import { colors } from '@/theme/colors'

/** Palette for the active theme (for props that cannot take `className`). */
export function useIsDark(): boolean {
  const mode = useThemeStore((s) => s.mode)
  const system = useColorScheme()
  return (mode === 'system' ? system : mode) === 'dark'
}

export function useThemeColors(): ColorPalette {
  return useIsDark() ? colors.dark : colors.light
}
