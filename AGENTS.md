# Meta Prompt & Role Definition

You are an expert browser extension developer and a a proficient UI/UX developer specializing in TypeScript, React, and Chrome Extension APIs. Your role is to build an educational intervention system that transforms social media scrolling into learning opportunities. You have deep expertise in the WXT framework, Chrome storage patterns, content script injection, and creating performant browser extensions that work seamlessly across different platforms.

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
10. Minimalism & Code Efficiency
	•	Reduce inline styles where possible and move them into shared CSS classes or style objects for reusability.
	•	Avoid deep nesting or unnecessary wrapper <div>s.
	•	Keep components lightweight and readable with fewer lines of code.
11. Consistency Across Pages
	•	Apply a shared layout container with consistent padding, spacing, and alignment rules across the pages.
	•	Ensure that headings, content blocks, and metric panels follow the same vertical rhythm (consistent margins between sections).
	•	Use flex or grid layouts for predictable alignment instead of ad-hoc margins.
12. Readability & Visibility
	•	All content should remain visible and centered in the popup area without overflow.
	•	Prioritize whitespace and spacing tokens over decorative borders or heavy backgrounds.
	•	Use consistent font sizes (h2, labels, values) to establish hierarchy.
13. UI/UX Balance
	•	Maintain the playful uniqueness of HomePage (e.g., brain fried panel) while keeping the core layout consistent with SettingsPage.
	•	Ensure the slot machine metrics and settings sections feel visually related by using the same border-radius, spacing, and padding values.

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

# XScroll - Phase 6: Library Page - Customizable Lesson Content System

## Project Overview

Phase 6 implements the Library page where users can customize which educational lesson themes and topics appear during their scroll interventions. The system features a two-tier selection hierarchy: themes (single-select) that determine available topics, and topics (multi-select) within each theme. This builds upon the existing Settings page architecture, utilizing similar horizontal scrolling components while introducing dynamic content loading based on theme selection.

### Key Features
- Theme selector with three options: "How to", "What is", "Why"
- Dynamic topic selector that updates based on selected theme
- Real-time lesson loading/unloading based on topic selection
- Hover tooltips showing one-sentence summaries for each topic
- Integration with existing lesson parser utility

## Project Structure

### Files to Create
```
src/entrypoints/popup/
├── pages/
│   └── LibraryPage.tsx              # Main Library page component
└── components/library/
    ├── ThemeSelector.tsx             # Single-select theme component
    └── TopicSelector.tsx             # Multi-select topic component with dynamic content
```

### Files to Modify
```
src/
├── entrypoints/
│   ├── popup/App.tsx                 # Add Library page routing
│   └── content/storage-utils.ts      # Add lesson selection storage methods
├── types/storage.ts                  # Add selectedTheme and selectedTopics fields
└── utils/lesson-parser.ts            # Extend with selective lesson loading
```

### New Lesson Files Required
```
public/lessons/
├── how-to-control.tsv                # Existing
├── how-to-learn.tsv                  # New
├── how-to-speak.tsv                  # New
├── what-is-money.tsv                 # New
├── what-is-relationship.tsv          # New
├── what-is-life.tsv                  # New
├── why-survive.tsv                   # New
├── why-love.tsv                      # New
└── why-hate.tsv                      # New
```

## Development Steps

### Step 1: Extend Storage System for Lesson Selection
**Objective**: Add storage fields and methods to track selected theme and topics

**Files to Edit**:
- `src/types/storage.ts`
- `src/entrypoints/content/storage-utils.ts`

**Implementation Outline**:
1. Add to `Settings` interface:
   - `selectedTheme: 'how-to' | 'what-is' | 'why'`
   - `selectedTopics: string[]` (array of topic identifiers)
2. Create storage methods in StorageUtils:
   - `updateSelectedTheme(theme: string)`
   - `updateSelectedTopics(topics: string[])`
   - `getSelectedLessons()` - returns filtered lesson set
3. Set default values in initialization (theme: 'how-to', topics: ['control'])

**Testing**:
- Verify storage initialization includes new fields
- Test theme update clears incompatible topics
- Confirm topic selection persists across browser sessions

### Step 2: Enhance Lesson Parser for Dynamic Loading
**Objective**: Modify lesson parser to load specific lesson files based on selection

**Files to Edit**:
- `src/utils/lesson-parser.ts`

**Implementation Outline**:
1. Create `THEME_TOPIC_MAP` constant mapping themes to available topics:
   ```typescript
   {
     'how-to': ['control', 'learn', 'speak'],
     'what-is': ['money', 'relationship', 'life'],
     'why': ['survive', 'love', 'hate']
   }
   ```
2. Add `TOPIC_DESCRIPTIONS` for hover tooltips
3. Modify `loadLessons()` to accept topic array parameter
4. Implement `getRandomLessonFromTopics(topics: string[])` method
5. Create file path builder: `getLessonFilePath(theme: string, topic: string)`

**Testing**:
- Test loading lessons from multiple topics
- Verify graceful handling of missing lesson files
- Confirm random selection works across topic boundaries

### Step 3: Build Theme Selector Component
**Objective**: Create single-select theme interface matching Settings page style

