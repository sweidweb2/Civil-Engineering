import { type FormEvent, useState } from 'react'
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { GuestOnly } from '@/components/auth'
import { Form } from '@/components/forms'
import { Button, buttonVariants } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { type FieldErrors, parseForm } from '@/lib/form'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/api'
import { toastApiError } from '@/services/toast'
import { useAuthStore } from '@/stores/authStore'

import { loginSchema, type LoginValues } from './login.schema'

export function LoginPage() {
  const { t } = useTranslation(['auth', 'validation', 'common'])
  const navigate = useNavigate()
  useDocumentTitle(t('auth:signIn'))
  const login = useAuthStore((s) => s.login)
  const [values, setValues] = useState<LoginValues>({
    email: '',
    password: '',
  })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<keyof LoginValues>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseForm(loginSchema, values)
    if (!parsed.success) {
      setFieldErrors(parsed.fieldErrors)
      return
    }

    setFieldErrors({})
    setIsSubmitting(true)
    try {
      await login(parsed.data.email, parsed.data.password)
      toast.success(t('auth:signedIn'))
    } catch (error) {
      if (error instanceof ApiError && error.code === 'ACCOUNT_PENDING') {
        navigate('/pending-approval')
        return
      }
      toastApiError(error, t('auth:couldNotSignIn'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <GuestOnly>
      <Link
        to="/"
        className={cn(buttonVariants({ variant: 'outline' }), 'fixed top-4 start-4 z-50')}
      >
        <ArrowLeft className="rtl:rotate-180" />
        {t('common:home')}
      </Link>
      <div className="home-canvas flex min-h-svh items-center justify-center bg-background px-4 text-foreground">
        <Card className="w-full max-w-sm">
          <CardContent>
            <Form onSubmit={onSubmit} className="gap-4" noValidate>
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">{t('auth:signIn')}</h1>
                <p className="text-sm text-muted-foreground">{t('auth:signInSubtitle')}</p>
              </div>

              <FieldGroup>
                <Field data-invalid={Boolean(fieldErrors.email) || undefined}>
                  <FieldLabel htmlFor="email">{t('auth:email')}</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    dir="ltr"
                    autoComplete="email"
                    placeholder={t('auth:emailPlaceholder')}
                    value={values.email}
                    aria-invalid={Boolean(fieldErrors.email) || undefined}
                    onChange={(e) => setValues((prev) => ({ ...prev, email: e.target.value }))}
                  />
                  <FieldError>{fieldErrors.email}</FieldError>
                </Field>

                <Field data-invalid={Boolean(fieldErrors.password) || undefined}>
                  <FieldLabel htmlFor="password">{t('auth:password')}</FieldLabel>
                  <div className="relative">
                    <Input
                      id="password"
                      type={isPasswordVisible ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder={t('auth:passwordPlaceholder')}
                      value={values.password}
                      aria-invalid={Boolean(fieldErrors.password) || undefined}
                      className="pe-9"
                      onChange={(e) => setValues((prev) => ({ ...prev, password: e.target.value }))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="absolute top-1/2 end-1 -translate-y-1/2 text-muted-foreground"
                      aria-label={
                        isPasswordVisible ? t('auth:hidePassword') : t('auth:showPassword')
                      }
                      aria-pressed={isPasswordVisible}
                      onClick={() => setIsPasswordVisible((prev) => !prev)}
                    >
                      {isPasswordVisible ? <EyeOff /> : <Eye />}
                    </Button>
                  </div>
                  <FieldError>{fieldErrors.password}</FieldError>
                </Field>
              </FieldGroup>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
                {isSubmitting ? t('auth:signingIn') : t('auth:signIn')}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                {t('auth:noAccount')}{' '}
                <Link to="/register" className="text-foreground underline-offset-4 hover:underline">
                  {t('auth:register')}
                </Link>
              </p>
            </Form>
          </CardContent>
        </Card>
      </div>
    </GuestOnly>
  )
}
