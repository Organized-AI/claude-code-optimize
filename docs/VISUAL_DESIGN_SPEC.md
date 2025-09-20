# Visual Design Specification

## 🎨 Color Palette

### Primary Theme
```css
:root {
  --bg-primary: #0f1729;      /* Deep navy background */
  --bg-secondary: #1e293b;    /* Card backgrounds */
  --bg-tertiary: #334155;     /* Secondary elements */
  --accent-blue: #3b82f6;     /* Primary blue accent */
  --accent-green: #10b981;    /* Success/live indicators */
  --text-primary: #f8fafc;    /* Primary text */
  --text-secondary: #94a3b8;  /* Secondary text */
  --border-color: #475569;    /* Card borders */
  --status-danger: #dc2626;   /* Red for critical */
  --status-warning: #f59e0b;  /* Yellow for warnings */
  --status-success: #10b981;  /* Green for safe */
}
```

### Analytics Card Colors
```css
.analytics-card-teal { 
  background: linear-gradient(135deg, #14b8a6, #0d9488); 
}
.analytics-card-purple { 
  background: linear-gradient(135deg, #8b5cf6, #7c3aed); 
}
.analytics-card-blue { 
  background: linear-gradient(135deg, #3b82f6, #2563eb); 
}
```

## 📐 Component Specifications

### Header Design
- Title: "🚀 Claude Code Optimizer - Smart Dashboard"
- Live indicator badge: "✓ REAL-TIME MONITORING" (green when active)
- Plan info: "Plan: Max 5x Pro ($100/month) • Model Access: Sonnet + Opus"

### Status Badges
- SAFE: Green background, white text
- WARNING: Yellow background, black text  
- DANGER: Red background, white text

### Card Design
- Border radius: 12px
- Padding: 24px
- Border: 1px solid var(--border-color)
- Box shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1)

### Progress Bars
- Height: 8px for main progress, 4px for sub-progress
- Rounded corners
- Green for safe usage, yellow for warning, red for danger

### Typography
- Headers: font-weight: 600, color: var(--text-primary)
- Body text: font-weight: 400, color: var(--text-secondary)  
- Metrics: font-weight: 700, color: var(--text-primary)
- Labels: font-size: 0.75rem, color: var(--text-secondary)

## 📱 Layout Requirements

### Desktop Layout (1200px+)
```
┌─────────────────────────────────────────────────────┐
│ Header with Title, Live Badge, Plan Info           │
├─────────────────────────────────────────────────────┤
│ Live Status Banner (when session active)           │
├─────────────────┬───────────────────────────────────┤
│ 5-Hour Block    │ Weekly Limit                      │
│ [STATUS] 45%    │ [STATUS] 67%                      │
├─────────────────┴───────────────────────────────────┤
│ Current Session Display (16.4M tokens)             │
├─────────────────┬─────────────────┬─────────────────┤
│ Cache Efficiency│ Cost Savings    │ Token Breakdown │
│ (Teal Card)     │ (Purple Card)   │ (Blue Card)     │
├─────────────────┴─────────────────┴─────────────────┤
│ Daily Reports Table                                 │
└─────────────────────────────────────────────────────┘
```

### Mobile Layout (<768px)
- Single column stack
- Collapsible sections
- Touch-friendly buttons
- Responsive tables (horizontal scroll)