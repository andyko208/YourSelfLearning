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

# XScroll - Phase 5: Settings Page Implementation

## Project Overview

Phase 5 implements a Settings page that provides users with configuration options for lesson frequency and platform selection. The Settings page replaces the main content area when the Settings navigation button is clicked, maintaining the existing navigation bar at the bottom. This implementation introduces proper page routing between Home and Settings pages while preserving all existing functionality from previous phases.

### Key Features to Implement
- Page routing system to switch between Home and Settings views
- **Lesson Frequency** selector with three modes: Often (1-3 scrolls), Sometimes (4-6 scrolls), Barely (7-9 scrolls)
- **Platforms** multi-selector with horizontal scrolling showing 3 platforms at a time
- Real-time storage synchronization for settings changes
- Visual feedback for active selections and smooth transitions

## Project Structure

```
src/
├── entrypoints/
│   ├── popup/
│   │   ├── App.tsx                    # Modified: Add page routing logic
│   │   ├── pages/                     # NEW: Page components directory
│   │   │   ├── HomePage.tsx           # NEW: Extract current main UI
│   │   │   └── SettingsPage.tsx       # NEW: Settings interface
│   │   ├── components/
│   │   │   ├── NavigationBar.tsx      # Modified: Add onNavigate callback
│   │   │   ├── settings/              # NEW: Settings-specific components
│   │   │   │   ├── LessonFrequency.tsx  # NEW: Frequency selector
│   │   │   │   └── PlatformSelector.tsx # NEW: Platform multi-select
│   │   │   └── [existing components]
│   │   └── utils/
│   │       └── [existing utils]
│   └── content/
│       └── storage-utils.ts           # Extended: Add updateSettings method
├── types/
│   └── storage.ts                     # Extended: Add frequency mode types
└── assets/                            # NEW: Platform icons directory
    └── platform-icons/
        ├── instagram.svg
        ├── tiktok.svg
        └── youtube-shorts.svg
```

## Specific Implementation Steps

### Step 1: Create Page Routing Infrastructure
**File: `src/entrypoints/popup/App.tsx`**

Modify the main App component to handle page navigation:
- Add `currentPage` state variable with type `'home' | 'settings'`
- Create `handleNavigation` function that updates currentPage
- Conditionally render HomePage or SettingsPage based on currentPage
- Pass handleNavigation to NavigationBar as onNavigate prop
- Ensure navigation state persists during popup session

### Step 2: Extract Home Page Component
**File: `src/entrypoints/popup/pages/HomePage.tsx`**

Extract the existing main UI into a dedicated HomePage component:
- Move all existing metric display logic from App.tsx
- Include DateSelector, MetricSlot components, BrainBattery, and ResetTimer
- Accept brainPercentage and other necessary props from App
- Maintain all storage listeners and real-time update functionality
- Preserve "BRAIN FRIED" conditional rendering logic

### Step 3: Update Navigation Bar for Page Switching
**File: `src/entrypoints/popup/components/NavigationBar.tsx`**

Modify NavigationBar to support actual page navigation:
- Accept `onNavigate` prop with type `(page: 'home' | 'settings' | 'library') => void`
- Accept `currentPage` prop to highlight active page
- Call onNavigate instead of console.log when buttons are clicked
- Update selected state based on currentPage prop
- Keep library navigation as placeholder (console.log)

### Step 4: Create Settings Page Layout
**File: `src/entrypoints/popup/pages/SettingsPage.tsx`**

Build the main Settings page component:
- Create container with 480px × 490px content area (accounting for 60px navigation bar)
- Add "Settings" header at top with consistent typography
- Create two sections: "Lesson Frequency" and "Platforms"
- Load current settings from storage on mount
- Implement save mechanism that updates storage in real-time
- Add proper spacing between sections (24px gap)

### Step 5: Implement Lesson Frequency Selector
**File: `src/entrypoints/popup/components/settings/LessonFrequency.tsx`**

