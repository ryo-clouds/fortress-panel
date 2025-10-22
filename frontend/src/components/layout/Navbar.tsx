import React from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import { Bell, Search, Menu, X, Shield, Settings, LogOut } from 'lucide-react'
import { Button } from '../ui/Button'
import { Dropdown } from '../ui/Dropdown'

export function Navbar() {
  const { user, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  const handleLogout = async () => {
    await logout()
  }

  return (
    <nav className="bg-white dark:bg-background-dark border-b border-border-primary">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side */}
          <div className="flex items-center">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>

            {/* Search */}
            <div className="hidden lg:block ml-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 border border-border-primary rounded-lg bg-background-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-security-danger rounded-full"></span>
            </Button>

            {/* User menu */}
            <Dropdown
              trigger={
                <Button variant="ghost" className="flex items-center space-x-2">
                  <div className="h-8 w-8 bg-primary-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden md:block text-sm font-medium text-text-primary">
                    {user?.username}
                  </span>
                </Button>
              }
            >
              <div className="px-4 py-3 border-b border-border-primary">
                <p className="text-sm font-medium text-text-primary">{user?.username}</p>
                <p className="text-xs text-text-tertiary">{user?.email}</p>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    user?.role === 'admin' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                  </span>
                </div>
              </div>
              
              <div className="py-1">
                <Link
                  to="/settings/profile"
                  className="dropdown-item"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
                <Link
                  to="/security"
                  className="dropdown-item"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Security
                </Link>
              </div>
              
              <div className="border-t border-border-primary py-1">
                <button
                  onClick={handleLogout}
                  className="dropdown-item text-security-danger"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </button>
              </div>
            </Dropdown>
          </div>
        </div>
      </div>

      {/* Mobile search */}
      {sidebarOpen && (
        <div className="lg:hidden border-t border-border-primary">
          <div className="px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-tertiary" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 border border-border-primary rounded-lg bg-background-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}