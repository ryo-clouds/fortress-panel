import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Globe, 
  Database, 
  Mail, 
  Shield, 
  Settings, 
  Activity,
  BarChart3,
  Archive
} from 'lucide-react'
import { useAuthStore } from '../../store/auth'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    current: (pathname: string) => pathname === '/dashboard',
  },
  {
    name: 'Domains',
    href: '/domains',
    icon: Globe,
    current: (pathname: string) => pathname.startsWith('/domains'),
  },
  {
    name: 'Databases',
    href: '/databases',
    icon: Database,
    current: (pathname: string) => pathname.startsWith('/databases'),
  },
  {
    name: 'Email',
    href: '/email',
    icon: Mail,
    current: (pathname: string) => pathname.startsWith('/email'),
  },
  {
    name: 'Security',
    href: '/security',
    icon: Shield,
    current: (pathname: string) => pathname.startsWith('/security'),
  },
]

const adminNavigation = [
  {
    name: 'System',
    href: '/system',
    icon: Activity,
    current: (pathname: string) => pathname.startsWith('/system'),
  },
  {
    name: 'Metrics',
    href: '/system/metrics',
    icon: BarChart3,
    current: (pathname: string) => pathname.startsWith('/system/metrics'),
  },
  {
    name: 'Backups',
    href: '/system/backups',
    icon: Archive,
    current: (pathname: string) => pathname.startsWith('/system/backups'),
  },
]

const settingsNavigation = [
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    current: (pathname: string) => pathname.startsWith('/settings'),
  },
]

export function Sidebar() {
  const { user } = useAuthStore()
  const location = useLocation()

  return (
    <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
      {/* Sidebar component */}
      <div className="flex flex-col flex-grow bg-white dark:bg-background-dark border-r border-border-primary overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center h-16 flex-shrink-0 px-4 border-b border-border-primary">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-600 rounded-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-text-primary">Fortress Panel</h1>
              <p className="text-xs text-text-secondary">Control Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-2">
          {/* Main Navigation */}
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = item.current(location.pathname)
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={`nav-link ${isActive ? 'nav-link-active' : 'nav-link-inactive'}`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </NavLink>
              )
            })}
          </div>

          {/* Admin Navigation */}
          {user?.role === 'admin' && (
            <>
              <div className="pt-4 pb-2">
                <div className="px-3">
                  <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                    Administration
                  </h3>
                </div>
              </div>
              <div className="space-y-1">
                {adminNavigation.map((item) => {
                  const isActive = item.current(location.pathname)
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      className={`nav-link ${isActive ? 'nav-link-active' : 'nav-link-inactive'}`}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </NavLink>
                  )
                })}
              </div>
            </>
          )}

          {/* Settings Navigation */}
          <div className="pt-4 pb-2">
            <div className="px-3">
              <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                Settings
              </h3>
            </div>
          </div>
          <div className="space-y-1">
            {settingsNavigation.map((item) => {
              const isActive = item.current(location.pathname)
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={`nav-link ${isActive ? 'nav-link-active' : 'nav-link-inactive'}`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </NavLink>
              )
            })}
          </div>
        </nav>

        {/* User info */}
        <div className="flex-shrink-0 flex border-t border-border-primary p-4">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-primary-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {user?.username}
              </p>
              <p className="text-xs text-text-tertiary truncate">
                {user?.email}
              </p>
            </div>
            <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
              user?.role === 'admin' 
                ? 'bg-purple-100 text-purple-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}