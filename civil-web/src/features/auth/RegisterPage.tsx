import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { GuestOnly } from '@/components/auth'
import { Form } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { type FieldErrors, parseForm } from '@/lib/form'
import { cn } from '@/lib/utils'
import type { RegisterRole } from '@/services/auth'
import { toastApiError } from '@/services/toast'
import { useAuthStore } from '@/stores/authStore'

import { registerSchema, type RegisterValues } from './register.schema'

const ROLES: RegisterRole[] = ['CLIENT', 'MANAGER', 'WORKER']

export function RegisterPage() {
  const { t } = useTranslation(['auth', 'validation', 'common'])
  const navigate = useNavigate()
  useDocumentTitle(t('auth:register'))
  const register = useAuthStore((s) => s.register)
  const [values, setValues] = useState<RegisterValues>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'CLIENT',
  })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<keyof RegisterValues>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseForm(registerSchema, values)
    if (!parsed.success) {
      setFieldErrors(parsed.fieldErrors)
      return
    }

    setFieldErrors({})
    setIsSubmitting(true)
    try {
      const { firstName, lastName, email, password, role } = parsed.data
      const result = await register({
        email,
        password,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        role,
      })
      if (result.pendingApproval) {
        navigate('/pending-approval')
        return
      }
      toast.success(t('auth:accountCreated'))
    } catch (error) {
      toastApiError(error, t('auth:couldNotRegister'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <GuestOnly>
      <div className="home-canvas flex min-h-svh items-center justify-center bg-background px-4 text-foreground">
        <Card className="w-full max-w-sm">
          <CardContent>
            <Form onSubmit={onSubmit} className="gap-4" noValidate>
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">{t('auth:createAccount')}</h1>
                <p className="text-sm text-muted-foreground">{t('auth:registerRoleNote')}</p>
              </div>

              <FieldGroup>
                <Field>
                  <FieldLabel>{t('auth:role')}</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {ROLES.map((role) => {
                      const active = values.role === role
                      return (
                        <button
                          key={role}
                          type="button"
                          className={cn(
                            'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                            active
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-card text-muted-foreground hover:text-foreground',
                          )}
                          aria-pressed={active}
                          onClick={() => setValues((prev) => ({ ...prev, role }))}
                        >
                          {t(
                            `auth:role${role === 'CLIENT' ? 'Client' : role === 'MANAGER' ? 'Manager' : 'Worker'}`,
                          )}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {values.role === 'CLIENT'
                      ? t('auth:roleClientHint')
                      : t('auth:rolePendingHint')}
                  </p>
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel htmlFor="firstName">{t('auth:firstName')}</FieldLabel>
                    <Input
                      id="firstName"
                      value={values.firstName ?? ''}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          firstName: e.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="lastName">{t('auth:lastName')}</FieldLabel>
                    <Input
                      id="lastName"
                      value={values.lastName ?? ''}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          lastName: e.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>

                <Field data-invalid={Boolean(fieldErrors.email) || undefined}>
                  <FieldLabel htmlFor="email">{t('auth:email')}</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    dir="ltr"
                    autoComplete="email"
                    value={values.email}
                    aria-invalid={Boolean(fieldErrors.email) || undefined}
                    onChange={(e) => setValues((prev) => ({ ...prev, email: e.target.value }))}
                  />
                  <FieldError>{fieldErrors.email}</FieldError>
                </Field>

                <Field data-invalid={Boolean(fieldErrors.password) || undefined}>
                  <FieldLabel htmlFor="password">{t('auth:password')}</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={values.password}
                    aria-invalid={Boolean(fieldErrors.password) || undefined}
                    onChange={(e) => setValues((prev) => ({ ...prev, password: e.target.value }))}
                  />
                  <FieldError>{fieldErrors.password}</FieldError>
                </Field>
              </FieldGroup>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? t('auth:creating') : t('auth:register')}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                {t('auth:haveAccount')}{' '}
                <Link to="/login" className="text-foreground underline-offset-4 hover:underline">
                  {t('auth:signIn')}
                </Link>
              </p>
            </Form>
          </CardContent>
        </Card>
      </div>
    </GuestOnly>
  )
}
