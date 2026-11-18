'use client'
import React from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { createButton } from '@gluestack-ui/core/button/creator'
import { UIIcon } from '@gluestack-ui/core/icon/creator'
import {
  tva,
  useStyleContext,
  type VariantProps,
  withStyleContext,
} from '@gluestack-ui/utils/nativewind-utils'
import { withUniwind } from 'uniwind'
const SCOPE = 'BUTTON'
const Root = withStyleContext(Pressable, SCOPE)
const StyledUIIcon = withUniwind(UIIcon)
const UIButton = createButton({
  Root: Root,
  Text,
  Group: View,
  Spinner: ActivityIndicator,
  Icon: StyledUIIcon,
})
/*
 * Design-system buttons (section 6.11):
 *   default     = Primary: accent fill, 54 tall, radius 16. Max one per screen.
 *   outline     = Secondary: surface + 1px line, ink text.
 *   secondary   = alias of Secondary.
 *   destructive = Secondary anatomy with negative text (confirm in a sheet).
 *   ghost/link  = Text button: 44 tall, no fill, ink text.
 * Pressed: accent darkens / surface takes the `bg` tone. Disabled: 40%.
 */
const buttonStyle = tva({
  base: 'flex-row items-center justify-center gap-2 data-[focus-visible=true]:web:outline-none data-[focus-visible=true]:web:ring-2 data-[focus-visible=true]:web:ring-ring data-[disabled=true]:opacity-40',
  variants: {
    variant: {
      default: 'rounded-lg bg-primary data-[active=true]:opacity-90',
      destructive: 'rounded-lg border border-border bg-card data-[active=true]:bg-background',
      outline: 'rounded-lg border border-border bg-card data-[active=true]:bg-background',
      secondary: 'rounded-lg border border-border bg-card data-[active=true]:bg-background',
      ghost: 'rounded-md data-[active=true]:bg-muted',
      link: 'rounded-md data-[active=true]:opacity-60',
    },
    size: {
      default: 'min-h-[54px] px-5',
      sm: 'min-h-11 rounded-md px-4',
      lg: 'min-h-[54px] px-6',
      icon: 'min-h-11 min-w-11 rounded-full',
    },
  },
})
const buttonTextStyle = tva({
  base: 'web:select-none text-center',
  parentVariants: {
    variant: {
      default: 'text-primary-foreground',
      destructive: 'text-destructive',
      outline: 'text-foreground',
      secondary: 'text-foreground',
      ghost: 'text-foreground',
      link: 'text-foreground',
    },
    size: {
      default: 'text-lg font-semibold',
      sm: 'text-sm font-medium',
      lg: 'text-lg font-semibold',
      icon: 'text-sm font-medium',
    },
  },
  parentCompoundVariants: [
    { variant: 'outline', size: 'default', class: 'font-medium' },
    { variant: 'secondary', size: 'default', class: 'font-medium' },
    { variant: 'destructive', size: 'default', class: 'font-medium' },
    { variant: 'ghost', size: 'default', class: 'text-base font-medium' },
    { variant: 'link', size: 'default', class: 'text-base font-medium' },
  ],
})

const buttonSpinnerStyle = tva({
  base: '',
  parentVariants: {
    size: {
      default: 'h-4 w-4',
      sm: 'h-3 w-3',
      lg: 'h-5 w-5',
      icon: 'h-4 w-4',
    },
  },
})

const buttonIconStyle = tva({
  base: 'fill-none pointer-events-none shrink-0',
  parentVariants: {
    variant: {
      default: 'text-primary-foreground',
      destructive: 'text-destructive',
      outline: 'text-foreground',
      secondary: 'text-foreground',
      ghost: 'text-foreground',
      link: 'text-foreground',
    },
    size: {
      default: 'h-5 w-5',
      sm: 'h-[18px] w-[18px]',
      lg: 'h-5 w-5',
      icon: 'h-5 w-5',
    },
  },
})
const buttonGroupStyle = tva({
  base: '',
  variants: {
    space: {
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-3',
      lg: 'gap-4',
      xl: 'gap-5',
      '2xl': 'gap-6',
      '3xl': 'gap-7',
      '4xl': 'gap-8',
    },
    isAttached: {
      true: 'gap-0',
    },
    flexDirection: {
      row: 'flex-row',
      column: 'flex-col',
      'row-reverse': 'flex-row-reverse',
      'column-reverse': 'flex-col-reverse',
    },
  },
})
type IButtonProps = Omit<React.ComponentPropsWithoutRef<typeof UIButton>, 'context'> &
  VariantProps<typeof buttonStyle> & { className?: string }
