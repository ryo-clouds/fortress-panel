import React from 'react'
import { Link } from 'react-router-dom'
import { 
  Globe, 
  Database, 
  Mail, 
  Shield, 
  Server, 
  Users, 
  Activity,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react'
import { Card, CardHeader, CardBody } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'

export function DashboardPage() {
  // Mock data - would come from API
  const stats = [
    {
      name: 'Active Domains',
      value: '12',
      change: '+2.5%',
      changeType: 'increase' as const,
      icon: Globe,
      color: 'primary',
    },
    {
      name: 'Databases',
      value: '8',
      change: '+1',
      changeType: 'increase' as const,
      icon: Database,
      color: 'success',
    },
    {
      name: 'Email Domains',
      value: '5',
      change: '0%',
      changeType: 'neutral' as const,
      icon: Mail,
      color: 'info',
    },
    {
      name: 'Security Score',
      value: '98%',
      change: '+0.5%',
      changeType: 'increase' as const,
      icon: Shield,
      color: 'warning',
    },
  ]

  const recentActivity = [
    {
      id: 1,
      type: 'domain_created',
      message: 'Domain example.com created',
      time: '2 minutes ago',
      status: 'success',
    },
    {
      id: 2,
      type: 'database_backup',
      message: 'Database backup completed',
      time: '15 minutes ago',
      status: 'success',
    },
    {
      id: 3,
      type: 'security_alert',
      message: 'Unusual login attempt detected',
      time: '1 hour ago',
      status: 'warning',
    },
    {
      id: 4,
      type: 'ssl_renewed',
      message: 'SSL certificate renewed for site.com',
      time: '2 hours ago',
      status: 'success',
    },
  ]

  const systemHealth = [
    {
      name: 'Web Server',
      status: 'healthy',
      uptime: '99.99%',
      lastCheck: '2 minutes ago',
    },
    {
      name: 'Database Server',
      status: 'healthy',
      uptime: '99.95%',
      lastCheck: '1 minute ago',
    },
    {
      name: 'Email Server',
      status: 'healthy',
      uptime: '99.98%',
      lastCheck: '3 minutes ago',
    },
    {
      name: 'Security System',
      status: 'healthy',
      uptime: '100%',
      lastCheck: '30 seconds ago',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-secondary">Welcome back! Here's what's happening with your server.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardBody className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">{stat.name}</p>
                  <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
                </div>
                <div className={`p-3 bg-${stat.color}-100 dark:bg-${stat.color}-900/20 rounded-lg`}>
                  <stat.icon className={`h-6 w-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                {stat.changeType === 'increase' && (
                  <TrendingUp className="h-4 w-4 text-security-safe mr-1" />
                )}
                <span className={`${
                  stat.changeType === 'increase' 
                    ? 'text-security-safe' 
                    : 'text-text-tertiary'
                }`}>
                  {stat.change}
                </span>
                <span className="text-text-tertiary ml-1">from last month</span>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-text-primary">Recent Activity</h2>
            <p className="text-sm text-text-secondary">Latest events and updates</p>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`p-1 rounded-full ${
                    activity.status === 'success' 
                      ? 'bg-security-safe/10' 
                      : 'bg-security-warning/10'
                  }`}>
                    {activity.status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-security-safe" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-security-warning" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary">{activity.message}</p>
                    <p className="text-xs text-text-tertiary">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border-primary">
              <Link
                to="/security/events"
                className="text-sm text-primary-600 hover:text-primary-500 font-medium"
              >
                View all activity →
              </Link>
            </div>
          </CardBody>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-text-primary">System Health</h2>
            <p className="text-sm text-text-secondary">Server status and performance</p>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {systemHealth.map((service) => (
                <div key={service.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      service.status === 'healthy' 
                        ? 'bg-security-safe' 
                        : 'bg-security-warning'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-text-primary">{service.name}</p>
                      <p className="text-xs text-text-tertiary">{service.lastCheck}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={service.status === 'healthy' ? 'success' : 'warning'}>
                      {service.status}
                    </Badge>
                    <p className="text-xs text-text-tertiary mt-1">{service.uptime}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border-primary">
              <Link
                to="/system"
                className="text-sm text-primary-600 hover:text-primary-500 font-medium"
              >
                View system metrics →
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-text-primary">Quick Actions</h2>
          <p className="text-sm text-text-secondary">Common tasks and shortcuts</p>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              to="/domains/create"
              className="flex flex-col items-center p-4 border border-border-primary rounded-lg hover:bg-background-secondary transition-colors"
            >
              <Globe className="h-8 w-8 text-primary-600 mb-2" />
              <span className="text-sm font-medium text-text-primary">Add Domain</span>
            </Link>
            <Link
              to="/databases/create"
              className="flex flex-col items-center p-4 border border-border-primary rounded-lg hover:bg-background-secondary transition-colors"
            >
              <Database className="h-8 w-8 text-success mb-2" />
              <span className="text-sm font-medium text-text-primary">Create Database</span>
            </Link>
            <Link
              to="/email/create"
              className="flex flex-col items-center p-4 border border-border-primary rounded-lg hover:bg-background-secondary transition-colors"
            >
              <Mail className="h-8 w-8 text-info mb-2" />
              <span className="text-sm font-medium text-text-primary">Setup Email</span>
            </Link>
            <Link
              to="/security/api-keys"
              className="flex flex-col items-center p-4 border border-border-primary rounded-lg hover:bg-background-secondary transition-colors"
            >
              <Shield className="h-8 w-8 text-warning mb-2" />
              <span className="text-sm font-medium text-text-primary">API Keys</span>
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}