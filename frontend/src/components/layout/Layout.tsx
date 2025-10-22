import React from 'react'
import { Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { Footer } from './Footer'

export function Layout() {
  const { user } = useAuthStore()

  return (
    <div className="min-h-screen bg-background-primary">
      <div className="flex">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main content */}
        <div className="flex-1 flex flex-col">
          {/* Navbar */}
          <Navbar />
          
          {/* Page content */}
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
          
          {/* Footer */}
          <Footer />
        </div>
      </div>
    </div>
  )
}