import type { StorageData, DailyData, StorageLock } from '../../types/storage';
import { 
  getCurrentTimePeriod, 
  getTodayDateString, 
  getYesterdayDateString, 
  isNewDay, 
  createEmptyDailyData 
} from '../../utils/time-periods';

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
        lessonFrequency: 10,
        frequencyMode: 'scrolls'
      }
    };
  }
  
  private static async performDailyRollover(data: StorageData): Promise<StorageData> {
    const today = getTodayDateString();
    
    const newData: StorageData = {
      ...data,
      yesterday: data.today,
      today: createEmptyDailyData(today)
    };
    
    await browser.storage.local.set({ [STORAGE_KEY]: newData });
    return newData;
  }
  
  static async incrementScrollCount(): Promise<void> {
    await this.withLock(async () => {
      const data = await this.getStorageData();
      const period = getCurrentTimePeriod();
      
      data.today[period].scrollCount += 1;
      console.log(`Scroll count: ${data.today[period].scrollCount}`);
      
      await browser.storage.local.set({ [STORAGE_KEY]: data });
    });
  }
  
  static async incrementTimeWasted(seconds: number): Promise<void> {
    await this.withLock(async () => {
      const data = await this.getStorageData();
      const period = getCurrentTimePeriod();
      
      data.today[period].timeWasted += seconds;
      console.log(`Time wasted: ${data.today[period].timeWasted} seconds`);
      
      await browser.storage.local.set({ [STORAGE_KEY]: data });
    });
  }
  
  static async incrementLessonCount(): Promise<void> {
    await this.withLock(async () => {
      const data = await this.getStorageData();
      const period = getCurrentTimePeriod();
      
      data.today[period].lessonCount += 1;
      
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
}