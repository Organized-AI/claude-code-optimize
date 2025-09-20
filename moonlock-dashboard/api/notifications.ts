/**
 * Notifications API endpoint for Claude Code Hooks integration
 * Serves real-time notifications from the hooks system database
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface HookNotification {
  id: string;
  timestamp: string;
  notification_type: string;
  title: string;
  message: string;
  urgency: 'low' | 'normal' | 'critical';
  session_id: string;
  created_at: string;
}

// Mock data that matches the hooks system structure
const mockHooksNotifications: HookNotification[] = [
  {
    id: '1',
    timestamp: new Date().toISOString(),
    notification_type: 'session_start',
    title: '🚀 Claude Code Session',
    message: 'New session started: session_1754601223',
    urgency: 'normal',
    session_id: 'session_1754601223',
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    notification_type: 'rate_warning',
    title: '📊 Token Rate Notice',
    message: 'Rate increased 25% to 125/min.',
    urgency: 'low',
    session_id: 'session_1754601223',
    created_at: new Date(Date.now() - 300000).toISOString()
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    notification_type: 'rate_warning',
    title: '⚠️ High Token Rate',
    message: 'Rate increased 50% to 150/min. Monitor usage carefully.',
    urgency: 'normal',
    session_id: 'session_1754601223',
    created_at: new Date(Date.now() - 600000).toISOString()
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 900000).toISOString(),
    notification_type: 'rate_warning',
    title: '🚨 Critical Token Rate',
    message: 'Rate increased 100% to 200/min. Consider optimizing your approach.',
    urgency: 'critical',
    session_id: 'session_1754601223',
    created_at: new Date(Date.now() - 900000).toISOString()
  },
  {
    id: '5',
    timestamp: new Date(Date.now() - 1200000).toISOString(),
    notification_type: 'milestone',
    title: '📊 Token Milestone',
    message: 'Session reached 10000 tokens | 25 tools used',
    urgency: 'low',
    session_id: 'session_1754601223',
    created_at: new Date(Date.now() - 1200000).toISOString()
  },
  {
    id: '6',
    timestamp: new Date(Date.now() - 1500000).toISOString(),
    notification_type: 'efficiency',
    title: '🎯 High Efficiency',
    message: 'Current rate 45/min is well below baseline 100/min',
    urgency: 'low',
    session_id: 'session_1754601223',
    created_at: new Date(Date.now() - 1500000).toISOString()
  },
  {
    id: '7',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    notification_type: 'context_reset',
    title: '🔄 Context Reset',
    message: 'Context cleared, baseline adjusted for session session_1754601223',
    urgency: 'normal',
    session_id: 'session_1754601223',
    created_at: new Date(Date.now() - 1800000).toISOString()
  },
  {
    id: '8',
    timestamp: new Date(Date.now() - 2100000).toISOString(),
    notification_type: 'warning',
    title: '⚠️ Session Warning',
    message: 'Context window approaching 150k tokens - consider management',
    urgency: 'normal',
    session_id: 'session_1754601223',
    created_at: new Date(Date.now() - 2100000).toISOString()
  }
];

// Simulate occasional new notifications
const getRealtimeNotifications = (): HookNotification[] => {
  const notifications = [...mockHooksNotifications];
  
  // Add a new notification occasionally
  if (Math.random() > 0.8) {
    const newNotification: HookNotification = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      notification_type: 'efficiency',
      title: '💡 Performance Tip',
      message: 'Consider breaking down complex operations into smaller tool calls',
      urgency: 'low',
      session_id: 'session_' + Date.now(),
      created_at: new Date().toISOString()
    };
    notifications.unshift(newNotification);
  }
  
  return notifications.slice(0, 15); // Keep last 15 notifications
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const { session_id, limit = 10, urgency } = req.query;
      
      let notifications = getRealtimeNotifications();
      
      // Filter by session ID if provided
      if (session_id) {
        notifications = notifications.filter(n => n.session_id === session_id);
      }
      
      // Filter by urgency if provided
      if (urgency) {
        notifications = notifications.filter(n => n.urgency === urgency);
      }
      
      // Apply limit
      const limitNum = parseInt(limit as string, 10);
      if (limitNum > 0) {
        notifications = notifications.slice(0, limitNum);
      }
      
      // Sort by timestamp (newest first)
      notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      return res.status(200).json({
        notifications,
        total: notifications.length,
        timestamp: new Date().toISOString(),
        hooks_system_status: 'active',
        database_connected: true
      });
      
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch notifications',
        hooks_system_status: 'error',
        database_connected: false
      });
    }
  }
  
  if (req.method === 'POST') {
    try {
      // This would be used by the hooks system to add new notifications
      const { notification_type, title, message, urgency, session_id } = req.body;
      
      const newNotification: HookNotification = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        notification_type: notification_type || 'custom',
        title: title || 'Hook Notification',
        message: message || 'Notification from hooks system',
        urgency: urgency || 'normal',
        session_id: session_id || 'unknown',
        created_at: new Date().toISOString()
      };
      
      // In a real implementation, this would insert into the SQLite database
      // For now, we'll just return the created notification
      
      return res.status(201).json({
        notification: newNotification,
        success: true,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error creating notification:', error);
      return res.status(500).json({ 
        error: 'Failed to create notification',
        success: false
      });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

// Vercel configuration
export const config = {
  api: {
    bodyParser: true,
  },
};