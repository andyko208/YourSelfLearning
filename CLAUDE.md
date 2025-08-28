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
8. User can view Home page to view the stats partitioned into 8-hour time periods to compare with yesterday's, customize lesson contents in Library page, or toggle lesson frequency mode & frequency and select/deselect enabled websites in Settings page.

# General Implementation Guidelines

**CRITICAL REQUIREMENTS FOR ALL PHASES**:
- **File Structure**: Ensure modularity of folders and files under `src/` directory
- **WXT Configuration**: Adjust `wxt.config.ts` for permissions and configurations as necessary
- **API Usage**: Use `browser.*` namespace for extension APIs (WXT handles cross-browser compatibility), fall back to `chrome.*`
- **Import Paths**: Use relative paths from `src/` directory (e.g., `'../types/storage'`)
- **Code Organization**: Maintain clean separation between types, utils, and entrypoints

# Additionally Addressed Problems Guidelines
**Update `CLAUDE.md` by appending the problems found and resolved beyond the initial phase development guideline**  
- If files/directories were additionally added or removed, specify so with reason(s).
- If only the additional direction was specified, give a bulleted list of compact implementation details with the reason(s),
- If a specific problem was mentioned and asked to resolve, number a title with the root cause and the solution(s).
   ## ...
   ## Implementation Notes
   ...
   ## Additionally Addressed Problems
   1. Removed `src/styles.css`
      - Styles applied directly to `src/entrypoints/content/lesson-overlay.ts` to prevent CSS style injection conflict.
   2. Browser API Fallbacks Added
      - Added const browser = (globalThis as any).browser || (globalThis as any).chrome; to all files to prevent the compatibility issues
   3. Fixed Tab ID Error
      - Root Cause: getCurrentTabId() was trying to use browser.tabs.query() in a content script, but content scripts don't have access to the tabs API
      - Solution: Removed the problematic method entirely since the background script already handles tab coordination

# Task Summary Guidelines

**Update the README.md file adhering to below rules and the format**  
*Objective: Provide a compact summary as context to Claude for developing the next phase development guideline*
- Title with `XScroll - Phase #: one-line summary of cores implemented
   - # XScroll - Phase 1: Scroll Detection & Time Tracking
- Overview with 2-3 sentences, summarizing the highlights
   - ## Overview
      Phase 1 implementation provides the core tracking functionality that monitors user behavior on social media platforms (TikTok, Instagram, YouTube Shorts) and tracks scrolling actions and time spent, organizing data into 8-hour intervals for daily analysis.
- Phase Implementation Summary with for each core features implemented, each numbered list consists of 3-5 bullet points describing the details and the specific files modified
   - ## Phase 2 Implementation Summary

      ### ✅ Completed Features

      1. **Extended Storage System**
         - Added lesson tracking fields: `lessonCount`, `nextLessonAt`, `lessonActive`
         - Updated storage initialization and daily rollover logic
         - Implemented lesson state management methods in `StorageUtils`
         - Modified lesson frequency from 10 to 3 scrolls (as specified)

- Project Structure using ASCII art character for describing the hierarchy
```
src/
├── entrypoints/
│   ├── background.ts              # Extended with lesson state coordination
│   ├── content.ts                 # Integrated with lesson system
│   └── content/
│       ├── lesson-overlay.ts      # Three-state lesson UI component (with inline styles)
│       ├── lesson-manager.ts      # Lesson display coordination
│       └── storage-utils.ts       # Extended with lesson tracking, simplified methods
├── types/
│   └── storage.ts                 # Extended with lesson fields
└── utils/
    ├── browser-api.ts             # Centralized cross-browser API compatibility
    ├── lesson-parser.ts           # TSV parsing and lesson management
    └── time-periods.ts            # Existing time utilities
public/
└── lessons/
    └── how-to-control.tsv         # Sample lesson content (10 lessons)
