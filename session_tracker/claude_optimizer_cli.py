#!/usr/bin/env python3
"""
Claude Code Optimizer CLI - Intelligent Model Selection System

This is the main CLI interface for the intelligent model selection and cost optimization system.
It provides easy access to all optimization features and integrates with existing session tracking.

Usage Examples:
  python claude_optimizer_cli.py recommend "Fix a bug in Python code"
  python claude_optimizer_cli.py analyze
  python claude_optimizer_cli.py optimize --savings-target 30
  python claude_optimizer_cli.py monitor --dashboard
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
import logging

from intelligent_model_selector import IntelligentModelSelector, ModelType
from deploy_cost_optimization import deploy_cost_optimization_system


class ClaudeOptimizerCLI:
    """Main CLI interface for the Claude Code Optimizer."""
    
    def __init__(self, database_path: str = None):
        self.database_path = database_path or "claude_usage.db"
        self.model_selector = IntelligentModelSelector(self.database_path)
        
        # Configure logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)
    
    def recommend_model(self, task_description: str, show_details: bool = True) -> dict:
        """Get model recommendation for a task."""
        print(f"🤔 Analyzing task: \"{task_description}\"")
        print("-" * 60)
        
        recommendation = self.model_selector.recommend_model(task_description)
        
        if show_details:
            # Pretty print recommendation
            print(f"🎯 RECOMMENDED MODEL: {recommendation.recommended_model.value}")
            print(f"📊 Confidence: {recommendation.confidence:.1%}")
            print(f"⚡ Complexity Score: {recommendation.complexity_score}/10")
            print(f"💰 Estimated Cost: ${recommendation.estimated_cost:.4f}")
            print(f"💵 Potential Savings: ${recommendation.potential_savings:.4f}")
            print(f"🧠 Rationale: {recommendation.rationale}")
            print(f"⚠️  Risk Assessment: {recommendation.risk_assessment}")
            
            if recommendation.alternative_model:
                print(f"🔄 Alternative: {recommendation.alternative_model.value}")
            
            # Show cost comparison
            self._show_cost_comparison(recommendation)
        
        return {
            'model': recommendation.recommended_model.value,
            'confidence': recommendation.confidence,
            'complexity': recommendation.complexity_score,
            'cost': recommendation.estimated_cost,
            'savings': recommendation.potential_savings
        }
    
    def _show_cost_comparison(self, recommendation):
        """Show cost comparison across all models."""
        print("\n📈 COST COMPARISON:")
        
        # Estimate tokens (simplified)
        estimated_input = 100 + (recommendation.complexity_score * 50)
        estimated_output = 200 + (recommendation.complexity_score * 100)
        
        from intelligent_model_selector import MODEL_PRICING
        
        for model_type in ModelType:
            pricing = MODEL_PRICING[model_type]
            cost = pricing.calculate_cost(estimated_input, estimated_output)
            
            marker = "👉" if model_type == recommendation.recommended_model else "  "
            print(f"{marker} {model_type.value}: ${cost:.4f}")
    
    def analyze_optimization(self, detailed: bool = True) -> dict:
        """Analyze cost optimization opportunities."""
        print("🔍 Analyzing cost optimization opportunities...")
        print("-" * 60)
        
        analysis = self.model_selector.analyze_cost_optimization_opportunities()
        
        if 'error' in analysis:
            print(f"❌ Error: {analysis['error']}")
            return analysis
        
        summary = analysis.get('analysis_summary', {})
        
        # Print summary
        print(f"📊 OPTIMIZATION ANALYSIS RESULTS:")
        print(f"   Sessions Analyzed: {summary.get('sessions_analyzed', 0):,}")
        print(f"   Current Total Cost: ${summary.get('current_total_cost', 0):.4f}")
        print(f"   Optimized Total Cost: ${summary.get('optimized_total_cost', 0):.4f}")
        print(f"   Potential Savings: ${summary.get('potential_savings', 0):.4f}")
        print(f"   Savings Percentage: {summary.get('savings_percentage', 0):.1f}%")
        print(f"   Target Achievement: {'✅' if summary.get('target_achieved', False) else '❌'}")
        
        opportunities = analysis.get('optimization_opportunities', {})
        high_impact = opportunities.get('high_impact_sessions', 0)
        if high_impact > 0:
            print(f"\n🎯 HIGH-IMPACT OPPORTUNITIES:")
            print(f"   Sessions with major savings potential: {high_impact}")
            print(f"   Total opportunity savings: ${opportunities.get('total_opportunity_savings', 0):.4f}")
        
        # Show model transition recommendations
        transitions = analysis.get('model_transition_recommendations', {})
        if transitions and detailed:
            print(f"\n🔄 RECOMMENDED MODEL TRANSITIONS:")
            for transition, data in transitions.items():
                print(f"   {transition}: {data['count']} sessions, ${data['total_savings']:.4f} savings")
        
        # Show recommendations
        recommendations = analysis.get('recommendations', [])
        if recommendations:
            print(f"\n💡 RECOMMENDATIONS:")
            for rec in recommendations:
                print(f"   • {rec}")
        
        return analysis
    
    def project_usage(self, days: int = 30) -> dict:
        """Project usage and costs for planning."""
        print(f"📅 Projecting usage and costs for next {days} days...")
        print("-" * 60)
        
        projection = self.model_selector.generate_usage_projection(days)
        
        if 'error' in projection:
            print(f"❌ Error: {projection['error']}")
            return projection
        
        print(f"📈 USAGE PROJECTION ({days} days):")
        print(f"   Projected Token Usage: {projection.get('projected_token_usage', 0):,}")
        
        strategies = projection.get('cost_strategies', {})
        print(f"\n💰 COST STRATEGIES:")
        for strategy, cost in strategies.items():
            marker = "👉" if strategy == 'optimized_selection' else "  "
            print(f"{marker} {strategy.replace('_', ' ').title()}: ${cost:.4f}")
        
        optimization = projection.get('optimization_impact', {})
        print(f"\n🎯 OPTIMIZATION IMPACT:")
        print(f"   Current Pattern Cost: ${optimization.get('current_cost', 0):.4f}")
        print(f"   Optimized Cost: ${optimization.get('optimized_cost', 0):.4f}")
        print(f"   Potential Savings: ${optimization.get('potential_savings', 0):.4f}")
        print(f"   Savings Percentage: {optimization.get('savings_percentage', 0):.1f}%")
        
        readiness = projection.get('rate_limit_readiness', {})
        print(f"\n📊 RATE LIMIT READINESS:")
        print(f"   Days to Limits: {readiness.get('days_to_limit', 0)}")
        print(f"   Projected Daily Cost: ${readiness.get('projected_daily_cost', 0):.4f}")
        print(f"   Optimization Status: {readiness.get('optimization_status', 'Unknown')}")
        
        return projection
    
    def deploy_system(self) -> dict:
        """Deploy the complete optimization system."""
        print("🚀 Deploying complete cost optimization system...")
        return deploy_cost_optimization_system(self.database_path)
    
    def quick_tips(self):
        """Show quick optimization tips."""
        print("💡 CLAUDE CODE OPTIMIZER - QUICK TIPS")
        print("=" * 50)
        
        tips = [
            "🎯 Use Haiku for: Simple syntax fixes, basic queries, formatting",
            "⚡ Use Sonnet for: Standard development, debugging, refactoring",
            "🧠 Use Opus for: Architecture design, complex algorithms, security analysis",
            "📊 Check costs regularly with: python claude_optimizer_cli.py analyze",
            "🔍 Get recommendations with: python claude_optimizer_cli.py recommend \"your task\"",
            "📈 Monitor usage with: python claude_optimizer_cli.py project --days 30",
            "🎪 Deploy full system with: python claude_optimizer_cli.py deploy"
        ]
        
        for tip in tips:
            print(f"   {tip}")
        
        print(f"\n🎯 TARGET: 30% cost reduction by Aug 28, 2025")
        print(f"💪 Current optimization tools are ready to help you achieve this goal!")
    
    def interactive_mode(self):
        """Run interactive optimization session."""
        print("🤖 CLAUDE CODE OPTIMIZER - INTERACTIVE MODE")
        print("=" * 50)
        print("Type 'help' for commands, 'quit' to exit")
        
        while True:
            try:
                user_input = input("\n🎯 optimizer> ").strip()
                
                if user_input.lower() in ['quit', 'exit', 'q']:
                    print("👋 Goodbye! Keep optimizing those costs!")
                    break
                
                elif user_input.lower() in ['help', 'h']:
                    self._show_interactive_help()
                
                elif user_input.lower() in ['analyze', 'a']:
                    self.analyze_optimization()
                
                elif user_input.lower().startswith('recommend ') or user_input.lower().startswith('r '):
                    task = user_input[user_input.find(' ') + 1:]
                    if task:
                        self.recommend_model(task)
                    else:
                        print("❌ Please provide a task description")
                
                elif user_input.lower().startswith('project'):
                    parts = user_input.split()
                    days = 30
                    if len(parts) > 1 and parts[1].isdigit():
                        days = int(parts[1])
                    self.project_usage(days)
                
                elif user_input.lower() in ['tips', 't']:
                    self.quick_tips()
                
                elif user_input.lower() in ['deploy', 'd']:
                    confirm = input("Deploy complete system? (y/N): ")
                    if confirm.lower() == 'y':
                        self.deploy_system()
                
                else:
                    print(f"❓ Unknown command: {user_input}")
                    print("Type 'help' for available commands")
                    
            except KeyboardInterrupt:
                print("\n\n👋 Goodbye!")
                break
            except Exception as e:
                print(f"❌ Error: {e}")
    
    def _show_interactive_help(self):
        """Show interactive mode help."""
        print("\n🤖 AVAILABLE COMMANDS:")
        print("   recommend <task>  - Get model recommendation for task")
        print("   r <task>         - Short form of recommend")
        print("   analyze          - Analyze optimization opportunities")
        print("   a                - Short form of analyze")
        print("   project [days]   - Project usage (default 30 days)")
        print("   tips             - Show optimization tips")
        print("   t                - Short form of tips")
        print("   deploy           - Deploy complete optimization system")
        print("   d                - Short form of deploy")
        print("   help             - Show this help")
        print("   h                - Short form of help")
        print("   quit             - Exit interactive mode")
        print("   q                - Short form of quit")


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description='Claude Code Optimizer - Intelligent Model Selection',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s recommend "Fix a Python syntax error"
  %(prog)s analyze
  %(prog)s project --days 30
  %(prog)s deploy
  %(prog)s interactive
  %(prog)s tips
        """
    )
    
    parser.add_argument('--database', default='claude_usage.db',
                       help='Path to SQLite database (default: claude_usage.db)')
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Recommend command
    rec_parser = subparsers.add_parser('recommend', help='Get model recommendation for task')
    rec_parser.add_argument('task', help='Task description')
    rec_parser.add_argument('--json', action='store_true', help='Output as JSON')
    
    # Analyze command
    analyze_parser = subparsers.add_parser('analyze', help='Analyze optimization opportunities')
    analyze_parser.add_argument('--json', action='store_true', help='Output as JSON')
    
    # Project command
    project_parser = subparsers.add_parser('project', help='Project usage and costs')
    project_parser.add_argument('--days', type=int, default=30, help='Days to project (default: 30)')
    project_parser.add_argument('--json', action='store_true', help='Output as JSON')
    
    # Deploy command
    subparsers.add_parser('deploy', help='Deploy complete optimization system')
    
    # Interactive command
    subparsers.add_parser('interactive', help='Start interactive mode')
    
    # Tips command
    subparsers.add_parser('tips', help='Show optimization tips')
    
    args = parser.parse_args()
    
    # Initialize CLI
    cli = ClaudeOptimizerCLI(args.database)
    
    # Handle commands
    if args.command == 'recommend':
        result = cli.recommend_model(args.task, show_details=not args.json)
        if args.json:
            print(json.dumps(result, indent=2))
    
    elif args.command == 'analyze':
        result = cli.analyze_optimization(detailed=not args.json)
        if args.json:
            print(json.dumps(result, indent=2, default=str))
    
    elif args.command == 'project':
        result = cli.project_usage(args.days)
        if args.json:
            print(json.dumps(result, indent=2, default=str))
    
    elif args.command == 'deploy':
        cli.deploy_system()
    
    elif args.command == 'interactive':
        cli.interactive_mode()
    
    elif args.command == 'tips':
        cli.quick_tips()
    
    else:
        # No command specified, show quick start
        print("🤖 CLAUDE CODE OPTIMIZER")
        print("=" * 40)
        print("Intelligent model selection for 30% cost savings")
        print("")
        print("Quick start:")
        print("  python claude_optimizer_cli.py tips")
        print("  python claude_optimizer_cli.py recommend \"your task\"")
        print("  python claude_optimizer_cli.py analyze")
        print("  python claude_optimizer_cli.py interactive")
        print("")
        print("For detailed help: python claude_optimizer_cli.py --help")


if __name__ == "__main__":
    main()