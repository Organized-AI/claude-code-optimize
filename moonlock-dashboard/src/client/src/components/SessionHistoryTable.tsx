/**
 * Session History Table Component
 * 
 * Displays historical Claude Code sessions with:
 * - Filtering by status, project, date range
 * - Real-time token usage and efficiency metrics
 * - Session duration and cost analysis
 * - Pagination and sorting capabilities
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

interface SessionWindow {
  sessionId: string;
  projectId: string;
  startTime: number;
  endTime: number;
  status: 'active' | 'expired' | 'completed';
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
    totalTokens: number;
  };
  costEstimate: number;
  lastActivity: number;
  efficiency: number;
  conversationContext: string;
}

interface HistoryFilters {
  status?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
  limit: number;
  offset: number;
}

export const SessionHistoryTable: React.FC = () => {
  const { isConnected } = useWebSocket();
  const [sessions, setSessions] = useState<SessionWindow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  
  const [filters, setFilters] = useState<HistoryFilters>({
    limit: 20,
    offset: 0
  });
  
  const [sortBy, setSortBy] = useState<keyof SessionWindow>('startTime');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchSessionHistory();
  }, [filters, isConnected]);

  const fetchSessionHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      params.append('limit', filters.limit.toString());
      params.append('offset', filters.offset.toString());
      
      if (filters.status) params.append('status', filters.status);
      if (filters.projectId) params.append('projectId', filters.projectId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      
      const response = await fetch(`/api/claude-code/history?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch session history');
      }
      
      const data = await response.json();
      setSessions(data.sessions);
      setTotal(data.total);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const sortedSessions = useMemo(() => {
    if (!sessions.length) return [];
    
    return [...sessions].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      
      let comparison = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [sessions, sortBy, sortDirection]);

  const handleSort = (column: keyof SessionWindow) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  const handleFilterChange = (newFilters: Partial<HistoryFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, offset: 0 }));
  };

  const handlePageChange = (newOffset: number) => {
    setFilters(prev => ({ ...prev, offset: newOffset }));
  };

  const formatDuration = (startTime: number, endTime: number): string => {
    const duration = endTime - startTime;
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatTokens = (tokens: number): string => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    } else {
      return tokens.toString();
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-500/20';
      case 'completed': return 'text-blue-400 bg-blue-500/20';
      case 'expired': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getEfficiencyColor = (efficiency: number): string => {
    if (efficiency >= 40) return 'text-green-400';
    if (efficiency >= 20) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (loading && sessions.length === 0) {
    return (
      <div className="bg-dark-800 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-dark-700 rounded w-1/3"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-dark-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && sessions.length === 0) {
    return (
      <div className="bg-dark-800 rounded-lg p-6">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
            <span className="text-red-400 text-xl">⚠️</span>
          </div>
          <div className="space-y-2">
            <p className="text-red-400 font-medium">Session History Unavailable</p>
            <p className="text-dark-400 text-sm">{error}</p>
            <button
              onClick={fetchSessionHistory}
              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-800 rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Session History</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-dark-400">{total} sessions</span>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-dark-700 rounded-lg">
        <div>
          <label className="block text-xs text-dark-400 mb-1">Status</label>
          <select
            value={filters.status || ''}
            onChange={(e) => handleFilterChange({ status: e.target.value || undefined })}
            className="w-full bg-dark-600 text-white text-sm rounded px-2 py-1 border border-dark-500"
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        
        <div>
          <label className="block text-xs text-dark-400 mb-1">Project</label>
          <input
            type="text"
            placeholder="Filter by project..."
            value={filters.projectId || ''}
            onChange={(e) => handleFilterChange({ projectId: e.target.value || undefined })}
            className="w-full bg-dark-600 text-white text-sm rounded px-2 py-1 border border-dark-500"
          />
        </div>
        
        <div>
          <label className="block text-xs text-dark-400 mb-1">Start Date</label>
          <input
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => handleFilterChange({ startDate: e.target.value || undefined })}
            className="w-full bg-dark-600 text-white text-sm rounded px-2 py-1 border border-dark-500"
          />
        </div>
        
        <div>
          <label className="block text-xs text-dark-400 mb-1">End Date</label>
          <input
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => handleFilterChange({ endDate: e.target.value || undefined })}
            className="w-full bg-dark-600 text-white text-sm rounded px-2 py-1 border border-dark-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-700">
              <th 
                className="text-left p-3 text-dark-400 cursor-pointer hover:text-white"
                onClick={() => handleSort('startTime')}
              >
                Session {sortBy === 'startTime' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="text-left p-3 text-dark-400 cursor-pointer hover:text-white"
                onClick={() => handleSort('projectId')}
              >
                Project {sortBy === 'projectId' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="text-left p-3 text-dark-400 cursor-pointer hover:text-white"
                onClick={() => handleSort('status')}
              >
                Status {sortBy === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="text-left p-3 text-dark-400 cursor-pointer hover:text-white"
                onClick={() => handleSort('tokenUsage.totalTokens')}
              >
                Tokens {sortBy === 'tokenUsage' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="text-left p-3 text-dark-400 cursor-pointer hover:text-white"
                onClick={() => handleSort('efficiency')}
              >
                Efficiency {sortBy === 'efficiency' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="text-left p-3 text-dark-400 cursor-pointer hover:text-white"
                onClick={() => handleSort('costEstimate')}
              >
                Cost {sortBy === 'costEstimate' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="text-left p-3 text-dark-400">Duration</th>
            </tr>
          </thead>
          <tbody>
            {sortedSessions.map((session) => (
              <tr key={session.sessionId} className="border-b border-dark-700/50 hover:bg-dark-700/30">
                <td className="p-3">
                  <div>
                    <p className="font-mono text-moonlock-400 text-xs">
                      {session.sessionId.substring(0, 8)}...
                    </p>
                    <p className="text-dark-400 text-xs">
                      {new Date(session.startTime).toLocaleDateString()}
                    </p>
                  </div>
                </td>
                
                <td className="p-3">
                  <p className="text-white font-medium">{session.projectId}</p>
                  <p className="text-dark-400 text-xs truncate max-w-32">
                    {session.conversationContext}
                  </p>
                </td>
                
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(session.status)}`}>
                    {session.status}
                  </span>
                </td>
                
                <td className="p-3">
                  <div className="space-y-1">
                    <p className="text-white font-mono">
                      {formatTokens(session.tokenUsage.totalTokens)}
                    </p>
                    <div className="flex space-x-2 text-xs">
                      <span className="text-blue-400">
                        {formatTokens(session.tokenUsage.inputTokens)}
                      </span>
                      <span className="text-purple-400">
                        {formatTokens(session.tokenUsage.outputTokens)}
                      </span>
                      <span className="text-moonlock-400">
                        {formatTokens(session.tokenUsage.cacheReadTokens)}
                      </span>
                    </div>
                  </div>
                </td>
                
                <td className="p-3">
                  <span className={`font-mono text-sm ${getEfficiencyColor(session.efficiency)}`}>
                    {session.efficiency.toFixed(1)}%
                  </span>
                </td>
                
                <td className="p-3">
                  <span className="text-green-400 font-mono text-sm">
                    ${session.costEstimate.toFixed(4)}
                  </span>
                </td>
                
                <td className="p-3">
                  <span className="text-white text-sm">
                    {session.status === 'active' 
                      ? formatDuration(session.startTime, Date.now())
                      : formatDuration(session.startTime, session.endTime)
                    }
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > filters.limit && (
        <div className="flex justify-between items-center pt-4 border-t border-dark-700">
          <div className="text-sm text-dark-400">
            Showing {filters.offset + 1} - {Math.min(filters.offset + filters.limit, total)} of {total} sessions
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => handlePageChange(Math.max(0, filters.offset - filters.limit))}
              disabled={filters.offset === 0}
              className="px-3 py-1 bg-dark-700 text-white rounded text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(filters.offset + filters.limit)}
              disabled={filters.offset + filters.limit >= total}
              className="px-3 py-1 bg-dark-700 text-white rounded text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {sessions.length === 0 && !loading && (
        <div className="text-center py-8 text-dark-400">
          <p className="text-lg mb-2">📭 No sessions found</p>
          <p className="text-sm">Start using Claude Code to see your session history here.</p>
        </div>
      )}
    </div>
  );
};
