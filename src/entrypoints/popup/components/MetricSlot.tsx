import React, { useState } from 'react';
import { getEmojiForMetric } from '../utils/emoji-selector';
import { formatTime, formatTimeClean, formatScrollCount, formatLessonCount } from '../utils/formatters';
import type { PeriodData } from '../../../types/storage';

interface MetricSlotProps {
  type: 'scroll' | 'time' | 'lesson';
  value: number;
  label: string;
  sessionData: {
    morning: PeriodData;
    afternoon: PeriodData;
    night: PeriodData;
  };
  isBatteryDead: boolean;
}

export const MetricSlot: React.FC<MetricSlotProps> = ({ type, value, label, sessionData, isBatteryDead }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const emojiPath = getEmojiForMetric(value, type);
  
  // Get the appropriate value for each session based on type
  const getSessionValue = (period: PeriodData) => {
    switch (type) {
      case 'scroll': return period.scrollCount;
      case 'time': return period.timeWasted;
      case 'lesson': return period.lessonCount;
    }
  };
  
  // Format the session value based on type
  const formatSessionValue = (periodValue: number) => {
    switch (type) {
      case 'scroll': return formatScrollCount(periodValue);
      case 'time': return formatTime(periodValue);
      case 'lesson': return formatLessonCount(periodValue);
    }
  };
  
  // Clean formatting for tooltips (no "wasted", "scrolled", "lessoned" suffixes)
  const formatTooltipValue = (periodValue: number) => {
    switch (type) {
      case 'scroll': return `${periodValue}`;
      case 'time': return formatTimeClean(periodValue);
      case 'lesson': return `${periodValue}`;
    }
  };
  
  const morningValue = getSessionValue(sessionData.morning);
  const afternoonValue = getSessionValue(sessionData.afternoon);
  const nightValue = getSessionValue(sessionData.night);
  
  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px',
        border: '3px solid black',
        borderRadius: '12px',
        backgroundColor: 'white',
        width: '120px',
        height: '160px',
        justifyContent: 'center',
        gap: '12px',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        position: 'relative'
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div style={{
        width: '60px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        border: '2px solid black'
      }}>
        <img 
          src={emojiPath} 
          alt={`${type} emoji`}
          style={{ width: '48px', height: '48px' }}
        />
      </div>
      <div style={{
        fontSize: '14px',
        fontWeight: 'bold',
        textAlign: 'center',
        color: 'black',
        lineHeight: '1.2'
      }}>
        {label}
      </div>
      
      {showTooltip && (
        <div style={{
          position: 'absolute',
          top: '-120px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'white',
          border: '2px solid black',
          borderRadius: '8px',
          padding: '12px',
          fontSize: '12px',
          whiteSpace: 'nowrap',
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            Session Breakdown
          </div>
          <div>+ Morning: {formatTooltipValue(morningValue)}</div>
          <div>+ Afternoon: {formatTooltipValue(afternoonValue)}</div>
          <div>+ Night: {formatTooltipValue(nightValue)}</div>
          <div style={{ 
            borderTop: '1px solid black', 
            marginTop: '4px', 
            paddingTop: '4px',
            fontWeight: 'bold' 
          }}>
            Total: {formatTooltipValue(value)}
          </div>
        </div>
      )}
    </div>
  );
};