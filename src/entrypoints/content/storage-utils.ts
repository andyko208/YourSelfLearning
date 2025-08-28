import type { StorageData, DailyData, StorageLock } from '../../types/storage';
import { 
  getCurrentTimePeriod, 
  getTodayDateString, 
  getYesterdayDateString, 
  isNewDay, 
  createEmptyDailyData 
} from '../../utils/time-periods';
import { browser } from '../../utils/browser-api';

const LOCK_TIMEOUT = 5000; // 5 seconds
const STORAGE_KEY = 'xscroll-data';
const LOCK_KEY = 'xscroll-lock';

export class StorageUtils {
  private static async acquireLock(): Promise<string | null> {
    const lockId = `${Date.now()}-${Math.random()}`;
    
    try {
      // Try to acquire lock
      const result = await browser.storage.local.get(LOCK_KEY);
      const existingLock = result[LOCK_KEY] as StorageLock | undefined;
      
      // Check if lock is available or expired
      if (!existingLock || 
          !existingLock.locked || 
          Date.now() - existingLock.lockTime > LOCK_TIMEOUT) {
        
        const newLock: StorageLock = {
          locked: true,
          lockTime: Date.now(),
          lockId
        };
        
        await browser.storage.local.set({ [LOCK_KEY]: newLock });
        
        // Verify we actually got the lock (race condition check)
        const verifyResult = await browser.storage.local.get(LOCK_KEY);
        const verifyLock = verifyResult[LOCK_KEY] as StorageLock;
        
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
  
  private static async releaseLock(lockId: string): Promise<void> {
    try {
      const result = await browser.storage.local.get(LOCK_KEY);
      const existingLock = result[LOCK_KEY] as StorageLock;
      
      // Only release if we own the lock
      if (existingLock && existingLock.lockId === lockId) {
        await browser.storage.local.set({
          [LOCK_KEY]: {
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
  
  private static async withLock<T>(operation: () => Promise<T>): Promise<T | null> {
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      const lockId = await this.acquireLock();
      
      if (lockId) {
        try {
          const result = await operation();
          await this.releaseLock(lockId);
          return result;
        } catch (error) {
          await this.releaseLock(lockId);
          throw error;
        }
      }
      
      attempts++;
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    }
    
    console.warn('Failed to acquire lock after maximum attempts');
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
          'youtube.com'
        ],
        lessonFrequency: 3,
        frequencyMode: 'scrolls'
      },
      nextLessonAt: 3,
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
      nextLessonAt: data.settings.lessonFrequency,
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
    });
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
    });
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
    });
  }
  
  static async incrementLessonCount(): Promise<void> {
    // NOTE: No battery check here - completing lessons RECHARGES battery
    // This allows users to recover from 0% battery by completing lessons
    await this.withLock(async () => {
      const data = await this.getStorageData();
      const period = getCurrentTimePeriod();
      
      data.today[period].lessonCount += 1;
      
      // Recharge brain battery by 0.5% per lesson completed
      const oldBattery = data.brainBattery;
      data.brainBattery = Math.min(100, data.brainBattery + 0.5);
      
      // console.log(`🔋 Brain battery recharged by lesson: ${oldBattery.toFixed(2)}% → ${data.brainBattery.toFixed(2)}% (+1.0%)`);
      
      // Calculate total scroll count and set next lesson threshold
      const totalScrolls = data.today.morning.scrollCount + 
                          data.today.afternoon.scrollCount + 
                          data.today.night.scrollCount;
      
      data.nextLessonAt = totalScrolls + data.settings.lessonFrequency;
      data.lessonActive = false;
      
      await browser.storage.local.set({ [STORAGE_KEY]: data });
    });
  }
  
  static async updateSettings(newSettings: Partial<StorageData['settings']>): Promise<void> {
    await this.withLock(async () => {
      const data = await this.getStorageData();
      
      data.settings = { ...data.settings, ...newSettings };
      
      await browser.storage.local.set({ [STORAGE_KEY]: data });
    });
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
    });
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