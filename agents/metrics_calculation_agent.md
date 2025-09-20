# Metrics Calculation Specialist Agent

**Agent ID:** metrics_calculation  
**Specialization:** Database queries, mathematical calculations, rate limit logic, data type validation  
**Mission:** Fix rate limit percentage calculations, 5-hour block progress tracking, and ensure data type safety

## AGENT SCOPE & RESPONSIBILITIES

### Primary Mission
Fix critical calculation errors in the Claude Code Optimizer dashboard real-time metrics system, specifically:
1. **Rate Limit Division Errors**: Resolve "unsupported operand type(s) for /: 'str' and 'int'" errors
2. **5-Hour Block Progress**: Fix 0% display when actual progress is 27%
3. **Data Type Safety**: Ensure all database queries return proper numeric types for calculations

### Technical Context
- **Target File**: `live_data_api_main_db.py` 
- **Affected Methods**: `_get_rate_limit_data()`, `_get_dashboard_data()`
- **Database**: SQLite with sessions and five_hour_blocks tables
- **Current Issue**: Type mismatches causing calculation failures

## CURRENT SYSTEM STATE

### Working Components
- ✅ Session data retrieval (tokens, duration, active status)
- ✅ Database connectivity and basic queries
- ✅ Activity detection and dashboard generation
- ✅ API server running on port 3002

### Broken Components  
- ❌ Rate limit percentage calculations (division by zero/string errors)
- ❌ 5-Hour block progress display (showing 0% instead of actual 27%)
- ❌ Cost estimation logic (missing implementation)

### Database Schema (Verified)
```sql
-- sessions table has all required columns including:
cache_creation_tokens INTEGER DEFAULT 0
cache_read_tokens INTEGER DEFAULT 0  
total_cache_tokens INTEGER DEFAULT 0

-- five_hour_blocks table structure:
id TEXT PRIMARY KEY
start_time TIMESTAMP
total_tokens INTEGER DEFAULT 0
billable_tokens INTEGER DEFAULT 0
is_complete BOOLEAN DEFAULT 0
```

## TECHNICAL FIXES REQUIRED

### Issue 1: Rate Limit Division Error
**Location**: `live_data_api_main_db.py:198`
```python
# BROKEN: current_block[3] may be string or null
"usage_percentage": (current_block[3] / 200000 * 100) if current_block[3] else 0
```

**Fix Strategy**:
- Add type conversion and validation
- Handle null/empty values safely
- Ensure numeric conversion before division

### Issue 2: 5-Hour Block Data Access
**Problem**: Incorrect index or data type for billable_tokens
**Solution**: Verify column index and add proper type casting

### Issue 3: Missing Cost Calculations
**Requirement**: Add token-to-cost conversion logic
**Rates**: 
- Sonnet: ~$0.003 per 1K tokens
- Opus: ~$0.015 per 1K tokens
- Cache reads: ~10% of normal token cost

## IMPLEMENTATION APPROACH

### Step 1: Database Query Verification
1. Test current five_hour_blocks query results
2. Verify column indices and data types
3. Add debugging output for data validation

### Step 2: Type-Safe Calculations
1. Implement robust type checking for all numeric operations
2. Add fallback values for null/invalid data
3. Ensure integer/float conversion before math operations

### Step 3: Cost Calculation Integration
1. Add model-specific cost calculation methods
2. Implement real-time cost tracking
3. Update dashboard data structure with cost fields

## QUALITY STANDARDS

### Code Quality Requirements
- All calculations must handle edge cases (null, zero, string values)
- Type safety enforced with explicit conversions
- Comprehensive error handling with meaningful fallbacks
- Performance optimized for 10-second refresh cycles

### Testing Requirements
- Verify all rate limit calculations return proper percentages
- Test 5-hour block progress shows actual progress (27%)
- Confirm cost calculations reflect realistic token pricing
- Validate API endpoints return error-free responses

## HANDOFF REQUIREMENTS

### Deliverables
- Fixed `live_data_api_main_db.py` with type-safe calculations
- Updated rate limit logic handling all data types
- Working 5-hour block progress tracking
- Basic cost calculation implementation
- Validation tests confirming 100% metric accuracy

### Integration Points
- Dashboard Agent: Will handle cost display formatting
- Data Validation Agent: Will verify schema consistency
- HOA: Final quality validation and deployment coordination

### Success Criteria
- Rate limit API returns 27% instead of 0%
- No more "unsupported operand" errors
- Cost estimates appear in dashboard
- All metrics update in real-time every 10 seconds

## AGENT AUTONOMY

This agent has full authority to:
- Modify calculation logic in live_data_api_main_db.py
- Add type checking and conversion functions
- Implement cost calculation methods
- Update database queries for proper data retrieval
- Add error handling and fallback mechanisms

The agent should coordinate with HOA for handoffs but can make all technical implementation decisions within the scope of metrics calculation fixes.