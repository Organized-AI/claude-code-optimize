// WORKING SESSION TRACKER - Direct port from localhost:5173
// This replaces all conflicting session timer logic

class WorkingSessionTracker {
    constructor() {
        this.sessionStartTime = Date.now();
        this.sessionDuration = 5 * 60 * 60 * 1000; // 5 hours in milliseconds
        this.sessionTokenLimit = 1000;
        this.weeklyTokenLimit = 10000;
        
        // Token tracking
        this.currentTokens = 0;
        this.tokenHistory = [];
        this.rateHistory = [];
        this.sessionHistory = [];
        
        // Rate limiting data
        this.weeklyUsage = 0;
        this.dailyUsage = [];
        this.sessionsToday = 0;
        
        console.log('🚀 Working Session Tracker initialized with start time:', new Date(this.sessionStartTime));
        this.init();
    }

    init() {
        this.startUpdateLoop();
        this.setupEventListeners();
        this.loadStoredData();
        this.simulateRealisticActivity();
        console.log('✅ Working session tracker fully initialized');
    }

    startUpdateLoop() {
        // This is the key - update every second like the working version
        setInterval(() => {
            this.updateTimers();
            this.updateWeeklyStats();
            this.saveDataToStorage();
        }, 1000);
        console.log('⏰ Session update loop started');
    }

    updateTimers() {
        const now = Date.now();
        const sessionElapsed = now - this.sessionStartTime;
        const sessionRemaining = Math.max(0, this.sessionDuration - sessionElapsed);
        
        // Update session timer - this is the exact working logic
        const hours = Math.floor(sessionRemaining / 3600000);
        const minutes = Math.floor((sessionRemaining % 3600000) / 60000);
        const seconds = Math.floor((sessionRemaining % 60000) / 1000);
        
        const timerElement = document.getElementById('sessionTimer');
        if (timerElement) {
            timerElement.textContent = 
                `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
        
        // Update next replenishment
        const resetTime = new Date(this.sessionStartTime + this.sessionDuration);
        const nextReplenishElement = document.getElementById('nextReplenishment');
        if (nextReplenishElement) {
            nextReplenishElement.textContent = resetTime.toLocaleTimeString([], {
                hour: '2-digit', 
                minute: '2-digit'
            });
        }
        
        // Update progress bar
        const progressElement = document.getElementById('sessionProgressBar');
        if (progressElement) {
            const progress = (sessionElapsed / this.sessionDuration) * 100;
            progressElement.style.width = Math.min(progress, 100) + '%';
            
            // Color coding
            if (progress < 50) {
                progressElement.style.background = 'linear-gradient(90deg, #10b981 0%, #059669 100%)';
            } else if (progress < 80) {
                progressElement.style.background = 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)';
            } else {
                progressElement.style.background = 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)';
            }
        }
        
        // Update burn rate
        const burnRateElement = document.getElementById('burnRate');
        if (burnRateElement) {
            const burnRate = sessionElapsed > 0 ? Math.round((this.currentTokens / sessionElapsed) * 60000) : 0;
            burnRateElement.textContent = this.formatNumber(burnRate) + '/min';
        }
        
        // Update session status
        const statusElement = document.getElementById('sessionStatus');
        if (statusElement) {
            let status = '';
            if (sessionRemaining > 0) {
                status = '🟢 Active Session';
                statusElement.className = 'stat-subvalue status-active';
            } else {
                status = '✅ Tokens Replenished';
                statusElement.className = 'stat-subvalue status-replenished';
            }
            statusElement.textContent = status;
        }
        
        // Auto-reset session if time expires
        if (sessionRemaining === 0 && sessionElapsed > this.sessionDuration) {
            this.resetSession();
        }
    }

    updateWeeklyStats() {
        // Mock weekly data for demonstration - same as working version
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
        weekStart.setHours(0, 0, 0, 0);
        
        const weeklyPercent = (this.weeklyUsage / this.weeklyTokenLimit) * 100;
        const dailyAvg = Math.round(this.weeklyUsage / 7);
    }

    simulateRealisticActivity() {
        // Simulate token usage like the working version
        setInterval(() => {
            // Random token increases to simulate activity
            const increase = Math.floor(Math.random() * 50) + 10;
            this.currentTokens += increase;
            
            // Add to history
            this.tokenHistory.push({
                timestamp: Date.now(),
                tokens: this.currentTokens
            });
            
            // Keep only recent history
            if (this.tokenHistory.length > 100) {
                this.tokenHistory = this.tokenHistory.slice(-50);
            }
            
            this.weeklyUsage += increase;
        }, 30000 + Math.random() * 30000); // Every 30-60 seconds
    }

    resetSession() {
        console.log('🔄 Resetting session automatically');
        this.sessionStartTime = Date.now();
        this.currentTokens = 0;
        this.tokenHistory = [];
        this.rateHistory = [];
        this.sessionsToday++;
        
        this.saveDataToStorage();
    }

    setupEventListeners() {
        // Reset button functionality
        const resetButton = document.getElementById('resetSession') || 
                           document.querySelector('.session-reset-btn');
        
        if (resetButton) {
            resetButton.addEventListener('click', () => this.resetSession());
        }
        
        // Keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
                e.preventDefault();
                this.resetSession();
            }
        });
    }

    loadStoredData() {
        try {
            const stored = localStorage.getItem('working-session-tracker-data');
            if (stored) {
                const data = JSON.parse(stored);
                this.sessionStartTime = data.sessionStartTime || Date.now();
                this.currentTokens = data.currentTokens || 0;
                this.weeklyUsage = data.weeklyUsage || 0;
                this.sessionsToday = data.sessionsToday || 0;
                this.tokenHistory = data.tokenHistory || [];
                this.rateHistory = data.rateHistory || [];
                console.log('📁 Loaded stored session data');
            }
        } catch (e) {
            console.warn('Failed to load stored data:', e);
        }
    }

    saveDataToStorage() {
        try {
            const data = {
                sessionStartTime: this.sessionStartTime,
                currentTokens: this.currentTokens,
                weeklyUsage: this.weeklyUsage,
                sessionsToday: this.sessionsToday,
                tokenHistory: this.tokenHistory.slice(-50),
                rateHistory: this.rateHistory.slice(-50)
            };
            localStorage.setItem('working-session-tracker-data', JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save data:', e);
        }
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }
}

// Initialize the working session tracker when loaded
let workingTracker = null;

// Override any existing session tracking when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Initializing working session tracker override...');
    
    // Clear any existing intervals
    if (window.sessionUpdateInterval) {
        clearInterval(window.sessionUpdateInterval);
    }
    
    // Small delay to ensure DOM is ready
    setTimeout(() => {
        // Initialize working tracker
        workingTracker = new WorkingSessionTracker();
        
        // Make it globally accessible
        window.workingSessionTracker = workingTracker;
        
        console.log('✅ Working session tracker is now active and should show live timer!');
    }, 1000);
});

// Additional CSS for status indicators
const workingTrackerStyle = document.createElement('style');
workingTrackerStyle.textContent = `
    .status-active { 
        color: #10b981 !important; 
        font-weight: 600;
    }
    .status-replenished { 
        color: #10b981 !important; 
        font-weight: 600;
    }
    .session-timer {
        font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace !important;
        letter-spacing: 0.05em;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    .session-progress-bar {
        transition: width 1s ease, background 0.5s ease;
        border-radius: 4px;
    }
`;
document.head.appendChild(workingTrackerStyle);

console.log('🎯 Working Session Tracker loaded - should fix the --:-- issue!');
