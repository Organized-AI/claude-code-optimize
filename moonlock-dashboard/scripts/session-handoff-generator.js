#!/usr/bin/env node

/**
 * Automatic Session Handoff Generator
 * 
 * Monitors Claude Code sessions and automatically generates handoff documents
 * when sessions end due to rate limits or other interruptions.
 */

const fs = require('fs');
const path = require('path');
const { homedir } = require('os');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration
const CLAUDE_PROJECTS_DIR = path.join(homedir(), '.claude', 'projects');
const HANDOFF_DIR = '/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer';
const supabaseUrl = 'https://rdsfgdtsbyioqilatvxu.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Track previous session state
let lastKnownSessions = new Map();
let sessionEndDetected = false;

console.log('🤖 Auto Session Handoff Generator Starting...');
console.log('📁 Monitoring:', CLAUDE_PROJECTS_DIR);
console.log('📝 Handoffs saved to:', HANDOFF_DIR);

/**
 * Parse JSONL session file to extract conversation context
 */
function parseSessionContext(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    
    if (lines.length === 0) return null;
    
    const messages = [];
    let sessionId = '';
    let startTime = 0;
    let lastActivity = 0;
    let totalTokens = 0;
    let rateLimitHit = false;
    
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        
        if (entry.sessionId) sessionId = entry.sessionId;
        if (entry.timestamp) {
          const time = new Date(entry.timestamp).getTime();
          if (!startTime) startTime = time;
          lastActivity = Math.max(lastActivity, time);
        }
        
        // Check for rate limit indicators
        if (entry.message?.content?.includes('rate limit') || 
            entry.message?.content?.includes('usage limit') ||
            entry.error?.includes('rate_limit')) {
          rateLimitHit = true;
        }
        
        // Extract conversation messages
        if (entry.message?.content) {
          messages.push({
            role: entry.message.role || 'unknown',
            content: entry.message.content.substring(0, 500), // Truncate for summary
            timestamp: entry.timestamp
          });
        }
        
        // Track token usage
        if (entry.message?.usage) {
          totalTokens += (entry.message.usage.input_tokens || 0) + 
                        (entry.message.usage.output_tokens || 0);
        }
        
      } catch (e) {
        // Skip malformed lines
      }
    }
    
    return {
      sessionId,
      startTime,
      lastActivity,
      totalTokens,
      rateLimitHit,
      messages: messages.slice(-10), // Last 10 messages for context
      duration: lastActivity - startTime,
      messageCount: messages.length
    };
    
  } catch (error) {
    console.error('Error parsing session:', error.message);
    return null;
  }
}

/**
 * Generate handoff document with session context
 */
function generateHandoffDocument(sessionContext, projectPath) {
  const timestamp = new Date().toISOString().split('T')[0];
  const timeStr = new Date().toLocaleTimeString();
  
  const handoffContent = `# 🔄 Auto-Generated Session Handoff

**Generated**: ${new Date().toLocaleString()}  
**Session ID**: ${sessionContext.sessionId.substring(0, 8)}...  
**Project**: ${path.basename(projectPath)}  
**Status**: ${sessionContext.rateLimitHit ? '⚠️ Rate Limit Detected' : '✅ Session Ended'}  

---

## 📊 **Session Summary**

- **Duration**: ${Math.round(sessionContext.duration / 1000 / 60)} minutes
- **Messages**: ${sessionContext.messageCount} exchanges
- **Tokens Used**: ${sessionContext.totalTokens.toLocaleString()}
- **Last Activity**: ${new Date(sessionContext.lastActivity).toLocaleString()}

---

## 🎯 **Session Context**

### **Recent Conversation:**
${sessionContext.messages.slice(-5).map(msg => 
  `**${msg.role.toUpperCase()}**: ${msg.content}${msg.content.length >= 500 ? '...' : ''}`
).join('\n\n')}

---

## 🚀 **To Continue This Session**

### **Quick Resume Commands:**
\`\`\`bash
# Start bridge service for live monitoring
cd "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/moonlock-dashboard"
./quick-setup.sh

# Navigate back to project
cd "${projectPath}"
\`\`\`

### **Context for Next Session:**
${sessionContext.rateLimitHit ? 
  '⚠️ **Rate Limit Hit**: Wait for rate limit reset before continuing.\n\n' : 
  '✅ **Session Ended Normally**: Ready to continue where left off.\n\n'
}

### **Key Points to Remember:**
- Session was working on: ${path.basename(projectPath)}
- Last activity: ${timeStr}
- ${sessionContext.rateLimitHit ? 'Hit rate limit - may need to wait' : 'Session completed normally'}
- Bridge service should be running for dashboard monitoring

---

## 📈 **Dashboard & Monitoring**

- **Live Dashboard**: https://moonlock-dashboard-3ktxl1dwf-jordaaans-projects.vercel.app/
- **Session Data**: Available in Supabase claude_sessions table
- **Bridge Service**: Should be running to sync data

---

## 🔍 **Troubleshooting**

If continuing the session:
1. **Check Rate Limits**: Verify if limits have reset
2. **Start Bridge Service**: Ensure monitoring is active
3. **Review Context**: Use the conversation summary above
4. **Check Dashboard**: Verify real-time data is flowing

---

**💡 This handoff was automatically generated when session activity stopped. Use this to seamlessly continue your work!**
`;

  const filename = `SESSION_HANDOFF_${timestamp}_${sessionContext.sessionId.substring(0, 8)}.md`;
  const filepath = path.join(HANDOFF_DIR, filename);
  
  fs.writeFileSync(filepath, handoffContent);
  console.log(`📝 Generated handoff: ${filename}`);
  
  return filepath;
}

