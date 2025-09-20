#!/usr/bin/env python3
"""
Cost Optimization Deployment Script (No Flask Dependencies)

Simplified deployment script that sets up the intelligent model selection system
without web dashboard dependencies.
"""

import sqlite3
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional

from intelligent_model_selector import IntelligentModelSelector


def deploy_cost_optimization_system(database_path: str) -> Dict[str, Any]:
    """Deploy the cost optimization system without web dependencies."""
    
    print("🚀 Deploying Claude Code Optimizer - Cost Optimization System")
    print("=" * 70)
    
    results = {
        'deployment_timestamp': datetime.now().isoformat(),
        'target_savings': 30.0,
        'rate_limit_date': '2025-08-28',
        'components_deployed': [],
        'baseline_analysis': {},
        'optimization_analysis': {},
        'savings_roadmap': {},
        'next_steps': []
    }
    
    try:
        # Initialize model selector
        print("📊 Initializing Intelligent Model Selector...")
        model_selector = IntelligentModelSelector(database_path)
        results['components_deployed'].append('IntelligentModelSelector')
        
        # Analyze current optimization opportunities
        print("🔍 Analyzing current optimization opportunities...")
        optimization_analysis = model_selector.analyze_cost_optimization_opportunities()
        results['optimization_analysis'] = optimization_analysis
        
        if 'error' not in optimization_analysis:
            summary = optimization_analysis.get('analysis_summary', {})
            print(f"   📈 Sessions Analyzed: {summary.get('sessions_analyzed', 0)}")
            print(f"   💰 Current Potential Savings: {summary.get('savings_percentage', 0):.1f}%")
            print(f"   🎯 Target Achievement: {'✅' if summary.get('target_achieved', False) else '❌'}")
        
        # Generate usage projection
        print("📅 Generating usage projection for rate limit planning...")
        usage_projection = model_selector.generate_usage_projection(30)
        results['usage_projection'] = usage_projection
        
        if 'error' not in usage_projection:
            optimization_impact = usage_projection.get('optimization_impact', {})
            print(f"   💸 Projected Monthly Savings: ${optimization_impact.get('potential_savings', 0):.2f}")
            print(f"   📊 Optimization Percentage: {optimization_impact.get('savings_percentage', 0):.1f}%")
        
        # Generate 30% savings roadmap
        print("🗺️  Generating 30% cost savings roadmap...")
        roadmap = generate_savings_roadmap(optimization_analysis)
        results['savings_roadmap'] = roadmap
        
        # Generate next steps
        print("🎯 Generating actionable next steps...")
        next_steps = generate_next_steps(database_path)
        results['next_steps'] = next_steps
        
        # Save deployment report
        report_path = save_deployment_report(results)
        print(f"📄 Deployment report saved: {report_path}")
        
        results['deployment_success'] = True
        
        # Print summary
        print_deployment_summary(results)
        
        return results
        
    except Exception as e:
        print(f"❌ Deployment failed: {e}")
        results['deployment_success'] = False
        results['error'] = str(e)
        return results


def generate_savings_roadmap(optimization_analysis: Dict[str, Any]) -> Dict[str, Any]:
    """Generate 30% cost savings roadmap."""
    
    current_savings = optimization_analysis.get('analysis_summary', {}).get('savings_percentage', 0)
    gap_to_target = max(0, 30.0 - current_savings)
    
    roadmap = {
        'target': '30% cost reduction',
        'current_progress': f'{current_savings:.1f}%',
        'gap_remaining': f'{gap_to_target:.1f}%',
        'timeline': 'Aug 28, 2025 rate limit preparation',
        'phases': []
    }
    
    # Phase 1: Immediate Optimization (0-2 weeks)
    phase1_savings = min(gap_to_target, 10)
    phase1 = {
        'phase': 1,
        'name': 'Immediate Optimization',
        'timeline': '0-2 weeks',
        'target_savings': f'{phase1_savings:.1f}%',
        'priority': 'CRITICAL',
        'actions': [
            'Deploy intelligent model selector for all new tasks',
            'Review and optimize high-cost sessions from last 30 days',
            'Implement task complexity analysis in development workflow',
            'Reduce Opus usage to <20% of total token consumption',
            'Set up cost monitoring and alerts'
        ]
    }
    
    # Phase 2: Pattern Optimization (2-6 weeks)
    phase2_savings = min(gap_to_target - phase1_savings, 12)
    phase2 = {
        'phase': 2,
        'name': 'Usage Pattern Optimization', 
        'timeline': '2-6 weeks',
        'target_savings': f'{phase2_savings:.1f}%',
        'priority': 'HIGH',
        'actions': [
            'Automate model recommendations in development tools',
            'Train team on optimal model selection patterns',
            'Implement batch processing and task grouping',
            'Establish cost budgets per project/workflow',
            'Optimize token usage through prompt engineering'
        ]
    }
    
    # Phase 3: Advanced Optimization (6-12 weeks)
    phase3_savings = max(0, gap_to_target - phase1_savings - phase2_savings)
    phase3 = {
        'phase': 3,
        'name': 'Advanced System Optimization',
        'timeline': '6-12 weeks',
        'target_savings': f'{phase3_savings:.1f}%',
        'priority': 'MEDIUM',
        'actions': [
            'Implement predictive cost modeling',
            'Deploy automated task routing based on complexity',
            'Implement caching and result reuse strategies',
            'Advanced rate limiting and usage policies',
            'Cross-project optimization and sharing'
        ]
    }
    
    roadmap['phases'] = [phase1, phase2, phase3]
    
    return roadmap


