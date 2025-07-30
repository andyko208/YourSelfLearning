import { StorageUtils } from './content/storage-utils';
import { LessonManager } from './content/lesson-manager';
import { browser } from '../utils/browser-api';

export default defineContentScript({
  matches: [
    '*://*.tiktok.com/*',
    '*://*.instagram.com/*', 
    '*://*.youtube.com/*'
  ],
  cssInjectionMode: 'ui',
  main() {
    let lastScrollTime = 0;
    let isTimerRunning = false;
    let timerStartTime = 0;
    let timeUpdateInterval: number | null = null;
    let lastTimeUpdate = 0;
    
    const SCROLL_COOLDOWN = 2000; // 2 seconds
    const TIME_UPDATE_INTERVAL = 1000; // 1 second

    // Initialize lesson manager
    const lessonManager = new LessonManager();

    function shouldTrackThisPage(): boolean {
      const url = window.location.href;
      
      // TikTok - all pages
      if (url.includes('tiktok.com')) {
        return true;
      }
      
      // Instagram - all pages (feed, stories, reels)
      if (url.includes('instagram.com')) {
        return true;
      }
      
      // YouTube - only Shorts and some watch pages
      if (url.includes('youtube.com')) {
        return url.includes('/shorts/') || 
               (url.includes('/watch') && url.includes('&list=') && url.includes('shorts'));
      }
      
      return false;
    }

    function handleScroll() {
      if (!shouldTrackThisPage()) return;
      
      // Don't track scrolls if lesson is active
      if (lessonManager.isActive()) {
        return;
      }
      
      const now = Date.now();
      
      // Check cooldown
      if (now - lastScrollTime < SCROLL_COOLDOWN) {
        return;
      }
      
      lastScrollTime = now;
      
      // Increment scroll count and check for lesson trigger
      StorageUtils.incrementScrollCount().then(() => {
        // Directly trigger lesson check after scroll count update
        lessonManager.triggerLessonCheck().catch((error: any) => {
          console.error('Error checking lesson trigger:', error);
        });
      }).catch((error: any) => {
        console.error('Error incrementing scroll count:', error);
      });
      
      // Notify background script
      browser.runtime.sendMessage({
        type: 'SCROLL_DETECTED',
        timestamp: now
      }).catch(error => {
        console.log('Could not send scroll message to background:', error);
      });      
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (!shouldTrackThisPage()) return;
      
      // Only track down arrow key
      if (event.key === 'ArrowDown') {
        handleScroll();
      }
    }

    function startTimeTracking(startTime: number) {
      if (isTimerRunning) return;
      
      isTimerRunning = true;
      timerStartTime = startTime;
      lastTimeUpdate = startTime;
      
      // Start interval to update time every second
      timeUpdateInterval = window.setInterval(async () => {
        if (!isTimerRunning) return;
        
        // Don't track time if lesson is active
        if (lessonManager.isActive()) {
          return;
        }
        
        const now = Date.now();
        const secondsElapsed = Math.floor((now - lastTimeUpdate) / 1000);
        
        if (secondsElapsed >= 1) {
          try {
            await StorageUtils.incrementTimeWasted(secondsElapsed);
            lastTimeUpdate = now;
          } catch (error) {
            console.error('Error updating time:', error);
          }
        }
      }, TIME_UPDATE_INTERVAL);
    }

    function stopTimeTracking(elapsedTime?: number) {
      if (!isTimerRunning) return;
      
      isTimerRunning = false;
      
      if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval);
        timeUpdateInterval = null;
      }
      
      // Update final elapsed time if provided
      if (elapsedTime && elapsedTime > 0) {
        const finalSeconds = Math.floor(elapsedTime / 1000);
        const remainingTime = finalSeconds - Math.floor((lastTimeUpdate - timerStartTime) / 1000);
        
        if (remainingTime > 0) {
          StorageUtils.incrementTimeWasted(remainingTime).catch(error => {
            console.error('Error updating final time:', error);
          });
        }
      }
    }

    function pauseTimeTracking() {
      if (!isTimerRunning) return;
      
      // Stop the interval but keep timer state
      if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval);
        timeUpdateInterval = null;
      }
    }

    function resumeTimeTracking() {
      if (!isTimerRunning || timeUpdateInterval) return;
      
      // Resume the interval
      timeUpdateInterval = window.setInterval(async () => {
        if (!isTimerRunning) return;
        
        // Don't track time if lesson is active
        if (lessonManager.isActive()) {
          return;
        }
        
        const now = Date.now();
        const secondsElapsed = Math.floor((now - lastTimeUpdate) / 1000);
        
        if (secondsElapsed >= 1) {
          try {
            await StorageUtils.incrementTimeWasted(secondsElapsed);
            lastTimeUpdate = now;
          } catch (error) {
            console.error('Error updating time:', error);
          }
        }
      }, TIME_UPDATE_INTERVAL);
    }

    // Handle messages from background script
    browser.runtime.onMessage.addListener((message: any) => {
      switch (message.type) {
        case 'START_TIMER':
          startTimeTracking(message.startTime);
          break;
          
        case 'STOP_TIMER':
          stopTimeTracking(message.elapsedTime);
          break;
          
        case 'PAUSE_TIMER':
          pauseTimeTracking();
          break;
          
        case 'RESUME_TIMER':
          resumeTimeTracking();
          break;
          
        case 'TIMER_STATE_RESPONSE':
          if (message.isActive && message.startTime) {
            startTimeTracking(message.startTime);
          }
          break;
      }
    });

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        pauseTimeTracking();
      } else if (isTimerRunning) {
        resumeTimeTracking();
      }
    });

    // Add scroll event listeners
    window.addEventListener('wheel', (event) => {
      // Only track downward scrolling
      if (event.deltaY > 0) {
        handleScroll();
      }
    }, { passive: true });

    // Add keyboard event listener
    document.addEventListener('keydown', handleKeyDown);

    // Request current timer state from background
    if (shouldTrackThisPage()) {
      browser.runtime.sendMessage({
        type: 'REQUEST_TIMER_STATE'
      }).catch((error: any) => {
        console.log('Could not request timer state:', error);
      });
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      stopTimeTracking();
      lessonManager.cleanup();
    });
  },
});
