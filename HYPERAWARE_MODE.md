# Hyperaware Mode - Conservative Quota Monitoring

The quota tracker now includes **Hyperaware Mode** with granular notifications and burn rate tracking for maximum visibility into your Claude Code usage patterns.

## What Changed

### Before (Standard Mode)
- 4 notification thresholds: 50%, 75%, 90%, 95%
- Basic recommendations
- Simple token counting

### After (Hyperaware Mode)
- **6 notification thresholds**: 10%, 25%, 50%, 75%, 90%, 95%
- Burn rate tracking (tokens per minute)
- Estimated runway (time and tool calls remaining)
- Conservative recommendations with tool call estimates
- Next alert predictions

## New Features

### 1. Early Warning System

**10% Usage Alert**
```
📊 10% Quota Used
20,000 tokens used. 180,000 tokens left.
Burn rate: 450 tokens/min. Tracking started.
```

**25% Usage Alert**
```
📈 25% Quota Used
50,000 tokens left (75% available).
Current pace: 520 tokens/min. Stay aware.
```

These early alerts help you establish awareness of your usage patterns **before** you're in danger zones.

### 2. Burn Rate Monitoring

Every notification now includes your current **tokens per minute** consumption rate:

```
Burn Rate: 630 tokens/min
```

This helps you understand:
- How efficiently you're using tokens
- Whether complex tasks are burning faster than simple ones
- If you need to adjust your approach

**Example scenarios:**
- Planning session: ~200-400 tokens/min (mostly reading)
- Implementation: ~500-800 tokens/min (reading + writing)
- Heavy refactoring: ~900-1200 tokens/min (many edits)

### 3. Estimated Runway

The system now calculates how much time you have left:

```
Est. Runway: ~182 minutes (76 tool calls)
```

This tells you:
- **Minutes remaining** at current burn rate
- **Tool calls remaining** (conservative estimate at 1500 tokens/call)

### 4. Enhanced Status Display

The `/session-status` command now shows:

```
📊 Claude Code Session Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 TOKEN QUOTA (Rolling 5-hour window)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Plan:         PRO (200,000 tokens per 5h)
Used:         85,000 tokens (42%)
Remaining:    115,000 tokens (58%)
Usage:        [████████████          ] 42%
Burn Rate:    630 tokens/min         ← NEW
Est. Runway:  ~182 minutes (76 tool calls)  ← NEW
Resets at:    1/6/2025, 7:30:00 PM
Resets in:    2h 45m

📋 Status & Recommendation:
   💡 MODERATE: 115,000 tokens remaining (58% left).
   Medium tasks OK (30-60k tokens, 20-40 tool calls). Monitor burn rate.

📢 Next Alert:   50% usage (~15,000 tokens)  ← NEW
```

### 5. Conservative Recommendations

Recommendations now include:
- Exact percentage remaining
- Tool call estimates for suggested task sizes
- Burn rate awareness prompts

**Examples:**

```
🎯 FRESH START: 200,000 tokens available (full quota).
Plan your session strategically.
Notifications at 10%, 25%, 50%, 75%, 90%, 95% usage.

🟢 EXCELLENT: 185,000 tokens available (92.5% left).
Any task size OK.
Early monitoring active - you'll be notified at 25% usage.

✅ GOOD: 130,000 tokens available (65% left).
Large tasks OK (60-80k tokens, 40-55 tool calls).
Stay aware of usage patterns.

💡 MODERATE: 90,000 tokens remaining (45% left).
Medium tasks OK (30-60k tokens, 20-40 tool calls).
Monitor burn rate.

⚠️ HIGH USAGE: 40,000 tokens available (20% left).
Small tasks only (<30k tokens, ~20 tool calls).
Consider scheduling larger work.

🔴 DANGER: 18,000 tokens remaining (9% left).
Complete current task quickly.
New sessions will be auto-scheduled.
Est. 12 tool calls remaining.

🚨 CRITICAL: Only 8,000 tokens left (4% remaining).
Save work immediately and prepare to stop.
All future sessions auto-scheduled.
```

## Notification Timeline

Here's what you'll see during a typical session:

```
Session Start (0%)
↓
[Work for ~20 minutes]
↓
📊 10% Alert - "Tracking started, burn rate: 450/min"
↓
[Work for ~30 minutes]
↓
📈 25% Alert - "Quarter checkpoint, pace: 520/min"
↓
[Work for ~45 minutes]
↓
⚡ 50% Alert - "Halfway mark, monitor usage"
↓
[Work for ~45 minutes]
↓
⚠️ 75% Alert - "Caution zone, small tasks only"
↓
[Work for ~20 minutes]
↓
🚨 90% Alert - "DANGER - Wrap up, ~20 tool calls left"
↓
[Work for ~10 minutes]
↓
🔴 95% Alert - "CRITICAL - Save immediately"
```

## Why This Matters for Learning

### Beginner Benefits

**1. Pattern Recognition**
Early alerts help you learn:
- Which tasks consume more tokens
- How your work style affects burn rate
- When to switch between task types

