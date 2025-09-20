#!/usr/bin/env python3
"""
Token tracking and metrics for Claude Code sessions
"""
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict

@dataclass
class TokenMetrics:
    """Token usage metrics for a session or operation"""
    timestamp: str
    operation_type: str  # 'analyze', 'plan', 'code', 'review', etc.
    agent_name: str
    model_used: str
    tokens_input: int
    tokens_output: int
    tokens_cached: int
    tokens_total: int
    cost_usd: float
    efficiency_score: float
    duration_seconds: float
    
    def to_dict(self) -> Dict:
        return asdict(self)

class TokenTracker:
    """Track and analyze token usage across all Claude Code operations"""
    
    def __init__(self, project_path: str = None):
        self.project_path = Path(project_path) if project_path else Path.cwd()
        self.metrics_file = self.project_path / ".claude_token_metrics.json"
        self.current_session_metrics: List[TokenMetrics] = []
        self.load_metrics_history()
    
    def track_operation(self, 
                       operation_type: str,
                       agent_name: str,
                       model_used: str,
                       tokens_input: int,
                       tokens_output: int,
                       tokens_cached: int = 0,
                       duration_seconds: float = 0.0) -> TokenMetrics:
        """Track token usage for an operation"""
        
        # Calculate total tokens
        tokens_total = tokens_input + tokens_output
        
        # Calculate cost (example rates)
        if model_used.lower() == "claude-3-opus":
            cost_per_1k_input = 0.015
            cost_per_1k_output = 0.075
        elif model_used.lower() == "claude-3-sonnet":
            cost_per_1k_input = 0.003
            cost_per_1k_output = 0.015
        else:  # claude-3-haiku
            cost_per_1k_input = 0.00025
            cost_per_1k_output = 0.00125
        
        # Calculate cost
        cost_usd = (tokens_input * cost_per_1k_input / 1000) + \
                   (tokens_output * cost_per_1k_output / 1000)
        
        # Calculate efficiency (cached tokens save money)
        efficiency_score = min(1.0, tokens_cached / max(1, tokens_total))
        
        # Create metrics record
        metrics = TokenMetrics(
            timestamp=datetime.now().isoformat(),
            operation_type=operation_type,
            agent_name=agent_name,
            model_used=model_used,
            tokens_input=tokens_input,
            tokens_output=tokens_output,
            tokens_cached=tokens_cached,
            tokens_total=tokens_total,
            cost_usd=cost_usd,
            efficiency_score=efficiency_score,
            duration_seconds=duration_seconds
        )
        
        # Add to current session
        self.current_session_metrics.append(metrics)
        
        # Save immediately
        self.save_metrics()
        
        return metrics
    
    def get_session_summary(self) -> Dict[str, Any]:
        """Get summary of current session metrics"""
        if not self.current_session_metrics:
            return {
                "total_operations": 0,
                "total_tokens": 0,
                "total_cost": 0.0,
                "agents": {},
                "models": {},
                "efficiency": 0.0
            }
        
        # Aggregate metrics
        total_tokens = sum(m.tokens_total for m in self.current_session_metrics)
        total_cost = sum(m.cost_usd for m in self.current_session_metrics)
        total_cached = sum(m.tokens_cached for m in self.current_session_metrics)
        
        # Group by agent
        agents = {}
        for metric in self.current_session_metrics:
            if metric.agent_name not in agents:
                agents[metric.agent_name] = {
                    "operations": 0,
                    "tokens": 0,
                    "cost": 0.0,
                    "cached": 0
                }
            agents[metric.agent_name]["operations"] += 1
            agents[metric.agent_name]["tokens"] += metric.tokens_total
            agents[metric.agent_name]["cost"] += metric.cost_usd
            agents[metric.agent_name]["cached"] += metric.tokens_cached
        
        # Group by model
        models = {}
        for metric in self.current_session_metrics:
            if metric.model_used not in models:
                models[metric.model_used] = {
                    "operations": 0,
                    "tokens": 0,
                    "cost": 0.0,
                    "efficiency": []
                }
            models[metric.model_used]["operations"] += 1
            models[metric.model_used]["tokens"] += metric.tokens_total
            models[metric.model_used]["cost"] += metric.cost_usd
            models[metric.model_used]["efficiency"].append(metric.efficiency_score)
        
        # Calculate average efficiency for each model
        for model in models:
            if models[model]["efficiency"]:
                models[model]["avg_efficiency"] = sum(models[model]["efficiency"]) / len(models[model]["efficiency"])
                del models[model]["efficiency"]  # Remove raw data
        
        return {
            "total_operations": len(self.current_session_metrics),
            "total_tokens": total_tokens,
            "total_cost": round(total_cost, 4),
            "total_cached": total_cached,
            "cache_efficiency": round(total_cached / max(1, total_tokens), 3),
            "agents": agents,
            "models": models,
            "duration_minutes": round(sum(m.duration_seconds for m in self.current_session_metrics) / 60, 1)
        }
    
    def get_detailed_breakdown(self) -> List[Dict]:
        """Get detailed breakdown of all operations"""
        breakdown = []
        
        for metric in self.current_session_metrics:
            breakdown.append({
                "timestamp": metric.timestamp,
                "operation": metric.operation_type,
                "agent": metric.agent_name,
                "model": metric.model_used,
                "tokens": {
                    "input": metric.tokens_input,
                    "output": metric.tokens_output,
                    "cached": metric.tokens_cached,
                    "total": metric.tokens_total
                },
                "cost": f"${metric.cost_usd:.4f}",
                "efficiency": f"{metric.efficiency_score:.1%}",
                "duration": f"{metric.duration_seconds:.1f}s"
            })
        
        return breakdown
    
    def format_cli_summary(self) -> str:
        """Format summary for CLI display"""
        summary = self.get_session_summary()
        
        output = [""]
        output.append("🎯 TOKEN USAGE SUMMARY")
        output.append("=" * 50)
        output.append(f"📊 Total Operations: {summary['total_operations']}")
        output.append(f"🪙 Total Tokens: {summary['total_tokens']:,}")
        output.append(f"💰 Total Cost: ${summary['total_cost']:.4f}")
        output.append(f"⚡ Cache Efficiency: {summary['cache_efficiency']:.1%}")
        output.append(f"⏱️ Duration: {summary['duration_minutes']} minutes")
        
        if summary['agents']:
            output.append("\n📤 BY AGENT:")
            for agent, stats in summary['agents'].items():
                output.append(f"  {agent}:")
                output.append(f"    • Operations: {stats['operations']}")
                output.append(f"    • Tokens: {stats['tokens']:,}")
                output.append(f"    • Cost: ${stats['cost']:.4f}")
                output.append(f"    • Cached: {stats['cached']:,}")
        
        if summary['models']:
            output.append("\n🤖 BY MODEL:")
            for model, stats in summary['models'].items():
                output.append(f"  {model}:")
                output.append(f"    • Operations: {stats['operations']}")
                output.append(f"    • Tokens: {stats['tokens']:,}")
                output.append(f"    • Cost: ${stats['cost']:.4f}")
                if 'avg_efficiency' in stats:
                    output.append(f"    • Efficiency: {stats['avg_efficiency']:.1%}")
        
        return "\n".join(output)
    
    def save_metrics(self):
        """Save metrics to file"""
        all_metrics = []
        
        # Load existing if any
        if self.metrics_file.exists():
            try:
                with open(self.metrics_file, 'r') as f:
                    existing = json.load(f)
                    if isinstance(existing, list):
                        all_metrics = existing
            except:
                pass
        
        # Add current session metrics
        for metric in self.current_session_metrics:
            all_metrics.append(metric.to_dict())
        
        # Save
        with open(self.metrics_file, 'w') as f:
            json.dump(all_metrics, f, indent=2)
    
    def load_metrics_history(self):
        """Load metrics history from file"""
        if self.metrics_file.exists():
            try:
                with open(self.metrics_file, 'r') as f:
                    data = json.load(f)
                    # Don't load into current session, just verify file exists
                    return True
            except:
                pass
        return False
    
    def clear_session(self):
        """Clear current session metrics"""
        self.current_session_metrics = []

# Example usage for tracking this session
if __name__ == "__main__":
    tracker = TokenTracker()
    
    # Track the Week 1 implementation
    tracker.track_operation(
        operation_type="foundation_setup",
        agent_name="claude_code_optimizer",
        model_used="claude-3-opus",
        tokens_input=15234,  # Estimated from prompt
        tokens_output=8921,  # Estimated from responses
        tokens_cached=2103,  # Some cached from file reads
        duration_seconds=420  # 7 minutes
    )
    
    print(tracker.format_cli_summary())