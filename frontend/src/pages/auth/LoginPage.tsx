import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Shield, Lock, User, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

import { useAuthStore } from '../../store/auth'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Checkbox } from '../ui/Checkbox'
import { Alert } from '../ui/Alert'

// Form schema
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().default(false),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const { login, error, clearError, setMFAPending } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: false,
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    clearError()

    try {
      await login(data.username, data.password, data.rememberMe)
      
      toast.success('Login successful!')
      navigate('/dashboard')
    } catch (error) {
      // Check if MFA is required
      if (error instanceof Error && error.message.includes('MFA')) {
        setMFAPending(true)
        navigate('/mfa')
      } else {
        toast.error(error instanceof Error ? error.message : 'Login failed')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Check for URL parameters
  const urlParams = new URLSearchParams(window.location.search)
  const reason = urlParams.get('reason')
  
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-background-dark dark:to-background-dark-secondary">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-600 rounded-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Fortress Panel</h1>
              <p className="text-xs text-text-secondary">High-Security Control Panel</p>
            </div>
          </div>
        </div>

        <h2 className="mt-6 text-center text-3xl font-extrabold text-text-primary">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-text-secondary">
          Or{' '}
          <Link
            to="/register"
            className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
          >
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-background-dark py-8 px-4 shadow-soft rounded-xl sm:px-10">
          {reason === 'timeout' && (
            <Alert variant="warning" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              Your session has expired. Please sign in again.
            </Alert>
          )}

          {error && (
            <Alert variant="danger" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              {error}
            </Alert>
          )}

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="username" className="form-label">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-text-tertiary" />
                </div>
                <Input
                  id="username"
                  type="text"
                  {...register('username')}
                  className="pl-10"
                  placeholder="Enter your username or email"
                  error={errors.username?.message}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-text-tertiary" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  className="pl-10 pr-10"
                  placeholder="Enter your password"
                  error={errors.password?.message}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-text-tertiary" />
                  ) : (
                    <Eye className="h-5 w-5 text-text-tertiary" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Checkbox
                {...register('rememberMe')}
                disabled={isLoading}
                label="Remember me"
              />

              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                className="w-full"
                loading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border-primary" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-background-dark text-text-secondary">
                  Security Features
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg mb-1">
                  <Shield className="h-5 w-5 text-security-safe" />
                </div>
                <p className="text-xs text-text-tertiary">End-to-End Encryption</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg mb-1">
                  <Lock className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <p className="text-xs text-text-tertiary">Multi-Factor Auth</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg mb-1">
                  <AlertCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <p className="text-xs text-text-tertiary">Zero Trust Architecture</p>
              </div>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-text-tertiary">
            <p>
              By signing in, you agree to our{' '}
              <a href="#" className="text-primary-600 hover:text-primary-500">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-primary-600 hover:text-primary-500">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-text-secondary">
            Protected by Fortress Panel Security Suite
          </p>
          <div className="flex items-center justify-center space-x-4 mt-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-security-safe/10 text-security-safe">
              AES-256 Encryption
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
              OAuth 2.0
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              JWT Tokens
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}