import React from 'react';
import { useTokenStore } from '../store/tokenStore';

export const AlertPanel: React.FC = () => {
  const { alerts } = useTokenStore();

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert, index) => (
        <div
          key={index}
          className={`p-3 rounded-lg border flex items-start space-x-3 ${
            alert.level === 'error'
              ? 'alert-error border-red-500/20'
              : 'alert-warning border-yellow-500/20'
          }`}
        >
          <div className="flex-shrink-0 mt-0.5">
            {alert.level === 'error' ? (
              <span className="text-red-400">🔴</span>
            ) : (
              <span className="text-yellow-400">⚠️</span>
            )}
          </div>
          
          <div className="flex-1">
            <p className="text-sm font-medium">
              {alert.level === 'error' ? 'Critical Alert' : 'Warning'}
            </p>
            <p className="text-sm opacity-90 mt-1">
              {alert.message}
            </p>
          </div>
          
          <div className="flex-shrink-0">
            <span className="text-xs text-dark-500 font-mono">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};