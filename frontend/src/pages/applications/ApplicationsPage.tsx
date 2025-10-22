import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Play, Square, RotateCcw, Trash2, Terminal, Settings, Code, Database, Globe } from 'lucide-react';
import { useAuthStore } from '../../store/auth';

interface Application {
  id: string;
  domainId: string;
  language: string;
  version: string;
  port: number;
  status: 'running' | 'stopped' | 'error' | 'building';
  memoryLimit: number;
  cpuLimit: number;
  diskLimit: number;
  environmentVariables: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

interface LanguageRuntime {
  id: string;
  name: string;
  language: string;
  version: string;
  installed: boolean;
  enabled: boolean;
  defaultPort: number;
  containerImage?: string;
}

const ApplicationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  const [applications, setApplications] = useState<Application[]>([]);
  const [runtimes, setRuntimes] = useState<LanguageRuntime[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    fetchApplications();
    fetchRuntimes();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await fetch('/api/languages/applications', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setApplications(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRuntimes = async () => {
    try {
      const response = await fetch('/api/languages/runtimes', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRuntimes(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch runtimes:', error);
    }
  };

  const handleAction = async (action: string, appId: string) => {
    try {
      const response = await fetch(`/api/languages/applications/${appId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchApplications();
      } else {
        console.error(`Failed to ${action} application`);
      }
    } catch (error) {
      console.error(`Failed to ${action} application:`, error);
    }
  };

  const handleShowLogs = async (appId: string) => {
    try {
      const response = await fetch(`/api/languages/applications/${appId}/logs?lines=100`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data.data.logs);
        setSelectedApp(applications.find(app => app.id === appId) || null);
        setShowLogs(true);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800';
      case 'stopped': return 'bg-gray-100 text-gray-800';
      case 'building': return 'bg-blue-100 text-blue-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLanguageIcon = (language: string) => {
    switch (language) {
      case 'php': return <Code className="w-4 h-4 text-purple-600" />;
      case 'nodejs': return <Code className="w-4 h-4 text-green-600" />;
      case 'python': return <Code className="w-4 h-4 text-blue-600" />;
      case 'ruby': return <Code className="w-4 h-4 text-red-600" />;
      case 'go': return <Code className="w-4 h-4 text-cyan-600" />;
      case 'java': return <Code className="w-4 h-4 text-orange-600" />;
      default: return <Code className="w-4 h-4 text-gray-600" />;
    }
  };

  if (!hasPermission('domain.read')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">You don't have permission to view applications.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <p className="text-gray-600">Manage your multi-language applications</p>
        </div>
        {hasPermission('domain.create') && (
          <button
            onClick={() => setShowDeployModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Deploy Application
          </button>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Applications</p>
              <p className="text-2xl font-bold text-gray-900">{applications.length}</p>
            </div>
            <Globe className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Running</p>
              <p className="text-2xl font-bold text-green-600">
                {applications.filter(app => app.status === 'running').length}
              </p>
            </div>
            <Play className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Stopped</p>
              <p className="text-2xl font-bold text-gray-600">
                {applications.filter(app => app.status === 'stopped').length}
              </p>
            </div>
            <Square className="w-8 h-8 text-gray-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Available Runtimes</p>
              <p className="text-2xl font-bold text-purple-600">
                {runtimes.filter(runtime => runtime.installed && runtime.enabled).length}
              </p>
            </div>
            <Database className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Available Runtimes */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Available Language Runtimes</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {runtimes.map((runtime) => (
              <div key={runtime.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  {getLanguageIcon(runtime.language)}
                  <div>
                    <p className="font-medium text-gray-900">{runtime.name}</p>
                    <p className="text-sm text-gray-500">Port: {runtime.defaultPort}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    runtime.installed 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {runtime.installed ? 'Installed' : 'Not Installed'}
                  </span>
                  {!runtime.installed && hasPermission('system.update') && (
                    <button
                      onClick={() => handleAction('install', runtime.id)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Install
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Deployed Applications</h2>
        </div>
        
        {loading ? (
          <div className="p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-500">Loading applications...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-gray-400 mb-4">
              <Globe className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No applications deployed</h3>
            <p className="text-gray-500 mb-4">Deploy your first application to get started</p>
            {hasPermission('domain.create') && (
              <button
                onClick={() => setShowDeployModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Deploy Application
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Application
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resources
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Port
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {getLanguageIcon(app.language)}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {app.language} {app.version}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {app.id.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(app.status)}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {app.memoryLimit}MB RAM / {app.cpuLimit} CPU
                      </div>
                      <div className="text-sm text-gray-500">
                        {app.diskLimit}MB Disk
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {app.port}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleShowLogs(app.id)}
                          className="text-gray-600 hover:text-gray-900"
                          title="View Logs"
                        >
                          <Terminal className="w-4 h-4" />
                        </button>
                        
                        {app.status === 'running' ? (
                          <button
                            onClick={() => handleAction('stop', app.id)}
                            className="text-yellow-600 hover:text-yellow-700"
                            title="Stop"
                            disabled={!hasPermission('domain.update')}
                          >
                            <Square className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction('restart', app.id)}
                            className="text-green-600 hover:text-green-700"
                            title="Start/Restart"
                            disabled={!hasPermission('domain.update')}
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleAction('restart', app.id)}
                          className="text-blue-600 hover:text-blue-700"
                          title="Restart"
                          disabled={!hasPermission('domain.update')}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        
                        <button
                          className="text-gray-600 hover:text-gray-900"
                          title="Settings"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Logs Modal */}
      {showLogs && selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Application Logs
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedApp.language} {selectedApp.version} - Port {selectedApp.port}
                  </p>
                </div>
                <button
                  onClick={() => setShowLogs(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400">No logs available</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deploy Modal would go here - simplified for now */}
      {showDeployModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Deploy New Application</h3>
                <button
                  onClick={() => setShowDeployModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-600">Application deployment interface would be implemented here.</p>
              <p className="text-gray-600 mt-2">This would include:</p>
              <ul className="list-disc list-inside mt-2 text-gray-600">
                <li>Language and version selection</li>
                <li>Source code upload or repository connection</li>
                <li>Environment variables configuration</li>
                <li>Resource limits settings</li>
                <li>Build and deployment options</li>
              </ul>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowDeployModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowDeployModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Deploy Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationsPage;