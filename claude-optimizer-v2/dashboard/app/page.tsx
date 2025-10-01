'use client';

/**
 * Main Dashboard Page
 * Real-time monitoring of Claude Code sessions
 */

import { useSession } from '@/hooks/useSession';
import { SessionMetrics } from '@/components/SessionMetrics';
import { ObjectivesList } from '@/components/ObjectivesList';
import { TokenUsageChart } from '@/components/TokenUsageChart';
import { Activity, AlertCircle, CheckCircle, Circle } from 'lucide-react';

export default function DashboardPage() {
  const { session, isConnected, error, recentObjectives, recentTools } = useSession();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Claude Code Optimizer
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Real-time session monitoring and analytics
              </p>
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-2">
              {isConnected ? (
                <div className="flex items-center gap-2 text-green-600">
                  <Circle className="w-3 h-3 fill-current animate-pulse" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <Circle className="w-3 h-3 fill-current" />
                  <span className="text-sm font-medium">Disconnected</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Session Status */}
        {session ? (
          <>
            <div className="mb-6 bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`
                    p-3 rounded-full
                    ${session.status === 'active' ? 'bg-green-100' : ''}
                    ${session.status === 'completed' ? 'bg-blue-100' : ''}
                    ${session.status === 'error' ? 'bg-red-100' : ''}
                  `}>
                    {session.status === 'active' && <Activity className="w-6 h-6 text-green-600 animate-pulse" />}
                    {session.status === 'completed' && <CheckCircle className="w-6 h-6 text-blue-600" />}
                    {session.status === 'error' && <AlertCircle className="w-6 h-6 text-red-600" />}
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {session.projectName}
                    </h2>
                    <p className="text-sm text-gray-600">
                      Phase: {session.phase} • Model: {session.model}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`
                    inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                    ${session.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                    ${session.status === 'completed' ? 'bg-blue-100 text-blue-800' : ''}
                    ${session.status === 'error' ? 'bg-red-100 text-red-800' : ''}
                  `}>
                    {session.status === 'active' && 'Active'}
                    {session.status === 'completed' && 'Completed'}
                    {session.status === 'error' && 'Error'}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Started {new Date(session.startTime).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {/* Planned Objectives */}
              {session.objectives && session.objectives.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    Planned Objectives ({session.objectives.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {session.objectives.map((obj, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
                      >
                        {obj}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Metrics Cards */}
            <div className="mb-6">
              <SessionMetrics metrics={session.metrics} model={session.model} />
            </div>

            {/* Charts and Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TokenUsageChart metrics={session.metrics} />
              <ObjectivesList
                objectives={session.metrics?.objectivesCompleted || []}
                recentObjectives={recentObjectives}
              />
            </div>

            {/* Recent Tools */}
            {recentTools.length > 0 && (
              <div className="mt-6 bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Recent Tool Usage
                </h3>
                <div className="flex flex-wrap gap-2">
                  {recentTools.map((tool, index) => (
                    <span
                      key={`${tool.name}-${index}`}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-purple-100 text-purple-800 font-medium"
                    >
                      🔧 {tool.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* No Active Session */
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No Active Session
            </h2>
            <p className="text-gray-600">
              Waiting for Claude Code session to start...
            </p>
            {!isConnected && (
              <p className="text-sm text-red-600 mt-2">
                Make sure the WebSocket server is running on port 3001
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
