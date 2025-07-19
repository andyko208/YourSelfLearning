# Meta Prompt & Role Definition

You are an expert browser extension developer specializing in TypeScript, React, and Chrome Extension APIs. Your role is to build an educational intervention system that transforms social media scrolling into learning opportunities. You have deep expertise in the WXT framework, Chrome storage patterns, content script injection, and creating performant browser extensions that work seamlessly across different platforms.

Your primary objectives:
1. Build clean, maintainable code that maximizes reusability and minimizes repetition
2. Create intuitive user experiences that encourage learning without disruption
3. Implement robust state management across extension contexts
4. Design modular architecture allowing future extensibility
5. Ensure high performance with minimal browsing impact
6. Minimize state variables - only track what's essential
7. Use derived values instead of storing redundant data
8. Single source of truth for each piece of information
9. Clear, intuitive variable names over brevity

Work methodically through development phases, building UI components first, then implementing functionality. Always prioritize clean code with proper TypeScript typing. Focus on simplicity - use the minimum number of variables and the most intuitive naming possible.

# Project Overview

XScroll is a browser extension that detects scrolling on social media platforms and presents educational quiz lessons at configurable intervals. The extension tracks user metrics, compares daily progress, and provides an engaging way to transform idle browsing into learning moments.

# User Flow

1. User scrolls on tracked social media sites (TikTok, Instagram, YouTube Shorts)
2. Extension counts scrolls and tracks time wasted
3. When scroll threshold is reached, lesson content appears with blurred background and muted audio
4. User sees a question with two randomized answer choices
5. Upon selection:
   - Correct answer triggers confetti animation
   - Explanation and reference link are revealed
   - 5-second countdown begins before close button is enabled
6. User can click "Learn More" or wait to close and continue browsing
7. Extension counts the number of times lesson have shown
8. User can view MyData page to view the stats partitioned into 8-hour time periods to compare with yesterday's, customize lesson contents in MyLessons page, or toggle lesson frequency mode & frequency and select/deselect enabled websites in MySettings page.

# General Implementation Guidelines

**CRITICAL REQUIREMENTS FOR ALL PHASES**:
- **File Structure**: Ensure modularity of folders and files under `src/` directory
- **WXT Configuration**: Adjust `wxt.config.ts` for permissions and configurations as necessary
- **API Usage**: Use `browser.*` namespace for extension APIs (WXT handles cross-browser compatibility)
- **Import Paths**: Use relative paths from `src/` directory (e.g., `'../types/storage'`)
- **Code Organization**: Maintain clean separation between types, utils, and entrypoints

# Phase 1 Development Guide: Scroll Detection & Time Tracking

## Project Overview

This phase implements the core tracking functionality for XScroll, a browser extension that monitors user behavior on social media platforms. The extension detects scrolling actions and tracks time spent on configured platforms (TikTok, Instagram, YouTube Shorts), organizing data into 8-hour intervals for daily analysis.

## Project Structure

```
src/
├── entrypoints/
│   ├── background.ts          # Service worker for tab coordination
│   ├── content/
│   │   ├── content.ts         # Main content script
│   │   └── storage-utils.ts   # Storage management utilities
│   └── popup/
│       └── popup.tsx          # Extension popup (testing only)
├── types/
│   └── storage.ts            # TypeScript interfaces
└── utils/
    └── time-periods.ts       # Time period calculation utilities
```

## Core Components Architecture

### 1. Storage Layer (`storage-utils.ts`)
Centralized data management with atomic operations to prevent race conditions.

### 2. Background Script (`background.ts`)
Service worker that coordinates tab state and timer management across the extension.

### 3. Content Script (`content.ts`)
Injected into tracked pages to detect user interactions and communicate with background script.

### 4. Time Period Utilities (`time-periods.ts`)
Helper functions for calculating 8-hour intervals and managing daily resets.

## Specific Implementation Steps

### Step 1: Setup Storage Structure and Time Period Utilities

**Objective**: Create the foundational storage interface and time calculation utilities.

**Files to create/modify**:
- `src/types/storage.ts`
- `src/utils/time-periods.ts`
- `src/entrypoints/content/storage-utils.ts`
- `wxt.config.ts` (add permissions as needed)

**Implementation Details**:

1. **Define storage interface** with 8-hour period tracking:
```typescript
interface DailyData {
  morning: { scrollCount: number; timeWasted: number; lessonCount: number };
  afternoon: { scrollCount: number; timeWasted: number; lessonCount: number };
  night: { scrollCount: number; timeWasted: number; lessonCount: number };
  date: string;
}
```

2. **Create time period utilities** that:
   - Calculate current 8-hour period (morning: 0-8, afternoon: 8-16, night: 16-24)
   - Generate daily reset timestamps
   - Handle timezone considerations

3. **Implement storage utilities** with:
   - Atomic increment operations for scroll count
   - Time tracking with period-specific updates
   - Race condition prevention using Chrome storage API locks
   - Daily data initialization and rollover logic
   - Use `browser.storage.local` (WXT handles cross-browser compatibility)

**Testing Requirements**:
- Verify correct period calculation across different times
- Test daily rollover at midnight
- Confirm atomic operations prevent data corruption

