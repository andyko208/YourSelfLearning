import { StorageUtils } from './content/storage-utils';
import { LessonManager } from './content/lesson-manager';
import { browser } from '../utils/browser-api';

export default defineContentScript({
  matches: [
    '*://*.instagram.com/*', 
    '*://*.tiktok.com/*',
    '*://*.youtube.com/*',
    '*://*.x.com/*',
    '*://*.reddit.com/*',
    '*://*.facebook.com/*',
    '*://*.amazon.com/*'
  ],
  cssInjectionMode: 'ui',
  main() {
    let lastScrollTime = 0;
    let isTimerRunning = false;
    let timerStartTime = 0;
    let timeUpdateInterval: number | null = null;
    let lastTimeUpdate = 0;
    
    // Brain battery recharge timer (runs when NOT on tracked sites)
    let brainRechargeInterval: number | null = null;
    let lastBatteryUpdate = 0;
    
    const SCROLL_COOLDOWN = 2000; // 2 seconds
    const TIME_UPDATE_INTERVAL = 2000; // 2 seconds (batch writes to reduce lock pressure)
    const BATTERY_RECHARGE_INTERVAL = 2000; // 2 seconds (batch writes)

    // Initialize lesson manager
    const lessonManager = new LessonManager();

    async function shouldTrackThisPage(): Promise<boolean> {
      const url = window.location.href;
      
      try {
        // Get enabled sites from storage
        const settings = await StorageUtils.getSettings();
        const enabledSites = settings.enabledSites;
        
        // If no sites are enabled, don't track anything
        if (!enabledSites || enabledSites.length === 0) {
          return false;
        }
        
        // Check if current domain matches any enabled site
        for (const site of enabledSites) {
          if (url.includes(site)) {
            // // Additional URL checks for specific platforms
            // if (site === 'youtube.com') {
            //   // YouTube - only Shorts and some watch pages
            //   return url.includes('/shorts/') || 
            //          (url.includes('/watch') && url.includes('&list=') && url.includes('shorts'));
            // }
            // TikTok and Instagram - all pages
            return true;
          }
        }
        
        return false;
      } catch (error) {
        console.error('Error checking enabled sites:', error);
        // Default to not tracking if storage fails
        return false;
      }
    }

    async function handleScroll() {
      if (!(await shouldTrackThisPage())) return;
      
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
      }).catch((error: any) => {
        console.log('Could not send scroll message to background:', error);
      });      
    }

    async function handleKeyDown(event: KeyboardEvent) {
      if (!(await shouldTrackThisPage())) return;
      
      // Only track down arrow key
      if (event.key === 'ArrowDown') {
        await handleScroll();
      }
    }

    function startTimeTracking(startTime: number) {
      if (isTimerRunning) return;
      
      isTimerRunning = true;
      timerStartTime = startTime;
      lastTimeUpdate = startTime;
      
      // Stop brain battery recharge when on tracked sites
      stopBrainBatteryRecharge();
      
      // Start interval to update time every second
      timeUpdateInterval = window.setInterval(async () => {
        if (!isTimerRunning) return;
        
        // Don't track time if lesson is active
        if (lessonManager.isActive()) {
          return;
        }
        
        const now = Date.now();
        const secondsElapsed = Math.floor((now - lastTimeUpdate) / 1000);
        
        if (secondsElapsed >= 2) {
          try {
            await StorageUtils.incrementTimeWasted(secondsElapsed);
            lastTimeUpdate = now;
          } catch (error: any) {
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
          StorageUtils.incrementTimeWasted(remainingTime).catch((error: any) => {
            console.error('Error updating final time:', error);
          });
        }
      }
      
      // Start brain battery recharge when not on tracked sites
      startBrainBatteryRecharge();
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
          } catch (error: any) {
            console.error('Error updating time:', error);
          }
        }
      }, TIME_UPDATE_INTERVAL);
    }

    // Brain battery recharge functions (run when NOT on tracked sites)
    function startBrainBatteryRecharge() {
      if (brainRechargeInterval || isTimerRunning) return; // Don't start if already running or on tracked sites
      
      lastBatteryUpdate = Date.now();
      
      // Start interval to recharge battery every second (like time tracking)
      brainRechargeInterval = window.setInterval(async () => {
        if (isTimerRunning) return; // Don't recharge if on tracked sites
        
        const now = Date.now();
        const secondsElapsed = Math.floor((now - lastBatteryUpdate) / 1000);
        
        if (secondsElapsed >= 2) {
          try {
            const data = await StorageUtils.getStorageData();
            if (data.brainBattery < 100) {
              await StorageUtils.incrementBrainBattery(secondsElapsed);
            }
            lastBatteryUpdate = now;
          } catch (error: any) {
            console.error('Error recharging brain battery:', error);
          }
        }
      }, BATTERY_RECHARGE_INTERVAL);
    }

    function stopBrainBatteryRecharge() {
      if (!brainRechargeInterval) return;
      
      clearInterval(brainRechargeInterval);
      brainRechargeInterval = null;
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
        handleScroll().catch((error: any) => {
          console.error('Error handling scroll:', error);
        });
      }
    }, { passive: true });

    // Add keyboard event listener
    document.addEventListener('keydown', handleKeyDown);

    // Request current timer state from background
    shouldTrackThisPage().then(shouldTrack => {
      if (shouldTrack) {
        browser.runtime.sendMessage({
          type: 'REQUEST_TIMER_STATE'
        }).catch((error: any) => {
          console.log('Could not request timer state:', error);
        });
      } else {
        // Start brain battery recharge if this is not a tracked page
        startBrainBatteryRecharge();
      }
    }).catch((error: any) => {
      console.error('Error checking if should track page:', error);
      // Default to starting brain battery recharge if check fails
      startBrainBatteryRecharge();
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      stopTimeTracking();
      stopBrainBatteryRecharge();
      lessonManager.cleanup();
    });
  },
});
