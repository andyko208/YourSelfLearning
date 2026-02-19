import React, { useState } from 'react';

interface BrainBatteryProps {
  percentage: number;
  scrollCount: number;
  timeWasted: number;
  lessonCount: number;
  variant?: 'absolute' | 'inline';
}

export const BrainBattery: React.FC<BrainBatteryProps> = ({
  percentage,
  scrollCount,
  timeWasted,
  lessonCount,
  variant = 'absolute'
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  // Display: show 1% for 0 < x < 1; 0% only at exactly 0
  const displayPercentage = percentage === 0 ? 0 : Math.max(1, Math.min(100, Math.floor(percentage)));
  const actualClamped = Math.max(0, Math.min(100, Math.floor(percentage)));

  const getBarColor = () => {
    if (actualClamped > 60) return '#4ade80';
    if (actualClamped > 20) return '#fb923c';
    return '#ef4444';
  };

  const isAbsolute = variant === 'absolute';

  return (
    <div
      style={{
        position: isAbsolute ? 'absolute' : 'relative',
        top: isAbsolute ? '10px' : undefined,
        right: isAbsolute ? '20px' : undefined,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        zIndex: 1001
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div style={{ position: 'relative', width: '100px', height: '18px', border: '2px solid black', borderRadius: '4px', background: '#f0f0f0', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${Math.max(0, Math.min(100, percentage))}%`, background: getBarColor(), transition: 'width 0.3s ease' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#111', mixBlendMode: 'normal' }}>
          {displayPercentage}%
        </div>
      </div>

      {showTooltip && (
        <div style={{ position: 'absolute', top: '24px', right: 0, background: 'white', border: '2px solid black', borderRadius: '8px', padding: '8px 10px', fontSize: '12px', color: '#111', width: '200px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Brain Battery</div>
          <div>- 1.0/min stay</div>
          <div>- 0.2/scroll</div>
          <div>+ 0.5/lesson complete</div>
          <div>+ 1.0/learn more click</div>
          <div>+ 1.0/min away</div>
        </div>
      )}
    </div>
  );
};
