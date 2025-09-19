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
    selectedTheme: string;
    selectedTopics: string[]; // deprecated: kept for compatibility
    selectedTopicsByTheme?: Record<string, string[]>;
  };
  nextLessonAt: number;
  lessonActive: boolean;
  brainBattery: number;
  // Bonus notification tracking
  bonusTracker: {
    lessonsCompleted: number;
    nextBonusAt: number;
  };
  recentTabs: VisitedTabEntry[];
}

export type TimePeriod = 'morning' | 'afternoon' | 'night';

export interface TimerState {
  isRunning: boolean;
  startTime: number;
  tabId: number;
}

export interface VisitedTabEntry {
  tabId: number;
  url: string;
  lastActiveAt: number;
}

export interface StorageLock {
  locked: boolean;
  lockTime: number;
  lockId: string;
}