/**
 * Check for session endings and generate handoffs
 */
async function checkForSessionEndings() {
  try {
    if (!fs.existsSync(CLAUDE_PROJECTS_DIR)) return;
    
    const projectDirs = fs.readdirSync(CLAUDE_PROJECTS_DIR);
    const currentSessions = new Map();
    
    // Scan current sessions
    for (const projectDir of projectDirs) {
      const projectPath = path.join(CLAUDE_PROJECTS_DIR, projectDir);
      if (!fs.statSync(projectPath).isDirectory()) continue;
      
      const files = fs.readdirSync(projectPath);
      for (const file of files) {
        if (file.endsWith('.jsonl')) {
          const filePath = path.join(projectPath, file);
          const stats = fs.statSync(filePath);
          const sessionContext = parseSessionContext(filePath);
          
          if (sessionContext) {
            currentSessions.set(sessionContext.sessionId, {
              ...sessionContext,
              filePath,
              projectPath,
              lastModified: stats.mtime.getTime()
            });
          }
        }
      }
    }
    
    // Check for sessions that have ended
    for (const [sessionId, lastSession] of lastKnownSessions) {
      const currentSession = currentSessions.get(sessionId);
      
      if (!currentSession) {
        // Session file disappeared - generate handoff
        console.log(`🔄 Session ended: ${sessionId.substring(0, 8)}...`);
        generateHandoffDocument(lastSession, lastSession.projectPath);
        
      } else if (currentSession.lastModified === lastSession.lastModified) {
        // Session hasn't been modified for a while - check if it's stale
        const timeSinceLastActivity = Date.now() - currentSession.lastActivity;
        
        if (timeSinceLastActivity > 10 * 60 * 1000) { // 10 minutes of inactivity
          console.log(`⏰ Session inactive: ${sessionId.substring(0, 8)}...`);
          generateHandoffDocument(currentSession, currentSession.projectPath);
          lastKnownSessions.delete(sessionId); // Don't generate again
        }
        
      } else if (currentSession.rateLimitHit && !lastSession.rateLimitHit) {
        // Rate limit detected
        console.log(`⚠️ Rate limit detected: ${sessionId.substring(0, 8)}...`);
        generateHandoffDocument(currentSession, currentSession.projectPath);
      }
    }
    
    // Update known sessions
    lastKnownSessions = new Map(currentSessions);
    
  } catch (error) {
    console.error('Error checking sessions:', error.message);
  }
}

/**
 * Start monitoring
 */
function startMonitoring() {
  console.log('👀 Starting session ending detection...');
  
  // Check every 30 seconds
  setInterval(checkForSessionEndings, 30000);
  
  // Initial check
  checkForSessionEndings();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Session Handoff Generator...');
  process.exit(0);
});

// Start monitoring
startMonitoring();

console.log('✅ Auto Session Handoff Generator is running!');
console.log('🔄 Will automatically generate handoff documents when sessions end');
console.log('🛑 Press Ctrl+C to stop');
