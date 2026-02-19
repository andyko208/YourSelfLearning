import { useState } from 'react';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { SettingsPage } from './pages/SettingsPage';
import { TodoPage } from './pages/TodoPage';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'settings' | 'library' | 'friends'>('home');

  // Handle navigation
  const handleNavigation = (page: 'home' | 'settings' | 'library' | 'friends') => {
    setCurrentPage(page);
  };

  return (
    <Layout currentPage={currentPage} onNavigate={handleNavigation}>
      {/* Conditionally render pages */}
      {currentPage === 'home' && <HomePage />}
      {currentPage === 'settings' && <SettingsPage />}
      {currentPage === 'friends' && <TodoPage />}
    </Layout>
  );
}
