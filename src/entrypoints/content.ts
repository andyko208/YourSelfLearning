import { StorageUtils } from './content/storage-utils';
import { LessonManager } from './content/lesson-manager';
import { BrainFriedOverlay, BrainFriedOverlayCallbacks } from './content/brain-fried-overlay';
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
    
    // Brain battery monitoring (runs independently on tracked sites)
    let brainBatteryCheckInterval: number | null = null;
    
    const SCROLL_COOLDOWN = 2000; // 2 seconds
    const TIME_UPDATE_INTERVAL = 2000; // 2 seconds (batch writes to reduce lock pressure)
    const BRAIN_BATTERY_CHECK_INTERVAL = 1000; // 1 second (frequent monitoring for responsiveness)

    // Initialize lesson manager
    const lessonManager = new LessonManager();

    // Initialize brain fried overlay
    const brainFriedOverlay = new BrainFriedOverlay({
      onClose: () => {
        // Reset the brain fried state so monitoring can resume if needed
        isBrainFried = false;
      },
      onTakeBreak: async () => {
        // Give a small battery boost for taking a break and reset state
        try {
          await StorageUtils.incrementBrainBattery(15); // Boost for taking a break
          isBrainFried = false;
        } catch (error: any) {
          console.error('Error boosting brain battery:', error);
        }
      }
    } as BrainFriedOverlayCallbacks);

    let isBrainFried = false;

    async function checkBrainBatteryLevel() {
      // Only check on tracked pages
      if (!(await shouldTrackThisPage())) return;
      
      try {
        const data = await StorageUtils.getStorageData();
        const brainBattery = data.brainBattery;
        
        if (brainBattery <= 0 && !isBrainFried) {
          // Brain is fried, show overlay and stop further checking
          isBrainFried = true;
          brainFriedOverlay.show();
        } else if (brainBattery > 0 && isBrainFried) {
          // Brain battery recovered (should only happen if user left and came back, or took a break)
          isBrainFried = false;
          if (brainFriedOverlay.isOverlayActive()) {
            brainFriedOverlay.cleanup();
          }
        }
      } catch (error: any) {
        console.error('Error checking brain battery level:', error);
      }
    }

    // Start independent brain battery monitoring for tracked pages
    function startBrainBatteryMonitoring() {
      if (brainBatteryCheckInterval) return; // Already running
      
      brainBatteryCheckInterval = window.setInterval(async () => {
        // Only check if overlay is not already active
        if (!isBrainFried) {
          await checkBrainBatteryLevel();
        }
      }, BRAIN_BATTERY_CHECK_INTERVAL);
      
      // Run initial check
      checkBrainBatteryLevel().catch((error: any) => {
        console.error('Error in initial brain battery check:', error);
      });
    }

    // Stop brain battery monitoring
    function stopBrainBatteryMonitoring() {
      if (!brainBatteryCheckInterval) return;
      
      clearInterval(brainBatteryCheckInterval);
      brainBatteryCheckInterval = null;
      
      // Clean up overlay if active when leaving tracked site
      if (isBrainFried && brainFriedOverlay.isOverlayActive()) {
        brainFriedOverlay.cleanup();
        isBrainFried = false;
      }
    }

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
        // ignore
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
      
      // Start brain battery monitoring for tracked sites
      startBrainBatteryMonitoring();
      
      // Start interval to update time every second
      timeUpdateInterval = window.setInterval(async () => {
        if (!isTimerRunning) return;
        
        // Don't track time if lesson is active, but continue when brain-fried overlay is active
        // (user is still "wasting time" on the platform even if blocked)
        if (lessonManager.isActive()) {
          // Update lastTimeUpdate to prevent counting lesson time as wasted time
          lastTimeUpdate = Date.now();
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
      
      // Stop brain battery monitoring when not on tracked sites
      stopBrainBatteryMonitoring();
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
        
        // Don't track time if lesson is active, but continue when brain-fried overlay is active
        if (lessonManager.isActive()) {
          // Update lastTimeUpdate to prevent counting lesson time as wasted time
          lastTimeUpdate = Date.now();
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
        // Start brain battery monitoring immediately for tracked pages
        startBrainBatteryMonitoring();
        
        browser.runtime.sendMessage({
          type: 'REQUEST_TIMER_STATE'
        }).catch((error: any) => {
          // ignore
        });
      }
    }).catch((error: any) => {
      console.error('Error checking if should track page:', error);
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      stopTimeTracking();
      stopBrainBatteryMonitoring();
      lessonManager.cleanup();
      brainFriedOverlay.cleanup();
    });
  },
});
