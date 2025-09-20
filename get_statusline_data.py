#!/usr/bin/env python3
"""
Generates a status line for Claude Code by extracting metrics from the most recent session.
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any
from collections import defaultdict

class ClaudeCodeMetricsExtractor:
    """Extracts detailed metrics from Claude Code JSONL files"""

    def __init__(self):
        self.claude_path = Path.home() / ".claude"
        self.projects_path = self.claude_path / "projects"

    def extract_session_id(self, file_path: str) -> str:
        """Extract session ID from file path or content"""
        path = Path(file_path)
        parent_name = path.parent.name
        if parent_name.startswith("session_") or parent_name.isdigit():
            return parent_name
        stat = path.stat()
        creation_time = int(stat.st_ctime)
        return f"session_{creation_time}"

    def parse_claude_code_entry(self, entry: Dict[str, Any]) -> Dict[str, Any]:
        """Parse a single JSONL entry for metrics"""
        metrics = {
            "timestamp": entry.get("timestamp") or entry.get("created_at"),
            "tokens": {},
            "cost": 0.0,
            "model": entry.get("model") or entry.get("model_name"),
            "turn_type": entry.get("role") or entry.get("type"),
            "error": entry.get("error"),
        }
        if "usage" in entry:
            usage = entry["usage"]
            metrics["tokens"] = {
                "input": usage.get("input_tokens", 0),
                "output": usage.get("output_tokens", 0),
                "total": usage.get("total_tokens", 0),
            }
        if "cost" in entry:
            metrics["cost"] = float(entry["cost"])
        elif "total_cost_usd" in entry:
            metrics["cost"] = float(entry["total_cost_usd"])
        return metrics

    def aggregate_session_metrics(self, session_id: str, entries: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Aggregate metrics for a session"""
        aggregated: Dict[str, Any] = {
            "session_id": session_id, "start_time": None, "end_time": None,
            "total_tokens": 0, "input_tokens": 0, "output_tokens": 0,
            "total_cost": 0.0, "turn_count": 0, "models_used": set(), "error_count": 0,
        }
        for entry in entries:
            metrics = self.parse_claude_code_entry(entry)
            if metrics["timestamp"]:
                timestamp = datetime.fromisoformat(metrics["timestamp"])
                if not aggregated["start_time"] or timestamp < aggregated["start_time"]:
                    aggregated["start_time"] = timestamp
                if not aggregated["end_time"] or timestamp > aggregated["end_time"]:
                    aggregated["end_time"] = timestamp
            if metrics["tokens"]:
                aggregated["total_tokens"] += metrics["tokens"].get("total", 0)
            aggregated["total_cost"] += metrics["cost"]
            if metrics["model"]:
                aggregated["models_used"].add(metrics["model"])
            if metrics["turn_type"] in ["user", "assistant"]:
                aggregated["turn_count"] += 1
            if metrics["error"]:
                aggregated["error_count"] += 1
        
        if aggregated["start_time"]:
            aggregated["start_time"] = aggregated["start_time"].isoformat()
        if aggregated["end_time"]:
            aggregated["end_time"] = aggregated["end_time"].isoformat()
        aggregated["models_used"] = list(aggregated["models_used"])
        return aggregated

    def scan_all_sessions(self) -> List[Dict[str, Any]]:
        """Scan all JSONL files and extract session metrics"""
        all_sessions = []
        if not self.projects_path.exists():
            return all_sessions
        
        jsonl_files = list(self.projects_path.glob("**/*.jsonl"))
        for jsonl_file in jsonl_files:
            try:
                session_id = self.extract_session_id(str(jsonl_file))
                entries = []
                with open(jsonl_file, 'r') as f:
                    for line in f:
                        if line.strip():
                            try:
                                entries.append(json.loads(line.strip()))
                            except json.JSONDecodeError:
                                continue
                if entries:
                    session_metrics = self.aggregate_session_metrics(session_id, entries)
                    all_sessions.append(session_metrics)
            except Exception:
                continue
        
        all_sessions.sort(key=lambda x: x.get("start_time", ""), reverse=True)
        return all_sessions

def get_latest_session_metrics():
    """Gets the metrics for the most recent session."""
    extractor = ClaudeCodeMetricsExtractor()
    all_sessions = extractor.scan_all_sessions()
    if all_sessions:
        return all_sessions[0]
    return None

def main():
    """Prints the formatted status line."""
    metrics = get_latest_session_metrics()
    if metrics:
        status_line = (
            f"Claude Session | "
            f"Tokens: {metrics.get('total_tokens', 0):,} | "
            f"Cost: ${metrics.get('total_cost', 0):.4f} | "
            f"Turns: {metrics.get('turn_count', 0)}"
        )
        print(status_line)
    else:
        print("No Claude session data found.")

if __name__ == "__main__":
    main()
