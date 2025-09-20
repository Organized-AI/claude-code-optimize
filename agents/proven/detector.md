# Detector Agent Specification

## Agent Identity
**Name**: Detector Agent  
**Primary Role**: Intelligent project analysis and context detection
**Specialization**: Project type detection, file categorization, pattern recognition
**Token Budget**: 4,000-6,000 tokens (18% of project)

## Claude Code Agent Template

```bash
claude --dangerously-skip-permissions --model claude-sonnet-4-20250514 \
  --agent detector \
  --system-prompt "You are the Detector Agent, responsible for intelligent analysis of projects and files to provide rich context for notification routing decisions.

## Your Specialized Responsibilities:

**PRIMARY FUNCTION**: Implement sophisticated project detection and file analysis that enables context-aware notification routing based on project type, file importance, and development patterns.

**CORE COMPONENTS**:
1. **Project Detector** (`hooks/detection/project_detector.py`)
2. **File Categorizer** (`hooks/detection/file_categorizer.py`)  
3. **Pattern Matcher** (`hooks/detection/pattern_matcher.py`)
4. **Context Analysis** with confidence scoring

**KEY FEATURES**:
- Intelligent project type detection (React, Python, Django, Next.js, etc.)
- File importance categorization (critical, source, test, config, documentation)
- Pattern recognition for project structures and conventions
- Confidence scoring for analysis reliability
- Performance optimization with intelligent caching

**INTEGRATION REQUIREMENTS**:
- Provide context analysis to Router Agent for routing decisions
- Support real-time analysis for hook events  
- Cache analysis results for performance optimization
- Handle edge cases and unknown project types gracefully

**PERFORMANCE TARGETS**:
- <100ms project type detection
- >90% accuracy for common project types
- <25ms file categorization  
- Intelligent caching to minimize redundant analysis

Focus on providing accurate, fast, and reliable project analysis that enables intelligent notification routing decisions."
```

## Core Implementation

### Project Detector
```python
#!/usr/bin/env python3
# /// script
# requires-python = ">=3.13"
# dependencies = [
#     "pathlib",
#     "json",
# ]
# ///

from pathlib import Path
from typing import Dict, List, Tuple
import json

class ProjectDetector:
    def __init__(self):
        self.detection_patterns = self.load_detection_patterns()
        self.confidence_thresholds = self.load_confidence_thresholds()
        self.analysis_cache = {}
    
    def detect_project_type(self, project_root: Path) -> Tuple[str, float]:
        """Detect project type with confidence score"""
        cache_key = str(project_root.absolute())
        
        if cache_key in self.analysis_cache:
            cached = self.analysis_cache[cache_key]
            if self.is_cache_valid(cached):
                return cached['project_type'], cached['confidence']
        
        # Analyze project structure
        scores = {}
        for project_type, patterns in self.detection_patterns.items():
            scores[project_type] = self.calculate_project_score(project_root, patterns)
        
        # Find best match
        best_match = max(scores.items(), key=lambda x: x[1])
        project_type, confidence = best_match
        
        # Cache result
        self.analysis_cache[cache_key] = {
            'project_type': project_type,
            'confidence': confidence,
            'timestamp': time.time()
        }
        
        return project_type, confidence
    
    def calculate_project_score(self, project_root: Path, patterns: Dict) -> float:
        """Calculate confidence score for project type"""
        score = 0.0
        max_score = 0.0
        
        # Check for required files
        for file_pattern, weight in patterns.get('required_files', {}).items():
            max_score += weight
            if self.file_exists(project_root, file_pattern):
                score += weight
        
        # Check for indicator files  
        for file_pattern, weight in patterns.get('indicator_files', {}).items():
            max_score += weight
            if self.file_exists(project_root, file_pattern):
                score += weight
        
        # Check for directory patterns
        for dir_pattern, weight in patterns.get('directories', {}).items():
            max_score += weight
            if self.directory_exists(project_root, dir_pattern):
                score += weight
        
        return score / max_score if max_score > 0 else 0.0
    
    def load_detection_patterns(self) -> Dict:
        """Load project detection patterns"""
        return {
            'react': {
                'required_files': {
                    'package.json': 3.0,
                    'src/App.jsx': 2.0,
                    'src/App.tsx': 2.0
                },
                'indicator_files': {
                    'public/index.html': 1.5,
                    'src/index.js': 1.5,
                    'src/index.tsx': 1.5
                },
                'directories': {
                    'src/': 1.0,
                    'public/': 1.0,
                    'node_modules/': 0.5
                }
            },
            'python': {
                'required_files': {
                    'requirements.txt': 2.5,
                    'pyproject.toml': 2.5,
                    'setup.py': 2.0
                },
                'indicator_files': {
                    '*.py': 2.0,
                    'main.py': 1.5,
                    'app.py': 1.5
                },
                'directories': {
                    'src/': 1.0,
                    'tests/': 1.0,
                    '__pycache__/': 0.5
                }
            },
            'nextjs': {
                'required_files': {
                    'next.config.js': 3.0,
                    'package.json': 2.0
                },
                'indicator_files': {
                    'pages/': 2.0,
                    'app/': 2.0,
                    'components/': 1.5
                }
            }
        }
```

### File Categorizer
```python
class FileCategorizer:
    def __init__(self):
        self.category_patterns = self.load_category_patterns()
    
    def categorize_file(self, file_path: str) -> Tuple[str, float]:
        """Categorize file importance with confidence"""
        if not file_path:
            return 'unknown', 0.0
        
        path = Path(file_path)
        
        # Check critical file patterns
        if self.is_critical_file(path):
            return 'critical', 0.95
        
        # Check file type patterns
        for category, patterns in self.category_patterns.items():
            if self.matches_patterns(path, patterns):
                confidence = self.calculate_category_confidence(path, patterns)
                return category, confidence
        
        return 'other', 0.5
    
    def is_critical_file(self, path: Path) -> bool:
        """Check if file is critical to project"""
        critical_files = [
            'package.json', 'requirements.txt', 'Dockerfile',
            '.env', '.env.local', '.env.production',
            'docker-compose.yml', 'pyproject.toml'
        ]
        
        return path.name in critical_files
    
    def load_category_patterns(self) -> Dict:
        """Load file categorization patterns"""
        return {
            'source': {
                'extensions': ['.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.cpp', '.c'],
                'patterns': ['src/**', 'lib/**', 'components/**']
            },
            'test': {
                'extensions': ['.test.js', '.spec.js', '.test.py', '.spec.py'],
                'patterns': ['test/**', 'tests/**', '**/*test*', '**/*spec*']
            },
            'config': {
                'extensions': ['.json', '.yml', '.yaml', '.toml', '.ini'],
                'patterns': ['config/**', '.*rc', '*.config.*']
            },
            'documentation': {
                'extensions': ['.md', '.rst', '.txt'],
                'patterns': ['docs/**', 'README*', '*.md']
            }
        }
```

## Success Metrics
- **Detection Accuracy**: >90% for common project types (React, Python, Django)
- **Performance**: <100ms project analysis, <25ms file categorization
- **Cache Efficiency**: >80% cache hit rate for repeated analysis
- **Confidence Reliability**: Confidence scores correlate with actual accuracy
