<div align="center">
  <img src="docs/media/logo-placeholder.png" alt="XScroll Logo" width="120" height="120">

  <h1>XScroll</h1>
  
  <p><strong>Turn endless scrolling into short learning moments.</strong></p>
  <p><strong>A Chrome extension that swaps doomscrolling with micro-lessons tailored to your interests.</strong></p>
  
  <p>
    <a href="#features"><img src="https://img.shields.io/badge/Features-✨-blue?style=for-the-badge" alt="Features"></a>
    <a href="#getting-started"><img src="https://img.shields.io/badge/Get%20Started-🚀-green?style=for-the-badge" alt="Get Started"></a>
    <a href="#development"><img src="https://img.shields.io/badge/Develop-🛠️-orange?style=for-the-badge" alt="Develop"></a>
    <a href="#contributing"><img src="https://img.shields.io/badge/Contribute-🤝-purple?style=for-the-badge" alt="Contribute"></a>
  </p>
</div>

![Product teaser placeholder](docs/media/popup-showcase-placeholder.png)

https://example.com/demo-video-placeholder

> [!TIP]
> ⭐ **Star the repo** to stay updated as we ship new lessons, themes, and productivity features.

> [!NOTE]
> XScroll is an independent open-source project. It is not affiliated with or endorsed by any social network mentioned in this repository.

---

## 🌟 Overview

