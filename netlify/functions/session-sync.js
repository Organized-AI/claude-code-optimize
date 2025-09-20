/**
 * Netlify Function: session-sync
 * Receives session data from localhost:3001 and stores it for dashboard consumption
 */

import { createClient } from '@supabase/supabase-js'

// Environment variables for database storage (fallback to in-memory if not available)
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
const API_SECRET = process.env.API_SECRET || 'development-secret'

// In-memory storage fallback for development
let sessionCache = {
  active_sessions: [],
  recent_sessions: [],
  analytics: {},
  five_hour_blocks: [],
  last_updated: null
}

// Initialize Supabase client if credentials available
let supabase = null
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}

export async function handler(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const path = event.path.replace('/.netlify/functions/session-sync', '')
    
    // Handle GET requests - return cached data
    if (event.httpMethod === 'GET') {
      return handleGetRequest(path, headers)
    }
    
    // Handle POST requests - receive sync data
    if (event.httpMethod === 'POST') {
      return await handlePostRequest(event, headers)
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }

  } catch (error) {
    console.error('Handler error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    }
  }
}

function handleGetRequest(path, headers) {
  // Route different GET endpoints
  switch (path) {
    case '/status':
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'running',
          version: '1.0.0-netlify',
          last_sync: sessionCache.last_updated,
          has_localhost_connection: sessionCache.last_updated && 
            (Date.now() - new Date(sessionCache.last_updated).getTime()) < 60000,
          cache_size: {
            active_sessions: sessionCache.active_sessions.length,
            recent_sessions: sessionCache.recent_sessions.length,
            five_hour_blocks: sessionCache.five_hour_blocks.length
          }
        })
      }

    case '/sessions/active':
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(sessionCache.active_sessions)
      }

    case '/sessions/recent':
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(sessionCache.recent_sessions)
      }

    case '/analytics/current':
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(sessionCache.analytics)
      }

    case '/five-hour-blocks':
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(sessionCache.five_hour_blocks)
      }

    case '/dashboard-config':
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          real_time_enabled: true,
          session_tracking: true,
          five_hour_blocks: true,
          localhost_fallback: true,
          localhost_url: 'http://localhost:3001',
          websocket_config: {
            ping_interval: 15000,
            ping_timeout: 10000,
            reconnect_interval: 1000,
            max_reconnect_interval: 30000,
            reconnect_decay: 1.5
          }
        })
      }

    default:
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Endpoint not found' })
      }
  }
}

async function handlePostRequest(event, headers) {
  try {
    // Validate API secret for security
    const apiKey = event.headers['x-api-key'] || event.headers['X-API-Key']
    if (apiKey !== API_SECRET) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid API key' })
      }
    }

    const body = JSON.parse(event.body)
    const { source, data, timestamp } = body

    // Validate required fields
    if (!source || !data || !timestamp) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: source, data, timestamp' 
        })
      }
    }

    // Update session cache
    if (data.active_sessions) {
      sessionCache.active_sessions = data.active_sessions
    }
    if (data.recent_sessions) {
      sessionCache.recent_sessions = data.recent_sessions
    }
    if (data.analytics) {
      sessionCache.analytics = data.analytics
    }
    if (data.five_hour_blocks) {
      sessionCache.five_hour_blocks = data.five_hour_blocks
    }
    
    sessionCache.last_updated = timestamp

    // Store in Supabase if available
    if (supabase) {
      try {
        await supabase
          .from('session_sync_data')
          .upsert({
            id: 'latest',
            source,
            data,
            timestamp,
            updated_at: new Date().toISOString()
          })
      } catch (dbError) {
        console.warn('Supabase storage failed, using memory cache:', dbError.message)
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        status: 'received',
        source,
        timestamp,
        cached_items: {
          active_sessions: sessionCache.active_sessions.length,
          recent_sessions: sessionCache.recent_sessions.length,
          five_hour_blocks: sessionCache.five_hour_blocks.length
        }
      })
    }

  } catch (parseError) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Invalid JSON payload',
        message: parseError.message 
      })
    }
  }
}