import { useState, useEffect } from 'react';
import { LessonFrequency } from '../components/settings/LessonFrequency';
import { PlatformSelector, ALL_PLATFORMS } from '../components/settings/PlatformSelector';
import { StorageUtils } from '../../content/storage-utils';
import type { StorageData } from '../../../utils/storage';

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

  const handleToggleAllPlatforms = () => {
    const all = ALL_PLATFORMS;
    if (!Array.isArray(all) || all.length === 0) return;
    const allSelected = selectedPlatforms.length === all.length;
    const next = allSelected ? [] : [...all];
    setSelectedPlatforms(next);
    updateSettings({ enabledSites: next });
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
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        maxWidth: '440px', // Match home page content width
      }}>
        {/* <img src="https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExZWZmbTc4ZzB6NzNtdWVkYTN3amIwYTNkOWR3cmU0cnlyOTAydHJzMiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/yr7n0u3qzO9nG/giphy.gif" alt="Funny GIF" /> */}

        <h2 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#666',
          margin: '0 0 12px 0',
          letterSpacing: '0.5px'
        }}>
          Block Content
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', maxWidth: '440px', justifyContent: 'center', margin: '0 0 12px 0' }}>
          <h2 style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#666',
            margin: 0,
            letterSpacing: '0.5px'
          }}>
            Platforms
          </h2>
          {ALL_PLATFORMS.length > 0 && (
            <button
              onClick={handleToggleAllPlatforms}
              title={selectedPlatforms.length === ALL_PLATFORMS.length ? 'Deselect all platforms' : 'Select all platforms'}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                fontSize: '12px', fontWeight: 700, background: 'transparent', outline: 'none',
                border: 'none', cursor: 'pointer', color: selectedPlatforms.length === ALL_PLATFORMS.length ? '#16a34a' : '#111'
              }}
            >
              <span style={{
                display: 'inline-flex', width: '16px', height: '16px', borderRadius: '50%',
                backgroundColor: selectedPlatforms.length === ALL_PLATFORMS.length ? '#16a34a' : '#e5e7eb',
                color: selectedPlatforms.length === ALL_PLATFORMS.length ? 'white' : '#374151',
                alignItems: 'center', justifyContent: 'center', lineHeight: 1, border: '1px solid #9ca3af'
              }}>✓</span>
              {selectedPlatforms.length === ALL_PLATFORMS.length ? '' : ''}
            </button>
          )}
        </div>
        <PlatformSelector
          selectedPlatforms={selectedPlatforms}
          onChange={handlePlatformChange}
        />
      </div>
    </div>
  );
};