XScroll is an educational intervention system that disrupts unproductive social media sessions with engaging lessons. When you browse selected sites, XScroll monitors your scroll momentum, challenges you with quizzes or bite-sized lessons, and tracks how your learning improves over time. The extension is built on the [WXT](https://wxt.dev/) framework and leverages the latest Chrome Extension APIs for a seamless multi-context experience.

Use it to turn idle browsing into progress on topics you care about: languages, STEM, culture, trivia, and more.

## 📋 Table of Contents

- [🌟 Overview](#-overview)
- [✨ Features](#-features)
  - [🎯 Interventions That Adapt](#-interventions-that-adapt)
  - [📊 Learning Metrics Dashboard](#-learning-metrics-dashboard)
  - [🧠 Brain Battery Safeguard](#-brain-battery-safeguard)
  - [🎛️ Personalized Settings](#️-personalized-settings)
  - [🧱 Extensible Architecture](#-extensible-architecture)
- [🧭 Product Tour](#-product-tour)
- [🗂️ Repository Structure](#️-repository-structure)
- [⚙️ Requirements](#️-requirements)
- [🚀 Getting Started](#-getting-started)
  - [Install Locally](#install-locally)
  - [Run in Development Mode](#run-in-development-mode)
  - [Build a Production Bundle](#build-a-production-bundle)
  - [Load the Chrome Extension](#load-the-chrome-extension)
- [📖 Usage Guide](#-usage-guide)
  - [Popup Home](#popup-home)
  - [Lesson Library](#lesson-library)
  - [Settings](#settings)
- [🛠️ Development](#️-development)
  - [Tech Stack](#tech-stack)
  - [Extension Architecture](#extension-architecture)
  - [Storage Model](#storage-model)
  - [Testing](#testing)
- [🤝 Contributing](#-contributing)
  - [Issue Labels](#issue-labels)
  - [Development Workflow](#development-workflow)
  - [Design & UX Guidelines](#design--ux-guidelines)
- [🗺️ Roadmap](#️-roadmap)
- [🔒 Security](#-security)
- [📄 License](#-license)
- [📚 Additional Resources](#-additional-resources)

## ✨ Features

### 🎯 Interventions That Adapt
- Tracks scroll momentum and idle time on popular social media sites.
- Interrupts doomscrolling with quiz-style lessons sourced from curated `.tsv` files.
- Adjusts lesson frequency based on your configuration and recent activity.

### 📊 Learning Metrics Dashboard
- Summaries of scrolls, time spent, and lessons completed with day-by-day breakdowns.
- Session tooltips reveal morning, afternoon, and night activity to highlight habits.
- Persistent history uses a single source of truth in `browser.storage.local`.

### 🧠 Brain Battery Safeguard
- The "brain battery" visualizes cognitive fatigue.
- Active browsing drains the battery; taking a break lets it recharge automatically.
- Lessons pause when your battery is depleted to prevent burnout.

### 🎛️ Personalized Settings
- Choose the sites XScroll should monitor.
- Pick themes and topics to customize lesson content.
- Swap between frequency modes (by scroll count or elapsed time).

### 🧱 Extensible Architecture
- Modular WXT entry points for background, popup, and content scripts.
- Utility-driven storage layer to keep logic reusable across contexts.
- Hook-based React popup designed for minimal state and responsive layouts.

## 🧭 Product Tour

| Screen | Description |
| ------ | ----------- |
| ![Popup home placeholder](docs/media/popup-home-placeholder.png) | Home metrics aligning learning gains with browsing habits. |
| ![Lesson overlay placeholder](docs/media/lesson-overlay-placeholder.png) | Full-screen lesson overlay that pauses the feed and captures your answer. |
| ![Settings placeholder](docs/media/settings-placeholder.png) | Controls for tracked sites, lesson cadence, and theme selections. |

> Replace the placeholder images with screenshots or GIFs when available.

## 🗂️ Repository Structure

```
XScroll/
├── public/                  # Static assets (lessons TSV files, icons)
├── src/
│   ├── entrypoints/
│   │   ├── background.ts    # Service worker (tab tracking, timers, battery)
│   │   ├── content/         # Content scripts (lesson overlays, storage utils)
│   │   └── popup/           # React popup UI and styles
│   ├── hooks/               # Reusable React hooks
│   ├── types/               # Shared TypeScript interfaces (storage, messages)
│   └── utils/               # Browser API polyfills, formatters, lesson parser
├── tests/                   # Playwright end-to-end tests (optional)
├── wxt.config.ts            # WXT build configuration
└── web-ext.config.ts        # WebExt helper for local runs
```

## ⚙️ Requirements

- Node.js 18+
- npm 9+
- Chrome (or Chromium-based browser)
- Optional: Firefox for cross-browser testing

## 🚀 Getting Started

### Install Locally

```bash
npm install
```

### Run in Development Mode

```bash
npm run dev
```

This launches the WXT dev server with hot reloading. You will see the popup fetch scripts from `http://localhost:3000/`, and background/content scripts reload automatically when files change.

### Build a Production Bundle

Always generate a production build before publishing to the Chrome Web Store to strip dev-only scripts and WebSocket connections.

```bash
npm run build
```

Outputs:
- `dist/chrome-mv3` – production-ready extension
- `dist/chrome-mv3.zip` – packaged archive (created via `npm run zip`)

> **Important:** Do **not** upload the `chrome-mv3-dev` folder to the store. The dev bundle references `ws://localhost:3000` and will render a blank popup in production.

### Load the Chrome Extension

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select `dist/chrome-mv3`.
4. Pin XScroll to your toolbar to access the popup quickly.

For Firefox, run `npm run dev:firefox` or load the signed build via `about:debugging`.

## 📖 Usage Guide

### Popup Home
- Quickly switch between **Today** and **Yesterday** to compare habits.
- Slot-machine metrics show scrolls, time spent, and lessons completed.
- Hover tooltips break metrics into morning, afternoon, and night sessions.

### Lesson Library
- Browse lessons grouped by theme and topic.
- Toggle individual lessons to preview the questions that might appear.
- Coming soon: community-contributed lesson packs.

### Settings
- Enable or disable supported social platforms.
- Choose lesson frequency (scroll-based or time-based intervals).
- Change the active theme to unlock tailored lesson libraries.

## 🛠️ Development

### Tech Stack
- **Framework**: [WXT](https://wxt.dev/) + Vite
- **UI**: React + TypeScript
- **State & Storage**: Chrome `storage.local` via shared `StorageUtils`
- **Testing**: Playwright (headless UI flows)
- **Build Tools**: npm scripts, WebExt helpers for local signing

### Extension Architecture
- **Background Service Worker**: Tracks active social tabs, manages timers, and recharges the brain battery when you leave monitored sites.
- **Content Scripts**: Inject overlays, block scroll interactions during lessons, and synchronize lesson schedules across tabs.
- **Popup React App**: Surfaces metrics, lesson library, and settings with a unified layout system and shared spacing tokens.
- **Utilities**: `lesson-parser` loads TSV data into memory, `browser-api` wraps WebExtension APIs for cross-browser support, and formatters keep display logic reusable.

### Storage Model
All mutable data sits in a single namespace: `browser.storage.local['xscroll-data']`.

Key properties include:
- `today` / `yesterday` – per-period metrics (`morning`, `afternoon`, `night`).
- `settings` – tracked sites, lesson cadence, theme-specific topic selections.
- `nextLessonAt` – timestamp when the next lesson should trigger.
- `lessonActive` – coordination flag between contexts.
- `brainBattery` – percentage charge (0–100).
- `bonusTracker` – streak rewards and notifications.

The storage helpers serialize all reads/writes to avoid race conditions and ensure a single source of truth.

### Testing

```bash
npm test        # Run Playwright suite
npm run test:ui # Launch Playwright inspector
```

Recommended scenarios:
- Scroll tracking and lesson trigger across multiple tabs
- Lesson completion and storage updates
- Popup rendering with mocked storage data

## 🤝 Contributing

We welcome thoughtful contributions from educators, developers, and designers.

### Issue Labels
- `good first issue` – scoped tasks ideal for new contributors
- `help wanted` – features or bugs that need community support
- `design` – UI/UX refinements aligned with the popup layout guidelines
- `content` – lesson curation, fact-checking, or localization

### Development Workflow
1. Fork the repository and create a feature branch.
2. Run `npm run dev` to iterate with hot reload.
3. Add Playwright tests when introducing new behaviors.
4. Ensure `npm run build` succeeds before opening a PR.
5. Follow [Conventional Commits](https://www.conventionalcommits.org/) in commit messages.
6. Attach screenshots or screen recordings (use the placeholders above) to demonstrate UI updates.

### Design & UX Guidelines
- Reuse shared layout containers and spacing tokens.
- Keep lessons accessible: high contrast, keyboard-friendly overlays.
- Minimize DOM depth and inline styles; prefer shared CSS modules.
- Avoid adding new state unless it has a single source of truth.

## 🗺️ Roadmap

- [ ] Expand lesson themes (STEM, art history, language practice)
- [ ] Add reward system for sustained learning streaks
- [ ] Sync metrics across devices via optional account login
- [ ] Provide Firefox and Edge store listings
- [ ] Release public API for community lesson packs

## 🔒 Security

- No external analytics or tracking libraries.
- All lessons and metrics are stored locally on the user’s machine.
- Content scripts run only on user-enabled domains.
- Permissions are scoped to the minimum required for overlays and storage.

## 📄 License

Released under the MIT License. See [`LICENSE`](LICENSE) for details.

## 📚 Additional Resources

- Documentation site placeholder: https://example.com/docs
- Product walkthrough placeholder: https://example.com/blog-post
- Community chat placeholder: https://example.com/community

---

<div align="center">
  <p><strong>Made for curious minds. Replace the scroll spiral with deliberate learning.</strong></p>
  <p>
    <a href="https://github.com/andyko/xscroll/issues">Report Bug</a>
    ·
    <a href="https://github.com/andyko/xscroll/issues">Request Feature</a>
  </p>
</div>
