import React, { useState } from 'react'
import { clsx } from 'clsx'

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  error?: string
}

export function Checkbox({ 
  label, 
  error, 
  className, 
  ...props 
}: CheckboxProps) {
  const [checked, setChecked] = useState(props.defaultChecked || false)

  const baseClasses = 'h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-0'
  const errorClasses = error ? 'border-security-danger focus:ring-security-danger' : ''
  
  const classes = clsx(baseClasses, errorClasses)

  return (
    <div className="space-y-2">
      <div className="flex items-center">
        <input
          type="checkbox"
          className={classes}
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          {...props}
        />
        {label && (
          <label className="ml-2 text-sm text-text-primary">
            {label}
          </label>
        )}
      </div>
      {error && (
        <p className="text-security-danger text-xs">{error}</p>
      )}
    </div>
  )
}