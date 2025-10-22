import React from 'react'
import { Shield, Lock, Key, Activity } from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-white dark:bg-background-dark border-t border-border-primary">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-primary-600" />
              <span className="text-xs text-text-secondary">
                © {currentYear} Fortress Panel
              </span>
            </div>
            
            <div className="hidden md:flex items-center space-x-4 text-xs text-text-tertiary">
              <span className="flex items-center space-x-1">
                <Lock className="h-3 w-3" />
                <span>Secured by</span>
              </span>
              <span className="flex items-center space-x-1">
                <Key className="h-3 w-3" />
                <span>AES-256 Encryption</span>
              </span>
              <span className="flex items-center space-x-1">
                <Activity className="h-3 w-3" />
                <span>Zero Trust Architecture</span>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-xs text-text-tertiary">
            <a href="#" className="hover:text-text-primary transition-colors">
              Documentation
            </a>
            <a href="#" className="hover:text-text-primary transition-colors">
              Support
            </a>
            <a href="#" className="hover:text-text-primary transition-colors">
              API
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}