"""
Configuration utilities for Claude Code Optimizer CLI
"""

import json
import os
from pathlib import Path
from typing import Dict, Any, Optional

def load_config() -> Dict[str, Any]:
    """Load configuration from multiple sources with precedence."""
    config = {
        # Default configuration
        'api_base_url': 'http://localhost:3001',
        'database_path': 'claude_usage.db',
        'default_format': 'table',
        'color_output': True,
        'cache_ttl': 30,  # seconds
        'planning': {
            'file_count_thresholds': {
                'simple': 10,
                'medium': 50,
                'complex': 100
            },
            'language_complexity': {
                'python': 1,
                'javascript': 1,
                'typescript': 2,
                'rust': 3,
                'cpp': 3,
                'go': 2
            }
        },
        'quota_limits': {
            'sonnet_weekly': 432,  # hours
            'opus_weekly': 36,     # hours
            'traffic_light': {
                'green_threshold': 70,   # percent
                'yellow_threshold': 85   # percent
            }
        }
    }
    
    # Load from config file if exists
    config_file = Path.home() / '.claude_code_optimizer' / 'config.json'
    if config_file.exists():
        try:
            with open(config_file, 'r') as f:
                user_config = json.load(f)
                config.update(user_config)
        except Exception:
            pass  # Use defaults if config file is invalid
    
    # Environment variable overrides
    if os.getenv('CCO_API_URL'):
        config['api_base_url'] = os.getenv('CCO_API_URL')
    
    if os.getenv('CCO_DATABASE_PATH'):
        config['database_path'] = os.getenv('CCO_DATABASE_PATH')
    
    if os.getenv('CCO_NO_COLOR'):
        config['color_output'] = False
    
    return config

def save_config(config: Dict[str, Any]) -> bool:
    """Save configuration to user config file."""
    try:
        config_dir = Path.home() / '.claude_code_optimizer'
        config_dir.mkdir(exist_ok=True)
        
        config_file = config_dir / 'config.json'
        with open(config_file, 'w') as f:
            json.dump(config, f, indent=2)
        
        return True
    except Exception:
        return False

def get_project_root() -> Path:
    """Get the project root directory."""
    return Path(__file__).parent.parent.parent.parent

def get_database_path(config: Dict[str, Any]) -> Path:
    """Get the absolute path to the database."""
    db_path = config.get('database_path', 'claude_usage.db')
    
    if Path(db_path).is_absolute():
        return Path(db_path)
    else:
        # Relative to project root
        return get_project_root() / db_path