def generate_next_steps(database_path: str) -> List[Dict[str, Any]]:
    """Generate prioritized next steps."""
    
    next_steps = [
        {
            'priority': 1,
            'timeframe': 'Next 24 hours',
            'action': 'Test Model Recommendations',
            'command': f'python intelligent_model_selector.py {database_path} --recommend "your task description"',
            'description': 'Test the intelligent model selector with various task descriptions',
            'expected_outcome': 'Understand model recommendations for different complexity levels'
        },
        {
            'priority': 2,
            'timeframe': 'Next 24 hours',
            'action': 'Analyze Historical Usage',
            'command': f'python intelligent_model_selector.py {database_path} --analyze-optimization',
            'description': 'Run comprehensive analysis of historical usage patterns',
            'expected_outcome': 'Detailed report of optimization opportunities'
        },
        {
            'priority': 3,
            'timeframe': 'Next week',
            'action': 'Implement Model Selection in Workflow',
            'description': 'Integrate model recommendations into daily development workflow',
            'expected_outcome': 'Consistent use of optimal models for different task types'
        },
        {
            'priority': 4,
            'timeframe': 'Next week',
            'action': 'Set Up Cost Monitoring',
            'description': 'Implement daily/weekly cost tracking and threshold alerts',
            'expected_outcome': 'Proactive cost management and optimization'
        },
        {
            'priority': 5,
            'timeframe': 'Next month',
            'action': 'Team Training and Documentation',
            'description': 'Train team on cost optimization tools and create usage guidelines',
            'expected_outcome': 'Increased adoption and effective use of optimization tools'
        }
    ]
    
    return next_steps


