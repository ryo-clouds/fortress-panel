import React, { useState, useEffect } from 'react';
import { Activity, Server, HardDrive, MemoryStick, Wifi, Users, AlertTriangle, CheckCircle, XCircle, TrendingUp, TrendingDown, Download } from 'lucide-react';
import { useAuthStore } from '../../store/auth';

interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  network: {
    connections: number;
    bytesIn: number;
    bytesOut: number;
  };
}

interface Alert {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  service: string;
  metric: string;
  message: string;
  value: number;
  threshold: number;
  timestamp: string;
  resolved: boolean;
}

interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  lastCheck: string;
  details: Record<string, any>;
}

interface PerformanceMetrics {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  cpu: { current: number; status: 'good' | 'warning' | 'critical' };
  memory: { current: number; status: 'good' | 'warning' | 'critical' };
  responseTime: { current: number; status: 'good' | 'warning' | 'critical' };
  errorRate: { current: number; status: 'good' | 'warning' | 'critical' };
}

const MonitoringPage: React.FC = () => {
  const { hasPermission } = useAuthStore();
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'hour' | 'day' | 'week' | 'month'>('hour');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchMonitoringData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchMonitoringData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, timeframe]);

  const fetchMonitoringData = async () => {
    try {
      const [dashboardRes, performanceRes] = await Promise.all([
        fetch('/api/monitoring/dashboard', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`/api/monitoring/performance?timeframe=${timeframe}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      if (dashboardRes.ok && performanceRes.ok) {
        const dashboardData = await dashboardRes.json();
        const performanceData = await performanceRes.json();

        setSystemMetrics(dashboardData.data.system);
        setHealthChecks(dashboardData.data.health.services);
        setAlerts(dashboardData.data.alerts.active);
        setPerformance(performanceData.data.performance);
      }
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/monitoring/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        fetchMonitoringData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': case 'good': return 'text-green-600';
      case 'warning': case 'degraded': return 'text-yellow-600';
      case 'critical': case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'healthy': case 'good': return 'bg-green-100 text-green-800';
      case 'warning': case 'degraded': return 'bg-yellow-100 text-yellow-800';
      case 'critical': case 'unhealthy': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'critical': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default: return <Activity className="w-4 h-4 text-blue-600" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (!hasPermission('system.read')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">You don't have permission to view monitoring data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Monitoring</h1>
          <p className="text-gray-600">Real-time system and application monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="hour">Last Hour</option>
            <option value="day">Last 24 Hours</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
          </select>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-lg border transition-colors ${
              autoRefresh 
                ? 'bg-green-100 text-green-800 border-green-300' 
                : 'bg-gray-100 text-gray-800 border-gray-300'
            }`}
          >
            {autoRefresh ? 'Auto Refresh On' : 'Auto Refresh Off'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Performance Score */}
          {performance && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">System Performance</h2>
                <span className={`text-2xl font-bold ${
                  performance.grade === 'A' ? 'text-green-600' :
                  performance.grade === 'B' ? 'text-blue-600' :
                  performance.grade === 'C' ? 'text-yellow-600' :
                  performance.grade === 'D' ? 'text-orange-600' : 'text-red-600'
                }`}>
                  {performance.grade}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    performance.score >= 90 ? 'bg-green-600' :
                    performance.score >= 80 ? 'bg-blue-600' :
                    performance.score >= 70 ? 'bg-yellow-600' :
                    performance.score >= 60 ? 'bg-orange-600' : 'bg-red-600'
                  }`}
                  style={{ width: `${performance.score}%` }}
                ></div>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Overall Performance Score: {performance.score}/100
              </div>
            </div>
          )}

          {/* System Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* CPU Usage */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">CPU Usage</h3>
                <Server className="w-5 h-5 text-blue-600" />
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-gray-900">
                  {systemMetrics?.cpu.usage.toFixed(1)}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      systemMetrics?.cpu.usage && systemMetrics.cpu.usage < 70 ? 'bg-green-600' :
                      systemMetrics?.cpu.usage && systemMetrics.cpu.usage < 90 ? 'bg-yellow-600' : 'bg-red-600'
                    }`}
                    style={{ width: `${systemMetrics?.cpu.usage || 0}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500">
                  Load Average: {systemMetrics?.cpu.loadAverage[0]?.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Memory Usage */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">Memory Usage</h3>
                <MemoryStick className="w-5 h-5 text-green-600" />
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-gray-900">
                  {systemMetrics?.memory.usage.toFixed(1)}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      systemMetrics?.memory.usage && systemMetrics.memory.usage < 80 ? 'bg-green-600' :
                      systemMetrics?.memory.usage && systemMetrics.memory.usage < 95 ? 'bg-yellow-600' : 'bg-red-600'
                    }`}
                    style={{ width: `${systemMetrics?.memory.usage || 0}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500">
                  {formatBytes((systemMetrics?.memory.used || 0) * 1024 * 1024)} / {formatBytes((systemMetrics?.memory.total || 0) * 1024 * 1024)}
                </div>
              </div>
            </div>

            {/* Disk Usage */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">Disk Usage</h3>
                <HardDrive className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-gray-900">
                  {systemMetrics?.disk.usage.toFixed(1)}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      systemMetrics?.disk.usage && systemMetrics.disk.usage < 80 ? 'bg-green-600' :
                      systemMetrics?.disk.usage && systemMetrics.disk.usage < 95 ? 'bg-yellow-600' : 'bg-red-600'
                    }`}
                    style={{ width: `${systemMetrics?.disk.usage || 0}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500">
                  {formatBytes((systemMetrics?.disk.used || 0) * 1024 * 1024)} / {formatBytes((systemMetrics?.disk.total || 0) * 1024 * 1024)}
                </div>
              </div>
            </div>

            {/* Network */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">Network</h3>
                <Wifi className="w-5 h-5 text-purple-600" />
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-gray-900">
                  {systemMetrics?.network.connections}
                </div>
                <div className="text-xs text-gray-500">
                  Connections Active
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {formatBytes(systemMetrics?.network.bytesIn || 0)}
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" />
                    {formatBytes(systemMetrics?.network.bytesOut || 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Health Checks */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Service Health</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {healthChecks.map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        service.status === 'healthy' ? 'bg-green-500' :
                        service.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <div>
                        <div className="font-medium text-gray-900 capitalize">
                          {service.service}
                        </div>
                        <div className="text-sm text-gray-500">
                          {service.responseTime}ms
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBgColor(service.status)}`}>
                      {service.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Active Alerts */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">Active Alerts</h2>
                <span className="bg-red-100 text-red-800 px-2 py-1 text-sm font-medium rounded-full">
                  {alerts.length} Active
                </span>
              </div>
            </div>
            <div className="p-6">
              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">All Systems Operational</h3>
                  <p className="text-gray-500">No active alerts at this time.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="flex items-start justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        {getAlertIcon(alert.level)}
                        <div>
                          <div className="font-medium text-gray-900">
                            {alert.service} - {alert.metric}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {alert.message}
                          </div>
                          <div className="text-xs text-gray-500 mt-2">
                            {new Date(alert.timestamp).toLocaleString()} • 
                            Value: {alert.value} • 
                            Threshold: {alert.threshold}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleResolveAlert(alert.id)}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        Resolve
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Performance Breakdown */}
          {performance && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-4">CPU Performance</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900">Usage</span>
                    <span className={`font-medium ${getStatusColor(performance.cpu.status)}`}>
                      {performance.cpu.current}%
                    </span>
                  </div>
                  <div className={`w-full h-2 rounded-full ${
                    performance.cpu.status === 'good' ? 'bg-green-600' :
                    performance.cpu.status === 'warning' ? 'bg-yellow-600' : 'bg-red-600'
                  }`} style={{ width: `${Math.min(performance.cpu.current, 100)}%` }}></div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-4">Memory Performance</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900">Usage</span>
                    <span className={`font-medium ${getStatusColor(performance.memory.status)}`}>
                      {performance.memory.current}%
                    </span>
                  </div>
                  <div className={`w-full h-2 rounded-full ${
                    performance.memory.status === 'good' ? 'bg-green-600' :
                    performance.memory.status === 'warning' ? 'bg-yellow-600' : 'bg-red-600'
                  }`} style={{ width: `${Math.min(performance.memory.current, 100)}%` }}></div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-4">Response Time</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900">Average</span>
                    <span className={`font-medium ${getStatusColor(performance.responseTime.status)}`}>
                      {performance.responseTime.current}ms
                    </span>
                  </div>
                  <div className={`w-full h-2 rounded-full ${
                    performance.responseTime.status === 'good' ? 'bg-green-600' :
                    performance.responseTime.status === 'warning' ? 'bg-yellow-600' : 'bg-red-600'
                  }`} style={{ width: `${Math.min((performance.responseTime.current / 50), 100)}%` }}></div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-4">Error Rate</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900">Rate</span>
                    <span className={`font-medium ${getStatusColor(performance.errorRate.status)}`}>
                      {performance.errorRate.current}%
                    </span>
                  </div>
                  <div className={`w-full h-2 rounded-full ${
                    performance.errorRate.status === 'good' ? 'bg-green-600' :
                    performance.errorRate.status === 'warning' ? 'bg-yellow-600' : 'bg-red-600'
                  }`} style={{ width: `${Math.min(performance.errorRate.current, 100)}%` }}></div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MonitoringPage;