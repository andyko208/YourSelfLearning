import type { StorageData, DailyData, StorageLock } from '../../utils/storage';
import { 
  getCurrentTimePeriod, 
  getTodayDateString, 
  getYesterdayDateString, 
  isNewDay, 
  createEmptyDailyData 
} from '../../utils/time-periods';
import { browser } from '../../utils/browser-api';
import { THEME_TOPIC_MAP } from '../../utils/lessons-index';

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
    
    // Failed to acquire lock after maximum attempts
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
          const themes = Object.keys(THEME_TOPIC_MAP);
          (data as any).settings.selectedTheme = themes[0] ?? 'default';
          migrated = true;
        }
        if ((data as any).settings.selectedTopics === undefined) {
          const theme = (data as any).settings.selectedTheme as string;
          const firstTopic = (THEME_TOPIC_MAP[theme] ?? [])[0];
          (data as any).settings.selectedTopics = firstTopic ? [firstTopic] : [];
          migrated = true;
        }
        if ((data as any).settings.selectedTopicsByTheme === undefined) {
          const theme = (data as any).settings.selectedTheme as string;
          const topics = (data as any).settings.selectedTopics ?? [];
          (data as any).settings.selectedTopicsByTheme = { [theme]: topics };
          migrated = true;
        }
        if ((data as any).bonusTracker === undefined) {
          const nextAt = this.getRandomBonusInterval();
          (data as any).bonusTracker = {
            lessonsCompleted: 0,
            nextBonusAt: nextAt
          };
          migrated = true;
        }
        if (migrated) {
          await browser.storage.local.set({ [STORAGE_KEY]: data });
          // Run cleanup without acquiring another lock to avoid reentrancy
          await this.cleanupCorruptedTopicData(true);
        }

        // Normalize topics to reflect any updated THEME_TOPIC_MAP mapping (e.g., swapped topics)
        try {
          const byTheme = (data.settings as any).selectedTopicsByTheme;
          if (byTheme) {
            let needsCleanup = false;
            const cleaned: Record<string, string[]> = {};
            Object.keys(byTheme).forEach((theme: string) => {
              const topics = Array.isArray(byTheme[theme]) ? byTheme[theme] : [];
              topics.forEach((topic: string) => {
                // Find the correct theme for this topic according to current map
                const correctTheme = (Object.entries(THEME_TOPIC_MAP) as Array<[string, string[]]>).find(([, list]) => list.includes(topic))?.[0] as string | undefined;
                if (correctTheme) {
                  if (!cleaned[correctTheme]) cleaned[correctTheme] = [];
                  cleaned[correctTheme].push(topic);
                  if (correctTheme !== theme) needsCleanup = true;
                } else {
                  needsCleanup = true; // drop unknown topics
                }
              });
            });

            if (needsCleanup) {
              (data.settings as any).selectedTopicsByTheme = cleaned;
              // Keep legacy selectedTopics in sync with selectedTheme
              const currentTheme = (data.settings as any).selectedTheme as string;
              (data.settings as any).selectedTopics = cleaned[currentTheme] ?? [];
              await browser.storage.local.set({ [STORAGE_KEY]: data });
            }
          }
        } catch (e) {
          // Non-fatal; continue
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
    const themes = Object.keys(THEME_TOPIC_MAP);
    const defaultTheme = themes[0] ?? 'default';
    // Select ALL topics for ALL themes by default
    const initialByTheme: Record<string, string[]> = {};
    themes.forEach(theme => {
      initialByTheme[theme] = [...(THEME_TOPIC_MAP[theme] ?? [])];
    });
    const selectedTopicsForDefault = initialByTheme[defaultTheme] ?? [];
    
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
        selectedTheme: defaultTheme,
        selectedTopics: selectedTopicsForDefault,
        selectedTopicsByTheme: initialByTheme
      },
      nextLessonAt: this.getRandomFrequency(3),
      lessonActive: false,
      brainBattery: 100, // Initialize brain battery to 100%
      bonusTracker: {
        lessonsCompleted: 0,
        nextBonusAt: this.getRandomBonusInterval() // Random interval between 2-5 lessons
      }
    };
  }
  
  private static async performDailyRollover(data: StorageData): Promise<StorageData> {
    const today = getTodayDateString();
    const yesterday = getYesterdayDateString();
    
    const newData: StorageData = {
      ...data,
      // Move current 'today' to 'yesterday', but normalize the date field to local yesterday
      yesterday: { ...data.today, date: yesterday },
      // Reset 'today' with local date
      today: createEmptyDailyData(today),
      nextLessonAt: this.getRandomFrequency(data.settings.lessonFrequency),
      lessonActive: false,
      brainBattery: 100, // Reset brain battery to 100% daily
      bonusTracker: {
        lessonsCompleted: 0,
        nextBonusAt: this.getRandomBonusInterval() // Reset bonus tracking daily
      }
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
      data.brainBattery = Math.max(0, Math.min(100, data.brainBattery + batteryRecharge));
      
      await browser.storage.local.set({ [STORAGE_KEY]: data });
    }, { lock: 'metrics', opName: 'incrementBrainBattery' });
  }

  static async rewardForLearnMore(fastClick: boolean = false): Promise<void> {
    await this.withLock(async () => {
      const data = await this.getStorageData();
      
      // Reward +2% for fast clicks (within 3 seconds), +1% for normal clicks
      const reward = fastClick ? 2 : 1;
      data.brainBattery = Math.max(0, Math.min(100, data.brainBattery + reward));
      
      await browser.storage.local.set({ [STORAGE_KEY]: data });
    }, { lock: 'metrics', opName: 'rewardForLearnMore' });
  }

  static async incrementScrollCount(): Promise<void> {
    // Check battery state before incrementing
    if (await this.isBatteryDead()) return;
    
    await this.withLock(async () => {
      const data = await this.getStorageData();
      const period = getCurrentTimePeriod();
      
      data.today[period].scrollCount += 1;
      
      // Drain brain battery by 0.2% per scroll
      data.brainBattery = Math.max(0, data.brainBattery - 0.2);
      
      await browser.storage.local.set({ [STORAGE_KEY]: data });
    }, { lock: 'metrics', opName: 'incrementScrollCount' });
  }
  
  static async incrementTimeWasted(seconds: number): Promise<void> {
    // Check battery state before incrementing
    if (await this.isBatteryDead()) return;
    
    await this.withLock(async () => {
      const data = await this.getStorageData();
      const period = getCurrentTimePeriod();
      
      data.today[period].timeWasted += seconds;
      
      // Drain brain battery by -1.0%/minute (convert seconds to minutes)
      const minutesDrained = seconds / 60;
      const batteryDrain = minutesDrained * 1.0;
      data.brainBattery = Math.max(0, data.brainBattery - batteryDrain);
      
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
        const newTheme = newSettings.selectedTheme as string;
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
  static async updateSelectedTheme(theme: string): Promise<void> {
    // Do not clear saved topics; switch current topics to saved-per-theme
    await this.updateSettings({ selectedTheme: theme });
  }

  static async updateSelectedTopics(topics: string[]): Promise<void> {
    await this.withLock(async () => {
      const data = await this.getStorageData();
      const theme = data.settings.selectedTheme as string;
      
      // CRITICAL FIX: Validate topics belong to current theme
      const validTopics = topics.filter(topic => THEME_TOPIC_MAP[theme]?.includes(topic));
      
      // Initialize theme map if needed
      (data.settings as any).selectedTopicsByTheme = (data.settings as any).selectedTopicsByTheme || {};
      
      // Store only valid topics for current theme
      (data.settings as any).selectedTopicsByTheme[theme] = validTopics;
      
      // Keep legacy field in sync for UI consumers
      data.settings.selectedTopics = validTopics;
      
      await browser.storage.local.set({ [STORAGE_KEY]: data });
    }, { lock: 'settings', opName: 'updateSelectedTopics' });
  }

  static async getSelectedLessons(): Promise<{ theme: string; topics: string[] }> {
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
      const cleanedByTheme: Record<string, string[]> = {};
      
      // Check each theme for corrupted data
      Object.entries(byTheme).forEach(([theme, topics]: [string, any]) => {
        if (!Array.isArray(topics)) return;
        
        topics.forEach((topic: string) => {
          const belongsToTheme = THEME_TOPIC_MAP[theme]?.includes(topic);
          
          if (belongsToTheme) {
            if (!cleanedByTheme[theme]) cleanedByTheme[theme] = [];
            cleanedByTheme[theme].push(topic);
          } else {
            needsCleanup = true;
            // Try to find correct theme for this topic
            const correctTheme = Object.entries(THEME_TOPIC_MAP).find(([, topicList]) => 
              topicList.includes(topic)
            )?.[0];
            
            if (correctTheme) {
              if (!cleanedByTheme[correctTheme]) cleanedByTheme[correctTheme] = [];
              cleanedByTheme[correctTheme].push(topic);
            } else {
              // drop unknown topic
            }
          }
        });
      });
      
      if (needsCleanup) {
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
    if (await this.isBatteryDead()) return false;
    
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

  private static getRandomBonusInterval(): number {
    // Random interval between 2-5 lessons for bonus notification
    return Math.floor(Math.random() * 4) + 2;
  }

  static async shouldShowTimeBonusNotification(): Promise<boolean> {
    const data = await this.getStorageData();
    // Check if completing THIS lesson will trigger the bonus (fix off-by-one error)
    const shouldShow = (data.bonusTracker.lessonsCompleted + 1) >= data.bonusTracker.nextBonusAt;
    return shouldShow;
  }

  static async incrementLessonCompletedAndCheckBonus(): Promise<void> {
    await this.withLock(async () => {
      const data = await this.getStorageData();
      const oldCompleted = data.bonusTracker.lessonsCompleted;
      const oldNextAt = data.bonusTracker.nextBonusAt;
      
      data.bonusTracker.lessonsCompleted += 1;
      
      // If we've reached the bonus threshold, reset the counter
      if (data.bonusTracker.lessonsCompleted >= data.bonusTracker.nextBonusAt) {
        data.bonusTracker.lessonsCompleted = 0;
        data.bonusTracker.nextBonusAt = this.getRandomBonusInterval();
      } else {
      }
      
      await browser.storage.local.set({ [STORAGE_KEY]: data });
    }, { lock: 'metrics', opName: 'incrementLessonCompletedAndCheckBonus' });
  }

  // DEBUG: Helper method to inspect bonus tracker state
  static async debugBonusTracker(): Promise<void> {
    const data = await this.getStorageData();
    // Intentionally silent: retained for backward compatibility
  }

  // DEBUG: Force reset bonus tracker for testing
  static async resetBonusTracker(): Promise<void> {
    await this.withLock(async () => {
      const data = await this.getStorageData();
      data.bonusTracker = {
        lessonsCompleted: 0,
        nextBonusAt: 2 // Set to 2 for quick testing
      };
      await browser.storage.local.set({ [STORAGE_KEY]: data });
    }, { lock: 'settings', opName: 'resetBonusTracker' });
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
