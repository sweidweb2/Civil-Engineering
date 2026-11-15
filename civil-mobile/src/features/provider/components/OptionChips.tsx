import { Text, View } from 'react-native'

import { Pressable } from '@/components/ui/pressable'

export type OptionChip = {
  value: string
  label: string
}

type OptionChipsProps = {
  options: OptionChip[]
  value: string
  onChange: (value: string) => void
  allowClear?: boolean
}

export function OptionChips({ options, value, onChange, allowClear = false }: OptionChipsProps) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {allowClear ? (
        <Pressable
          accessibilityRole="button"
          className={`rounded-md border px-3 py-2 ${
            value === '' ? 'border-primary bg-primary/10' : 'border-border bg-background'
          }`}
          onPress={() => onChange('')}
        >
          <Text
            className={`text-sm ${value === '' ? 'font-medium text-primary' : 'text-foreground'}`}
          >
            None
          </Text>
        </Pressable>
      ) : null}
      {options.map((option) => {
        const active = option.value === value
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className={`rounded-md border px-3 py-2 ${
              active ? 'border-primary bg-primary/10' : 'border-border bg-background'
            }`}
            onPress={() => onChange(option.value)}
          >
            <Text className={`text-sm ${active ? 'font-medium text-primary' : 'text-foreground'}`}>
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
