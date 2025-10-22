import React from 'react'
import { clsx } from 'clsx'
import { AlertCircle } from 'lucide-react'

interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'danger'
  children: React.ReactNode
  className?: string
}

export function Alert({ 
  variant = 'info', 
  children, 
  className 
}: AlertProps) {
  const baseClasses = 'rounded-lg border px-4 py-3 flex items-start space-x-3'
  
  const variantClasses = {
    info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200',
    success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200',
    danger: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
  }

  const iconColors = {
    info: 'text-blue-500',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    danger: 'text-red-500',
  }

  const classes = clsx(baseClasses, variantClasses[variant], className)

  return (
    <div className={classes}>
      <AlertCircle className={`h-5 w-5 flex-shrink-0 ${iconColors[variant]}`} />
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}