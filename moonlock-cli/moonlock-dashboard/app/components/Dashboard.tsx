'use client';

import { useEffect, useState } from 'react';
import { Session, ActiveSession } from '@/app/types';
import { SessionCard } from './SessionCard';
import { StatsCard } from './StatsCard';
import { TokenUsageChart } from './TokenUsageChart';
import { Activity, Clock, Hash, TrendingUp, History, RefreshCw } from 'lucide-react';

export function Dashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'active' | 'history'>('active');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [sessionsRes, activeRes, statsRes] = await Promise.all([
        fetch('/api/sessions'),
        fetch('/api/active-session'),
        fetch('/api/statistics'),
      ]);

      const sessionsData = await sessionsRes.json();
      const activeData = await activeRes.json();
      const statsData = await statsRes.json();

      setSessions(sessionsData);
      setActiveSession(activeData);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 10 seconds for real-time updates
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const activeSessions = sessions.filter(s => s.status === 'active');
  const historySessions = sessions.filter(s => s.status !== 'active');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-moonlock-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Moonlock Dashboard</h1>
              <span className="ml-4 px-2 py-1 bg-moonlock-100 text-moonlock-700 text-xs rounded-full">
                Real-time Data
              </span>
            </div>
            <button
              onClick={fetchData}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-moonlock-600 text-white rounded-lg hover:bg-moonlock-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Active Sessions"
              value={stats.activeSessions}
              subtitle={`of ${stats.totalSessions} total`}
              icon={<Activity className="w-6 h-6 text-moonlock-600" />}
            />
            <StatsCard
              title="Today's Tokens"
              value={stats.todayUsage.toLocaleString()}
              icon={<Clock className="w-6 h-6 text-moonlock-600" />}
            />
            <StatsCard
              title="Monthly Usage"
              value={stats.monthlyUsage.toLocaleString()}
              icon={<TrendingUp className="w-6 h-6 text-moonlock-600" />}
            />
            <StatsCard
              title="Total Tokens"
              value={stats.totalTokens.toLocaleString()}
              icon={<Hash className="w-6 h-6 text-moonlock-600" />}
            />
          </div>
        )}

        {/* Token Usage Chart */}
        <div className="mb-8">
          <TokenUsageChart />
        </div>

        {/* Session Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setView('active')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                  view === 'active'
                    ? 'border-moonlock-600 text-moonlock-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Activity className="inline w-4 h-4 mr-2" />
                Active Sessions ({activeSessions.length})
              </button>
              <button
                onClick={() => setView('history')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                  view === 'history'
                    ? 'border-moonlock-600 text-moonlock-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <History className="inline w-4 h-4 mr-2" />
                History ({historySessions.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Sessions List */}
        <div className="space-y-4">
          {view === 'active' ? (
            activeSessions.length > 0 ? (
              activeSessions.map(session => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isActive={activeSession?.sessionId === session.id}
                />
              ))
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No active sessions</p>
                <p className="text-sm text-gray-400 mt-2">
                  Start a new session using the Moonlock CLI
                </p>
              </div>
            )
          ) : (
            historySessions.length > 0 ? (
              historySessions.map(session => (
                <SessionCard key={session.id} session={session} />
              ))
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No session history</p>
                <p className="text-sm text-gray-400 mt-2">
                  Completed sessions will appear here
                </p>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}