### Step 2: Implement Background Script for Tab Coordination

**Objective**: Create service worker to manage timer state across multiple tabs.

**Files to create/modify**:
- `src/entrypoints/background.ts`

**Implementation Details**:

1. **Track enabled platforms**:
   - Define array of monitored URLs (TikTok, Instagram, YouTube Shorts)
   - URL matching logic for platform detection

2. **Tab state management**:
   - Monitor tab activation events
   - Track which tabs are on enabled platforms
   - Handle window focus changes

3. **Timer coordination**:
   - Send start/stop messages to content scripts
   - Ensure only one timer runs per user session
   - Handle tab switching gracefully

4. **Message handling**:
   - Process timer control requests from content scripts
   - Coordinate between multiple tabs to prevent conflicts

**Testing Requirements**:
- Test tab switching between tracked and non-tracked sites
- Verify timer coordination across multiple tabs
- Confirm proper cleanup when tabs are closed

### Step 3: Implement Scroll Detection with Cooldown

**Objective**: Detect user scrolling actions with anti-spam protection.

**Files to create/modify**:
- `src/entrypoints/content/content.ts`

**Implementation Details**:

1. **Scroll detection system**:
   - Listen for `wheel` events (downward scrolling)
   - Listen for `keydown` events (down arrow key)
   - Implement 2-second cooldown timer to prevent overcounting

2. **Event handling logic**:
   - Track last scroll timestamp
   - Debounce rapid scroll events
   - Only increment count after user appears to be "watching content"

3. **Storage integration**:
   - Use storage utilities for atomic scroll count updates
   - Determine current time period before incrementing
   - Update appropriate period-specific counter

4. **Performance considerations**:
   - Use passive event listeners where possible
   - Minimize DOM queries and storage operations
   - Implement efficient cooldown mechanism

**Testing Requirements**:
- Verify 2-second cooldown prevents overcounting
- Test both scroll wheel and arrow key detection
- Confirm counts increment in correct time periods

### Step 4: Implement Time Tracking System

**Objective**: Track time spent on enabled platforms with second-by-second updates.

**Files to create/modify**:
- `src/entrypoints/content/content.ts` (extend from Step 3)

**Implementation Details**:

1. **Timer management**:
   - Start timer when tab becomes active on tracked platform
   - Stop timer when tab becomes inactive or switches to non-tracked site
   - Update time every second with 1-second intervals

2. **Background script communication**:
   - Listen for timer control messages from background script
   - Send confirmation responses for timer state changes
   - Handle message passing errors gracefully

3. **Time calculation and storage**:
   - Calculate elapsed time in seconds
   - Determine current 8-hour period for time allocation
   - Update period-specific time counters atomically

4. **Page lifecycle handling**:
   - Pause timer when page becomes hidden
   - Resume timer when page becomes visible (if still tracked)
   - Clean up timers on page unload

**Testing Requirements**:
- Verify time tracking accuracy across tab switches
- Test timer behavior during page visibility changes
- Confirm proper cleanup prevents memory leaks

### Step 5: Implement Race Condition Prevention

**Objective**: Ensure data consistency across multiple tabs and rapid user interactions.

**Files to create/modify**:
- `src/entrypoints/content/storage-utils.ts` (extend from Step 1)

**Implementation Details**:

1. **Atomic operations**:
   - Use Chrome storage API's atomic set operations
   - Implement read-modify-write patterns safely
   - Handle concurrent updates from multiple tabs

2. **Locking mechanism**:
   - Implement simple mutex using Chrome storage
   - Queue operations during concurrent access
   - Timeout handling for stuck locks

3. **Data validation**:
   - Verify data integrity before and after operations
   - Recover from corrupted state gracefully
   - Log errors for debugging without breaking functionality

4. **Background script coordination**:
   - Ensure timer messages are processed in order
   - Handle rapid tab switching scenarios
   - Prevent duplicate timer instances

**Testing Requirements**:
- Test concurrent scroll detection from multiple tabs
- Verify timer accuracy with rapid tab switching
- Confirm data consistency under high-frequency operations

## Testing Script

Create `test-phase1.js` to validate all functionality:

```javascript
// Test scroll detection cooldown
// Test time period calculations
// Test tab coordination
// Test race condition handling
// Test data persistence across extension reloads
```

**Test Cases**:

1. **Happy Path**: Normal scrolling and time tracking on single tab
2. **Edge Case 1**: Rapid scrolling within 2-second cooldown period
3. **Edge Case 2**: Multiple tabs open on different platforms simultaneously
4. **Edge Case 3**: Time period transition during active tracking
5. **Edge Case 4**: Extension reload during active tracking session

## Implementation Notes

- Use TypeScript strict mode for type safety
- Implement proper error handling with try-catch blocks
- Add console logging for debugging (removable in production)
- Follow Chrome Extension Manifest V3 patterns
- Ensure all async operations are properly awaited
- Use performance.now() for accurate time measurements

## Success Criteria

- Scroll count increments correctly with 2-second cooldown
- Time tracking works across tab switches
- Data is properly partitioned into 8-hour periods
- Race conditions are prevented across multiple tabs
- Extension maintains accuracy during rapid user interactions
- All test cases pass consistently