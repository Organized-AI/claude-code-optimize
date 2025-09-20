/**
 * SimpleDashboard.js - ccusage-inspired minimalist dashboard for Claude Code Optimizer
 * Provides essential metrics in a clean, terminal-inspired layout
 */

class SimpleDashboard {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.data = null;
        this.refreshInterval = null;
        this.render();
        this.startAutoRefresh();
    }

    async fetchData() {
        try {
            const [statusResponse, limitsResponse, sessionsResponse] = await Promise.all([
                fetch('/api/status/current'),
                fetch('/api/limits/weekly'), 
                fetch('/api/reports/sessions?days=3')
            ]);

            this.data = {
                status: await statusResponse.json(),
                limits: await limitsResponse.json(),
                recent_sessions: (await sessionsResponse.json()).sessions || []
            };

        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
            this.data = null;
        }
    }

    render() {
        if (!this.data) {
            this.container.innerHTML = `
                <div class="simple-dashboard loading">
                    <div class="loading-message">
                        <div class="spinner"></div>
                        Loading Claude Code data...
                    </div>
                </div>
            `;
            return;
        }

        this.container.innerHTML = `
            <div class="simple-dashboard">
                <div class="simple-header">
                    <h1>Claude Code Optimizer</h1>
                    <div class="simple-subtitle">ccusage-style monitoring with optimization features</div>
                </div>
                
                <div class="simple-content">
                    ${this.renderCurrentStatus()}
                    ${this.renderWeeklyQuota()}
                    ${this.renderRecentSessions()}
                    ${this.renderQuickActions()}
                </div>
            </div>
        `;

        this.addStyles();
    }

    renderCurrentStatus() {
        const status = this.data.status;
        
        if (status && status.active_session) {
            const duration = status.duration_hours || 0;
            const model = (status.model || 'unknown').toLowerCase();
            const tokens = status.tokens_used || 0;
            const project = status.project_name || 'Unknown';
            
            // 5-hour block progress
            const blockProgress = (duration / 5.0) * 100;
            const blockWarning = duration >= 4.0;
            
            return `
                <div class="simple-card current-status">
                    <h3>🟢 Current Session</h3>
                    <div class="status-line ${blockWarning ? 'warning' : ''}">
                        <span class="duration">${duration.toFixed(1)}h</span>
                        <span class="separator">|</span>
                        <span class="model model-${model}">${model.charAt(0).toUpperCase() + model.slice(1)}</span>
                        <span class="separator">|</span>
                        <span class="tokens">${tokens.toLocaleString()} tokens</span>
                    </div>
                    <div class="project-info">Project: ${project}</div>
                    
                    <div class="block-progress">
                        <div class="block-progress-bar">
                            <div class="block-progress-fill" style="width: ${blockProgress}%"></div>
                        </div>
                        <div class="block-info">
                            ${duration.toFixed(1)}h / 5.0h block 
                            ${blockWarning ? '⚠️' : ''}
                        </div>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="simple-card current-status idle">
                    <h3>⚪ No Active Session</h3>
                    <div class="status-line">
                        Ready to start Claude Code optimization
                    </div>
                    <div class="idle-message">
                        All models available for new sessions
                    </div>
                </div>
            `;
        }
    }

    renderWeeklyQuota() {
        const limits = this.data.limits;
        if (!limits) return '';

        const usage = limits.usage || {};
        const percentages = limits.percentages || {};
        const trafficLight = limits.traffic_light || {};

        const sonnetPercent = percentages.sonnet || 0;
        const opusPercent = percentages.opus || 0;
        const maxPercent = Math.max(sonnetPercent, opusPercent);

        const statusEmoji = trafficLight.emoji || '⚪';
        const statusText = trafficLight.status || 'unknown';
        const message = trafficLight.message || 'Status unknown';

        return `
            <div class="simple-card quota-status ${statusText}">
                <h3>${statusEmoji} Weekly Quota Status</h3>
                <div class="quota-summary">
                    <span class="quota-status-text">${statusText.toUpperCase()}</span>
                    <span class="quota-percentage">${maxPercent.toFixed(1)}% used</span>
                </div>
                <div class="quota-message">${message}</div>
                
                <div class="quota-breakdown">
                    <div class="quota-item">
                        <span class="quota-label">Sonnet:</span>
                        <span class="quota-value">${(usage.sonnet || 0).toFixed(1)}h / 432h</span>
                        <span class="quota-percent">(${sonnetPercent.toFixed(1)}%)</span>
                    </div>
                    <div class="quota-item">
                        <span class="quota-label">Opus:</span>
                        <span class="quota-value">${(usage.opus || 0).toFixed(1)}h / 36h</span>
                        <span class="quota-percent">(${opusPercent.toFixed(1)}%)</span>
                    </div>
                </div>
            </div>
        `;
    }

    renderRecentSessions() {
        const sessions = this.data.recent_sessions.slice(0, 5);
        
        if (!sessions.length) {
            return `
                <div class="simple-card recent-sessions">
                    <h3>Recent Sessions</h3>
                    <div class="no-sessions">No recent sessions found</div>
                </div>
            `;
        }

        const sessionsList = sessions.map(session => {
            const date = new Date(session.start_time).toLocaleDateString();
            const duration = (session.duration_hours || 0).toFixed(1);
            const model = (session.model || 'unknown').toLowerCase();
            const project = session.project_name || 'Unknown';
            const tokens = session.total_tokens || 0;

            return `
                <div class="session-item">
                    <div class="session-main">
                        <span class="session-project">${project}</span>
                        <span class="session-duration">${duration}h</span>
                        <span class="session-model model-${model}">${model}</span>
                    </div>
                    <div class="session-details">
                        <span class="session-date">${date}</span>
                        <span class="session-tokens">${tokens.toLocaleString()} tokens</span>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="simple-card recent-sessions">
                <h3>Recent Sessions (${sessions.length})</h3>
                <div class="sessions-list">
                    ${sessionsList}
                </div>
            </div>
        `;
    }

    renderQuickActions() {
        return `
            <div class="simple-card quick-actions">
                <h3>Quick Actions</h3>
                <div class="actions-grid">
                    <button class="action-btn plan-btn" onclick="simpleDashboard.runCLICommand('plan')">
                        📋 Plan Session
                    </button>
                    <button class="action-btn limits-btn" onclick="simpleDashboard.runCLICommand('limits')">
                        ⚡ Check Limits
                    </button>
                    <button class="action-btn optimize-btn" onclick="simpleDashboard.runCLICommand('optimize')">
                        🎯 Optimize
                    </button>
                    <button class="action-btn advanced-btn" onclick="simpleDashboard.switchToAdvanced()">
                        🔧 Advanced View
                    </button>
                </div>
            </div>
        `;
    }

    runCLICommand(command) {
        // Simulate CLI command execution
        const modal = document.createElement('div');
        modal.className = 'cli-modal';
        modal.innerHTML = `
            <div class="cli-modal-content">
                <div class="cli-header">
                    <span>Claude Code Optimizer CLI</span>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="cli-output">
                    <div class="cli-command">$ cco ${command}</div>
                    <div class="cli-result">
                        ${this.getCLIExample(command)}
                    </div>
                </div>
                <div class="cli-footer">
                    Install CLI: <code>pip install claude-code-optimizer</code>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    getCLIExample(command) {
        switch (command) {
            case 'plan':
                return `
                    <div class="cli-example">
                        Project Analysis: current-project<br>
                        ══════════════════════════════════════<br>
                        Complexity Level: <span style="color: #fbbf24">Medium</span><br>
                        Estimated Time: 3-4 hours<br>
                        Recommended Model: <span style="color: #10b981">Sonnet</span><br>
                        Suggested Sessions: 1<br><br>
                        Analysis: 42 files, moderate complexity<br>
                        Quota Status: 🟢 Safe - Normal usage recommended
                    </div>
                `;
            case 'limits':
                return `
                    <div class="cli-example">
                        ┌─────────────────────────────────────┐<br>
                        │ 🟢 <strong>GREEN</strong>                            │<br>
                        │ Safe - Normal usage recommended    │<br>
                        └─────────────────────────────────────┘<br><br>
                        Quota Details:<br>
                        &nbsp;&nbsp;Sonnet: 25.2h / 432h (5.8%) ✅<br>
                        &nbsp;&nbsp;Opus: 3.3h / 36h (9.2%) ✅
                    </div>
                `;
            case 'optimize':
                return `
                    <div class="cli-example">
                        Claude Code Optimization Analysis<br>
                        ══════════════════════════════════════<br>
                        Overall Efficiency: <span style="color: #10b981">7.2/10</span><br>
                        Tokens per Hour: 4,250<br><br>
                        <strong>Recommendations:</strong><br>
                        • Schedule work around 14:00 for peak efficiency<br>
                        • Good efficiency - consider optimizing timing<br>
                        • All models available for optimal results
                    </div>
                `;
            default:
                return 'Command executed successfully.';
        }
    }

    switchToAdvanced() {
        if (window.modeToggle) {
            window.modeToggle.currentMode = 'advanced';
            window.modeToggle.saveMode('advanced');
            window.modeToggle.render();
            if (window.modeToggle.onModeChange) {
                window.modeToggle.onModeChange('advanced');
            }
        }
    }

    startAutoRefresh() {
        this.fetchData().then(() => this.render());
        
        this.refreshInterval = setInterval(async () => {
            await this.fetchData();
            this.render();
        }, 30000); // Refresh every 30 seconds
    }

    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }

    addStyles() {
        if (document.getElementById('simple-dashboard-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'simple-dashboard-styles';
        styles.textContent = `
            .simple-dashboard {
                max-width: 800px;
                margin: 0 auto;
                padding: 0 20px;
                font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
            }

            .simple-header {
                text-align: center;
                margin-bottom: 30px;
            }

            .simple-header h1 {
                color: white;
                font-size: 2.2em;
                margin-bottom: 8px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }

            .simple-subtitle {
                color: rgba(255, 255, 255, 0.8);
                font-size: 14px;
                font-style: italic;
            }

            .simple-content {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }

            .simple-card {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 20px;
                backdrop-filter: blur(10px);
                color: white;
                transition: all 0.3s ease;
            }

            .simple-card:hover {
                background: rgba(255, 255, 255, 0.08);
                border-color: rgba(255, 255, 255, 0.2);
            }

            .simple-card h3 {
                margin-bottom: 15px;
                font-size: 1.1em;
                color: #e5e7eb;
            }

            /* Current Status */
            .current-status .status-line {
                display: flex;
                align-items: center;
                gap: 12px;
                font-size: 1.1em;
                font-weight: 500;
                margin-bottom: 10px;
            }

            .current-status .status-line.warning {
                color: #fbbf24;
            }

            .separator {
                color: rgba(255, 255, 255, 0.4);
            }

            .model-sonnet { color: #3b82f6; }
            .model-opus { color: #a855f7; }
            .model-haiku { color: #10b981; }

            .project-info {
                color: rgba(255, 255, 255, 0.7);
                font-size: 0.9em;
                margin-bottom: 15px;
            }

            .block-progress {
                margin-top: 15px;
            }

            .block-progress-bar {
                height: 6px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                overflow: hidden;
                margin-bottom: 8px;
            }

            .block-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #10b981 0%, #fbbf24 70%, #ef4444 90%);
                border-radius: 3px;
                transition: width 0.5s ease;
            }

            .block-info {
                font-size: 0.85em;
                color: rgba(255, 255, 255, 0.7);
            }

            .idle-message {
                color: rgba(255, 255, 255, 0.6);
                font-style: italic;
                margin-top: 10px;
            }

            /* Quota Status */
            .quota-status.green { border-left: 4px solid #10b981; }
            .quota-status.yellow { border-left: 4px solid #fbbf24; }
            .quota-status.red { border-left: 4px solid #ef4444; }

            .quota-summary {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }

            .quota-status-text {
                font-weight: 600;
                font-size: 1.1em;
            }

            .quota-percentage {
                font-size: 1.2em;
                font-weight: 500;
            }

            .quota-message {
                color: rgba(255, 255, 255, 0.8);
                margin-bottom: 15px;
                font-style: italic;
            }

            .quota-breakdown {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .quota-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .quota-item:last-child {
                border-bottom: none;
            }

            .quota-label {
                font-weight: 500;
            }

            .quota-value {
                color: rgba(255, 255, 255, 0.9);
            }

            .quota-percent {
                color: rgba(255, 255, 255, 0.7);
                font-size: 0.9em;
            }

            /* Recent Sessions */
            .sessions-list {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .session-item {
                padding: 12px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                border: 1px solid rgba(255, 255, 255, 0.05);
            }

            .session-main {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 6px;
            }

            .session-project {
                font-weight: 500;
                color: #e5e7eb;
            }

            .session-duration {
                color: #3b82f6;
                font-weight: 500;
            }

            .session-details {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 0.85em;
                color: rgba(255, 255, 255, 0.6);
            }

            .no-sessions {
                color: rgba(255, 255, 255, 0.6);
                font-style: italic;
                text-align: center;
                padding: 20px 0;
            }

            /* Quick Actions */
            .actions-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
            }

            .action-btn {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: white;
                padding: 12px 16px;
                border-radius: 8px;
                font-size: 0.9em;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .action-btn:hover {
                background: rgba(255, 255, 255, 0.15);
                border-color: rgba(255, 255, 255, 0.3);
                transform: translateY(-2px);
            }

            .plan-btn { border-left: 4px solid #3b82f6; }
            .limits-btn { border-left: 4px solid #10b981; }
            .optimize-btn { border-left: 4px solid #fbbf24; }
            .advanced-btn { border-left: 4px solid #a855f7; }

            /* CLI Modal */
            .cli-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }

            .cli-modal-content {
                background: #1f2937;
                border-radius: 12px;
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                overflow: hidden;
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
            }

            .cli-header {
                background: #374151;
                color: white;
                padding: 15px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #4b5563;
            }

            .cli-header button {
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .cli-header button:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .cli-output {
                padding: 20px;
                font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
                color: #e5e7eb;
                background: #111827;
            }

            .cli-command {
                color: #10b981;
                margin-bottom: 15px;
                font-weight: 500;
            }

            .cli-result {
                color: #e5e7eb;
                line-height: 1.6;
            }

            .cli-example {
                font-size: 14px;
                white-space: pre-line;
            }

            .cli-footer {
                background: #374151;
                padding: 12px 20px;
                color: rgba(255, 255, 255, 0.7);
                font-size: 0.85em;
                border-top: 1px solid #4b5563;
            }

            .cli-footer code {
                background: rgba(255, 255, 255, 0.1);
                padding: 2px 6px;
                border-radius: 4px;
                font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
            }

            /* Loading state */
            .loading {
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 200px;
            }

            .loading-message {
                display: flex;
                align-items: center;
                gap: 15px;
                color: rgba(255, 255, 255, 0.8);
                font-size: 1.1em;
            }

            .spinner {
                width: 20px;
                height: 20px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-top: 2px solid white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            /* Responsive design */
            @media (max-width: 768px) {
                .simple-dashboard {
                    padding: 0 15px;
                }

                .actions-grid {
                    grid-template-columns: 1fr;
                }

                .quota-breakdown {
                    font-size: 0.9em;
                }

                .session-main {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 6px;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
}

// Global reference
window.SimpleDashboard = SimpleDashboard;