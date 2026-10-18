import './index.css'
// Bind auth session → API refresh before any feature requests
import '@/stores/authStore'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'

import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { appQueryClient } from '@/hooks/queryClient'

import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={appQueryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        themes={['light', 'colorful', 'dark']}
        disableTransitionOnChange
      >
        <TooltipProvider>
          <App />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