**Files to Create**:
- `src/entrypoints/popup/components/library/ThemeSelector.tsx`

**Implementation Outline**:
1. Create pill-shaped button interface similar to LessonFrequency
2. Three options: "How to", "What is", "Why"
3. Props: `selectedTheme`, `onThemeChange`
4. Styling: Black borders, white background, active state highlighting
5. Smooth transitions and hover effects (match existing casino aesthetic)

**Testing**:
- Verify single selection behavior
- Test visual feedback for active state
- Confirm theme change triggers storage update

### Step 4: Build Dynamic Topic Selector Component
**Objective**: Create multi-select topic interface with horizontal scrolling

**Files to Create**:
- `src/entrypoints/popup/components/library/TopicSelector.tsx`

**Implementation Outline**:
1. Base structure on existing PlatformSelector component
2. Props: `selectedTheme`, `selectedTopics`, `onTopicToggle`
3. Dynamic content based on theme (3 different topic sets)
4. Each topic card includes:
   - Topic name
   - Checkbox/selection indicator
   - Hover tooltip with description
5. Horizontal scrolling with arrow navigation
6. Multi-select capability with visual feedback

**Testing**:
- Test content updates when theme changes
- Verify multi-select functionality
- Confirm tooltips appear on hover
- Test scroll navigation at boundaries

### Step 5: Implement Library Page
**Objective**: Assemble complete Library page with theme and topic selection

**Files to Create**:
- `src/entrypoints/popup/pages/LibraryPage.tsx`

**Implementation Outline**:
1. Import and compose ThemeSelector and TopicSelector
2. Manage local state for theme and topics
3. Storage integration:
   - Load initial selections from storage
   - Update storage on selection changes
   - Listen for external storage changes
4. Layout structure:
   - Header: "Lessons"
   - Section 1: Theme selection
   - Section 2: Topic selection (dynamic based on theme)
   - Maintain consistent spacing with Settings page: ResetTimer, BrainBattery, NavigationBar
5. Handle theme change logic:
   - Clear incompatible topics when theme changes
   - Update available topics in selector

**Testing**:
- Test complete user flow: theme change → topic update → storage persist
- Verify real-time lesson loading based on selections
- Confirm UI updates when storage changes externally

### Step 6: Integrate with Navigation System
**Objective**: Enable Library page access through existing navigation

**Files to Edit**:
- `src/entrypoints/popup/App.tsx`
- `src/entrypoints/popup/components/NavigationBar.tsx`

**Implementation Outline**:
1. Import LibraryPage component in App.tsx
2. Add case for 'library' in page rendering switch
3. Update NavigationBar to remove placeholder behavior for Library
4. Ensure proper page transitions and state preservation

**Testing**:
- Navigate between all three pages
- Verify Library selections persist during navigation
- Test that Library icon highlights when active

### Step 7: Connect Selected Lessons to Content System
**Objective**: Ensure lesson overlay displays only selected topic lessons

**Files to Edit**:
- `src/entrypoints/content/lesson-manager.ts`

**Implementation Outline**:
1. Modify lesson loading to use `getSelectedLessons()` from storage
2. Update `showLesson()` to pull from filtered lesson pool
3. Handle edge case: no topics selected (show warning or default)
4. Ensure lesson randomization works across selected topics

**Testing**:
- Select specific topics and verify only those lessons appear
- Test with single topic selected
- Test with all topics from one theme
- Verify lessons don't appear if no topics selected

## Testing Strategy

### Unit Tests
1. **Storage Operations**
   - Theme selection persistence
   - Topic array management
   - Default value initialization

2. **Lesson Parser**
   - Multi-file loading
   - Topic-based filtering
   - Random selection distribution

3. **Component Behavior**
   - Theme selector single-select
   - Topic selector multi-select
   - Dynamic content updates

### Integration Tests
1. **Full User Flow**
   - Navigate to Library → Select theme → Select topics → Navigate away → Return and verify persistence
   - Change theme and verify topic reset
   - Select topics → Trigger lesson → Verify correct content pool

2. **Edge Cases**
   - No topics selected behavior
   - Missing lesson file handling
   - Storage quota limits with many selections

3. **Cross-Tab Synchronization**
   - Update Library in one tab
   - Verify lessons update in content scripts across all tabs
   - Test real-time synchronization

### Visual Regression Tests
1. Theme selector active states
2. Topic card selection indicators
3. Horizontal scroll arrow states
4. Tooltip positioning and content

## Success Criteria
- [ ] Users can select one theme at a time
- [ ] Topic options update based on selected theme
- [ ] Multiple topics can be selected within a theme
- [ ] Selections persist across browser sessions
- [ ] Lesson overlay only shows content from selected topics
- [ ] UI maintains consistent casino aesthetic with existing pages
- [ ] Real-time updates when selections change
- [ ] Smooth transitions and intuitive user experience

## Additionally Addressed Problems
4. Library Page and Dynamic Lesson Loading
   - Added theme/topic selection with real-time synchronization across contexts
   - Implemented selective lesson loading in `src/utils/lesson-parser.ts` with caching
   - Ensured UI parity with Settings components for consistent UX