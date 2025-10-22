import React from 'react'
import { clsx } from 'clsx'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
  helpText?: string
}

export function Input({ 
  error, 
  label, 
  helpText, 
  className, 
  ...props 
}: InputProps) {
  const baseClasses = 'w-full rounded-lg border border-border-primary bg-background-primary px-3 py-2 text-sm text-text-primary placeholder-text-tertiary shadow-soft focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-background-tertiary disabled:text-text-tertiary'
  
  const errorClasses = error ? 'border-security-danger focus:border-security-danger focus:ring-security-danger' : ''
  
  const classes = clsx(baseClasses, errorClasses, className)

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-text-primary">
          {label}
        </label>
      )}
      <input className={classes} {...props} />
      {error && (
        <p className="text-security-danger text-xs">{error}</p>
      )}
      {helpText && !error && (
        <p className="text-text-tertiary text-xs">{helpText}</p>
      )}
    </div>
  )
}