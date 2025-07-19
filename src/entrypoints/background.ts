// Note: StorageUtils import removed as background script should use chrome.storage directly

interface TabState {
  tabId: number;
  isTrackedSite: boolean;
  isActive: boolean;
  url: string;
}

interface ActiveTimer {
  tabId: number;
  startTime: number;
}

export default defineBackground(() => {
  const activeTabs = new Map<number, TabState>();
  let activeTimer: ActiveTimer | null = null;
  
  const TRACKED_SITES = [
    'tiktok.com',
    'instagram.com',
    'youtube.com/shorts',
    'youtube.com/watch'
  ];

  function isTrackedSite(url: string): boolean {
    return TRACKED_SITES.some(site => url.includes(site));
  }

  function shouldTrackUrl(url: string): boolean {
    if (!url) return false;
    
    // Check for YouTube Shorts specifically
    if (url.includes('youtube.com')) {
      return url.includes('/shorts/') || 
             (url.includes('/watch') && url.includes('&list=') && url.includes('shorts'));
    }
    
    return isTrackedSite(url);
  }

  async function updateTabState(tabId: number, url: string, isActive: boolean = false) {
    const isTracked = shouldTrackUrl(url);
    
    activeTabs.set(tabId, {
      tabId,
      isTrackedSite: isTracked,
      isActive,
      url
    });
    
    // Manage timer based on active tracked tabs
    await manageTimer();
  }

  async function manageTimer() {
    const activeTrackedTab = Array.from(activeTabs.values())
      .find(tab => tab.isActive && tab.isTrackedSite);
    
    if (activeTrackedTab && !activeTimer) {
      // Start timer for this tab
      activeTimer = {
        tabId: activeTrackedTab.tabId,
        startTime: Date.now()
      };
      
      // Send start message to content script
      try {
        await chrome.tabs.sendMessage(activeTrackedTab.tabId, {
          type: 'START_TIMER',
          startTime: activeTimer.startTime
        });
      } catch (error) {
        console.log('Could not send start message to tab:', error);
      }
      
    } else if (!activeTrackedTab && activeTimer) {
      // Stop current timer
      try {
        await chrome.tabs.sendMessage(activeTimer.tabId, {
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
        await chrome.tabs.sendMessage(activeTrackedTab.tabId, {
          type: 'START_TIMER',
          startTime: activeTimer.startTime
        });
      } catch (error) {
        console.log('Could not send start message to new tab:', error);
      }
    }
  }

  // Tab event listeners
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.url && tab.url) {
      await updateTabState(tabId, tab.url, tab.active);
    }
  });

  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    // Mark all tabs as inactive
    activeTabs.forEach(tabState => {
      tabState.isActive = false;
    });
    
    // Mark the active tab
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      await updateTabState(activeInfo.tabId, tab.url, true);
    }
  });

  chrome.tabs.onRemoved.addListener(async (tabId) => {
    // Clean up removed tab
    if (activeTimer && activeTimer.tabId === tabId) {
      activeTimer = null;
    }
    activeTabs.delete(tabId);
    await manageTimer();
  });

  // Window focus events
  chrome.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      // All windows lost focus - stop timer
      if (activeTimer) {
        try {
          await chrome.tabs.sendMessage(activeTimer.tabId, {
            type: 'PAUSE_TIMER'
          });
        } catch (error) {
          console.log('Could not send pause message:', error);
        }
      }
    } else {
      // Window gained focus - resume timer if needed
      const tabs = await chrome.tabs.query({ active: true, windowId });
      if (tabs.length > 0 && tabs[0].url) {
        await updateTabState(tabs[0].id!, tabs[0].url, true);
      }
    }
  });

  // Handle messages from content scripts
  chrome.runtime.onMessage.addListener(async (message, sender) => {
    if (message.type === 'SCROLL_DETECTED' && sender.tab?.id) {
      // Content script detected a scroll - this is handled in content script
      // Background script just needs to be aware
      console.log('Scroll detected in tab:', sender.tab.id);
    }
    
    if (message.type === 'REQUEST_TIMER_STATE' && sender.tab?.id) {
      // Content script requesting current timer state
      const isActive = activeTimer?.tabId === sender.tab.id;
      
      try {
        await chrome.tabs.sendMessage(sender.tab.id, {
          type: 'TIMER_STATE_RESPONSE',
          isActive,
          startTime: isActive ? activeTimer?.startTime : null
        });
      } catch (error) {
        console.log('Could not send timer state response:', error);
      }
    }
  });

  // Initialize with current active tab
  chrome.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
    if (tabs.length > 0 && tabs[0].url && tabs[0].id) {
      await updateTabState(tabs[0].id, tabs[0].url, true);
    }
  });

  console.log('XScroll background script initialized');
});
