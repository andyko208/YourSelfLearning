import React, { useState, useEffect } from 'react';
import { BrainBattery } from './BrainBattery';
import { ResetTimer } from './ResetTimer';
import { NavigationBar } from './NavigationBar';
import { StorageUtils } from '../../content/storage-utils';
import { browser } from '../../../utils/browser-api';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: 'home' | 'settings' | 'library';
  onNavigate: (page: 'home' | 'settings' | 'library') => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate }) => {
  const [brainPercentage, setBrainPercentage] = useState(100);
  const [scrollCount, setScrollCount] = useState(0);
  const [timeWasted, setTimeWasted] = useState(0);
  const [lessonCount, setLessonCount] = useState(0);

  // Load brain battery and metrics for BrainBattery tooltip
  const loadSharedData = async () => {
    const data = await StorageUtils.getStorageData();
    setBrainPercentage(data.brainBattery);
    
    // Get today's totals for BrainBattery tooltip
    const totals = await StorageUtils.getTotalsByDate('today');
    setScrollCount(totals.scrollCount);
    setTimeWasted(totals.timeWasted);
    setLessonCount(totals.lessonCount);
  };

  useEffect(() => {
    // Load initial data
    loadSharedData();
    
    // Listen for storage changes and update all shared data
    const handleStorageChange = async (changes: any) => {
      if (changes['xscroll-data']) {
        await loadSharedData();
      }
    };
    
    browser.storage.onChanged.addListener(handleStorageChange);
    
    return () => {
      browser.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: 'white',
      position: 'relative',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Fixed positioned components */}
      <ResetTimer />
      
      <BrainBattery
        percentage={Math.floor(brainPercentage)}
        scrollCount={scrollCount}
        timeWasted={timeWasted}
        lessonCount={lessonCount}
      />
      
      {/* Page content area with consistent spacing */}
      <div style={{
        flex: 1,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        // Top: clear BrainBattery+ResetTimer (approx 56px), Sides: 16px, Bottom: clear NavigationBar (60px)
        padding: '64px 16px 72px 16px',
        minHeight: '0',
        overflowY: 'auto'
      }}>
        {children}
      </div>
      
      {/* Fixed navigation bar */}
      <NavigationBar 
        currentPage={currentPage}
        onNavigate={onNavigate}
      />
    </div>
  );
};