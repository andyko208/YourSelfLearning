import React, { useState } from 'react';

interface BrainBatteryProps {
  percentage: number;
  scrollCount: number;
  timeWasted: number;
  lessonCount: number;
}

export const BrainBattery: React.FC<BrainBatteryProps> = ({
  percentage,
  scrollCount,
  timeWasted,
  lessonCount
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const getBarColor = () => {
    if (percentage > 60) return '#4ade80'; // light green
    if (percentage > 20) return '#fb923c'; // orange
    return '#ef4444'; // red
  };
  
  const timeMinutes = Math.floor(timeWasted / 60);
  const timeDrain = timeMinutes * 1.0;
  const scrollDrain = scrollCount * 0.2;
  const lessonRecharge = lessonCount * 1.0;
  
  return (
    <div 
      style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer'
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <img 
        src="/icon/main-ui/BrainBattery.png" 
        alt="Brain"
        style={{ width: '24px', height: '24px' }}
      />
      <div style={{
        fontSize: '14px',
        fontWeight: 'bold',
        color: 'black'
      }}>
        {percentage}%
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 'bold',
          color: 'black'
        }}>
        </div>
        <div style={{
          width: '60px',
          height: '20px',
          backgroundColor: '#e5e5e5',
          borderRadius: '3px',
          border: '1px solid black',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: getBarColor(),
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>
      
      
      {showTooltip && (
        <div style={{
          position: 'absolute',
          top: '30px',
          right: '0',
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
            Brain Battery
          </div>
          <div>Time drain: -1.0% per minute</div>
          <div>Scroll drain: -0.2% per scroll</div>
          <div>Lesson recharge: +0.5% per lesson</div>
          <div>Auto recharge: +1% per minute when away from tracked sites</div>
        </div>
      )}
    </div>
  );
};