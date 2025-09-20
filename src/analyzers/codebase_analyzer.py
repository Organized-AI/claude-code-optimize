#!/usr/bin/env python3
"""
Analyze projects to recommend optimal Claude Code sessions
"""
import os
import subprocess
from pathlib import Path
from typing import Dict, List, Any
import yaml

class ProjectAnalyzer:
    """Analyze projects to recommend optimal Claude Code sessions"""
    
    def __init__(self, project_path: str):
        self.project_path = Path(project_path)
        self.analysis_cache = {}
    
    def analyze_project(self) -> Dict[str, Any]:
        """Comprehensive project analysis"""
        
        analysis = {
            'project_info': self.get_project_info(),
            'file_analysis': self.analyze_files(),
            'complexity_metrics': self.calculate_complexity(),
            'git_analysis': self.analyze_git_history(),
            'test_analysis': self.analyze_tests(),
            'recommendations': []
        }
        
        # Generate session recommendations
        analysis['recommendations'] = self.generate_recommendations(analysis)
        
        return analysis
    
    def get_project_info(self) -> Dict:
        """Basic project information"""
        return {
            'name': self.project_path.name,
            'path': str(self.project_path),
            'exists': self.project_path.exists(),
            'is_git_repo': (self.project_path / '.git').exists()
        }
    
    def analyze_files(self) -> Dict:
        """Analyze project files"""
        code_extensions = {'.py', '.js', '.ts', '.java', '.cpp', '.c', '.go', '.rs', '.php', '.rb'}
        config_extensions = {'.yaml', '.yml', '.json', '.toml', '.ini', '.cfg'}
        test_patterns = {'test_', '_test', '.test.', 'spec_', '_spec', '.spec.'}
        
        files = list(self.project_path.rglob('*'))
        code_files = [f for f in files if f.suffix in code_extensions]
        config_files = [f for f in files if f.suffix in config_extensions]
        test_files = [f for f in files if any(pattern in f.name.lower() for pattern in test_patterns)]
        
        total_lines = 0
        for code_file in code_files:
            try:
                with open(code_file, 'r', encoding='utf-8', errors='ignore') as f:
                    total_lines += len(f.readlines())
            except:
                continue
        
        return {
            'total_files': len(files),
            'code_files': len(code_files),
            'config_files': len(config_files),
            'test_files': len(test_files),
            'total_lines': total_lines,
            'avg_lines_per_file': total_lines / max(1, len(code_files))
        }
    
    def calculate_complexity(self) -> Dict:
        """Calculate project complexity metrics"""
        file_analysis = self.analysis_cache.get('file_analysis') or self.analyze_files()
        
        # Simple complexity heuristics
        complexity_score = 0.0
        
        # File count complexity
        if file_analysis['code_files'] > 100:
            complexity_score += 0.3
        elif file_analysis['code_files'] > 50:
            complexity_score += 0.2
        elif file_analysis['code_files'] > 20:
            complexity_score += 0.1
        
        # Lines of code complexity
        if file_analysis['total_lines'] > 50000:
            complexity_score += 0.3
        elif file_analysis['total_lines'] > 20000:
            complexity_score += 0.2
        elif file_analysis['total_lines'] > 5000:
            complexity_score += 0.1
        
        # Average file size complexity
        if file_analysis['avg_lines_per_file'] > 500:
            complexity_score += 0.2
        elif file_analysis['avg_lines_per_file'] > 200:
            complexity_score += 0.1
        
        # Test coverage impact
        test_ratio = file_analysis['test_files'] / max(1, file_analysis['code_files'])
        if test_ratio < 0.2:
            complexity_score += 0.2  # Low test coverage adds complexity
        
        return {
            'complexity_score': min(1.0, complexity_score),
            'file_complexity': file_analysis['code_files'] / 100,
            'size_complexity': file_analysis['total_lines'] / 50000,
            'test_coverage_ratio': test_ratio
        }
    
    def analyze_git_history(self) -> Dict:
        """Analyze git history for project activity"""
        if not (self.project_path / '.git').exists():
            return {'is_git_repo': False}
        
        try:
            # Get recent commits
            result = subprocess.run([
                'git', 'log', '--since=30 days ago', '--oneline'
            ], cwd=self.project_path, capture_output=True, text=True)
            
            recent_commits = result.stdout.strip().split('\n') if result.stdout else []
            
            # Get contributors
            result = subprocess.run([
                'git', 'shortlog', '-sn', '--since=30 days ago'
            ], cwd=self.project_path, capture_output=True, text=True)
            
            contributors = len(result.stdout.strip().split('\n')) if result.stdout else 0
            
            return {
                'is_git_repo': True,
                'recent_commits': len(recent_commits),
                'active_contributors': contributors,
                'activity_level': 'high' if len(recent_commits) > 50 else 'medium' if len(recent_commits) > 10 else 'low'
            }
        except:
            return {'is_git_repo': True, 'analysis_failed': True}
    
    def analyze_tests(self) -> Dict:
        """Analyze test structure and coverage"""
        file_analysis = self.analysis_cache.get('file_analysis') or self.analyze_files()
        
        test_ratio = file_analysis['test_files'] / max(1, file_analysis['code_files'])
        
        coverage_level = 'high' if test_ratio > 0.5 else 'medium' if test_ratio > 0.2 else 'low'
        
        return {
            'test_files': file_analysis['test_files'],
            'test_ratio': test_ratio,
            'coverage_level': coverage_level,
            'needs_testing': test_ratio < 0.3
        }
    
    def generate_recommendations(self, analysis: Dict) -> List[Dict]:
        """Generate session recommendations based on analysis"""
        recommendations = []
        
        complexity = analysis['complexity_metrics']['complexity_score']
        test_coverage = analysis['test_analysis']['test_ratio']
        file_count = analysis['file_analysis']['code_files']
        
        # Always start with planning for complex projects
        if complexity > 0.5 or file_count > 50:
            recommendations.append({
                'type': 'planning',
                'duration': 180 if complexity > 0.7 else 120,
                'priority': 'high',
                'reason': f'High complexity ({complexity:.1%}) requires thorough planning',
                'token_estimate': 30000 if complexity > 0.7 else 25000
            })
        else:
            recommendations.append({
                'type': 'planning',
                'duration': 90,
                'priority': 'medium', 
                'reason': 'Basic planning session',
                'token_estimate': 20000
            })
        
        # Coding sessions based on project size
        if file_count > 100:
            recommendations.extend([
                {
                    'type': 'coding',
                    'duration': 300,
                    'priority': 'high',
                    'reason': 'Large codebase requires extended sessions',
                    'token_estimate': 100000
                },
                {
                    'type': 'coding', 
                    'duration': 240,
                    'priority': 'high',
                    'reason': 'Continue implementation',
                    'token_estimate': 75000
                }
            ])
        elif file_count > 20:
            recommendations.append({
                'type': 'coding',
                'duration': 240,
                'priority': 'high',
                'reason': 'Medium-sized project development',
                'token_estimate': 75000
            })
        else:
            recommendations.append({
                'type': 'coding',
                'duration': 180,
                'priority': 'medium',
                'reason': 'Small project implementation',
                'token_estimate': 50000
            })
        
        # Testing recommendations
        if test_coverage < 0.2:
            recommendations.append({
                'type': 'testing',
                'duration': 240,
                'priority': 'high',
                'reason': f'Very low test coverage ({test_coverage:.1%}) needs attention',
                'token_estimate': 60000
            })
        elif test_coverage < 0.5:
            recommendations.append({
                'type': 'testing',
                'duration': 180,
                'priority': 'medium',
                'reason': f'Moderate test coverage ({test_coverage:.1%}) can be improved',
                'token_estimate': 45000
            })
        
        # Always recommend review
        recommendations.append({
            'type': 'review',
            'duration': 90,
            'priority': 'medium',
            'reason': 'Code review and optimization',
            'token_estimate': 20000
        })
        
        return recommendations

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        analyzer = ProjectAnalyzer(sys.argv[1])
        analysis = analyzer.analyze_project()
        print("📊 Project Analysis Complete")
        print(f"Complexity: {analysis['complexity_metrics']['complexity_score']:.1%}")
        print(f"Recommendations: {len(analysis['recommendations'])} sessions")
    else:
        print("Usage: python codebase_analyzer.py /path/to/project")