import React from 'react'

import {
  FormControl,
  FormControlError,
  FormControlErrorIcon,
  FormControlErrorText,
  FormControlHelper,
  FormControlHelperText,
  FormControlLabel,
  FormControlLabelAstrick,
  FormControlLabelText,
} from '@/components/ui/form-control'
import { AlertCircleIcon } from '@/components/ui/icon'

type FormFieldProps = {
  label?: string
  helperText?: string
  errorText?: string
  isRequired?: boolean
  isInvalid?: boolean
  isDisabled?: boolean
  isReadOnly?: boolean
  children: React.ReactNode
  className?: string
}

/**
 * Thin FormControl composition for labeled fields.
 * Use gluestack Input / Select / Textarea / etc. as children.
 */
export function FormField({
  label,
  helperText,
  errorText,
  isRequired,
  isInvalid,
  isDisabled,
  isReadOnly,
  children,
  className,
}: FormFieldProps) {
  const showError = Boolean(isInvalid && errorText)

  return (
    <FormControl
      className={className}
      isRequired={isRequired}
      isInvalid={isInvalid}
      isDisabled={isDisabled}
      isReadOnly={isReadOnly}
    >
      {label ? (
        <FormControlLabel>
          <FormControlLabelText>{label}</FormControlLabelText>
          {isRequired ? <FormControlLabelAstrick /> : null}
        </FormControlLabel>
      ) : null}

      {children}

      {showError ? (
        <FormControlError>
          <FormControlErrorIcon as={AlertCircleIcon} />
          <FormControlErrorText>{errorText}</FormControlErrorText>
        </FormControlError>
      ) : helperText ? (
        <FormControlHelper>
          <FormControlHelperText>{helperText}</FormControlHelperText>
        </FormControlHelper>
      ) : null}
    </FormControl>
  )
}

export {
  FormControl,
  FormControlError,
  FormControlErrorIcon,
  FormControlErrorText,
  FormControlHelper,
  FormControlHelperText,
  FormControlLabel,
  FormControlLabelAstrick,
  FormControlLabelText,
}
