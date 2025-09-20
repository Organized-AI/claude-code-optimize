#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient('https://rdsfgdtsbyioqilatvxu.supabase.co', process.env.SUPABASE_KEY);

async function createTable() {
  console.log('🔄 Creating claude_sessions table...');
  
  try {
    // Test if table already exists
    const { data, error } = await supabase
      .from('claude_sessions')
      .select('*')
      .limit(1);
    
    if (!error) {
      console.log('✅ Table already exists!');
      return;
    }
    
    console.log('❌ Table does not exist. Please create it manually:');
    console.log('');
    console.log('1. Go to: https://rdsfgdtsbyioqilatvxu.supabase.co');
    console.log('2. Navigate to: SQL Editor');
    console.log('3. Copy and paste the following SQL:');
    console.log('');
    console.log('-- Create claude_sessions table');
    console.log('CREATE TABLE claude_sessions (');
    console.log('  session_id TEXT PRIMARY KEY,');
    console.log('  start_time TIMESTAMP WITH TIME ZONE NOT NULL,');
    console.log('  tokens_used INTEGER NOT NULL DEFAULT 0,');
    console.log('  token_budget INTEGER NOT NULL DEFAULT 200000,');
    console.log('  last_activity TIMESTAMP WITH TIME ZONE NOT NULL,');
    console.log('  is_realtime_active BOOLEAN NOT NULL DEFAULT false,');
    console.log('  input_tokens INTEGER NOT NULL DEFAULT 0,');
    console.log('  output_tokens INTEGER NOT NULL DEFAULT 0,');
    console.log('  cache_read_tokens INTEGER NOT NULL DEFAULT 0,');
    console.log('  cache_creation_tokens INTEGER NOT NULL DEFAULT 0,');
    console.log('  total_tokens INTEGER NOT NULL DEFAULT 0,');
    console.log('  efficiency DECIMAL(5,2) NOT NULL DEFAULT 0,');
    console.log('  rate_per_min INTEGER NOT NULL DEFAULT 0,');
    console.log('  cost_estimate DECIMAL(10,4) NOT NULL DEFAULT 0,');
    console.log('  budget_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,');
    console.log('  remaining_time BIGINT NOT NULL DEFAULT 0,');
    console.log('  elapsed_time BIGINT NOT NULL DEFAULT 0,');
    console.log('  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),');
    console.log('  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()');
    console.log(');');
    console.log('');
    console.log('-- Create indexes');
    console.log('CREATE INDEX idx_claude_sessions_last_activity ON claude_sessions(last_activity DESC);');
    console.log('');
    console.log('-- Enable RLS and create policy');
    console.log('ALTER TABLE claude_sessions ENABLE ROW LEVEL SECURITY;');
    console.log('CREATE POLICY "Allow all operations" ON claude_sessions FOR ALL USING (true);');
    console.log('');
    console.log('4. Click "Run" to execute the SQL');
    console.log('5. Once created, your bridge service will start syncing data!');
    
  } catch (err) {
    console.error('❌ Connection error:', err.message);
  }
}

createTable();
