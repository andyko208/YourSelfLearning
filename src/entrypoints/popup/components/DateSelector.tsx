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
    console.log(`Date changed to ${date}`);
  };
  return (
    <div style={{
      display: 'flex',
      gap: '0',
      margin: '20px 0',
      backgroundColor: 'white',
      border: '3px solid black',
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
      width: '466px'
    }}>
      <button
        onClick={(e) => handleDateChange('today', e)}
        style={{
          flex: 1,
          padding: '10px 20px',
          border: 'none',
          backgroundColor: selectedDate === 'today' ? '#e0e0e0' : 'white',
          color: 'black',
          fontSize: '14px',
          fontWeight: 'normal',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          borderRight: '2px solid black'
        }}
        onMouseEnter={(e) => {
          if (selectedDate !== 'today') {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
          }
        }}
        onMouseLeave={(e) => {
          if (selectedDate !== 'today') {
            e.currentTarget.style.backgroundColor = 'white';
          }
        }}
      >
        Today
      </button>
      <button
        onClick={(e) => handleDateChange('yesterday', e)}
        style={{
          flex: 1,
          padding: '10px 20px',
          border: 'none',
          backgroundColor: selectedDate === 'yesterday' ? '#e0e0e0' : 'white',
          color: 'black',
          fontSize: '14px',
          fontWeight: 'normal',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}
        onMouseEnter={(e) => {
          if (selectedDate !== 'yesterday') {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
          }
        }}
        onMouseLeave={(e) => {
          if (selectedDate !== 'yesterday') {
            e.currentTarget.style.backgroundColor = 'white';
          }
        }}
      >
        Yesterday
      </button>
    </div>
  );
};
