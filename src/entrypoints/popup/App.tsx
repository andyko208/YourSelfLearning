import { useState, useEffect } from 'react';
import { MetricSlot } from './components/MetricSlot';
import { BrainBattery } from './components/BrainBattery';
import { ResetTimer } from './components/ResetTimer';
import { NavigationBar } from './components/NavigationBar';
import { formatTime, formatScrollCount, formatLessonCount } from './utils/formatters';
import { StorageUtils } from '../content/storage-utils';
import { browser } from '../../utils/browser-api';
import type { PeriodData } from '../../types/storage';

export default function App() {
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

  useEffect(() => {
    // Load initial data
    const loadData = async () => {
      const timestamp = new Date().toISOString();
      
      const totals = await StorageUtils.getTotals();
      
      setScrollCount(totals.scrollCount);
      setTimeWasted(totals.timeWasted);
      setLessonCount(totals.lessonCount);
      
      // Load session data for tooltips
      const todayData = await StorageUtils.getTodayData();
      setSessionData({
        morning: todayData.morning,
        afternoon: todayData.afternoon,
        night: todayData.night
      });
      
      // Get stored brain battery (simple number)
      const data = await StorageUtils.getStorageData();
      setBrainPercentage(data.brainBattery);
    };
    loadData();
    
    // Listen for storage changes and update UI
    const handleStorageChange = async (changes: any) => {
      const timestamp = new Date().toISOString();
      
      if (changes['xscroll-data']) {
        const totals = await StorageUtils.getTotals();
        
        setScrollCount(totals.scrollCount);
        setTimeWasted(totals.timeWasted);
        setLessonCount(totals.lessonCount);
        
        // Update session data
        const todayData = await StorageUtils.getTodayData();
        setSessionData({
          morning: todayData.morning,
          afternoon: todayData.afternoon,
          night: todayData.night
        });
        
        // Get updated brain battery from storage
        const data = await StorageUtils.getStorageData();
        setBrainPercentage(data.brainBattery);
      }
    };
    
    browser.storage.onChanged.addListener(handleStorageChange);
    
    return () => {
      browser.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);


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
        percentage={Math.floor(brainPercentage)} // change to an integer 
        // percentage={Number(brainPercentage.toFixed(2))} // change to an integer floor later
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
        {brainPercentage === 0 ? (
          // Brain fried state - darkened panel with red text
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
              YOUR BRAIN IS FRIED,<br />come back later!
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
              isBatteryDead={false}
            />
            <MetricSlot
              type="time"
              value={timeWasted}
              label={formatTime(timeWasted)}
              sessionData={sessionData}
              isBatteryDead={false}
            />
            <MetricSlot
              type="lesson"
              value={lessonCount}
              label={formatLessonCount(lessonCount)}
              sessionData={sessionData}
              isBatteryDead={false}
            />
          </div>
        )}
      </div>
      
      <NavigationBar />
    </div>
  );
}
