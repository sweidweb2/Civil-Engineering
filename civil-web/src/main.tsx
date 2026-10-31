import './index.css'
import './i18n'
// Bind auth session → API refresh before any feature requests
import '@/stores/authStore'

import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { I18nextProvider } from 'react-i18next'

import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { appQueryClient } from '@/hooks/queryClient'
import i18n from '@/i18n'
import { applyDocumentLocale, useLocaleStore } from '@/stores/localeStore'

import App from './App.tsx'

function LocaleSync({ children }: { children: React.ReactNode }) {
  const locale = useLocaleStore((state) => state.locale)

  useEffect(() => {
    applyDocumentLocale(locale)
    if (i18n.language !== locale) {
      void i18n.changeLanguage(locale)
    }
  }, [locale])

  return children
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={appQueryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          themes={['light', 'colorful', 'dark']}
          disableTransitionOnChange
        >
          <TooltipProvider>
            <LocaleSync>
              <App />
              <Toaster />
            </LocaleSync>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </I18nextProvider>
  </StrictMode>,
)
