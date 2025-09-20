# 🚀 Moonlock Dashboard Deployment Guide

## Production Deployment Options

### Option 1: Docker Deployment (Recommended)

#### Dockerfile
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS runner

WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 moonlock

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

RUN mkdir -p /app/data && chown moonlock:nodejs /app/data

USER moonlock
EXPOSE 3001

CMD ["node", "dist/server/index.js"]
```

#### Docker Compose
```yaml
version: '3.8'
services:
  moonlock-dashboard:
    build: .
    ports:
      - "3001:3001"
    volumes:
      - moonlock-data:/app/data
    environment:
      - NODE_ENV=production
      - PORT=3001
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  moonlock-data:
```

### Option 2: Cloud Platform Deployment

#### Vercel (Frontend Only)
```json
{
  "builds": [
    {
      "src": "src/client/**/*",
      "use": "@vercel/static-build",
      "config": {
        "buildCommand": "npm run build:client",
        "outputDirectory": "dist/client"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://your-backend-server.com/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

#### Railway.app (Full Stack)
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/api/health",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### Option 3: VPS/Server Deployment

#### Prerequisites
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx (optional, for reverse proxy)
sudo apt install nginx
```

#### Deployment Steps
```bash
# Clone repository
git clone <your-repo-url> moonlock-dashboard
cd moonlock-dashboard

# Install dependencies
npm ci --only=production

# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
pm2 startup
```

#### PM2 Configuration (ecosystem.config.js)
```javascript
module.exports = {
  apps: [{
    name: 'moonlock-dashboard',
    script: 'dist/server/index.js',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001,
      DB_PATH: '/var/lib/moonlock/moonlock.db'
    },
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '500M',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Environment Configuration

### Production Environment Variables
```bash
# Server Configuration
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database
DB_PATH=/var/lib/moonlock/moonlock.db

# Performance
BATCH_SIZE=10
BATCH_INTERVAL=100

# Security
CORS_ORIGIN=https://your-domain.com
```

### Environment File (.env.production)
```bash
NODE_ENV=production
PORT=3001
DB_PATH=./data/moonlock.db

# Performance optimizations
SQLITE_CACHE_SIZE=2000
SQLITE_SYNCHRONOUS=NORMAL
SQLITE_JOURNAL_MODE=WAL

# WebSocket settings
WS_HEARTBEAT_INTERVAL=30000
WS_MAX_CLIENTS=1000

# Monitoring
ENABLE_PERFORMANCE_MONITORING=true
LOG_LEVEL=info
```

## Database Setup

### SQLite Optimization for Production
```sql
-- Production SQLite configuration
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 2000;
PRAGMA temp_store = memory;
PRAGMA mmap_size = 268435456; -- 256MB
```

### Backup Strategy
```bash
#!/bin/bash
# backup-moonlock.sh

DB_PATH="/var/lib/moonlock/moonlock.db"
BACKUP_DIR="/var/backups/moonlock"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
sqlite3 $DB_PATH ".backup $BACKUP_DIR/moonlock_$DATE.db"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "moonlock_*.db" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/moonlock_$DATE.db"
```

### Automated Backup with Cron
```bash
# Add to crontab (crontab -e)
0 2 * * * /path/to/backup-moonlock.sh >/dev/null 2>&1
```

## SSL/HTTPS Setup

### Let's Encrypt with Certbot
```bash
# Install Certbot
sudo apt install snapd
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot

# Create certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal test
sudo certbot renew --dry-run
```

### Nginx HTTPS Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

    location / {
        proxy_pass http://localhost:3001;
        # ... (same proxy settings as above)
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

## Monitoring & Logging

### Health Check Endpoint
The application includes a health check at `/api/health`:
```json
{
  "status": "ok",
  "timestamp": 1640995200000,
  "uptime": 3600,
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "websocket": "5 clients",
    "sessions": 2
  }
}
```

### Log Aggregation
```bash
# Install log rotation
sudo apt install logrotate

# Create logrotate config (/etc/logrotate.d/moonlock)
/var/log/moonlock/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
}
```

### System Monitoring
```bash
# Install monitoring tools
sudo apt install htop iotop

# Monitor PM2 processes
pm2 monitor

# Check application logs
pm2 logs moonlock-dashboard

# System resource usage
htop
```

## Performance Optimization

### Node.js Production Settings
```bash
# Increase memory limit if needed
export NODE_OPTIONS="--max-old-space-size=1024"

# Enable V8 optimizations
export NODE_ENV=production
```

### Database Performance
```sql
-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_token_usage_session_timestamp ON token_usage(session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_checkpoints_session_timestamp ON checkpoints(session_id, timestamp);
```

### Client-Side Optimization
```javascript
// Enable service worker for caching
// sw.js
const CACHE_NAME = 'moonlock-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});
```

## Security Considerations

### Access Control
```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /api/ {
    limit_req zone=api burst=20 nodelay;
    # ... other settings
}
```

### Data Protection
```bash
# Set proper file permissions
sudo chown -R moonlock:nodejs /var/lib/moonlock
sudo chmod 750 /var/lib/moonlock
sudo chmod 640 /var/lib/moonlock/moonlock.db
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   sudo lsof -i :3001
   sudo kill -9 <PID>
   ```

2. **Database Lock**
   ```bash
   # Check for stale locks
   sqlite3 moonlock.db "PRAGMA wal_checkpoint(TRUNCATE);"
   ```

3. **WebSocket Connection Issues**
   ```bash
   # Check firewall
   sudo ufw allow 3001
   
   # Test WebSocket connection
   wscat -c ws://localhost:3001/ws
   ```

4. **Memory Issues**
   ```bash
   # Monitor memory usage
   pm2 monit
   
   # Restart if needed
   pm2 restart moonlock-dashboard
   ```

### Recovery Procedures

1. **Database Recovery**
   ```bash
   # Check database integrity
   sqlite3 moonlock.db "PRAGMA integrity_check;"
   
   # Restore from backup if needed
   cp /var/backups/moonlock/moonlock_latest.db /var/lib/moonlock/moonlock.db
   ```

2. **Application Recovery**
   ```bash
   # Full restart
   pm2 stop moonlock-dashboard
   pm2 start moonlock-dashboard
   
   # Check logs
   pm2 logs moonlock-dashboard --lines 100
   ```

---

**Deployment completed! Your Moonlock Dashboard is now running in production.** 🚀