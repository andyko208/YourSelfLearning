import type { TimePeriod } from '../types/storage';

export function getCurrentTimePeriod(): TimePeriod {
  const now = new Date();
  const hour = now.getHours();
  
  if (hour >= 0 && hour < 8) {
    return 'morning';
  } else if (hour >= 8 && hour < 16) {
    return 'afternoon';
  } else {
    return 'night';
  }
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getTodayDateString(): string {
  const now = new Date();
  return formatLocalDate(now);
}

export function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatLocalDate(yesterday);
}

export function isSameDay(dateString1: string, dateString2: string): boolean {
  return dateString1 === dateString2;
}

export function isNewDay(lastStoredDate: string): boolean {
  const today = getTodayDateString();
  return !isSameDay(lastStoredDate, today);
}

export function getNextResetTime(): number {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.getTime();
}

export function createEmptyPeriodData() {
  return {
    scrollCount: 0,
    timeWasted: 0,
    lessonCount: 0
  };
}

export function createEmptyDailyData(date: string) {
  return {
    morning: createEmptyPeriodData(),
    afternoon: createEmptyPeriodData(),
    night: createEmptyPeriodData(),
    date
  };
}
