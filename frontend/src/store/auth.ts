import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, AuthSession } from '@shared/types'
import { z } from 'zod'

// Auth state schema
const AuthStateSchema = z.object({
  user: z.object({
    id: z.string(),
    username: z.string(),
    email: z.string(),
    role: z.enum(['admin', 'user', 'reseller']),
    mfa_enabled: z.boolean(),
    createdAt: z.string(),
    last_login: z.string().optional(),
  }).optional(),
  sessionId: z.string().optional(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  isAuthenticated: z.boolean(),
  loading: z.boolean(),
  error: z.string().optional(),
})

type AuthState = z.infer<typeof AuthStateSchema>

interface AuthStore extends AuthState {
  // Actions
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
  checkAuth: () => Promise<void>
  clearError: () => void
  updateUser: (user: Partial<User>) => void
  setMFAPending: (pending: boolean) => void
}

// Auth store
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: undefined,
      sessionId: undefined,
      accessToken: undefined,
      refreshToken: undefined,
      isAuthenticated: false,
      loading: false,
      error: undefined,

      // Login action
      login: async (username: string, password: string, rememberMe: boolean = false) => {
        set({ loading: true, error: undefined })

        try {
          const deviceFingerprint = getDeviceFingerprint()
          
          // API call to login
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Device-Fingerprint': deviceFingerprint,
            },
            body: JSON.stringify({
              username,
              password,
              rememberMe,
              deviceFingerprint,
            }),
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error?.message || 'Login failed')
          }

          const data = await response.json()
          
          // Store auth data
          set({
            user: data.user,
            sessionId: data.sessionId,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
            loading: false,
          })

          // Store in secure storage
          if (rememberMe) {
            localStorage.setItem('auth_refresh', data.refreshToken)
          }

          // Track successful login
          trackAuthEvent('login_success', {
            userId: data.user.id,
            username: username,
            deviceFingerprint,
          })

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed'
          set({ 
            error: errorMessage, 
            loading: false 
          })

          // Track failed login
          trackAuthEvent('login_failed', {
            username,
            error: errorMessage,
            deviceFingerprint,
          })

          throw error
        }
      },

      // Logout action
      logout: async () => {
        const { sessionId } = get()

        try {
          // Call logout endpoint
          if (sessionId) {
            await fetch('/api/auth/logout', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${get().accessToken}`,
              },
              body: JSON.stringify({ sessionId }),
            })
          }
        } catch (error) {
          console.error('Logout API error:', error)
        }

        // Clear local state
        set({
          user: undefined,
          sessionId: undefined,
          accessToken: undefined,
          refreshToken: undefined,
          isAuthenticated: false,
        })

        // Clear local storage
        localStorage.removeItem('auth_refresh')
        sessionStorage.clear()

        // Track logout event
        trackAuthEvent('logout', {
          sessionId,
          deviceFingerprint: getDeviceFingerprint(),
        })
      },

      // Refresh token action
      refreshToken: async () => {
        const { refreshToken } = get()

        if (!refreshToken) {
          throw new Error('No refresh token available')
        }

        try {
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
          })

          if (!response.ok) {
            throw new Error('Token refresh failed')
          }

          const data = await response.json()

          set({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
            error: undefined,
          })

        } catch (error) {
          // Refresh failed, logout user
          get().logout()
          throw error
        }
      },

      // Check authentication status
      checkAuth: async () => {
        const { accessToken } = get()

        if (!accessToken) {
          return
        }

        try {
          const response = await fetch('/api/auth/me', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          })

          if (!response.ok) {
            throw new Error('Auth check failed')
          }

          const data = await response.json()

          set({
            user: data.user,
            isAuthenticated: true,
            loading: false,
          })

        } catch (error) {
          console.error('Auth check error:', error)
          // Token invalid, clear auth state
          set({
            user: undefined,
            sessionId: undefined,
            accessToken: undefined,
            refreshToken: undefined,
            isAuthenticated: false,
            loading: false,
          })
        }
      },

      // Clear error
      clearError: () => set({ error: undefined }),

      // Update user
      updateUser: (userData: Partial<User>) => {
        set(state => ({
          user: state.user ? { ...state.user, ...userData } : undefined
        }))
      },

      // Set MFA pending state
      setMFAPending: (pending: boolean) => {
        set({ 
          error: pending ? 'MFA verification required' : undefined,
          loading: pending,
        })
      },
    }),
    {
      name: 'fortress-auth',
      // Don't persist sensitive data
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        sessionId: state.sessionId,
      }),
      // Secure storage options
      storage: {
        getItem: (name) => {
          const item = localStorage.getItem(name)
          return item ? JSON.parse(item) : null
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value))
        },
        removeItem: (name) => {
          localStorage.removeItem(name)
        },
      },
      onRehydrateStorage: (state) => {
        // Validate rehydrated state
        try {
          const validatedState = AuthStateSchema.parse(state)
          return validatedState
        } catch (error) {
          console.error('Invalid auth state detected, clearing...', error)
          return {
            isAuthenticated: false,
            loading: false,
          }
        }
      },
    }
  )
)

// Helper functions
function getDeviceFingerprint(): string {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  if (!ctx) return ''

  ctx.textBaseline = 'top'
  ctx.font = '14px Arial'
  ctx.fillText('Device fingerprint', 2, 2)
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL()
  ].join('|')

  return btoa(fingerprint).substring(0, 32)
}

function trackAuthEvent(eventType: string, metadata: Record<string, any> = {}): void {
  try {
    fetch('/api/security/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: eventType,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          language: navigator.language,
          platform: navigator.platform,
          referrer: document.referrer,
        },
      }),
    }).catch(() => {
      // Silent fail for security tracking
    })
  } catch (error) {
    // Silent fail
  }
}

// Session timeout checker
export const useSessionTimeout = () => {
  const { logout } = useAuthStore()

  useEffect(() => {
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ]

    let timeoutId: NodeJS.Timeout

    const resetTimeout = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      timeoutId = setTimeout(() => {
        logout()
        window.location.href = '/login?reason=timeout'
      }, 15 * 60 * 1000) // 15 minutes
    }

    const handleActivity = () => {
      resetTimeout()
    }

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    // Initial timeout
    resetTimeout()

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [logout])
}