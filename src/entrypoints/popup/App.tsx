import { useState, useEffect } from 'react';
import { MetricSlot } from './components/MetricSlot';
import { BrainBattery } from './components/BrainBattery';
import { ResetTimer } from './components/ResetTimer';
import { NavigationBar } from './components/NavigationBar';
import { DateSelector } from './components/DateSelector';
import { formatTime, formatScrollCount, formatLessonCount } from './utils/formatters';
import { StorageUtils } from '../content/storage-utils';
import { browser } from '../../utils/browser-api';
import type { PeriodData } from '../../types/storage';

export default function App() {
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
  };

  // Handle date change
  const handleDateChange = (date: 'today' | 'yesterday') => {
    setSelectedDate(date);
    loadDataForDate(date);
  };

  useEffect(() => {
    // Load initial data for selected date
    loadDataForDate(selectedDate);
    
    // Load brain battery (always from today)
    const loadBrainBattery = async () => {
      const data = await StorageUtils.getStorageData();
      setBrainPercentage(data.brainBattery);
    };
    loadBrainBattery();
    
    // Listen for storage changes and update UI (only for "today")
    const handleStorageChange = async (changes: any) => {
      if (changes['xscroll-data']) {
        // Always update brain battery
        const data = await StorageUtils.getStorageData();
        setBrainPercentage(data.brainBattery);
        
        // Only update metrics if "today" is selected
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
      width: '480px',
      height: '550px',
      backgroundColor: 'white',
      position: 'relative',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <ResetTimer />
      
      <BrainBattery
        percentage={Math.floor(brainPercentage)}
        scrollCount={scrollCount}
        timeWasted={timeWasted}
        lessonCount={lessonCount}
      />
      
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingBottom: '40px' // Account for navigation bar
      }}>
        {/* Date Selector */}
        <DateSelector 
          selectedDate={selectedDate} 
          onDateChange={handleDateChange} 
        />
        
        {brainPercentage === 0 && selectedDate === 'today' ? (
          // Brain fried state - only show for today
          <div style={{
            backgroundColor: '#2a2a2a',
            border: '3px solid black',
            borderRadius: '16px',
            padding: '50px 30px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '160px',
            opacity: 0.8
          }}>
            <div style={{
              color: '#ff4444',
              fontSize: '18px',
              fontWeight: 'bold',
              textAlign: 'center',
              lineHeight: '1.4'
            }}>
              BRAIN FRIED!
            </div>
          </div>
        ) : (
          // Normal slot machine panel
          <div style={{
            backgroundColor: '#f5f5f5',
            border: '3px solid black',
            borderRadius: '16px',
            padding: '30px',
            display: 'flex',
            gap: '20px',
            flexDirection: 'row',
            alignItems: 'center'
          }}>
            <MetricSlot
              type="scroll"
              value={scrollCount}
              label={formatScrollCount(scrollCount)}
              sessionData={sessionData}
              selectedDate={selectedDate}
              isBatteryDead={false}
            />
            <MetricSlot
              type="time"
              value={timeWasted}
              label={formatTime(timeWasted)}
              sessionData={sessionData}
              selectedDate={selectedDate}
              isBatteryDead={false}
            />
            <MetricSlot
              type="lesson"
              value={lessonCount}
              label={formatLessonCount(lessonCount)}
              sessionData={sessionData}
              selectedDate={selectedDate}
              isBatteryDead={false}
            />
          </div>
        )}
      </div>
      
      <NavigationBar />
    </div>
  );
}
