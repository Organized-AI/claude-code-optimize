import React, { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';

interface LiveSessionData {
  hasActiveSession: boolean;
  activeSessionId?: string;
  lastActivity?: number;
}

export const LiveSessionStatus: React.FC = () => {
  const [sessionData, setSessionData] = useState<LiveSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/claude-code?endpoint=live-status');
        if (response.ok) {
          const data = await response.json();
          setSessionData(data);
        }
      } catch (error) {
        console.error('Failed to fetch live session status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <Activity className="h-5 w-5 text-gray-400 animate-pulse mr-2" />
          <span className="text-gray-500">Checking session status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg shadow p-6 ${sessionData?.hasActiveSession ? 'bg-red-50 border-2 border-red-500' : 'bg-white'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Activity className={`h-5 w-5 mr-2 ${sessionData?.hasActiveSession ? 'text-red-600 animate-pulse' : 'text-gray-400'}`} />
          <h3 className="text-lg font-semibold">
            {sessionData?.hasActiveSession ? 'LIVE SESSION ACTIVE' : 'No Active Session'}
          </h3>
        </div>
        {sessionData?.hasActiveSession && (
          <div className="flex items-center space-x-2">
            <span className="inline-block w-3 h-3 bg-red-600 rounded-full animate-pulse"></span>
            <span className="text-sm text-gray-600">
              ID: {sessionData.activeSessionId?.slice(0, 8)}...
            </span>
          </div>
        )}
      </div>
      {sessionData?.lastActivity && (
        <p className="text-sm text-gray-500 mt-2">
          Last activity: {new Date(sessionData.lastActivity).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
};

export default LiveSessionStatus;