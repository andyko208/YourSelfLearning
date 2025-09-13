import React from 'react';

interface DateSelectorProps {
  selectedDate: 'today' | 'yesterday';
  onDateChange: (date: 'today' | 'yesterday') => void;
}

export const DateSelector: React.FC<DateSelectorProps> = ({ selectedDate, onDateChange }) => {

  const handleDateChange = (
    date: 'today' | 'yesterday',
    e?: React.MouseEvent<HTMLButtonElement>
  ) => {
    onDateChange(date);
    // Blur to avoid persistent default focus ring after mouse clicks
    e?.currentTarget?.blur();
  };
  const isSelected = selectedDate === 'today';
  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      justifyContent: 'center',
      backgroundColor: '#f5f5f5',
      border: '2px solid black',
      borderRadius: '12px',
      padding: '4px',
      width: '100%',
      maxWidth: '440px',
      boxSizing: 'border-box'
    }}>
      <button
        onClick={(e) => handleDateChange('today', e)}
        style={{
          flex: 1,
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isSelected ? 'white' : 'transparent',
          border: isSelected ? '2px solid black' : 'none',
          borderRadius: '12px',
          padding: '0 20px',
          fontSize: '14px',
          fontWeight: isSelected ? '600' : '500',
          color: 'black',
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.1s ease',
          boxShadow: isSelected ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
        }}
        onMouseEnter={(e) => {
          if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.5)';
        }}
        onMouseLeave={(e) => {
          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        Today
      </button>
      <button
        onClick={(e) => handleDateChange('yesterday', e)}
        style={{
          flex: 1,
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: !isSelected ? 'white' : 'transparent',
          border: !isSelected ? '2px solid black' : 'none',
          borderRadius: '12px',
          padding: '0 20px',
          fontSize: '14px',
          fontWeight: !isSelected ? '600' : '500',
          color: 'black',
          cursor: 'pointer',
          transition: 'all 0.15s ease-out',
          outline: 'none',
          minWidth: '110px',
          boxShadow: !isSelected ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
          }}
            onMouseEnter={(e) => {
              if (isSelected) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.5)';
            }}
            onMouseLeave={(e) => {
              if (isSelected) e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
        Yesterday
      </button>
    </div>
  );
};
