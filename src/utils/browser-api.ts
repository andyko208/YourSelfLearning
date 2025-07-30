/**
 * Centralized browser API compatibility utility
 * Provides cross-browser compatibility for Chrome Extension APIs
 */
export const browser = (globalThis as any).browser || (globalThis as any).chrome;