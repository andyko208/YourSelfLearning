import React, { useState } from 'react';
import { formatTime, formatTimeClean, formatScrollCount, formatLessonCount } from '../../utils/formatters';
import type { PeriodData } from '../../../../types/storage';

interface MetricSlotProps {
  type: 'scroll' | 'time' | 'lesson';
  value: number;
  label: string;
  sessionData: {
    morning: PeriodData;
    afternoon: PeriodData;
    night: PeriodData;
  };
  selectedDate?: 'today' | 'yesterday';
  isBatteryDead: boolean;
}

export const MetricSlot: React.FC<MetricSlotProps> = ({ 
  type, 
  value, 
  label, 
  sessionData, 
  selectedDate = 'today',
  isBatteryDead 
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
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
  
  // Check if we have any data for yesterday
  const hasData = selectedDate === 'today' || (morningValue > 0 || afternoonValue > 0 || nightValue > 0);
  
  // Get display value and label text
  const getDisplayValue = () => {
    switch (type) {
      case 'scroll': return value.toString();
      case 'time': return formatTimeClean(value);
      case 'lesson': return value.toString();
    }
  };
  
  const getLabelText = () => {
    switch (type) {
      case 'scroll': return 'scrolled';
      case 'time': return 'wasted';
      case 'lesson': return 'lessoned';
    }
  };
  
  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px',
        border: '3px solid black',
        borderRadius: '12px',
        backgroundColor: 'white',
        width: '100%',
        maxWidth: '132px',
        height: '148px',
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
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        gap: '8px'
      }}>
        <div style={{
          fontSize: '24px',
          fontWeight: 'bold',
          textAlign: 'center',
          color: 'red',
          lineHeight: '1.1',
          textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
        }}>
          {getDisplayValue()}
        </div>
        <div style={{
          fontSize: '12px',
          fontWeight: '600',
          textAlign: 'center',
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          {getLabelText()}
        </div>
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
          {
            <>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                {selectedDate === 'today' ? "Today's Sessions" : "Yesterday's Sessions"}
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
            </>
          }
        </div>
      )}
    </div>
  );
};
