#!/usr/bin/env python3
"""
Live Claude Code Session Dashboard
Displays real-time session status including "LIVE SESSION ACTIVE"
"""

import streamlit as st
import json
import os
from datetime import datetime, timedelta
import time
from pathlib import Path

# Page config
st.set_page_config(
    page_title="Claude Code Live Monitor",
    page_icon="🚀",
    layout="wide",
    initial_sidebar_state="collapsed"
)

class LiveSessionDashboard:
    def __init__(self):
        self.state_file = "dashboard_state/current_session.json"
        self.refresh_interval = 2  # seconds
    
    def render(self):
        """Render the main dashboard"""
        
        # Custom CSS for animations and styling
        st.markdown("""
        <style>
            .live-active {
                background: linear-gradient(90deg, #ff4444, #ff6b6b);
                padding: 20px;
                border-radius: 10px;
                text-align: center;
                animation: pulse 2s infinite;
                margin: 20px 0;
            }
            
            .live-inactive {
                background: #f0f0f0;
                padding: 20px;
                border-radius: 10px;
                text-align: center;
                border: 2px dashed #ccc;
                margin: 20px 0;
            }
            
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.7; }
                100% { opacity: 1; }
            }
            
            .metric-card {
                background: white;
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                margin: 10px 0;
            }
        </style>
        """, unsafe_allow_html=True)
        
        # Header
        st.markdown("# 🚀 Claude Code Live Session Monitor")
        st.markdown("*Real-time monitoring of Claude Code sessions*")
        
        # Get current session data
        session_data = self._get_session_data()
        
        # Main status display
        if session_data and session_data.get("status") == "ACTIVE":
            self._render_active_session(session_data)
        else:
            self._render_inactive_session(session_data)
        
        # Auto-refresh
        time.sleep(self.refresh_interval)
        st.rerun()
    
    def _render_active_session(self, session_data: dict):
        """Render active session display"""
        
        data = session_data.get("data", {})
        session_id = data.get("session_id", "Unknown")[:8]
        
        # LIVE SESSION ACTIVE indicator
        st.markdown(f"""
        <div class="live-active">
            <h2 style="color: white; margin: 0;">
                🔴 **LIVE SESSION ACTIVE**
            </h2>
            <p style="color: white; margin: 5px 0;">
                Session: {session_id}
            </p>
            <p style="color: white; margin: 5px 0; font-size: 14px;">
                Started: {self._format_time(data.get("start_time", ""))}
            </p>
        </div>
        """, unsafe_allow_html=True)
        
        # Real-time metrics
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            cost = data.get("total_cost_usd", 0.0)
            st.metric(
                label="💰 Cost (USD)",
                value=f"${cost:.4f}",
                delta=f"+${cost:.4f}" if cost > 0 else None
            )
        
        with col2:
            turns = data.get("num_turns", 0)
            st.metric(
                label="🔄 Turns",
                value=str(turns),
                delta=f"+{turns}" if turns > 0 else None
            )
        
        with col3:
            duration_ms = data.get("duration_ms", 0)
            duration_sec = duration_ms / 1000 if duration_ms else 0
            st.metric(
                label="⏱️ Duration",
                value=f"{duration_sec:.1f}s",
                delta=f"+{duration_sec:.1f}s" if duration_sec > 0 else None
            )
        
        with col4:
            # Calculate session duration
            session_duration = self._calculate_session_duration(data.get("start_time", ""))
            st.metric(
                label="📊 Session Time",
                value=session_duration,
                delta="Running" if session_duration != "Unknown" else None
            )
        
        # Session details
        st.markdown("### 📋 Session Details")
        
        details_col1, details_col2 = st.columns(2)
        
        with details_col1:
            st.info(f"**Command:** {data.get('command', 'N/A')}")
            
        with details_col2:
            if cost > 0 and turns > 0:
                efficiency = turns / cost if cost > 0 else 0
                st.success(f"**Efficiency:** {efficiency:.1f} turns/$")
            else:
                st.warning("**Status:** Initializing...")
        
        # Progress indicator
        st.markdown("### ⚡ Live Activity")
        progress_bar = st.progress(0.5, text="Session in progress...")
    
    def _render_inactive_session(self, session_data: dict):
        """Render inactive session display"""
        
        st.markdown("""
        <div class="live-inactive">
            <h3 style="color: #666; margin: 0;">
                ⚫ No Active Session
            </h3>
            <p style="color: #999; margin: 5px 0;">
                Waiting for Claude Code to start...
            </p>
        </div>
        """, unsafe_allow_html=True)
        
        # Show last session info if available
        if session_data and session_data.get("status") in ["COMPLETED", "INTERRUPTED"]:
            st.markdown("### 📊 Last Session")
            
            last_data = session_data.get("data", {})
            
            col1, col2, col3 = st.columns(3)
            
            with col1:
                cost = last_data.get("total_cost_usd", 0.0)
                st.metric("Final Cost", f"${cost:.4f}")
            
            with col2:
                turns = last_data.get("num_turns", 0)
                st.metric("Total Turns", str(turns))
            
            with col3:
                duration_ms = last_data.get("duration_ms", 0)
                duration_sec = duration_ms / 1000 if duration_ms else 0
                st.metric("Duration", f"{duration_sec:.1f}s")
            
            # Status
            status = session_data.get("status", "Unknown")
            if status == "COMPLETED":
                st.success("✅ Session completed successfully")
            elif status == "INTERRUPTED":
                st.warning("⚠️ Session was interrupted")
        
        # Instructions
        st.markdown("### 🚀 How to Start Monitoring")
        st.code("""
# Run Claude Code with monitoring:
python src/usage_tracker/session_monitor.py --help

# Or use the wrapper in your terminal:
python src/usage_tracker/session_monitor.py ask "Help me debug this code"
        """)
    
    def _get_session_data(self) -> dict:
        """Get current session data from state file"""
        try:
            if os.path.exists(self.state_file):
                with open(self.state_file, 'r') as f:
                    data = json.load(f)
                
                # Check if data is recent (within last 30 seconds for active sessions)
                timestamp = datetime.fromisoformat(data.get("timestamp", ""))
                time_diff = datetime.now() - timestamp
                
                if data.get("status") == "ACTIVE" and time_diff > timedelta(seconds=30):
                    # Session might be stale
                    return {"status": "INACTIVE", "data": {}}
                
                return data
        
        except Exception as e:
            st.error(f"Error reading session data: {e}")
        
        return {"status": "INACTIVE", "data": {}}
    
    def _format_time(self, time_str: str) -> str:
        """Format timestamp for display"""
        try:
            dt = datetime.fromisoformat(time_str)
            return dt.strftime("%H:%M:%S")
        except:
            return "Unknown"
    
    def _calculate_session_duration(self, start_time_str: str) -> str:
        """Calculate how long the session has been running"""
        try:
            start_time = datetime.fromisoformat(start_time_str)
            duration = datetime.now() - start_time
            
            total_seconds = int(duration.total_seconds())
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            seconds = total_seconds % 60
            
            if hours > 0:
                return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
            else:
                return f"{minutes:02d}:{seconds:02d}"
                
        except:
            return "Unknown"


# Streamlit app entry point
if __name__ == "__main__":
    dashboard = LiveSessionDashboard()
    dashboard.render()
