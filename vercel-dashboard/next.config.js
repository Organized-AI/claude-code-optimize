/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
    DATABASE_PATH: process.env.DATABASE_PATH || '../dashboard-server/claude-monitor.db'
  },
}

module.exports = nextConfig
