import React, { useState, useEffect } from 'react';

interface Notification {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical' | 'success';
  urgency: 'low' | 'normal' | 'critical';
  read: boolean;
}

export const NotificationsPanel: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Simulate real-time notifications from the hooks system
  useEffect(() => {
    const mockNotifications: Notification[] = [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        title: '🚀 Session Started',
        message: 'Claude Code hook monitoring active for current session',
        type: 'success',
        urgency: 'normal',
        read: false
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        title: '📊 Token Milestone',
        message: 'Session reached 10,000 tokens | 25 tools used',
        type: 'info',
        urgency: 'low',
        read: false
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 600000).toISOString(),
        title: '⚠️ High Token Rate',
        message: 'Rate increased 50% to 150/min. Monitor usage carefully.',
        type: 'warning',
        urgency: 'normal',
        read: true
      }
    ];

    setNotifications(mockNotifications);

    // Set up real-time updates from hooks system
    const interval = setInterval(() => {
      // In a real implementation, this would fetch from the hooks database
      // For now, we'll simulate occasional new notifications
      if (Math.random() > 0.95) {
        const newNotification: Notification = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          title: '🎯 High Efficiency',
          message: 'Current rate is well below baseline - excellent optimization!',
          type: 'success',
          urgency: 'low',
          read: false
        };
        setNotifications(prev => [newNotification, ...prev.slice(0, 19)]); // Keep last 20
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const recentNotifications = notifications.slice(0, 5);

  const getNotificationIcon = (type: string, urgency: string) => {
    if (urgency === 'critical') return '🚨';
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'info': return '📊';
      case 'critical': return '🔥';
      default: return '📢';
    }
  };

  const getNotificationStyle = (type: string, urgency: string) => {
    if (urgency === 'critical') {
      return 'border-red-500/40 bg-red-500/10 text-red-300';
    }
    switch (type) {
      case 'success':
        return 'border-green-500/40 bg-green-500/10 text-green-300';
      case 'warning':
        return 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300';
      case 'info':
        return 'border-blue-500/40 bg-blue-500/10 text-blue-300';
      default:
        return 'border-dark-600 bg-dark-800 text-dark-200';
    }
  };

  return (
    <div className="metric-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-dark-200 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3" />
          Live Notifications
          {unreadCount > 0 && (
            <span className="ml-2 px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/40">
              {unreadCount} new
            </span>
          )}
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-dark-400 hover:text-dark-200 transition-colors p-1"
            title={isCollapsed ? "Expand notifications" : "Collapse notifications"}
          >
            {isCollapsed ? '📖' : '📕'}
          </button>
          {notifications.length > 0 && (
            <>
              <button
                onClick={markAllAsRead}
                className="text-dark-400 hover:text-dark-200 transition-colors text-xs px-2 py-1 rounded border border-dark-600 hover:border-dark-500"
                title="Mark all as read"
              >
                ✓ All
              </button>
              <button
                onClick={clearAll}
                className="text-dark-400 hover:text-red-400 transition-colors text-xs px-2 py-1 rounded border border-dark-600 hover:border-red-500/40"
                title="Clear all notifications"
              >
                🗑️
              </button>
            </>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-dark-400">
              <div className="text-3xl mb-2">🔔</div>
              <p className="text-sm">No notifications yet</p>
              <p className="text-xs text-dark-500 mt-1">
                Hook system notifications will appear here
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-track-dark-800 scrollbar-thumb-dark-600">
                {recentNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => markAsRead(notification.id)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer hover:bg-opacity-80 ${
                      getNotificationStyle(notification.type, notification.urgency)
                    } ${
                      !notification.read 
                        ? 'ring-2 ring-offset-2 ring-offset-dark-900 ring-blue-500/30' 
                        : 'opacity-70'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <span className="text-lg flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type, notification.urgency)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-sm truncate">
                            {notification.title}
                          </h4>
                          <span className="text-xs text-current opacity-60 flex-shrink-0 ml-2">
                            {new Date(notification.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-sm opacity-90 leading-tight">
                          {notification.message}
                        </p>
                        {notification.urgency === 'critical' && (
                          <div className="mt-2 text-xs text-red-400 font-mono">
                            CRITICAL ALERT - Action may be required
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {notifications.length > 5 && (
                <div className="text-center pt-2 border-t border-dark-700">
                  <button className="text-sm text-dark-400 hover:text-dark-200 transition-colors">
                    View all {notifications.length} notifications →
                  </button>
                </div>
              )}

              {/* Stats Row */}
              <div className="flex justify-between items-center pt-2 border-t border-dark-700 text-xs text-dark-500">
                <span>
                  {notifications.length} total
                </span>
                <span>
                  Last update: {new Date().toLocaleTimeString()}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Connection to hooks system indicator */}
      <div className="mt-4 p-2 bg-dark-800/50 rounded border border-dark-700">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse-slow" />
            <span className="text-dark-400">Claude Code Hooks</span>
          </div>
          <span className="text-green-400 font-mono">ACTIVE</span>
        </div>
      </div>
    </div>
  );
};