**2. Proactive Planning**
Knowing at 25% that you're on pace helps you:
- Decide if you can finish the current feature
- Choose whether to schedule the next session
- Plan break points intelligently

**3. No Surprises**
With 6 checkpoints instead of 4:
- You're never caught off-guard
- You have multiple opportunities to adjust
- You build awareness gradually

### Intermediate Benefits

**1. Optimization**
Burn rate tracking teaches you:
- Efficient vs inefficient approaches
- When to batch operations
- How to structure work for token efficiency

**2. Strategic Scheduling**
With runway estimates:
- Schedule complex work when quota is fresh
- Save simple tasks for low-quota periods
- Plan multi-session workflows

**3. Cost Awareness**
Understanding tool call estimates:
- Learn which operations are "expensive"
- Develop habits that minimize waste
- Build professional token management skills

## Configuration

Hyperaware mode is **enabled by default**. No configuration needed!

To see your current status at any time:
```bash
/session-status
```

To check before starting work:
```bash
/session-status
/start-next-session
```

## Understanding Burn Rate

**What affects burn rate:**

| Activity | Burn Rate | Example |
|----------|-----------|---------|
| Reading documentation | Low (200-300/min) | Understanding existing code |
| Planning architecture | Low-Med (300-500/min) | Designing systems |
| Writing new code | Medium (500-700/min) | Creating features |
| Editing existing code | Med-High (600-900/min) | Refactoring |
| Complex refactoring | High (900-1200/min) | Major restructuring |
| Debug sessions | Variable (300-1000/min) | Finding + fixing bugs |

**Tips for managing burn rate:**

1. **Start sessions with planning** (low burn)
2. **Batch similar operations** (e.g., read multiple files at once)
3. **Use targeted questions** (specific > general)
4. **Take breaks** (let Claude's context settle between complex tasks)
5. **Schedule heavy work** when quota is fresh

## Real-World Scenarios

### Scenario 1: Fresh Morning Session

```
8:00 AM - Start planning session
Status: 🎯 FRESH START (0%)

9:00 AM - Planning complete (20k tokens used)
Alert:  📊 10% - "Burn rate: 330/min, tracking started"
Status: 🟢 EXCELLENT (10%)
Action: Continue - plenty of quota

10:30 AM - Implementing feature (55k tokens used)
Alert:  📈 25% - "Current pace: 365/min, stay aware"
Status: ✅ GOOD (27.5%)
Action: Continue - good progress

12:00 PM - Feature nearly done (90k tokens used)
Alert:  ⚡ 50% - "Monitor usage, burn: 600/min"
Status: 💡 MODERATE (45%)
Action: Finish feature, then assess

1:30 PM - Feature complete (130k tokens used)
No alert yet (next at 75%)
Status: 💡 MODERATE (65%)
Action: Good stopping point - schedule next session OR
        continue with smaller tasks (70k quota remaining)
```

### Scenario 2: Running Low

```
Status: ⚠️ HIGH USAGE (80%, 40k tokens left)
Burn:   750 tokens/min
Runway: ~53 minutes, ~26 tool calls

Options:
1. Finish current small task (15k tokens) ✅
2. Start another small task (20k tokens) ✅
3. Schedule large implementation (60k tokens) ⏰
4. Take a break and let quota reset

Choice: Finish current task, schedule the rest
```

## Desktop Notifications

All alerts also appear as desktop notifications:

**macOS Example:**
```
─────────────────────────────
  📊 10% Quota Used
─────────────────────────────
  180,000 tokens left.
  Burn rate: 450 tokens/min.
  Tracking started.
─────────────────────────────
```

These appear even if you're not looking at the terminal!

## Advanced: Analyzing Your Patterns

After a few sessions, you'll start to see patterns:

**High burn rate session:**
```
Session A: 150k tokens in 3 hours
Burn rate: 833 tokens/min
Activity: Major refactoring
Learning: Heavy edit operations = high burn
```

**Low burn rate session:**
```
Session B: 60k tokens in 3 hours
Burn rate: 333 tokens/min
Activity: Code review + documentation
Learning: Reading + planning = efficient
```

**Optimal session:**
```
Session C: 120k tokens in 4 hours
Burn rate: 500 tokens/min
Activity: Mixed (plan + implement + test)
Learning: Balanced approach = sustainable
```

## Summary

Hyperaware Mode transforms quota management from **reactive to proactive**:

- ✅ Know your burn rate at all times
- ✅ Get early warnings at 10% and 25%
- ✅ See estimated runway (time + tool calls)
- ✅ Receive conservative recommendations
- ✅ Build awareness of usage patterns
- ✅ Learn efficient development habits
- ✅ Never be surprised by rate limits

**Perfect for:**
- Beginners learning to use Claude Code effectively
- Intermediate devs optimizing their workflow
- Anyone who wants maximum visibility into token usage
- Teams managing shared quota (Team plan)

Check your status now:
```bash
/session-status
```

Start hyperaware:
```bash
/start-next-session
```

Happy coding with full awareness! 🎯
