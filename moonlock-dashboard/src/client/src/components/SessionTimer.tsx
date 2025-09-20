import React, { useMemo, useEffect, useState } from 'react';
import { useDataController } from '../hooks/useDataController';

export const SessionTimer: React.FC = () => {
  const { session, elapsed, remaining, formatElapsed, state } = useDataController();
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every second for accurate calculations
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const { hours, minutes, seconds, progress, actualElapsed, actualRemaining, isClaudeCodeSession } = useMemo(() => {
    if (!session) {
      return { 
        hours: 0, 
        minutes: 0, 
        seconds: 0, 
        progress: 0, 
        actualElapsed: 0, 
        actualRemaining: 0,
        isClaudeCodeSession: false 
      };
    }

    const isClaudeCodeSession = state.claudeCode?.liveStatus.hasActiveSession || false;
    
    // For Claude Code sessions, use 5-hour window (18,000 seconds = 5 hours)
    const fiveHourWindow = 5 * 60 * 60 * 1000; // 5 hours in milliseconds
    let actualElapsed = 0;
    let actualRemaining = isClaudeCodeSession ? fiveHourWindow : session.duration;

    if (session.status === 'active') {
      // For active sessions, calculate from start time to now
      actualElapsed = currentTime - session.startTime;
      
      if (isClaudeCodeSession) {
        // For Claude Code sessions, remaining time in 5-hour window
        actualRemaining = Math.max(0, fiveHourWindow - actualElapsed);
      } else {
        actualRemaining = Math.max(0, session.duration - actualElapsed);
      }
    } else if (session.status === 'paused') {
      // For paused sessions, use the elapsed time from WebSocket updates
      actualElapsed = elapsed;
      actualRemaining = Math.max(0, (isClaudeCodeSession ? fiveHourWindow : session.duration) - elapsed);
    } else if (session.status === 'completed') {
      // For completed sessions, show full duration
      actualElapsed = isClaudeCodeSession ? fiveHourWindow : session.duration;
      actualRemaining = 0;
    }

    // Calculate display values from remaining time
    const totalSeconds = Math.floor(actualRemaining / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const progress = Math.min(1, actualElapsed / (isClaudeCodeSession ? fiveHourWindow : session.duration));

    return { 
      hours, 
      minutes, 
      seconds, 
      progress, 
      actualElapsed, 
      actualRemaining,
      isClaudeCodeSession
    };
  }, [session, elapsed, remaining, currentTime, state]);

  const isWarning = actualRemaining < 600000; // Less than 10 minutes
  const isCritical = actualRemaining < 60000; // Less than 1 minute

  if (!session) {
    return (
      <div className="text-center text-dark-400">
        <div className="text-6xl font-mono timer-display mb-2">--:--:--</div>
        <p className="text-sm">No active session</p>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4">
      {/* Main Timer Display */}
      <div className={`text-6xl font-mono timer-display transition-colors ${
        isCritical 
          ? 'text-red-400 animate-pulse' 
          : isWarning 
            ? 'text-yellow-400' 
            : 'text-moonlock-400'
      }`}>
        {hours > 0 ? (
          `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        ) : (
          `${minutes}:${seconds.toString().padStart(2, '0')}`
        )}
      </div>

      {/* Progress Ring */}
      <div className="relative w-32 h-32 mx-auto">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background ring */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-dark-700"
          />
          {/* Progress ring */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress)}`}
            className={`transition-all duration-300 ${
              isCritical 
                ? 'text-red-500' 
                : isWarning 
                  ? 'text-yellow-500' 
                  : 'text-moonlock-500'
            }`}
          />
        </svg>
        
        {/* Center percentage */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-lg font-mono ${
            isCritical 
              ? 'text-red-400' 
              : isWarning 
                ? 'text-yellow-400' 
                : 'text-moonlock-400'
          }`}>
            {Math.round(progress * 100)}%
          </span>
        </div>
      </div>

      {/* Status and Elapsed Time */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            session.status === 'active' 
              ? 'bg-green-500 animate-pulse-slow' 
              : session.status === 'paused'
                ? 'bg-yellow-500'
                : 'bg-blue-500'
          }`} />
          <span className="text-dark-400 uppercase tracking-wide">
            {session.status}
          </span>
          {isClaudeCodeSession && (
            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">
              5-HOUR WINDOW
            </span>
          )}
        </div>
        
        <p className="text-dark-500 font-mono">
          Elapsed: {formatElapsed(actualElapsed)}
          {isClaudeCodeSession && (
            <span className="ml-2 text-blue-400">
              of 5 hours
            </span>
          )}
        </p>
        
        {actualRemaining < 3600000 && ( // Show warning when less than 1 hour
          <p className={`font-medium ${
            isCritical ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-dark-400'
          }`}>
            {isCritical ? '⚠️ 5-hour window ending soon!' : isWarning ? '⏰ Less than 10 minutes in 5-hour window' : ''}
          </p>
        )}
        
        {isClaudeCodeSession && actualRemaining > 3600000 && (
          <p className="text-blue-400 text-xs">
            ⏳ {Math.round(actualRemaining / 3600000 * 10) / 10} hours remaining in budget window
          </p>
        )}
      </div>
    </div>
  );
};

