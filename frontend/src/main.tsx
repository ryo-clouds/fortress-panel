import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'

import App from './App'
import './index.css'

// React Query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error?.status && error.status >= 400 && error.status < 500) {
          return false
        }
        return failureCount < 3
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
})

// Security: Prevent console errors in production
if (import.meta.env.PROD) {
  console.log = () => {}
  console.warn = () => {}
  console.error = () => {}
}

// Theme initialization
const initializeTheme = () => {
  const theme = localStorage.getItem('theme') || 'light'
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
  
  // Watch for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      if (e.matches) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  })
}

// Security: CSP violations reporting
const initializeCSPReporting = () => {
  if (import.meta.env.PROD) {
    document.addEventListener('securitypolicyviolation', (e) => {
      // Report CSP violations to monitoring service
      fetch('/api/security/csp-violation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          violatedDirective: e.violatedDirective,
          originalPolicy: e.originalPolicy,
          blockedURI: e.blockedURI,
          documentURI: e.documentURI,
          referrer: e.referrer,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {
        // Silent fail for security reporting
      })
    })
  }
}

// Initialize before rendering
initializeTheme()
initializeCSPReporting()

// Security: Clear sensitive data from URL hash on load
if (window.location.hash.includes('access_token') || 
    window.location.hash.includes('password') ||
    window.location.hash.includes('secret')) {
  window.location.hash = ''
  window.history.replaceState({}, document.title, window.location.pathname)
}

// Create React root
const root = ReactDOM.createRoot(
  document.getElementById('root')!
)

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--color-background-primary)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border-primary)',
            },
            success: {
              style: {
                background: 'var(--color-security-safe)',
                color: 'white',
                border: '1px solid var(--color-security-safe)',
              },
            },
            error: {
              style: {
                background: 'var(--color-security-danger)',
                color: 'white',
                border: '1px solid var(--color-security-danger)',
              },
            },
          }}
        />
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)