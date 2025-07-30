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

