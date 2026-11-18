'use client'
import React from 'react'
import { AccessibilityInfo, Text, View } from 'react-native'
import { createToastHook } from '@gluestack-ui/core/toast/creator'
import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils'
import { tva, withStyleContext } from '@gluestack-ui/utils/nativewind-utils'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { withUniwind } from 'uniwind'
const useToast = createToastHook(View)
const SCOPE = 'TOAST'
const AnimatedView = Animated.createAnimatedComponent(View)
const StyledAnimatedView = withUniwind(AnimatedView)
/* Toast (section 6.17): inverse surface, radius 14, no shadow, above the tab bar. */
const toastStyle = tva({
  base: 'mx-5 mb-24 gap-0.5 rounded-md bg-inverse px-4 py-3.5 web:pointer-events-auto',
  variants: {
    action: { error: '', warning: '', success: '', info: '', muted: '' },
    variant: { solid: '', outline: '' },
  },
})

const toastTitleStyle = tva({
  base: 'font-medium text-on-inverse',
  variants: {
    isTruncated: {
      true: '',
    },
    bold: {
      true: 'font-bold',
    },
    underline: {
      true: 'underline',
    },
    strikeThrough: {
      true: 'line-through',
    },
    size: {
      '2xs': 'text-2xs',
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl',
      '3xl': 'text-3xl',
      '4xl': 'text-4xl',
      '5xl': 'text-5xl',
      '6xl': 'text-6xl',
    },
  },
})

const toastDescriptionStyle = tva({
  base: 'font-normal text-on-inverse-muted',
  variants: {
    isTruncated: {
      true: '',
    },
    bold: {
      true: 'font-bold',
    },
    underline: {
      true: 'underline',
    },
    strikeThrough: {
      true: 'line-through',
    },
    size: {
      '2xs': 'text-2xs',
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl',
      '3xl': 'text-3xl',
      '4xl': 'text-4xl',
      '5xl': 'text-5xl',
      '6xl': 'text-6xl',
    },
  },
})

const Root = withStyleContext(StyledAnimatedView, SCOPE)
type IToastProps = React.ComponentProps<typeof Root> & {
  className?: string
} & VariantProps<typeof toastStyle>

const Toast = React.forwardRef<React.ComponentRef<typeof Root>, IToastProps>(function Toast(
  { className, variant = 'solid', action = 'muted', ...props },
  ref,
) {
  return (
    <Root
      ref={ref}
      entering={FadeInDown.duration(220)}
      className={toastStyle({ variant, action, class: className })}
      context={{ variant, action }}
      {...props}
    />
  )
})

type IToastTitleProps = React.ComponentProps<typeof Text> & {
  className?: string
} & VariantProps<typeof toastTitleStyle>

const ToastTitle = React.forwardRef<React.ComponentRef<typeof Text>, IToastTitleProps>(
  function ToastTitle({ className, size = 'md', children, ...props }, ref) {
    React.useEffect(() => {
      // Issue from react-native side
      // Hack for now, will fix this later
      AccessibilityInfo.announceForAccessibility(children as string)
    }, [children])

    return (
      <Text
        {...props}
        ref={ref}
        aria-live="assertive"
        aria-atomic="true"
        role="alert"
        className={toastTitleStyle({ size, class: className })}
      >
        {children}
      </Text>
    )
  },
)

type IToastDescriptionProps = React.ComponentProps<typeof Text> & {
  className?: string
} & VariantProps<typeof toastDescriptionStyle>

const ToastDescription = React.forwardRef<React.ComponentRef<typeof Text>, IToastDescriptionProps>(
  function ToastDescription({ className, size = 'md', ...props }, ref) {
    return (
      <Text ref={ref} {...props} className={toastDescriptionStyle({ size, class: className })} />
    )
  },
)

Toast.displayName = 'Toast'
ToastTitle.displayName = 'ToastTitle'
ToastDescription.displayName = 'ToastDescription'

export { Toast, ToastDescription, ToastTitle, useToast }
