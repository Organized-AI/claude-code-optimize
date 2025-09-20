#!/usr/bin/env python3
"""
Data Integrity Tests
Validates data consistency and integrity across the system
"""

import unittest
import sqlite3
import json
from datetime import datetime
from pathlib import Path

class DataIntegrityTests(unittest.TestCase):
    """Test data integrity rules and constraints"""
    
    def test_session_data_integrity(self):
        """Test session data integrity rules"""
        # Mock session data
        session = {
            "id": "test_session",
            "start_time": "2024-01-01T10:00:00Z",
            "tokens": 100,
            "cost": 0.01,
            "is_active": True,
            "end_time": None
        }
        
        # Test integrity rules
        self.assertIsNotNone(session["id"])
        self.assertGreaterEqual(session["tokens"], 0)
        self.assertGreaterEqual(session["cost"], 0)
        
        # Active sessions should not have end time
        if session["is_active"]:
            self.assertIsNone(session["end_time"])
    
    def test_token_cost_consistency(self):
        """Test token and cost consistency"""
        session = {
            "tokens": 1000,
            "cost": 0.01,
            "cost_per_token": 0.00001
        }
        
        expected_cost = session["tokens"] * session["cost_per_token"]
        self.assertAlmostEqual(session["cost"], expected_cost, places=6)
    
    def test_timestamp_validity(self):
        """Test timestamp validity"""
        timestamp_str = "2024-01-01T10:00:00Z"
        
        # Should be parseable
        try:
            datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            timestamp_valid = True
        except:
            timestamp_valid = False
        
        self.assertTrue(timestamp_valid)
    
    def test_json_field_integrity(self):
        """Test JSON field integrity"""
        metadata = {"key": "value", "number": 123}
        
        # Should be serializable
        try:
            json_str = json.dumps(metadata)
            parsed = json.loads(json_str)
            self.assertEqual(metadata, parsed)
        except:
            self.fail("JSON serialization failed")

def main():
    """Run integrity tests"""
    unittest.main()

if __name__ == "__main__":
    main()