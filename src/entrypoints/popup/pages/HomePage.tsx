import { useState, useEffect } from 'react';
import { MetricSlot } from '../components/home/MetricSlot';
import { DateSelector } from '../components/home/DateSelector';
import { formatTime, formatScrollCount, formatLessonCount } from '../utils/formatters';
import { StorageUtils } from '../../content/storage-utils';
import { browser } from '../../../utils/browser-api';
import type { PeriodData } from '../../../types/storage';

export const HomePage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<'today' | 'yesterday'>('today');
  const [scrollCount, setScrollCount] = useState(0);
  const [timeWasted, setTimeWasted] = useState(0);
  const [lessonCount, setLessonCount] = useState(0);
  const [brainPercentage, setBrainPercentage] = useState(100);
  
  // Session data for tooltips
  const [sessionData, setSessionData] = useState<{
    morning: PeriodData;
    afternoon: PeriodData;
    night: PeriodData;
  }>({
    morning: { scrollCount: 0, timeWasted: 0, lessonCount: 0 },
    afternoon: { scrollCount: 0, timeWasted: 0, lessonCount: 0 },
    night: { scrollCount: 0, timeWasted: 0, lessonCount: 0 }
  });

  // Load data based on selected date
  const loadDataForDate = async (date: 'today' | 'yesterday') => {
    const totals = await StorageUtils.getTotalsByDate(date);
    const dailyData = await StorageUtils.getDataByDate(date);
    
    setScrollCount(totals.scrollCount);
    setTimeWasted(totals.timeWasted);
    setLessonCount(totals.lessonCount);
    
    setSessionData({
      morning: dailyData.morning,
      afternoon: dailyData.afternoon,
      night: dailyData.night
    });
    
    // Brain battery is only meaningful for today
    if (date === 'today') {
      const storageData = await StorageUtils.getStorageData();
      setBrainPercentage(storageData.brainBattery);
    } else {
      setBrainPercentage(100); // Default for yesterday
    }
  };

  // Handle date change
  const handleDateChange = (date: 'today' | 'yesterday') => {
    setSelectedDate(date);
    loadDataForDate(date);
  };

  useEffect(() => {
    // Load initial data for selected date
    loadDataForDate(selectedDate);
    
    const handleStorageChange = async (changes: any) => {
      if (changes['xscroll-data']) {
        if (selectedDate === 'today') {
          await loadDataForDate('today');
        }
      }
    };
    
    browser.storage.onChanged.addListener(handleStorageChange);
    
    return () => {
      browser.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [selectedDate]);

  return (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'flex-start', // Allow content to flow from top
        width: '100%',
        minHeight: '100%',
        gap: '12px' // Consistent spacing between sections
      }}>
        {/* Date Selector */}
        <DateSelector 
          selectedDate={selectedDate} 
          onDateChange={handleDateChange} 
        />
        
        {/* Normal slot machine panel - always show */}
        <div style={{
          backgroundColor: '#f5f5f5',
          border: '3px solid black',
          borderRadius: '16px',
          padding: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          alignItems: 'stretch',
          width: '100%',
          boxSizing: 'border-box',
        }}>
          <MetricSlot
            type="scroll"
            value={scrollCount}
            label={formatScrollCount(scrollCount)}
            sessionData={sessionData}
            selectedDate={selectedDate}
            isBatteryDead={brainPercentage === 0 && selectedDate === 'today'}
          />
          <MetricSlot
            type="time"
            value={timeWasted}
            label={formatTime(timeWasted)}
            sessionData={sessionData}
            selectedDate={selectedDate}
            isBatteryDead={brainPercentage === 0 && selectedDate === 'today'}
          />
          <MetricSlot
            type="lesson"
            value={lessonCount}
            label={formatLessonCount(lessonCount)}
            sessionData={sessionData}
            selectedDate={selectedDate}
            isBatteryDead={brainPercentage === 0 && selectedDate === 'today'}
          />
        </div>
      </div>
  );
};
