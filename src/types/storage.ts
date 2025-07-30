export interface PeriodData {
  scrollCount: number;
  timeWasted: number;
  lessonCount: number;
}

export interface DailyData {
  morning: PeriodData;
  afternoon: PeriodData;
  night: PeriodData;
  date: string;
}

export interface StorageData {
  today: DailyData;
  yesterday: DailyData;
  settings: {
    enabledSites: string[];
    lessonFrequency: number;
    frequencyMode: 'scrolls' | 'time';
  };
  nextLessonAt: number;
  lessonActive: boolean;
}

export type TimePeriod = 'morning' | 'afternoon' | 'night';

export interface TimerState {
  isRunning: boolean;
  startTime: number;
  tabId: number;
}

export interface StorageLock {
  locked: boolean;
  lockTime: number;
  lockId: string;
}