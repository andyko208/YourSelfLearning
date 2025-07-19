# XScroll Browser Extension - Phase 1: Scroll Detection & Time Tracking

## Overview

XScroll is an educational intervention browser extension that transforms social media scrolling into learning opportunities. This Phase 1 implementation provides the core tracking functionality that monitors user behavior on social media platforms (TikTok, Instagram, YouTube Shorts) and tracks scrolling actions and time spent, organizing data into 8-hour intervals for daily analysis.

## Phase 1 Implementation Summary

### ✅ Completed Features

1. **Storage Structure & Time Period Utilities**
   - TypeScript interfaces for data organization (`src/types/storage.ts`)
   - 8-hour period calculations (morning: 0-8, afternoon: 8-16, night: 16-24) (`src/utils/time-periods.ts`)
   - Atomic storage operations with race condition prevention (`src/entrypoints/content/storage-utils.ts`)

2. **Background Script for Tab Coordination**
   - Service worker managing timer state across multiple tabs (`src/entrypoints/background.ts`)
   - Platform detection for TikTok, Instagram, and YouTube Shorts
   - Message passing coordination between background and content scripts
   - Window focus/blur handling

3. **Scroll Detection with Cooldown**
   - Mouse wheel event detection for downward scrolling
   - Keyboard event detection for down arrow key
   - 2-second cooldown timer to prevent overcounting
   - Anti-spam protection for rapid scroll events

4. **Time Tracking System**
   - Second-by-second time tracking when on tracked platforms
   - Automatic start/stop based on tab activity
   - Pause/resume on page visibility changes
   - Proper cleanup on page unload

5. **Race Condition Prevention**
   - Atomic storage operations using browser storage API
   - Simple mutex locking mechanism
   - Data validation and error recovery
   - Concurrent access handling across multiple tabs

### 🏗️ Project Structure

```
src/
├── entrypoints/
│   ├── background.ts              # Service worker for tab coordination
│   ├── content/
│   │   ├── content.ts             # Main content script (MOVED from root)
│   │   └── storage-utils.ts       # Storage management utilities
│   └── popup/                     # Extension popup (existing)
├── types/
│   └── storage.ts                 # TypeScript interfaces
└── utils/
    └── time-periods.ts            # Time period calculation utilities
```

### 📊 Data Structure

The extension stores data in browser local storage with the following structure:

```typescript
{
  today: {
    morning: { scrollCount: number, timeWasted: number, lessonCount: number },
    afternoon: { scrollCount: number, timeWasted: number, lessonCount: number },
    night: { scrollCount: number, timeWasted: number, lessonCount: number },
    date: string
  },
  yesterday: { /* same structure */ },
  settings: {
    enabledSites: string[],
    lessonFrequency: number,
    frequencyMode: 'scrolls' | 'time'
  }
}
```

## 🧪 Manual Testing Instructions

### Prerequisites

1. **Build the Extension**
   ```bash
   npm install
   npm run build
   ```

2. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked"
   - Select the `.output/chrome-mv3` folder

### Test Cases

#### 1. **Basic Scroll Detection Test**
1. Open TikTok, Instagram, or YouTube Shorts
2. Open browser console (F12)
3. Scroll down slowly (wait 3+ seconds between scrolls)
4. **Expected**: Console shows "Scroll detected and counted" messages
5. Try rapid scrolling within 2 seconds
6. **Expected**: Only first scroll is counted due to cooldown

#### 2. **Time Period Calculation Test**
1. Open browser console on any tracked site
2. Copy and paste the test script from `test-phase1.js`
3. **Expected**: Correct time period displayed based on current hour

#### 3. **Tab Coordination Test**
1. Open a tracked site (TikTok/Instagram/YouTube Shorts)
2. Open browser console and look for "Timer started" message
3. Open new tab to non-tracked site (e.g., google.com)
4. **Expected**: Console shows "Timer stopped" message
5. Switch back to tracked site
6. **Expected**: Console shows "Timer started" message

#### 4. **Multi-Tab Race Condition Test**
1. Open multiple tabs to the same tracked platform
2. Scroll in different tabs rapidly
3. **Expected**: No duplicate counting, data remains consistent

#### 5. **Data Persistence Test**
1. Scroll several times on a tracked site
2. Check data: `browser.storage.local.get('xscroll-data')`
3. Reload the page
4. Check data again
5. **Expected**: Scroll counts and time data persist after reload

#### 6. **Window Focus Test**
1. Open tracked site and ensure timer is running
2. Switch to another application (minimize browser)
3. **Expected**: Timer pauses
4. Switch back to browser
5. **Expected**: Timer resumes

### 🛠️ Testing Utilities

Load the automated test script by copying `test-phase1.js` content into browser console:

```javascript
// Available test functions:
XScrollTest.viewData()        // View current stored data
XScrollTest.clearData()       // Clear all stored data  
XScrollTest.simulateScroll()  // Simulate scroll event
XScrollTest.simulateKeyDown() // Simulate down arrow key
```

### 🎯 Success Criteria Validation

Verify the following work correctly:

- ✅ Scroll count increments with 2-second cooldown
- ✅ Time tracking across tab switches
- ✅ Data partitioned into 8-hour periods
- ✅ Race conditions prevented across multiple tabs
- ✅ Extension maintains accuracy during rapid interactions
- ✅ Proper cleanup prevents memory leaks

### 🔍 Debugging

1. **Background Script**: Check background script console in `chrome://extensions/`
2. **Content Script**: Check page console on tracked sites
3. **Storage Data**: Run `browser.storage.local.get('xscroll-data')` in console
4. **Clear Data**: Run `browser.storage.local.clear()` to reset

### 📋 Known Limitations

- YouTube Shorts detection is URL-based and may not catch all variations
- Timer accuracy depends on browser tab scheduling
- Storage locks have 5-second timeout for stuck operations

## 🚀 Next Steps

Phase 1 provides the foundation for:
- Lesson threshold detection
- UI overlay system
- Quiz content delivery
- Advanced analytics and reporting

The extension is now ready for Phase 2 development: Lesson Trigger System.
