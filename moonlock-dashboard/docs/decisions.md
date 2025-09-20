# Architectural Decision Records

## ADR-001: Technology Stack Selection

**Status**: Accepted  
**Date**: 2025-08-04  

### Context
Need to select appropriate technologies for a real-time AI session monitoring dashboard with strict timing and accuracy requirements.

### Decision
- **Frontend**: React 18 with TypeScript for type safety and component reusability
- **Backend**: Node.js with Express for rapid development and WebSocket support
- **Database**: SQLite with better-sqlite3 for embedded, zero-config persistence
- **Real-time**: WebSocket for low-latency bidirectional communication
- **State Management**: Zustand for lightweight, type-safe state management
- **Styling**: Tailwind CSS for rapid UI development with dark theme support

### Consequences
- **Positive**: Fast development, type safety, excellent real-time capabilities
- **Negative**: Node.js single-threaded nature may limit heavy computational tasks
- **Mitigation**: Use worker threads for CPU-intensive operations if needed

## ADR-002: Timer Precision Strategy

**Status**: Accepted  
**Date**: 2025-08-04  

### Context  
Requirement for <1 second drift over 5-hour sessions demands high-precision timing.

### Decision
- Use `performance.now()` for microsecond precision timestamps
- Implement drift correction algorithm with reference timestamps
- Server-side authoritative timer with client-side interpolation
- Checkpoint system every 60 seconds for recovery

### Consequences
- **Positive**: Meets precision requirements, resilient to client issues
- **Negative**: Increased complexity in timer synchronization
- **Mitigation**: Comprehensive testing with simulated network conditions

## ADR-003: Database Schema Design

**Status**: Accepted  
**Date**: 2025-08-04  

### Context
Need efficient storage for sessions, token usage, and analytics with fast queries.

### Decision
```sql
-- Normalized schema with separate tables for different data types
sessions (id, name, start_time, end_time, duration, token_budget, tokens_used, status)
token_usage (id, session_id, timestamp, tokens_used, cumulative_total, operation)
checkpoints (id, session_id, phase, prompt_count, timestamp, metadata)
```

### Consequences
- **Positive**: Normalized design enables efficient queries and analytics
- **Negative**: Requires joins for complex queries
- **Mitigation**: Indexed foreign keys and strategic denormalization where needed

## ADR-004: Real-time Communication Protocol

**Status**: Accepted  
**Date**: 2025-08-04  

### Context
Need efficient real-time updates for timer, token usage, and alerts.

### Decision
- WebSocket for bidirectional real-time communication
- JSON message protocol with typed message structure
- Heartbeat mechanism for connection health monitoring
- Automatic reconnection with exponential backoff

### Consequences
- **Positive**: Low latency, efficient bandwidth usage
- **Negative**: WebSocket connection management complexity
- **Mitigation**: Robust error handling and connection state management

## ADR-005: Token Tracking Accuracy

**Status**: Accepted  
**Date**: 2025-08-04  

### Context
Requirement for ±1% accuracy in token consumption tracking.

### Decision
- Server-side token counting as source of truth
- Batch token updates every 100ms to reduce overhead
- Client-side optimistic updates for UI responsiveness
- Reconciliation mechanism for accuracy verification

### Consequences
- **Positive**: Meets accuracy requirements while maintaining performance
- **Negative**: Added complexity in state synchronization
- **Mitigation**: Comprehensive testing with various usage patterns

## ADR-006: UI/UX Design Philosophy

**Status**: Accepted  
**Date**: 2025-08-04  

### Context
Dashboard needs to be information-dense yet usable during development sessions.

### Decision
- Dark theme optimized for extended viewing
- Minimal cognitive load with clear information hierarchy
- Real-time updates without disruptive animations
- Responsive design for various screen sizes
- Accessible design following WCAG guidelines

### Consequences
- **Positive**: Excellent developer experience and accessibility
- **Negative**: Additional design and testing overhead
- **Mitigation**: Design system with reusable components

## ADR-007: Error Handling Strategy

**Status**: Accepted  
**Date**: 2025-08-04  

### Context
System must be resilient to various failure modes while maintaining data integrity.

### Decision
- Graceful degradation for non-critical features
- Automatic retry with exponential backoff for transient failures  
- Circuit breaker pattern for external dependencies
- Comprehensive logging with structured error data
- User-friendly error messages with actionable guidance

### Consequences
- **Positive**: Robust system with excellent debugging capabilities
- **Negative**: Increased code complexity and maintenance overhead
- **Mitigation**: Standardized error handling patterns and utilities