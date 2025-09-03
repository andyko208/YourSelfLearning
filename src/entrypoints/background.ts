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
  });

  // Window focus events
  browser.windows.onFocusChanged.addListener(async (windowId: any) => {
    if (windowId === browser.windows.WINDOW_ID_NONE) {
      // All windows lost focus - stop timer
      if (activeTimer) {
        try {
          await browser.tabs.sendMessage(activeTimer.tabId, {
            type: 'PAUSE_TIMER'
          });
        } catch (error) {
          console.log('Could not send pause message:', error);
        }
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
      // Content script detected a scroll - this is handled in content script
      // Background script just needs to be aware
      console.log('Scroll detected in tab:', sender.tab.id);
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
        console.log('Could not send timer state response:', error);
      }
    }

    if (message.type === 'LESSON_STARTED' && sender.tab?.id) {
      // Mark tab as having active lesson
      const tabState = activeTabs.get(sender.tab.id);
      if (tabState) {
        tabState.hasActiveLesson = true;
        console.log('Lesson started in tab:', sender.tab.id);
        
        // If this tab has the active timer, pause it
        if (activeTimer && activeTimer.tabId === sender.tab.id) {
          try {
            await browser.tabs.sendMessage(sender.tab.id, {
              type: 'PAUSE_TIMER'
            });
          } catch (error) {
            console.log('Could not send pause message during lesson:', error);
          }
        }
      }
    }

    if (message.type === 'LESSON_ENDED' && sender.tab?.id) {
      // Mark tab as no longer having active lesson
      const tabState = activeTabs.get(sender.tab.id);
      if (tabState) {
        tabState.hasActiveLesson = false;
        console.log('Lesson ended in tab:', sender.tab.id);
        
        // Resume timer management
        await manageTimer();
      }
    }
  });

  // Initialize with current active tab
  browser.tabs.query({ active: true, currentWindow: true }).then(async (tabs: any[]) => {
    if (tabs.length > 0 && tabs[0].url && tabs[0].id) {
      await updateTabState(tabs[0].id, tabs[0].url, true);
    }
  });

  console.log('🚀 XScroll background script initialized');
});
