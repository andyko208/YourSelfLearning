import React from 'react';

type Theme = 'how-to' | 'what-is' | 'why';

interface ThemeSelectorProps {
  selectedTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

const OPTIONS: { label: string; value: Theme }[] = [
  { label: 'How to', value: 'how-to' },
  { label: 'What is', value: 'what-is' },
  { label: 'Why', value: 'why' }
];

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ selectedTheme, onThemeChange }) => {
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
      {OPTIONS.map((opt) => {
        const isSelected = selectedTheme === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onThemeChange(opt.value)}
            style={{
              backgroundColor: isSelected ? 'white' : 'transparent',
              border: isSelected ? '2px solid black' : 'none',
              borderRadius: '12px',
              padding: '8px 20px',
              fontSize: '14px',
              fontWeight: isSelected ? '600' : '500',
              color: 'black',
              cursor: 'pointer',
              // transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              transition: 'all 0.15s ease-out',
              outline: 'none',
              minWidth: '110px',
              boxShadow: isSelected ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.5)';
            }}
            onMouseLeave={(e) => {
              if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};