Create the frequency selector component with three pill options:
- Design pill-shaped buttons with black border and white background
- Implement three options: "Often (1-3)", "Sometimes (4-6)", "Barely (7-9)"
- Map selections to numeric values: Often=3, Sometimes=6, Barely=9
- Highlight selected option with darker background (#e0e0e0)
- Add hover effects for unselected options (#f5f5f5)
- Accept `value` and `onChange` props for controlled component pattern

### Step 6: Build Platform Selector Component
**File: `src/entrypoints/popup/components/settings/PlatformSelector.tsx`**

Create horizontal scrolling platform selector:
- Display 3 platform cards at a time (each ~140px wide)
- Implement left/right arrow navigation buttons
- Create platform cards with icon placeholder area (48×48px) and label below
- Support multi-selection with checkbox overlay or border highlight
- Initialize with ["Instagram", "TikTok", "YouTube Shorts"]
- Add smooth horizontal scroll animation (transform: translateX)
- Disable arrows at scroll boundaries
- Accept `selectedPlatforms` and `onChange` props

### Step 7: Extend Storage Utilities
**File: `src/entrypoints/content/storage-utils.ts`**

Add settings update functionality:
```typescript
static async updateSettings(updates: Partial<StorageData['settings']>): Promise<boolean> {
  return this.withLock(async () => {
    const data = await this.getStorageData();
    data.settings = { ...data.settings, ...updates };
    
    // Update nextLessonAt if frequency changed
    if (updates.lessonFrequency !== undefined) {
      const currentScroll = /* get current total scroll count */;
      data.nextLessonAt = currentScroll + updates.lessonFrequency;
    }
    
    await browser.storage.local.set({ [STORAGE_KEY]: data });
    return true;
  });
}
```

### Step 8: Add Platform Icon Assets
**Directory: `src/assets/platform-icons/`**

Create or source SVG icons for each platform:
- Instagram icon (black outline style)
- TikTok icon (black outline style)
- YouTube Shorts icon (black outline style)
- Ensure icons are 24×24 viewBox for consistency
- Use currentColor for fill to allow styling

### Step 9: Implement Settings Persistence
**In: `src/entrypoints/popup/pages/SettingsPage.tsx`**

Connect UI components to storage:
- Load settings on component mount using `StorageUtils.getStorageData()`
- Debounce updates by 500ms to prevent excessive storage writes
- Update storage when frequency selection changes
- Update storage when platform selections change
- Show subtle save confirmation (e.g., brief checkmark animation)

### Step 10: Polish Transitions and State Management
**Across all modified files:**

Add finishing touches:
- Implement smooth fade transitions between page switches (opacity animation)
- Preserve scroll position when switching pages
- Add loading states during storage operations
- Ensure settings changes apply immediately to content scripts
- Test multi-tab synchronization of settings

## Testing Script

### Test 1: Page Navigation
```javascript
// Test basic navigation between pages
1. Open extension popup
2. Verify Home page displays with all metrics
3. Click Settings icon in navigation bar
4. Expect: Settings page appears with smooth transition
5. Expect: Settings icon becomes highlighted/selected
6. Click Home icon
7. Expect: Return to Home page with metrics intact
8. Expect: Home icon becomes highlighted
```

### Test 2: Lesson Frequency Selection
```javascript
// Test frequency selector functionality
1. Navigate to Settings page
2. Observe current frequency selection (default: Often/3)
3. Click "Sometimes (4-6)"
4. Expect: Visual feedback showing selection change
5. Scroll 4 times on tracked site
6. Expect: Lesson appears after 6th scroll (not 3rd)
7. Return to settings and verify selection persisted
```

### Test 3: Platform Multi-Selection
```javascript
// Test platform selector with scrolling
1. Navigate to Settings page
2. See 3 platforms visible: Instagram, TikTok, YouTube Shorts
3. All should be selected by default
4. Deselect Instagram
5. Visit Instagram.com
6. Expect: No scroll tracking or lessons on Instagram
7. Visit TikTok.com
8. Expect: Normal tracking still works on TikTok
9. Re-select Instagram and verify tracking resumes
```

### Test 4: Horizontal Platform Scrolling
```javascript
// Test when more platforms added (future-proofing)
1. Add more platforms to the list (Twitter, Reddit, Facebook)
2. Verify only 3 visible at once
3. Click right arrow
4. Expect: Smooth scroll to show next 3 platforms
5. Click left arrow
6. Expect: Scroll back to first 3 platforms
7. Verify arrow states (disabled at boundaries)
```

### Test 5: Settings Persistence
```javascript
// Test settings save across sessions
1. Change frequency to "Barely (7-9)"
2. Deselect YouTube Shorts
3. Close extension popup
4. Reopen extension popup
5. Navigate to Settings
6. Expect: "Barely" still selected
7. Expect: YouTube Shorts still deselected
8. Check browser.storage.local.get('xscroll-data')
9. Verify settings.lessonFrequency = 9
10. Verify settings.enabledSites excludes YouTube
```

### Test 6: Multi-Tab Settings Sync
```javascript
// Test settings apply across all tabs
1. Open two tabs with tracked sites
2. Change frequency to "Sometimes" in popup
3. Both tabs should respect new 6-scroll threshold
4. Disable TikTok in settings
5. TikTok tab should stop tracking immediately
6. Instagram tab should continue normally
```

### Test 7: Edge Cases
```javascript
// Test boundary conditions
1. Rapidly toggle frequency selections
   Expect: No crashes, last selection wins
2. Toggle all platforms off
   Expect: No tracking on any site
3. Close popup during settings change
   Expect: Last completed change persists
4. Test with 0% brain battery
   Expect: Settings still accessible and functional
```

## Success Criteria

- [ ] Page routing works smoothly between Home and Settings
- [ ] Navigation bar correctly highlights current page
- [ ] Lesson frequency selector updates storage immediately
- [ ] Platform selector supports multi-selection
- [ ] Horizontal scrolling works for platform list
- [ ] Settings persist across popup sessions
- [ ] Changes apply immediately to content scripts
- [ ] UI maintains consistent black-and-white casino aesthetic
- [ ] All transitions are smooth (< 300ms)
- [ ] No memory leaks from event listeners
- [ ] TypeScript types are complete and strict
- [ ] Storage updates are atomic with proper locking

## Notes for Implementation

1. **State Management**: Keep settings as local state in SettingsPage, sync to storage on change
2. **Performance**: Debounce storage writes to prevent excessive I/O
3. **Styling**: Maintain consistent casino slot machine aesthetic throughout
4. **Accessibility**: Ensure keyboard navigation works for all controls
5. **Error Handling**: Gracefully handle storage failures with user feedback
6. **Platform Icons**: Start with placeholder divs if icons not ready
7. **Future Extensibility**: Design platform selector to easily add more platforms later

## Implementation Notes

Phase 5 implementation successfully completed with all core features functional:

- **Page Routing System**: App.tsx now manages navigation state and conditionally renders HomePage, SettingsPage, or Library placeholder
- **Component Architecture**: HomePage extracted from App.tsx with proper state management and prop passing for brain battery
- **Settings Components**: LessonFrequency and PlatformSelector built with casino aesthetic matching existing design system
- **Storage Integration**: updateSettings method extended to recalculate nextLessonAt when frequency changes
- **Icon System**: Created inline SVG components for platform icons (Instagram, TikTok, YouTube) in black outline style
- **Real-time Updates**: Settings changes save immediately to storage and apply across extension contexts
- **TypeScript Types**: All components properly typed with strict TypeScript compliance

## Additionally Addressed Problems

1. **Updated Storage Utils Method**
   - Extended updateSettings() to recalculate nextLessonAt when lessonFrequency changes
   - Ensures lesson trigger timing updates immediately when user changes frequency settings

2. **Platform Domain Consistency**
   - Platform selector uses correct domain names matching storage system (instagram.com, tiktok.com, youtube.com)
   - Maintains compatibility with existing tracking system

3. **Component State Management**  
   - Settings page manages local state and debounces storage updates
   - HomePage receives brain battery as props to maintain single source of truth in App.tsx
   - Navigation state properly managed at app level with callback system

4. **Fixed Time Tracking Inconsistency**
   - Root Cause: Background script used hardcoded TRACKED_SITES array with restrictive YouTube filtering
   - Content script used storage settings but background script only started timers for hardcoded URLs
   - Solution: Updated background script to use same storage-based shouldTrackUrl() logic as content script
   - Result: Time tracking now works on ALL enabled sites, not just TikTok/Instagram/YouTube Shorts