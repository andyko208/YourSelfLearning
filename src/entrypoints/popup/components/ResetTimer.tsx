import React, { useState, useEffect } from 'react';
import { getTimeUntilMidnight } from '../utils/formatters';
import { getCurrentTimePeriod } from '../../../utils/time-periods';

export const ResetTimer: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState(getTimeUntilMidnight());
  const [showTooltip, setShowTooltip] = useState(false);
  const [currentSession, setCurrentSession] = useState(getCurrentTimePeriod());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeUntilMidnight());
      setCurrentSession(getCurrentTimePeriod());
    }, 1000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  const isCurrentTimePeriod = (session: string): boolean => {
    const validSessions = ['morning', 'afternoon', 'night'];
    const validCurrentSession = validSessions.includes(currentSession) ? currentSession : 'morning';
    
    return session === validCurrentSession;
  };
  
  const getSessionDisplayName = (session: string) => {
    const shouldBeBold = isCurrentTimePeriod(session);
    const style = shouldBeBold ? { fontWeight: 'bold' as const } : { fontWeight: 'normal' as const };
    
    switch (session) {
      case 'morning': return <div style={style}>Morning (12AM-8AM)</div>;
      case 'afternoon': return <div style={style}>Afternoon (8AM-4PM)</div>;
      case 'night': return <div style={style}>Night (4PM-12AM)</div>;
      default: return <div style={style}>{session}</div>;
    }
  };
  
  return (
    <div 
      style={{
        position: 'absolute',
        left: '20px',
        height: '20px',
        fontSize: '12px',
        fontWeight: 'bold',
        color: '#666',
        cursor: 'pointer',
        zIndex: 1001
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      RESET IN {timeLeft}
      
      {showTooltip && (
        <div style={{
          position: 'absolute',
          top: '30px',
          left: '0',
          backgroundColor: 'white',
          border: '2px solid black',
          borderRadius: '8px',
          padding: '12px',
          fontSize: '12px',
          whiteSpace: 'nowrap',
          zIndex: 1002,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            Time Periods
          </div>
          {getSessionDisplayName('morning')}
          {getSessionDisplayName('afternoon')}
          {getSessionDisplayName('night')}
        </div>
      )}
    </div>
  );
};