const Button = React.forwardRef<React.ElementRef<typeof UIButton>, IButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <UIButton
        ref={ref}
        {...props}
        className={buttonStyle({ variant, size, class: className })}
        context={{ variant, size }}
      />
    )
  },
)
type IButtonTextProps = React.ComponentPropsWithoutRef<typeof UIButton.Text> &
  VariantProps<typeof buttonTextStyle> & { className?: string }
const ButtonText = React.forwardRef<React.ElementRef<typeof UIButton.Text>, IButtonTextProps>(
  ({ className, size, ...props }, ref) => {
    const { size: parentSize, variant: parentVariant } = useStyleContext(SCOPE)
    return (
      <UIButton.Text
        ref={ref}
        {...props}
        className={buttonTextStyle({
          parentVariants: {
            size: parentSize,
            variant: parentVariant,
          },
          size,
          class: className,
        })}
      />
    )
  },
)
const ButtonSpinner = React.forwardRef<
  React.ElementRef<typeof UIButton.Spinner>,
  React.ComponentPropsWithoutRef<typeof UIButton.Spinner>
>(({ className, ...props }, ref) => {
  const { size: parentSize } = useStyleContext(SCOPE)
  return (
    <UIButton.Spinner
      ref={ref}
      {...props}
      className={buttonSpinnerStyle({ parentVariants: { size: parentSize }, class: className })}
    />
  )
})
type IButtonIcon = React.ComponentPropsWithoutRef<typeof UIButton.Icon> &
  VariantProps<typeof buttonIconStyle> & {
    className?: string | undefined
    as?: React.ElementType
    height?: number
    width?: number
  }
const ButtonIcon = React.forwardRef<React.ElementRef<typeof UIButton.Icon>, IButtonIcon>(
  ({ className, size, ...props }, ref) => {
    const { size: parentSize, variant: parentVariant } = useStyleContext(SCOPE)
    if (typeof size === 'number') {
      return (
        <UIButton.Icon
          ref={ref}
          {...props}
          className={buttonIconStyle({ class: className })}
          size={size}
        />
      )
    } else if ((props.height !== undefined || props.width !== undefined) && size === undefined) {
      return (
        <UIButton.Icon ref={ref} {...props} className={buttonIconStyle({ class: className })} />
      )
    }
    return (
      <UIButton.Icon
        {...props}
        className={buttonIconStyle({
          parentVariants: {
            size: parentSize,
            variant: parentVariant,
          },
          size,
          class: className,
        })}
        ref={ref}
      />
    )
  },
)
type IButtonGroupProps = React.ComponentPropsWithoutRef<typeof UIButton.Group> &
  VariantProps<typeof buttonGroupStyle>
const ButtonGroup = React.forwardRef<React.ElementRef<typeof UIButton.Group>, IButtonGroupProps>(
  ({ className, space = 'md', isAttached = false, flexDirection = 'column', ...props }, ref) => {
    return (
      <UIButton.Group
        className={buttonGroupStyle({
          class: className,
          space,
          isAttached,
          flexDirection,
        })}
        {...props}
        ref={ref}
      />
    )
  },
)
Button.displayName = 'Button'
ButtonText.displayName = 'ButtonText'
ButtonSpinner.displayName = 'ButtonSpinner'
ButtonIcon.displayName = 'ButtonIcon'
ButtonGroup.displayName = 'ButtonGroup'
export { Button, ButtonGroup, ButtonIcon, ButtonSpinner, ButtonText }
