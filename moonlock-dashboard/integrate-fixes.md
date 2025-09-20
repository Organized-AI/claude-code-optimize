# Integration Guide

## 1. Fix Token Calculation
In your ClaudeCodeDashboard.tsx, replace the token calculation with:

```typescript
import { FixedDataProcessor } from '../services/FixedDataProcessor';

// Replace existing token logic:
const tokenUsage = FixedDataProcessor.calculateCorrectTokenUsage(sessionData);
```

## 2. Fix Activity Feed
Replace the activity feed with:

```typescript
import { BatchedActivityFeed } from './BatchedActivityFeed';

// In your render:
<BatchedActivityFeed activities={batchedActivities} />
```

## 3. Verify Fix
Your dashboard should now show:
- ✅ ~631k total tokens (not 156.6M)
- ✅ Batched Claude Code activities
- ✅ Expandable activity details
