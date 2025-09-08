import type { StorageData, DailyData, StorageLock } from '../../types/storage';
import { 
  getCurrentTimePeriod, 
  getTodayDateString, 
  getYesterdayDateString, 
  isNewDay, 
  createEmptyDailyData 
} from '../../utils/time-periods';
import { browser } from '../../utils/browser-api';
import { THEME_TOPIC_MAP } from '../../utils/lesson-parser';

const LOCK_TIMEOUT = 5000; // 5 seconds
const STORAGE_KEY = 'xscroll-data';
// Use separate lock namespaces to reduce contention between metrics and settings
const LOCK_KEY_METRICS = 'xscroll-lock-metrics';
const LOCK_KEY_SETTINGS = 'xscroll-lock-settings';

type LockNamespace = 'metrics' | 'settings';

export class StorageUtils {
  private static async acquireLock(lockKey: string): Promise<string | null> {
    const lockId = `${Date.now()}-${Math.random()}`;
    
    try {
      // Try to acquire lock
      const result = await browser.storage.local.get(lockKey);
      const existingLock = result[lockKey] as StorageLock | undefined;
      
      // Check if lock is available or expired
      if (!existingLock || 
          !existingLock.locked || 
          Date.now() - existingLock.lockTime > LOCK_TIMEOUT) {
        
        const newLock: StorageLock = {
          locked: true,
          lockTime: Date.now(),
          lockId
        };
        
        await browser.storage.local.set({ [lockKey]: newLock });
        
        // Verify we actually got the lock (race condition check)
        const verifyResult = await browser.storage.local.get(lockKey);
        const verifyLock = verifyResult[lockKey] as StorageLock;
        
        if (verifyLock.lockId === lockId) {
          return lockId;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error acquiring lock:', error);
      return null;
    }
  }
  
  private static async releaseLock(lockKey: string, lockId: string): Promise<void> {
    try {
      const result = await browser.storage.local.get(lockKey);
      const existingLock = result[lockKey] as StorageLock;
      
      // Only release if we own the lock
      if (existingLock && existingLock.lockId === lockId) {
        await browser.storage.local.set({
          [lockKey]: {
            locked: false,
            lockTime: 0,
            lockId: ''
          }
        });
      }
    } catch (error) {
      console.error('Error releasing lock:', error);
    }
  }
  
  private static async withLock<T>(
    operation: () => Promise<T>,
    options?: { lock?: LockNamespace; opName?: string; maxAttempts?: number }
  ): Promise<T | null> {
    const lockNamespace: LockNamespace = options?.lock ?? 'metrics';
    const opName = options?.opName ?? 'operation';
    const maxAttempts = options?.maxAttempts ?? 8;
    const lockKey = lockNamespace === 'metrics' ? LOCK_KEY_METRICS : LOCK_KEY_SETTINGS;

    let attempts = 0;
    let backoff = 50; // start small and back off
    
    while (attempts < maxAttempts) {
      const lockId = await this.acquireLock(lockKey);
      
      if (lockId) {
        try {
          const result = await operation();
          await this.releaseLock(lockKey, lockId);
          return result;
        } catch (error) {
          await this.releaseLock(lockKey, lockId);
          throw error;
        }
      }
      
      attempts++;
      // Exponential backoff with jitter
      const delay = backoff + Math.floor(Math.random() * 50);
      await new Promise(resolve => setTimeout(resolve, delay));
      backoff = Math.min(backoff * 2, 800);
    }
    
    console.warn(`Failed to acquire lock after maximum attempts: ${opName} [${lockNamespace}]`);
    return null;
  }
  
  static async getStorageData(): Promise<StorageData> {
    try {
      const result = await browser.storage.local.get(STORAGE_KEY);
      let data = result[STORAGE_KEY] as StorageData | undefined;
      
      if (!data) {
        data = this.createDefaultStorageData();
        await browser.storage.local.set({ [STORAGE_KEY]: data });
        return data;
      }
      
      // Check if we need to roll over to a new day
      if (isNewDay(data.today.date)) {
        data = await this.performDailyRollover(data);
      }
      
      // Migration: ensure new Library fields exist in settings
      // Add defaults if missing from older stored data
      if ((data as any).settings) {
        let migrated = false;
        if ((data as any).settings.selectedTheme === undefined) {
          (data as any).settings.selectedTheme = 'how-to';
          migrated = true;
        }
        if ((data as any).settings.selectedTopics === undefined) {
          (data as any).settings.selectedTopics = ['control'];
          migrated = true;
        }
        if ((data as any).settings.selectedTopicsByTheme === undefined) {
          (data as any).settings.selectedTopicsByTheme = {
            'how-to': (data as any).settings.selectedTopics ?? ['control'],
            'what-is': [],
            'why': []
          };
          migrated = true;
        }
        if (migrated) {
          await browser.storage.local.set({ [STORAGE_KEY]: data });
          // Run cleanup without acquiring another lock to avoid reentrancy
          await this.cleanupCorruptedTopicData(true);
        }
      }
      
      return data;
    } catch (error) {
      console.error('Error getting storage data:', error);
      return this.createDefaultStorageData();
    }
  }
  
  private static createDefaultStorageData(): StorageData {
    const today = getTodayDateString();
    const yesterday = getYesterdayDateString();
    
    return {
      today: createEmptyDailyData(today),
      yesterday: createEmptyDailyData(yesterday),
      settings: {
        enabledSites: [
          'tiktok.com',
          'instagram.com',
          'youtube.com',
          'x.com',
          'reddit.com',
          'facebook.com',
          'amazon.com'
        ],
        lessonFrequency: 3,
        frequencyMode: 'scrolls',
        selectedTheme: 'how-to',
        selectedTopics: ['control'],
        selectedTopicsByTheme: {
          'how-to': ['control'],
          'what-is': [],
          'why': []
        }
      },
      nextLessonAt: this.getRandomFrequency(3),
      lessonActive: false,
      brainBattery: 100 // Initialize brain battery to 100%
    };
  }
  
  private static async performDailyRollover(data: StorageData): Promise<StorageData> {
    const today = getTodayDateString();
    
    const newData: StorageData = {
      ...data,
      yesterday: data.today,
      today: createEmptyDailyData(today),
      nextLessonAt: this.getRandomFrequency(data.settings.lessonFrequency),
      lessonActive: false,
      brainBattery: 100 // Reset brain battery to 100% daily
    };
    
    await browser.storage.local.set({ [STORAGE_KEY]: newData });
    return newData;
  }
  
  // Check if tracking operations should be paused due to 0% battery
  private static async isBatteryDead(): Promise<boolean> {
    const data = await this.getStorageData();
    return data.brainBattery <= 0;
  }


  static async incrementBrainBattery(seconds: number): Promise<void> {
    await this.withLock(async () => {
      const data = await this.getStorageData();
      
      // Recharge brain battery by +1.0%/minute (convert seconds to minutes)
      const minutesRecharged = seconds / 60;
      const batteryRecharge = minutesRecharged * 0.5;
      const oldPercentage = data.brainBattery;
      data.brainBattery = Math.max(0, Math.min(100, data.brainBattery + batteryRecharge));
      
      // if (batteryRecharge > 0) {
      //   console.log(`🔋 Brain battery recharged: ${oldPercentage}% → ${data.brainBattery}% (+${batteryRecharge.toFixed(2)}%)`);
      // }
      
      await browser.storage.local.set({ [STORAGE_KEY]: data });
    }, { lock: 'metrics', opName: 'incrementBrainBattery' });
  }

  static async incrementScrollCount(): Promise<void> {
    // Check battery state before incrementing
    if (await this.isBatteryDead()) {
      // console.log('🔋 Scroll counting paused - brain battery at 0%');
      return;
    }
    
    await this.withLock(async () => {
      const data = await this.getStorageData();
      const period = getCurrentTimePeriod();
      
      data.today[period].scrollCount += 1;
      
      // Drain brain battery by 0.2% per scroll
      const oldBattery = data.brainBattery;
      data.brainBattery = Math.max(0, data.brainBattery - 0.2);
      
      // console.log(`🔋 Brain battery drained by scroll: ${oldBattery.toFixed(2)}% → ${data.brainBattery.toFixed(2)}% (-0.2%)`);
      
      await browser.storage.local.set({ [STORAGE_KEY]: data });
    }, { lock: 'metrics', opName: 'incrementScrollCount' });
  }
  
  static async incrementTimeWasted(seconds: number): Promise<void> {
    // Check battery state before incrementing
    if (await this.isBatteryDead()) {
      // console.log('🔋 Time tracking paused - brain battery at 0%');
      return;
    }
    
    await this.withLock(async () => {
      const data = await this.getStorageData();
      const period = getCurrentTimePeriod();
      
      data.today[period].timeWasted += seconds;
      
      // Drain brain battery by -1.0%/minute (convert seconds to minutes)
      const minutesDrained = seconds / 60;
      const batteryDrain = minutesDrained * 1.0;
      const oldBattery = data.brainBattery;
      data.brainBattery = Math.max(0, data.brainBattery - batteryDrain);
      
      // if (batteryDrain > 0) {
        // console.log(`🔋 Brain battery drained by time: ${oldBattery.toFixed(2)}% → ${data.brainBattery.toFixed(2)}% (-${batteryDrain.toFixed(2)}%)`);
      // }
      
      await browser.storage.local.set({ [STORAGE_KEY]: data });
    }, { lock: 'metrics', opName: 'incrementTimeWasted' });
  }
  
  static async completeLessonAndScheduleNext(): Promise<void> {
    // Single locked write to update lesson count, schedule next, and clear active flag
    await this.withLock(async () => {
      const data = await this.getStorageData();
      const period = getCurrentTimePeriod();
      data.today[period].lessonCount += 1;
      data.brainBattery = Math.min(100, data.brainBattery + 0.5);
      const totalScrolls = data.today.morning.scrollCount +
                          data.today.afternoon.scrollCount +
                          data.today.night.scrollCount;
      data.nextLessonAt = totalScrolls + this.getRandomFrequency(data.settings.lessonFrequency);
      data.lessonActive = false;
      await browser.storage.local.set({ [STORAGE_KEY]: data });
    }, { lock: 'metrics', opName: 'completeLessonAndScheduleNext' });
  }
  
  static async updateSettings(newSettings: Partial<StorageData['settings']>): Promise<void> {
    await this.withLock(async () => {
      const data = await this.getStorageData();
      
      data.settings = { ...data.settings, ...newSettings } as any;

      // If theme changes, do not globally clear topics; switch current selectedTopics to that theme's saved set
      if (newSettings.selectedTheme && newSettings.selectedTheme !== data.settings.selectedTheme) {
        const newTheme = newSettings.selectedTheme as 'how-to' | 'what-is' | 'why';
        const byTheme = (data.settings as any).selectedTopicsByTheme;
        const topicsForNewTheme: string[] = byTheme?.[newTheme] ?? [];
        data.settings.selectedTopics = topicsForNewTheme;
        data.settings.selectedTheme = newTheme;
      }
      
      // Update nextLessonAt if frequency changed
      if (newSettings.lessonFrequency !== undefined) {
        const currentTotalScrolls = data.today.morning.scrollCount + 
                                   data.today.afternoon.scrollCount + 
                                   data.today.night.scrollCount;
        data.nextLessonAt = currentTotalScrolls + this.getRandomFrequency(newSettings.lessonFrequency);
      }
      
      await browser.storage.local.set({ [STORAGE_KEY]: data });
    }, { lock: 'settings', opName: 'updateSettings' });
  }

  /**
   * Library selection helpers
   */
  static async updateSelectedTheme(theme: 'how-to' | 'what-is' | 'why'): Promise<void> {
    // Do not clear saved topics; switch current topics to saved-per-theme
    await this.updateSettings({ selectedTheme: theme });
  }

  static async updateSelectedTopics(topics: string[]): Promise<void> {
    await this.withLock(async () => {
      const data = await this.getStorageData();
      const theme = data.settings.selectedTheme as 'how-to' | 'what-is' | 'why';
      
      // CRITICAL FIX: Validate topics belong to current theme
      const validTopics = topics.filter(topic => {
        const belongsToTheme = THEME_TOPIC_MAP[theme]?.includes(topic);
        if (!belongsToTheme) {
          console.warn(`❌ Topic "${topic}" does not belong to theme "${theme}". Removing from selection.`);
        }
        return belongsToTheme;
      });
      
      // Only log when topics are filtered out
      const filteredOut = topics.filter(t => !validTopics.includes(t));
      if (filteredOut.length > 0) {
        console.log('🔧 Filtered invalid topics:', { theme, filteredOut });
      }
      
      // Initialize theme map if needed
      (data.settings as any).selectedTopicsByTheme = (data.settings as any).selectedTopicsByTheme || {
        'how-to': [], 'what-is': [], 'why': []
      };
      
      // Store only valid topics for current theme
      (data.settings as any).selectedTopicsByTheme[theme] = validTopics;
      
      // Keep legacy field in sync for UI consumers
      data.settings.selectedTopics = validTopics;
      
      await browser.storage.local.set({ [STORAGE_KEY]: data });
    }, { lock: 'settings', opName: 'updateSelectedTopics' });
  }

  static async getSelectedLessons(): Promise<{ theme: 'how-to' | 'what-is' | 'why'; topics: string[] }> {
    const settings = await this.getSettings();
    const theme = settings.selectedTheme;
    const byTheme = (settings as any).selectedTopicsByTheme;
    const topics = (byTheme?.[theme] ?? settings.selectedTopics) || [];
    return { theme, topics };
  }

  /**
   * Clean up corrupted topic-theme assignments
   */
  static async cleanupCorruptedTopicData(noLock?: boolean): Promise<void> {
    const work = async () => {
      const data = await this.getStorageData();
      const byTheme = (data.settings as any).selectedTopicsByTheme;
      
      if (!byTheme) return;
      
      let needsCleanup = false;
      const cleanedByTheme: Record<string, string[]> = {
        'how-to': [],
        'what-is': [],
        'why': []
      };
      
      // Check each theme for corrupted data
      Object.entries(byTheme).forEach(([theme, topics]: [string, any]) => {
        if (!Array.isArray(topics)) return;
        
        topics.forEach((topic: string) => {
          const belongsToTheme = THEME_TOPIC_MAP[theme as 'how-to' | 'what-is' | 'why']?.includes(topic);
          
          if (belongsToTheme) {
            cleanedByTheme[theme].push(topic);
          } else {
            needsCleanup = true;
            console.warn(`🧹 Cleaning up: "${topic}" incorrectly stored in "${theme}" theme`);
            
            // Try to find correct theme for this topic
            const correctTheme = Object.entries(THEME_TOPIC_MAP).find(([, topicList]) => 
              topicList.includes(topic)
            )?.[0];
            
            if (correctTheme) {
              console.log(`✅ Moving "${topic}" from "${theme}" to correct theme "${correctTheme}"`);
              cleanedByTheme[correctTheme].push(topic);
            } else {
              console.warn(`❌ Topic "${topic}" not found in any theme. Removing.`);
            }
          }
        });
      });
      
      if (needsCleanup) {
        console.log('🧹 Data cleanup applied - corrupted topics moved to correct themes');
        (data.settings as any).selectedTopicsByTheme = cleanedByTheme;
        await browser.storage.local.set({ [STORAGE_KEY]: data });
      }
    };
    if (noLock) {
      await work();
    } else {
      await this.withLock(work, { lock: 'settings', opName: 'cleanupCorruptedTopicData' });
    }
  }

  /**
   * Get ALL selected topics across ALL themes (for global deselection logic)
   */
  static async getAllSelectedTopics(): Promise<string[]> {
    const settings = await this.getSettings();
    const byTheme = (settings as any).selectedTopicsByTheme;
    
    if (!byTheme) {
      return settings.selectedTopics || [];
    }
    
    const allTopics: string[] = [];
    Object.values(byTheme).forEach((topics: any) => {
      if (Array.isArray(topics)) {
        allTopics.push(...topics);
      }
    });
    
    // Removed verbose logging for performance
    
    return allTopics;
  }
  
  static async getTodayData(): Promise<DailyData> {
    const data = await this.getStorageData();
    return data.today;
  }
  
  static async getYesterdayData(): Promise<DailyData> {
    const data = await this.getStorageData();
    return data.yesterday;
  }
  
  static async getSettings(): Promise<StorageData['settings']> {
    const data = await this.getStorageData();
    return data.settings;
  }

  static async setLessonActive(active: boolean): Promise<void> {
    await this.withLock(async () => {
      const data = await this.getStorageData();
      data.lessonActive = active;
      await browser.storage.local.set({ [STORAGE_KEY]: data });
    }, { lock: 'metrics', opName: 'setLessonActive' });
  }

  static async isLessonActive(): Promise<boolean> {
    const data = await this.getStorageData();
    return data.lessonActive;
  }

  static async shouldTriggerLesson(): Promise<boolean> {
    // Check battery state before allowing lesson triggers
    if (await this.isBatteryDead()) {
      console.log('🔋 Lesson triggering paused - brain battery at 0%');
      return false;
    }
    
    const data = await this.getStorageData();
    
    // Remove global lessonActive check to allow per-tab lesson independence
    // Each tab's lesson manager will handle its own local state checking
    
    // Calculate total scroll count across all periods
    const totalScrolls = data.today.morning.scrollCount + 
                        data.today.afternoon.scrollCount + 
                        data.today.night.scrollCount;
    
    return totalScrolls >= data.nextLessonAt;
  }

  private static getRandomFrequency(frequencyMode: number): number {
    switch (frequencyMode) {
      case 3: return Math.floor(Math.random() * 2) + 1; // Often: 1-3 scrolls
      case 6: return Math.floor(Math.random() * 2) + 4; // Sometimes: 4-6 scrolls  
      case 9: return Math.floor(Math.random() * 2) + 7; // Barely: 7-9 scrolls
      default: return frequencyMode; // fallback for safety
    }
  }

  static async getTotals(): Promise<{
    scrollCount: number;
    timeWasted: number;
    lessonCount: number;
  }> {
    const data = await this.getStorageData();
    return {
      scrollCount: data.today.morning.scrollCount + 
                   data.today.afternoon.scrollCount + 
                   data.today.night.scrollCount,
      timeWasted: data.today.morning.timeWasted + 
                  data.today.afternoon.timeWasted + 
                  data.today.night.timeWasted,
      lessonCount: data.today.morning.lessonCount + 
                   data.today.afternoon.lessonCount + 
                   data.today.night.lessonCount
    };
  }

  static async getTotalsByDate(date: 'today' | 'yesterday'): Promise<{
    scrollCount: number;
    timeWasted: number;
    lessonCount: number;
  }> {
    const data = await this.getStorageData();
    const targetData = date === 'today' ? data.today : data.yesterday;
    
    // Handle case where yesterday data doesn't exist
    if (!targetData) {
      return {
        scrollCount: 0,
        timeWasted: 0,
        lessonCount: 0
      };
    }
    
    return {
      scrollCount: targetData.morning.scrollCount + 
                   targetData.afternoon.scrollCount + 
                   targetData.night.scrollCount,
      timeWasted: targetData.morning.timeWasted + 
                  targetData.afternoon.timeWasted + 
                  targetData.night.timeWasted,
      lessonCount: targetData.morning.lessonCount + 
                   targetData.afternoon.lessonCount + 
                   targetData.night.lessonCount
    };
  }

  static async getDataByDate(date: 'today' | 'yesterday'): Promise<DailyData> {
    const data = await this.getStorageData();
    if (date === 'today') {
      return data.today;
    } else {
      // Return yesterday data or empty data if doesn't exist
      return data.yesterday || createEmptyDailyData(getYesterdayDateString());
    }
  }
}
