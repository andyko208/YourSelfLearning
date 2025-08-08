import React from 'react';

interface NavItem {
  id: string;
  icon: string;
  label: string;
}

const navItems: NavItem[] = [
  { id: 'lessons', icon: '/icon/main-ui/MyLessons.png', label: 'MyLessons' },
  { id: 'data', icon: '/icon/main-ui/MyData.png', label: 'MyData' },
  { id: 'settings', icon: '/icon/main-ui/MySettings.png', label: 'MySettings' }
];

export const NavigationBar: React.FC = () => {
  const handleNavClick = (id: string) => {
    console.log(`Navigation to ${id} - Coming soon!`);
  };
  
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '60px',
      backgroundColor: 'white',
      borderTop: '2px solid black',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: '0 20px'
    }}>
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => handleNavClick(item.id)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          <img 
            src={item.icon} 
            alt={item.label}
            style={{ width: '24px', height: '24px' }}
          />
          <span style={{ fontSize: '10px', color: 'black' }}>
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
};