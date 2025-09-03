import React from 'react';

interface LessonFrequencyProps {
  value: number;
  onChange: (frequency: number) => void;
}

const frequencyOptions = [
  { label: 'Often (1-3)', value: 3 },
  { label: 'Sometimes (4-6)', value: 6 },
  { label: 'Barely (7-9)', value: 9 }
];

export const LessonFrequency: React.FC<LessonFrequencyProps> = ({ value, onChange }) => {
  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      justifyContent: 'center',
      backgroundColor: '#f5f5f5',
      border: '2px solid black',
      borderRadius: '12px',
      padding: '4px',
      width: 'fit-content'
    }}>
      {frequencyOptions.map((option) => {
        const isSelected = value === option.value;
        
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            style={{
              backgroundColor: isSelected ? 'white' : 'transparent',
              border: isSelected ? '2px solid black' : 'none',
              borderRadius: '12px',
              padding: '8px 20px',
              fontSize: '14px',
              fontWeight: isSelected ? '600' : '500',
              color: 'black',
              cursor: 'pointer',
              transition: 'all 0.1s ease',
              outline: 'none',
              minWidth: '110px',
              boxShadow: isSelected ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.5)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};