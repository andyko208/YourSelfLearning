import React from 'react';

import { THEMES } from '../../../../utils/lessons-index';
type Theme = string;

interface ThemeSelectorProps {
  selectedTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

const toLabel = (slug: string) => slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');

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
      width: '100%',
      maxWidth: '440px',
      boxSizing: 'border-box'
    }}>
      {THEMES.map((theme) => {
        const isSelected = selectedTheme === theme;
        return (
          <button
            key={theme}
            onClick={() => onThemeChange(theme)}
            style={{
              flex: 1,
              backgroundColor: isSelected ? 'white' : 'transparent',
              border: isSelected ? '2px solid black' : 'none',
              borderRadius: '12px',
              padding: '8px 20px',
              fontSize: '14px',
              fontWeight: isSelected ? '600' : '500',
              color: 'black',
              cursor: 'pointer',
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
            {toLabel(theme)}
          </button>
        );
      })}
    </div>
  );
};
