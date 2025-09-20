/**
 * ModeToggle.js - Simple/Advanced mode toggle for Claude Code Optimizer Dashboard
 * Switches between ccusage-inspired minimalist view and full advanced dashboard
 */

class ModeToggle {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentMode = this.loadMode();
        this.onModeChange = null;
        this.render();
    }

    loadMode() {
        return localStorage.getItem('dashboard_mode') || 'simple';
    }

    saveMode(mode) {
        localStorage.setItem('dashboard_mode', mode);
    }

    setOnModeChange(callback) {
        this.onModeChange = callback;
    }

    render() {
        this.container.innerHTML = `
            <div class="mode-toggle-container">
                <div class="mode-toggle">
                    <label class="toggle-switch">
                        <input type="checkbox" ${this.currentMode === 'advanced' ? 'checked' : ''} 
                               onchange="window.modeToggle.handleToggle(this)">
                        <span class="slider">
                            <span class="toggle-label">
                                ${this.currentMode === 'simple' ? '📊 Simple' : '🔧 Advanced'}
                            </span>
                        </span>
                    </label>
                </div>
                <div class="mode-description">
                    ${this.currentMode === 'simple' 
                        ? 'ccusage-inspired minimalist view' 
                        : 'Full featured dashboard with all metrics'}
                </div>
            </div>
        `;

        this.addStyles();
    }

    handleToggle(checkbox) {
        const newMode = checkbox.checked ? 'advanced' : 'simple';
        this.currentMode = newMode;
        this.saveMode(newMode);
        this.render();
        
        if (this.onModeChange) {
            this.onModeChange(newMode);
        }
    }

    addStyles() {
        if (document.getElementById('mode-toggle-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'mode-toggle-styles';
        styles.textContent = `
            .mode-toggle-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                margin: 20px 0;
            }

            .mode-toggle {
                background: rgba(255, 255, 255, 0.1);
                padding: 8px 16px;
                border-radius: 25px;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
            }

            .toggle-switch {
                position: relative;
                display: inline-block;
                width: 120px;
                height: 40px;
                cursor: pointer;
            }

            .toggle-switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }

            .slider {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 20px;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            }

            .toggle-switch input:checked + .slider {
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
            }

            .toggle-label {
                color: white;
                font-weight: 600;
                font-size: 14px;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
                transition: all 0.3s ease;
            }

            .mode-description {
                color: rgba(255, 255, 255, 0.8);
                font-size: 12px;
                text-align: center;
                font-style: italic;
            }

            /* Hover effects */
            .toggle-switch:hover .slider {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0,0,0,0.3);
            }

            /* Animation for mode switch */
            .mode-switch-animation {
                animation: modeSwitch 0.5s ease-in-out;
            }

            @keyframes modeSwitch {
                0% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.7; transform: scale(0.95); }
                100% { opacity: 1; transform: scale(1); }
            }
        `;
        
        document.head.appendChild(styles);
    }
}

// Global reference for event handlers
window.ModeToggle = ModeToggle;