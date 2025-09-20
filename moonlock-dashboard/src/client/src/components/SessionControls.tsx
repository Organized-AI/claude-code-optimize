import React, { useState } from 'react';
import { useSessionStore } from '../store/sessionStore';

export const SessionControls: React.FC = () => {
  const { 
    currentSession, 
    isLoading, 
    startNewSession, 
    pauseSession, 
    resumeSession, 
    completeSession 
  } = useSessionStore();
  
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [duration, setDuration] = useState(300); // 5 hours in minutes
  const [tokenBudget, setTokenBudget] = useState(10000);

  const handleStartSession = async () => {
    await startNewSession(duration * 60 * 1000, tokenBudget); // Convert to milliseconds
    setShowNewSessionModal(false);
  };

  if (!currentSession) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setShowNewSessionModal(true)}
          disabled={isLoading}
          className="w-full py-3 px-6 bg-moonlock-600 hover:bg-moonlock-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
        >
          {isLoading ? 'Starting...' : 'Start New Session'}
        </button>

        {showNewSessionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-dark-800 rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-dark-200 mb-4">
                New Session Configuration
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-dark-400 mb-2">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-200 focus:border-moonlock-500 focus:outline-none"
                    min="1"
                    max="300"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-dark-400 mb-2">
                    Token Budget (optional)
                  </label>
                  <input
                    type="number"
                    value={tokenBudget}
                    onChange={(e) => setTokenBudget(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-200 focus:border-moonlock-500 focus:outline-none"
                    min="100"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowNewSessionModal(false)}
                  className="flex-1 py-2 px-4 bg-dark-700 hover:bg-dark-600 text-dark-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartSession}
                  disabled={isLoading}
                  className="flex-1 py-2 px-4 bg-moonlock-600 hover:bg-moonlock-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  Start Session
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3 p-4 bg-dark-800 rounded-lg border border-dark-700">
      <div className="flex-1">
        <h3 className="font-semibold text-dark-200">
          Session Active
        </h3>
        <p className="text-sm text-dark-400">
          {currentSession.name || `Session ${currentSession.id.slice(0, 8)}`}
        </p>
      </div>
      
      <div className="flex space-x-2">
        {currentSession.status === 'active' ? (
          <button
            onClick={pauseSession}
            disabled={isLoading}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            ⏸️ Pause
          </button>
        ) : currentSession.status === 'paused' ? (
          <button
            onClick={resumeSession}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            ▶️ Resume
          </button>
        ) : null}
        
        <button
          onClick={completeSession}
          disabled={isLoading}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          ⏹️ Complete
        </button>
      </div>
    </div>
  );
};