def save_deployment_report(results: Dict[str, Any]) -> str:
    """Save deployment report to file."""
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    report_path = f'cost_optimization_deployment_{timestamp}.json'
    
    with open(report_path, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    # Also create markdown summary
    summary_path = f'COST_OPTIMIZATION_SUMMARY_{datetime.now().strftime("%Y%m%d")}.md'
    create_markdown_summary(results, summary_path)
    
    return report_path


def create_markdown_summary(results: Dict[str, Any], summary_path: str):
    """Create human-readable markdown summary."""
    
    lines = [
        "# Claude Code Optimizer - Cost Optimization System",
        f"**Deployment Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        f"**Target:** 30% cost reduction",
        f"**Rate Limit Date:** 2025-08-28",
        "",
        "## Deployment Status",
        "✅ **SYSTEM DEPLOYED SUCCESSFULLY**" if results.get('deployment_success') else "❌ **DEPLOYMENT FAILED**",
        ""
    ]
    
    # Optimization Analysis
    opt_analysis = results.get('optimization_analysis', {})
    if opt_analysis and 'analysis_summary' in opt_analysis:
        summary = opt_analysis['analysis_summary']
        lines.extend([
            "## Current Analysis",
            f"- Sessions Analyzed: {summary.get('sessions_analyzed', 0):,}",
            f"- Potential Savings: {summary.get('savings_percentage', 0):.1f}%",
            f"- Current Cost: ${summary.get('current_total_cost', 0):.4f}",
            f"- Optimized Cost: ${summary.get('optimized_total_cost', 0):.4f}",
            f"- Target Achievement: {'✅ Yes' if summary.get('target_achieved', False) else '❌ No'}",
            ""
        ])
    
    # Savings Roadmap
    roadmap = results.get('savings_roadmap', {})
    if roadmap and 'phases' in roadmap:
        lines.extend([
            "## 30% Cost Savings Roadmap",
            f"- **Current Progress:** {roadmap.get('current_progress', 'N/A')}",
            f"- **Remaining Gap:** {roadmap.get('gap_remaining', 'N/A')}",
            f"- **Timeline:** {roadmap.get('timeline', 'N/A')}",
            ""
        ])
        
        for phase in roadmap['phases']:
            lines.extend([
                f"### Phase {phase['phase']}: {phase['name']}",
                f"- **Timeline:** {phase['timeline']}",
                f"- **Target Savings:** {phase['target_savings']}",
                f"- **Priority:** {phase['priority']}",
                f"- **Key Actions:**"
            ])
            for action in phase['actions']:
                lines.append(f"  - {action}")
            lines.append("")
    
    # Next Steps
    next_steps = results.get('next_steps', [])
    if next_steps:
        lines.extend([
            "## Next Steps",
            ""
        ])
        
        for step in next_steps:
            lines.extend([
                f"### {step['priority']}. {step['action']} ({step['timeframe']})",
                f"**Description:** {step['description']}",
                f"**Expected Outcome:** {step['expected_outcome']}"
            ])
            if 'command' in step:
                lines.append(f"**Command:** `{step['command']}`")
            lines.append("")
    
    # Usage Examples
    lines.extend([
        "## Quick Start Examples",
        "",
        "### Test Model Recommendations",
        "```bash",
        f"python intelligent_model_selector.py {results.get('database_path', 'claude_usage.db')} --recommend \"Fix a simple bug\"",
        f"python intelligent_model_selector.py {results.get('database_path', 'claude_usage.db')} --recommend \"Design microservices architecture\"",
        "```",
        "",
        "### Analyze Optimization Opportunities",
        "```bash",
        f"python intelligent_model_selector.py {results.get('database_path', 'claude_usage.db')} --analyze-optimization",
        "```",
        "",
        "### Project Usage and Costs",
        "```bash",
        f"python intelligent_model_selector.py {results.get('database_path', 'claude_usage.db')} --project-usage 30",
        "```",
        "",
        "---",
        "*Report generated by Claude Code Optimizer Cost Optimization System*"
    ])
    
    with open(summary_path, 'w') as f:
        f.write('\n'.join(lines))


def print_deployment_summary(results: Dict[str, Any]):
    """Print deployment summary to console."""
    
    print("\n" + "=" * 70)
    print("🎉 COST OPTIMIZATION SYSTEM DEPLOYMENT COMPLETE!")
    print("=" * 70)
    
    # Current Status
    opt_analysis = results.get('optimization_analysis', {})
    if 'analysis_summary' in opt_analysis:
        summary = opt_analysis['analysis_summary']
        print(f"📊 CURRENT STATUS:")
        print(f"   Sessions Analyzed: {summary.get('sessions_analyzed', 0):,}")
        print(f"   Potential Savings: {summary.get('savings_percentage', 0):.1f}%")
        print(f"   Target Achievement: {'✅' if summary.get('target_achieved', False) else '❌'}")
    
    # Roadmap Summary
    roadmap = results.get('savings_roadmap', {})
    if roadmap:
        print(f"\n💰 SAVINGS ROADMAP:")
        print(f"   Target: {roadmap.get('target', 'N/A')}")
        print(f"   Current Progress: {roadmap.get('current_progress', 'N/A')}")
        print(f"   Remaining Gap: {roadmap.get('gap_remaining', 'N/A')}")
    
    # Next Steps
    next_steps = results.get('next_steps', [])
    if next_steps:
        print(f"\n🎯 IMMEDIATE NEXT STEPS:")
        for i, step in enumerate(next_steps[:3], 1):
            print(f"   {i}. {step['action']} ({step['timeframe']})")
            if 'command' in step:
                print(f"      Command: {step['command']}")
    
    print(f"\n📄 Reports saved:")
    print(f"   - cost_optimization_deployment_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    print(f"   - COST_OPTIMIZATION_SUMMARY_{datetime.now().strftime('%Y%m%d')}.md")
    
    print("\n🚀 System ready for cost optimization!")
    print("=" * 70)


def main():
    """Main function."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Deploy Cost Optimization System')
    parser.add_argument('database', help='Path to SQLite database')
    
    args = parser.parse_args()
    
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    # Deploy system
    results = deploy_cost_optimization_system(args.database)
    
    if not results.get('deployment_success'):
        print(f"❌ Deployment failed: {results.get('error', 'Unknown error')}")
        exit(1)


if __name__ == "__main__":
    main()