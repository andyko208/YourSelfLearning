import { browser } from '../utils/browser-api';
import { StorageUtils } from './content/storage-utils';

interface TabState {
  tabId: number;
  isTrackedSite: boolean;
  isActive: boolean;
  url: string;
  hasActiveLesson: boolean;
}

interface ActiveTimer {
  tabId: number;
  startTime: number;
}

export default defineBackground(() => {
  const activeTabs = new Map<number, TabState>();
  let activeTimer: ActiveTimer | null = null;
  
  // Brain battery recharge management
  let brainRechargeInterval: ReturnType<typeof setInterval> | null = null;
  let lastBatteryUpdate = 0;
  const BATTERY_RECHARGE_INTERVAL = 2000; // 2 seconds (same as content script)
  
  async function shouldTrackUrl(url: string): Promise<boolean> {
    if (!url) return false;
    
    try {
      const settings = await StorageUtils.getSettings();
      const enabledSites = settings.enabledSites;
      
      if (!enabledSites || enabledSites.length === 0) {
        return false;
      }
      
      for (const site of enabledSites) {
        if (url.includes(site)) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking enabled sites in background:', error);
      return false;
    }
  }

  async function updateTabState(tabId: number, url: string, isActive: boolean = false) {
    const isTracked = await shouldTrackUrl(url);
    const existingTab = activeTabs.get(tabId);
    
    activeTabs.set(tabId, {
      tabId,
      isTrackedSite: isTracked,
      isActive,
      url,
      hasActiveLesson: existingTab?.hasActiveLesson || false
    });
    
    // Manage timer based on active tracked tabs
    await manageTimer();
    
    // Manage brain battery recharge based on tab state
    await manageBrainBatteryRecharge();
  }

  async function manageTimer() {
    const activeTrackedTab = Array.from(activeTabs.values())
      .find(tab => tab.isActive && tab.isTrackedSite && !tab.hasActiveLesson);
    
    if (activeTrackedTab && !activeTimer) {
      // Start timer for this tab
      activeTimer = {
        tabId: activeTrackedTab.tabId,
        startTime: Date.now()
      };
      
      // Send start message to content script
      try {
        await browser.tabs.sendMessage(activeTrackedTab.tabId, {
          type: 'START_TIMER',
          startTime: activeTimer.startTime
        });
      } catch (error) {
        console.log('Could not send start message to tab:', error);
      }
      
    } else if (!activeTrackedTab && activeTimer) {
      // Stop current timer
      try {
        await browser.tabs.sendMessage(activeTimer.tabId, {
          type: 'STOP_TIMER',
          elapsedTime: Date.now() - activeTimer.startTime
        });
      } catch (error) {
        console.log('Could not send stop message to tab:', error);
      }
      
      activeTimer = null;
      
    } else if (activeTrackedTab && activeTimer && activeTrackedTab.tabId !== activeTimer.tabId) {
      // Switch timer to new tab
      const oldTabId = activeTimer.tabId;
      const elapsedTime = Date.now() - activeTimer.startTime;
      
      // Stop old timer
      try {
        await browser.tabs.sendMessage(oldTabId, {
          type: 'STOP_TIMER',
          elapsedTime
        });
      } catch (error) {
        console.log('Could not send stop message to old tab:', error);
      }
      
      // Start new timer
      activeTimer = {
        tabId: activeTrackedTab.tabId,
        startTime: Date.now()
      };
      
      try {
        await browser.tabs.sendMessage(activeTrackedTab.tabId, {
          type: 'START_TIMER',
          startTime: activeTimer.startTime
        });
      } catch (error) {
        console.log('Could not send start message to new tab:', error);
      }
    }
  }

  // Brain battery recharge functions
  function startBrainBatteryRecharge() {
    if (brainRechargeInterval) return; // Already running
    lastBatteryUpdate = Date.now();
    
    brainRechargeInterval = setInterval(async () => {
      // Check if user is currently on any enabled sites
      const activeTrackedTab = Array.from(activeTabs.values())
        .find(tab => tab.isActive && tab.isTrackedSite);
      
      if (activeTrackedTab) {
        stopBrainBatteryRecharge();
        return;
      }
      
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
          console.error('Error recharging brain battery (background):', error);
        }
      }
    }, BATTERY_RECHARGE_INTERVAL);
  }

  function stopBrainBatteryRecharge() {
    if (!brainRechargeInterval) return;
    clearInterval(brainRechargeInterval);
    brainRechargeInterval = null;
  }

  async function manageBrainBatteryRecharge() {
    const activeTrackedTab = Array.from(activeTabs.values())
      .find(tab => tab.isActive && tab.isTrackedSite);
    
    if (activeTrackedTab) {
      // User is on enabled site, stop recharging
      stopBrainBatteryRecharge();
    } else {
      // User is not on any enabled sites, start recharging
      if (!brainRechargeInterval) {
        startBrainBatteryRecharge();
      }
    }
  }

  // Tab event listeners
  browser.tabs.onUpdated.addListener(async (tabId: any, changeInfo: any, tab: any) => {
    if (changeInfo.url && tab.url) {
      await updateTabState(tabId, tab.url, tab.active);
    }
  });

  browser.tabs.onActivated.addListener(async (activeInfo: any) => {
    // Mark all tabs as inactive
    activeTabs.forEach(tabState => {
      tabState.isActive = false;
    });
    
    // Mark the active tab
    const tab = await browser.tabs.get(activeInfo.tabId);
    if (tab.url) {
      await updateTabState(activeInfo.tabId, tab.url, true);
    }
  });

  browser.tabs.onRemoved.addListener(async (tabId: any) => {
    // Clean up removed tab
    if (activeTimer && activeTimer.tabId === tabId) {
      activeTimer = null;
    }
    activeTabs.delete(tabId);
    await manageTimer();
    await manageBrainBatteryRecharge();
  });

  // Window focus events
  browser.windows.onFocusChanged.addListener(async (windowId: any) => {
    if (windowId === browser.windows.WINDOW_ID_NONE) {
      // All windows lost focus - stop timer and start brain recharge
      if (activeTimer) {
        try {
          await browser.tabs.sendMessage(activeTimer.tabId, {
            type: 'PAUSE_TIMER'
          });
        } catch (error) {
          console.log('Could not send pause message:', error);
        }
      }
      
      // Start brain battery recharge since user is away from all sites
      if (!brainRechargeInterval) {
        startBrainBatteryRecharge();
      }
    } else {
      // Window gained focus - resume timer if needed
      const tabs = await browser.tabs.query({ active: true, windowId });
      if (tabs.length > 0 && tabs[0].url) {
        await updateTabState(tabs[0].id!, tabs[0].url, true);
      }
    }
  });

  // Handle messages from content scripts
  browser.runtime.onMessage.addListener(async (message: any, sender: any) => {
    if (message.type === 'SCROLL_DETECTED' && sender.tab?.id) {
      // Content script detected a scroll
    }
    
    if (message.type === 'REQUEST_TIMER_STATE' && sender.tab?.id) {
      // Content script requesting current timer state
      const isActive = activeTimer?.tabId === sender.tab.id;
      
      try {
        await browser.tabs.sendMessage(sender.tab.id, {
          type: 'TIMER_STATE_RESPONSE',
          isActive,
          startTime: isActive ? activeTimer?.startTime : null
        });
      } catch (error) {
        // ignore
      }
    }

    if (message.type === 'LESSON_STARTED' && sender.tab?.id) {
      // Mark tab as having active lesson
      const tabState = activeTabs.get(sender.tab.id);
      if (tabState) {
        tabState.hasActiveLesson = true;
        
        // If this tab has the active timer, pause it
        if (activeTimer && activeTimer.tabId === sender.tab.id) {
          try {
            await browser.tabs.sendMessage(sender.tab.id, {
              type: 'PAUSE_TIMER'
            });
          } catch (error) {
            // ignore
          }
        }
      }
    }

    if (message.type === 'LESSON_ENDED' && sender.tab?.id) {
      // Mark tab as no longer having active lesson
      const tabState = activeTabs.get(sender.tab.id);
      if (tabState) {
        tabState.hasActiveLesson = false;
        
        // Resume timer management
        await manageTimer();
      }
    }
  });

  // Initialize with current active tab
  browser.tabs.query({ active: true, currentWindow: true }).then(async (tabs: any[]) => {
    if (tabs.length > 0 && tabs[0].url && tabs[0].id) {
      await updateTabState(tabs[0].id, tabs[0].url, true);
    } else {
      // No active tab or no enabled sites, start brain battery recharge
      await manageBrainBatteryRecharge();
    }
  });

  
});
