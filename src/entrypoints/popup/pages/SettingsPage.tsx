import { useState, useEffect } from 'react';
import { LessonFrequency } from '../components/settings/LessonFrequency';
import { PlatformSelector } from '../components/settings/PlatformSelector';
import { StorageUtils } from '../../content/storage-utils';
import type { StorageData } from '../../../types/storage';

export const SettingsPage: React.FC = () => {
  const [lessonFrequency, setLessonFrequency] = useState<number>(3);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Load current settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await StorageUtils.getStorageData();
        setLessonFrequency(data.settings.lessonFrequency);
        setSelectedPlatforms(data.settings.enabledSites);
        setLoading(false);
      } catch (error) {
        console.error('Error loading settings:', error);
        setLoading(false);
      }
    };
    
    loadSettings();
  }, []);

  // Debounced update function
  const updateSettings = async (updates: Partial<StorageData['settings']>) => {
    try {
      await StorageUtils.updateSettings(updates);
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  // Handle lesson frequency changes
  const handleFrequencyChange = (frequency: number) => {
    setLessonFrequency(frequency);
    updateSettings({ lessonFrequency: frequency });
  };

  // Handle platform changes  
  const handlePlatformChange = (platforms: string[]) => {
    setSelectedPlatforms(platforms);
    updateSettings({ enabledSites: platforms });
  };

  if (loading) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start', // Allow content to flow from top
      width: '100%',
      minHeight: '100%',
      gap: '12px' // Consistent spacing between sections
    }}>
      {/* Settings Header - Optional, can be removed for cleaner look */}
      
      {/* Lesson Frequency Section - Centered like DateSelector */}
      <div style={{
        width: '100%',
        maxWidth: '440px', // Match home page content width
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <h2 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#666',
          margin: '0 0 12px 0',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Lesson Frequency
        </h2>
        <LessonFrequency
          value={lessonFrequency}
          onChange={handleFrequencyChange}
        />
      </div>

      {/* Platforms Section - Centered container */}
      <div style={{
        width: '100%',
        maxWidth: '440px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <h2 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#666',
          margin: '0 0 12px 0',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Platforms
        </h2>
        <PlatformSelector
          selectedPlatforms={selectedPlatforms}
          onChange={handlePlatformChange}
        />
      </div>
    </div>
  );
};