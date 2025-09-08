import { useEffect, useState } from 'react';
import { ThemeSelector } from '../components/library/ThemeSelector';
import { TopicSelector } from '../components/library/TopicSelector';
import { StorageUtils } from '../../content/storage-utils';
import { browser } from '../../../utils/browser-api';

type Theme = 'how-to' | 'what-is' | 'why';

// Helper function to calculate all selected topics from theme-based data
const calculateAllTopics = (selectedTopicsByTheme: Record<string, string[]>): string[] => {
  const allTopics: string[] = [];
  Object.values(selectedTopicsByTheme).forEach(topics => {
    if (Array.isArray(topics)) {
      allTopics.push(...topics);
    }
  });
  return allTopics;
};

export const LibraryPage: React.FC = () => {
  const [selectedTheme, setSelectedTheme] = useState<Theme>('how-to');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [allSelectedTopics, setAllSelectedTopics] = useState<string[]>([]);
  const [selectedTopicsByTheme, setSelectedTopicsByTheme] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const settings = await StorageUtils.getSettings();
      const theme = (settings as any).selectedTheme ?? 'how-to';
      const topicsByTheme = (settings as any).selectedTopicsByTheme ?? {
        'how-to': ['control'],
        'what-is': [],
        'why': []
      };
      const topics = topicsByTheme[theme] ?? [];
      
      // Calculate all topics locally - no storage calls!
      const allTopics = calculateAllTopics(topicsByTheme);
      
      setSelectedTheme(theme);
      setSelectedTopics(topics);
      setSelectedTopicsByTheme(topicsByTheme);
      setAllSelectedTopics(allTopics);
      setLoading(false);
    };
    init();

    const onChanged = (changes: Record<string, any>, area: string) => {
      if (area !== 'local') return;
      if (changes['xscroll-data']?.newValue?.settings) {
        const updateGlobalTopics = async () => {
          const s = changes['xscroll-data'].newValue.settings;
          const theme = s?.selectedTheme ?? 'how-to';
          const topics = s?.selectedTopicsByTheme?.[theme] ?? s?.selectedTopics ?? ['control'];
          
          // Calculate all topics locally - no storage calls!
          const topicsByTheme = s?.selectedTopicsByTheme ?? {
            'how-to': ['control'],
            'what-is': [],
            'why': []
          };
          const allTopics = calculateAllTopics(topicsByTheme);
          
          setSelectedTheme(theme);
          setSelectedTopics(topics);
          setSelectedTopicsByTheme(topicsByTheme);
          setAllSelectedTopics(allTopics);
        };
        updateGlobalTopics();
      }
    };
    try { browser.storage.onChanged.addListener(onChanged as any); } catch {}
    return () => {
      try { browser.storage.onChanged.removeListener(onChanged as any); } catch {}
    };
  }, []);

  const handleThemeChange = async (theme: Theme) => {
    await StorageUtils.updateSelectedTheme(theme);
    // Use local state instead of refetching from storage
    const topics = selectedTopicsByTheme[theme] ?? [];
    setSelectedTheme(theme);
    setSelectedTopics(topics);
  };

  const handleTopicToggle = async (topic: string) => {
    const exists = selectedTopics.includes(topic);
    // Toggle - UI already prevents deselection of last topic
    const updated = exists ? selectedTopics.filter(t => t !== topic) : [...selectedTopics, topic];
    setSelectedTopics(updated);
    
    // Update local state first, then persist to storage
    const updatedTopicsByTheme = {
      ...selectedTopicsByTheme,
      [selectedTheme]: updated
    };
    setSelectedTopicsByTheme(updatedTopicsByTheme);
    
    // Calculate all topics locally - no storage calls!
    const allTopics = calculateAllTopics(updatedTopicsByTheme);
    setAllSelectedTopics(allTopics);
    
    // Persist to storage
    await StorageUtils.updateSelectedTopics(updated);
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: '#666' }}>Loading...</div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', width: '100%', minHeight: '100%', gap: '12px'
    }}>
      <div style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#666', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Theme</h2>
        <ThemeSelector selectedTheme={selectedTheme} onThemeChange={handleThemeChange} />
      </div>

      <div style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#666', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Topics</h2>
        <TopicSelector selectedTheme={selectedTheme} selectedTopics={selectedTopics} allSelectedTopics={allSelectedTopics} onTopicToggle={handleTopicToggle} />
      </div>
    </div>
  );
};


