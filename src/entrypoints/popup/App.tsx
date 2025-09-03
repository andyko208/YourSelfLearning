import { useState } from 'react';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'settings' | 'library'>('home');

  // Handle navigation
  const handleNavigation = (page: 'home' | 'settings' | 'library') => {
    setCurrentPage(page);
  };

  return (
    <Layout currentPage={currentPage} onNavigate={handleNavigation}>
      {/* Conditionally render pages */}
      {currentPage === 'home' && <HomePage />}
      {currentPage === 'settings' && <SettingsPage />}
      {currentPage === 'library' && (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          color: '#666'
        }}>
          Library - Coming Soon!
        </div>
      )}
    </Layout>
  );
}