```
- Rigorous Test Cases for ensuring the accuracy of the implemented functionalities, UI/UX
   - #### 4. **Multi-Tab Independence Test**
      1. Open two tabs with tracked sites (e.g., TikTok and Instagram)
      2. Scroll 3 times in Tab 1 to trigger lesson
      3. Switch to Tab 2
      4. **Expected**: Tab 2 scrolling and tracking still works
- Success Criteria Validation to enforce the expected behavior
   - ### 🎯 Success Criteria Validation

      Verify the following work correctly:

      - ✅ Lessons trigger every 3 scrolls
      - ✅ Three-state UI progression works smoothly
- Limitations with 1-3 bullet points with the current implementation, critically assess the simplicity for the backend and the conciseness of the user experience.
   - ### 📋 Known Limitations

      - Lesson content is static (loaded from TSV file)

# XScroll - Phase 4: Date Selection & Historical Metrics Display

## Overview

Phase 4 implements date selection functionality allowing users to view their daily metrics for both "Today" and "Yesterday". This builds on the existing Phase 3 UI by adding a toggle component above the metric slots and modifying the display logic to show historical data. The implementation maintains all existing functionality while providing users with comparison capabilities between their current and previous day's performance.

## Phase 4 Implementation Objectives

### Primary Goals
1. **Date Selection UI**: Add a clean toggle component for Today/Yesterday selection
2. **Historical Data Display**: Show metrics from selected date in existing metric slots
3. **Graceful Fallback**: Handle cases where yesterday data doesn't exist
4. **Maintain Live Indicators**: Keep brain battery and reset timer as "today" only features

### Design Principles
- **Simplicity**: Minimal state management with single `selectedDate` variable
- **Accuracy**: Reuse existing formatters and calculation logic
- **Consistency**: Match existing black/white casino slot aesthetic
- **Performance**: Leverage existing storage listeners without additional overhead

## Current Codebase Status (Phase 3 Complete)

### ✅ Existing Infrastructure
- Complete metric tracking system with scroll, time, and lesson counting
- Brain battery with drain/recharge calculations
- Storage structure with `today` and `yesterday` data objects
- Real-time UI updates via storage change listeners
- Casino slot machine styling with numeric-only values (no emojis)
- Reset timer with midnight countdown
- Navigation bar with SVG icons (recently updated from PNG files)

### 🏗️ Current Project Structure
```
src/
├── entrypoints/
│   ├── background.ts              # Tab coordination (no changes needed)
│   ├── content.ts                 # Tracking system (no changes needed)
│   ├── content/
│   │   ├── storage-utils.ts       # Storage methods (extend for date-aware totals)
│   │   ├── lesson-manager.ts      # Lesson system (no changes needed)
│   │   └── lesson-overlay.ts      # Lesson UI (no changes needed)
│   └── popup/
│       ├── App.tsx                # Main UI (add date selection state)
│       ├── index.html             # Popup frame (no changes needed)
│       ├── components/
│       │   ├── MetricSlot.tsx     # Extend to accept date-specific data
│       │   ├── BrainBattery.tsx   # Keep as "today" only (no changes needed)
│       │   ├── ResetTimer.tsx     # Keep as live countdown (no changes needed)
│       │   └── NavigationBar.tsx  # Updated with SVG icons (no changes needed)
│       └── utils/
│           ├── formatters.ts      # Reuse existing functions (no changes needed)
│           └── formatters.ts      # Reuse existing functions (no changes needed)
```

## Implementation Steps

### Step 1: Create Date Selector Component
**File**: `src/entrypoints/popup/components/DateSelector.tsx`

Create a toggle component that:
- Renders two clickable buttons: "Today" and "Yesterday"
- Uses casino slot styling (black border, white background, inset shadow)
- Highlights active selection with darker background
- Accepts `selectedDate` prop and `onDateChange` callback
- Positions above metric slots with appropriate spacing
- Matches existing UI dimensions and spacing patterns

**Key Requirements**:
- Component size: ~200px width, ~40px height
- Button styling consistent with existing metric slots
- Smooth transition animation (0.2s) between states
- Clear visual distinction between active/inactive states

### Step 2: Extend Storage Utils for Date-Aware Queries
**File**: `src/entrypoints/content/storage-utils.ts`

Add method `getTotalsByDate(date: 'today' | 'yesterday')`:
- Extend existing `getTotals()` logic to accept date parameter
- Return same format: `{ scrolls, timeWasted, lessons }`
- Handle case where yesterday data doesn't exist (return zeros)
- Reuse existing calculation logic for consistency
- No additional storage fields required

**Key Requirements**:
- Maintain existing `getTotals()` method for backward compatibility
- Default to "today" when no date specified
- Graceful fallback for missing yesterday data
- Use existing time period summation logic

### Step 3: Update App.tsx for Date Selection State
**File**: `src/entrypoints/popup/App.tsx`

Implement date selection state management:
- Add `selectedDate: 'today' | 'yesterday'` to React state (default: 'today')
- Create `handleDateChange` callback function
- Modify existing data loading to be date-aware
- Pass selected date to MetricSlot components
- Import and render DateSelector component above metric grid

**Key Requirements**:
- Use existing storage listener patterns
- Maintain real-time updates for "today" when selected
- Static display for "yesterday" data (no live updates needed)
- Preserve existing component hierarchy and styling

### Step 4: Update MetricSlot Components for Date Display
**File**: `src/entrypoints/popup/components/MetricSlot.tsx`

Extend MetricSlot to handle date-specific data:
- Add `selectedDate` prop to component interface
- Modify tooltip to show date-aware session breakdown
- Update props to accept pre-calculated totals instead of fetching internally
- Maintain existing numeric formatting (no emoji thresholds)
- Keep existing visual styling and animations

**Key Requirements**:
- Backward compatible with existing prop structure
- Use passed-in data instead of internal storage queries
- Update tooltip text to reflect selected date
- Preserve emoji selection logic for both dates

### Step 5: Implement Graceful Yesterday Data Fallback
**File**: Multiple files as needed

Handle edge cases for missing yesterday data:
- Display "0" values and zeroed period breakdown when yesterday data is empty
- Keep tooltips consistent with today’s format
- Maintain consistent UI layout regardless of data availability

**Key Requirements**:
- No error states or broken UI when yesterday is empty
- Consistent zero-value emoji display (use lowest threshold emojis)
- Clear user feedback about data availability
- Seamless experience for new users

### Step 6: Update Tooltip System for Date Context
**File**: `src/entrypoints/popup/components/MetricSlot.tsx`

Enhance tooltips with date-aware information:
- Modify session breakdown tooltip to show selected date's periods
- Add date context to tooltip headers (e.g., "Today's Sessions" vs "Yesterday's Sessions")
- Maintain existing clean time formatting with `formatTimeClean()`
- Keep current period bolding only for "today" selection

**Key Requirements**:
- Tooltip positioning and styling unchanged
- Clear date context in tooltip headers
- Preserve existing formatting functions
- Handle both today/yesterday data gracefully

## Testing Protocol

### Test Case 1: Date Selection UI Functionality
1. Open extension popup
2. **Expected**: DateSelector shows "Today" as active by default
3. Click "Yesterday" button
4. **Expected**: Selection switches with smooth animation, Yesterday becomes active
5. Click "Today" button
6. **Expected**: Selection switches back to Today
7. **Expected**: UI styling matches existing casino slot aesthetic

### Test Case 2: Today Metrics Display
1. Browse tracked sites to accumulate some data (scroll 5+ times, spend 3+ minutes)
2. Open popup with "Today" selected
3. **Expected**: Metrics show current day's accumulated data
4. **Expected**: Numeric values update; no emojis used
5. **Expected**: Brain battery and reset timer display current live data
6. Leave popup open and continue browsing
7. **Expected**: Today metrics update in real-time

### Test Case 3: Yesterday Metrics Display (With Data)
1. Ensure yesterday data exists in storage
2. Open popup and select "Yesterday"
3. **Expected**: Metrics show yesterday's final totals
4. **Expected**: Numeric values reflect yesterday totals (no emojis)
5. **Expected**: Brain battery and reset timer remain unchanged (today only)
6. Continue browsing while popup is open
7. **Expected**: Yesterday metrics remain static (no live updates)

### Test Case 4: Yesterday Metrics Display (No Data)
1. Clear extension data or test with fresh install
2. Open popup and select "Yesterday"
3. **Expected**: All metrics show "0" values
4. **Expected**: Appropriate emojis for zero values (lowest threshold)
5. Hover over metric slots
6. **Expected**: Tooltips show the same display format as today but with all 0s

### Test Case 5: Tooltip Accuracy Test
1. Accumulate data in different time periods (morning, afternoon, night)
2. Select "Today" and hover over metric slots
3. **Expected**: Tooltips show "Today's Sessions" with period breakdown
4. Select "Yesterday" and hover over metric slots
5. **Expected**: Tooltips show "Yesterday's Sessions" with period breakdown
6. **Expected**: Time formatting uses `formatTimeClean()` consistently

### Test Case 6: Navigation and Live Features
1. Select "Yesterday" in popup
2. **Expected**: Navigation bar remains fully functional
3. **Expected**: Reset timer continues live countdown
4. **Expected**: Brain battery shows current percentage and live tooltip
5. Switch between dates multiple times
6. **Expected**: Live features (battery, timer) unaffected by date selection

### Test Case 7: Real-time Updates During Date Selection
1. Select "Today" in popup
2. Browse tracked sites to generate new data
3. **Expected**: "Today" metrics update immediately
4. Switch to "Yesterday" 
5. Continue browsing
6. **Expected**: "Yesterday" metrics remain static
7. Switch back to "Today"
8. **Expected**: Updated metrics from recent browsing activity

### Test Case 8: Storage Integration Edge Cases
1. Test during midnight rollover (or simulate by changing system time)
2. **Expected**: Date selector continues working correctly
3. **Expected**: "Yesterday" now shows previous "today" data
4. Test with corrupted storage data
5. **Expected**: Graceful fallback to zero values
6. **Expected**: No errors or crashes in UI

## Success Criteria

### ✅ Functional Requirements
- Date selection toggle works smoothly with clear visual feedback
- "Today" shows live-updating current metrics
- "Yesterday" shows static historical metrics  
- Graceful handling when yesterday data doesn't exist
- Brain battery and reset timer remain "today" only features
- All existing Phase 3 functionality preserved

### ✅ Technical Requirements
- Single `selectedDate` state variable manages date selection
- Reuse existing storage structure and formatters
- No additional storage fields or complex state management
- Date-aware tooltips with proper context headers
- Consistent emoji threshold logic for both dates
- Real-time updates only affect "today" selection

### ✅ UI/UX Requirements
- DateSelector matches existing casino slot aesthetic
- Smooth animations and transitions between states
- Clear visual hierarchy (date selector → metrics → navigation)
- Tooltips provide helpful context about selected date
- No layout shifts or visual inconsistencies
- Professional appearance matching existing design language

## Implementation Notes

### Code Organization
- Create new `DateSelector.tsx` component following existing patterns
- Extend `StorageUtils` with date-aware methods
- Modify `App.tsx` minimally - just add date state and pass props
- Update `MetricSlot.tsx` to be data-driven rather than storage-driven

### Performance Considerations
- Leverage existing storage listeners (no additional overhead)
- Cache yesterday data to avoid repeated storage queries
- Use derived state instead of additional storage fields
- Maintain existing real-time update patterns for today

### SVG Icon Integration
- NavigationBar.tsx already updated with inline SVG code replacing PNG imports
- New DateSelector component should follow same pattern if icons are needed
- Maintain consistent icon sizing and styling across components

This phase should result in a clean, intuitive date selection interface that enhances user ability to compare their daily performance while maintaining the extension's core educational intervention functionality.

## Additionally Addressed Problems - Phase 4

1. **Fixed TypeScript Compilation Errors**
   - Root Cause: Untyped `error` parameters in catch blocks throughout `content.ts` causing TypeScript compilation failures
   - Solution: Added explicit `any` type annotations to all error parameters in catch blocks
   - Files affected: `src/entrypoints/content.ts` (5 instances at lines 72, 75, 83, 119, 146, 181, 208)
   - This ensures the extension compiles without TypeScript errors while maintaining error handling functionality

2. **Maintained Browser API Consistency**
   - Continued use of centralized `browser-api.ts` for cross-browser compatibility
   - No duplicate browser API declarations introduced in new components
   - All new code uses existing `import { browser } from '../../utils/browser-api'` pattern
   - Avoided WXT's built-in browser imports to prevent conflicts

3. **Preserved Storage Structure Integrity**
   - No new storage fields added (reused existing `today`/`yesterday` structure from Phase 1)
   - Date-aware methods (`getTotalsByDate`, `getDataByDate`) added without breaking existing storage patterns
   - Backward compatibility maintained for all existing storage operations
   - `getTotals()` method preserved for components that don't need date selection

4. **Component Prop Updates**
   - MetricSlot component updated to accept optional `selectedDate` prop with default value 'today'
   - Ensures backward compatibility if prop is not provided
   - Tooltip logic updated to be context-aware based on selected date
   - Maintains all existing functionality while adding new capabilities

5. **Lesson Trigger Coordination (Race-condition hardening)**
   - Root Cause: Storage change listener in lesson manager could double-trigger lessons across tabs
   - Solution: Removed storage listener; content script now calls `lessonManager.triggerLessonCheck()` immediately after `incrementScrollCount()`
   - Files affected: `src/entrypoints/content.ts`, `src/entrypoints/content/lesson-manager.ts`, `src/entrypoints/content/storage-utils.ts`

6. **Inline Overlay Styles**
   - Rationale: Avoid CSS injection mode conflicts and host page overrides
   - Implementation: All overlay styles defined inline in `lesson-overlay.ts`; removed reference to external style file in docs

7. **Navigation Items Renamed**
   - Updated labels to `Library`, `Home`, `Settings` and added filled/outline SVG toggles
   - File: `src/entrypoints/popup/components/NavigationBar.tsx`