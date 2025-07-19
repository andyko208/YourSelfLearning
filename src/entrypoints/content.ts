import { StorageUtils } from './content/storage-utils';

export default defineContentScript({
  matches: [
    '*://*.tiktok.com/*',
    '*://*.instagram.com/*', 
    '*://*.youtube.com/*'
  ],
  main() {
    let lastScrollTime = 0;
    let isTimerRunning = false;
    let timerStartTime = 0;
    let timeUpdateInterval: number | null = null;
    let lastTimeUpdate = 0;
    
    const SCROLL_COOLDOWN = 2000; // 2 seconds
    const TIME_UPDATE_INTERVAL = 1000; // 1 second

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
      
      const now = Date.now();
      
      // Check cooldown
      if (now - lastScrollTime < SCROLL_COOLDOWN) {
        return;
      }
      
      lastScrollTime = now;
      
      // Increment scroll count
      StorageUtils.incrementScrollCount().catch(error => {
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
      
      console.log('Timer started');
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
      
      console.log('Timer stopped');
    }

    function pauseTimeTracking() {
      if (!isTimerRunning) return;
      
      // Stop the interval but keep timer state
      if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval);
        timeUpdateInterval = null;
      }
      
      console.log('Timer paused');
    }

    function resumeTimeTracking() {
      if (!isTimerRunning || timeUpdateInterval) return;
      
      // Resume the interval
      timeUpdateInterval = window.setInterval(async () => {
        if (!isTimerRunning) return;
        
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
      
      console.log('Timer resumed');
    }

    // Handle messages from background script
    browser.runtime.onMessage.addListener((message) => {
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
      }).catch(error => {
        console.log('Could not request timer state:', error);
      });
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      stopTimeTracking();
    });

    console.log('XScroll content script initialized for:', window.location.href);
  },
});
