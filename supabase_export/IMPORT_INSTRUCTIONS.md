# Supabase Import Instructions

## 1. Set up Schema
1. Go to your Supabase project: https://supabase.com/dashboard/project/rdsfgdtsbyioqilatvxu
2. Navigate to SQL Editor
3. Run the contents of `supabase_schema.sql` to create tables

## 2. Import Data
You can import the JSON data in several ways:

### Option A: Using Supabase Dashboard
1. Go to Table Editor in your Supabase dashboard
2. Select each table (sessions, five_hour_blocks, etc.)
3. Use "Import data" feature to upload the corresponding JSON file

### Option B: Using SQL Editor
1. Go to SQL Editor
2. Use INSERT statements to add the data

### Option C: Using Supabase API
Use the REST API to POST the data to each table endpoint.

## 3. Files to Import
- `sessions.json` → Table: `sessions`
- `five_hour_blocks.json` → Table: `five_hour_blocks`
- `message_breakdown.json` → Table: `message_breakdown`
- `tool_usage.json` → Table: `tool_usage`
- `cost_breakdown.json` → Table: `cost_breakdown`

## 4. Verify Import
After importing, run this query in SQL Editor to verify:

```sql
SELECT 
    'sessions' as table_name, COUNT(*) as record_count 
FROM sessions
UNION ALL
SELECT 
    'five_hour_blocks', COUNT(*) 
FROM five_hour_blocks
UNION ALL
SELECT 
    'message_breakdown', COUNT(*) 
FROM message_breakdown
UNION ALL
SELECT 
    'tool_usage', COUNT(*) 
FROM tool_usage
UNION ALL
SELECT 
    'cost_breakdown', COUNT(*) 
FROM cost_breakdown;
```

## 5. Dashboard Access
Once imported, your dashboard can access the data via:
- API: https://rdsfgdtsbyioqilatvxu.supabase.co/rest/v1/sessions
- Function: https://rdsfgdtsbyioqilatvxu.supabase.co/rest/v1/rpc/get_current_session_status
