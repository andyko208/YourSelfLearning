import { useEffect, useState } from 'react';
import { ThemeSelector } from '../components/library/ThemeSelector';
import { TopicSelector } from '../components/library/TopicSelector';
import { StorageUtils } from '../../content/storage-utils';
import { browser } from '../../../utils/browser-api';
import { THEME_TOPIC_MAP } from '../../../utils/lessons-index';

type Theme = string;

const calculateAllTopics = (selectedTopicsByTheme: Record<string, string[]>): string[] =>
  Object.values(selectedTopicsByTheme).flatMap((t) => (Array.isArray(t) ? t : []));

export const LibraryPage: React.FC = () => {
  const [selectedTheme, setSelectedTheme] = useState<Theme>('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [allSelectedTopics, setAllSelectedTopics] = useState<string[]>([]);
  const [selectedTopicsByTheme, setSelectedTopicsByTheme] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const settings = await StorageUtils.getSettings();
      const theme = (settings as any).selectedTheme ?? '';
      const topicsByTheme = (settings as any).selectedTopicsByTheme ?? {};
      const topics = topicsByTheme[theme] ?? [];
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
          const theme = s?.selectedTheme ?? '';
          const topics = s?.selectedTopicsByTheme?.[theme] ?? s?.selectedTopics ?? [];
          const topicsByTheme = s?.selectedTopicsByTheme ?? {};
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
    const topics = selectedTopicsByTheme[theme] ?? [];
    setSelectedTheme(theme);
    setSelectedTopics(topics);
  };

  const handleTopicToggle = async (topic: string) => {
    const exists = selectedTopics.includes(topic);
    const updated = exists ? selectedTopics.filter(t => t !== topic) : [...selectedTopics, topic];
    setSelectedTopics(updated);
    
    const updatedTopicsByTheme = {
      ...selectedTopicsByTheme,
      [selectedTheme]: updated
    };
    setSelectedTopicsByTheme(updatedTopicsByTheme);
    
    const allTopics = calculateAllTopics(updatedTopicsByTheme);
    setAllSelectedTopics(allTopics);
    
    await StorageUtils.updateSelectedTopics(updated);
  };

  const handleToggleAllInTheme = async () => {
    const themeTopics = THEME_TOPIC_MAP[selectedTheme] || [];
    if (themeTopics.length === 0) return;
    const allSelected = selectedTopics.length === themeTopics.length;
    const next = !allSelected
      ? [...themeTopics]
      : Math.max(0, allSelectedTopics.length - selectedTopics.length) > 0
        ? []
        : [themeTopics[0]];
    setSelectedTopics(next);
    const updated = { ...selectedTopicsByTheme, [selectedTheme]: next };
    setSelectedTopicsByTheme(updated);
    setAllSelectedTopics(calculateAllTopics(updated));
    await StorageUtils.updateSelectedTopics(next);
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: '#666' }}>Loading...</div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'flex-start', width: '100%', minHeight: '100%', gap: '12px'
    }}>
      <div style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#666', margin: '0 0 12px 0', letterSpacing: '0.5px' }}>Theme</h2>
        <ThemeSelector selectedTheme={selectedTheme} onThemeChange={handleThemeChange} />
      </div>

      <div style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', maxWidth: '440px', justifyContent: 'center', margin: '0 0 12px 0' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#666', margin: 0, letterSpacing: '0.5px' }}>Topics</h2>
          {(THEME_TOPIC_MAP[selectedTheme]?.length ?? 0) > 0 && (
            <button
              onClick={handleToggleAllInTheme}
              title={selectedTopics.length === (THEME_TOPIC_MAP[selectedTheme]?.length ?? 0) ? 'Deselect all in this theme' : 'Select all in this theme'}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                fontSize: '12px', fontWeight: 700, background: 'transparent',
                outline: 'none', border: 'none', cursor: 'pointer', color: selectedTopics.length === (THEME_TOPIC_MAP[selectedTheme]?.length ?? 0) ? '#16a34a' : '#111'
              }}
            >
              <span style={{
                display: 'inline-flex', width: '16px', height: '16px', borderRadius: '50%',
                backgroundColor: selectedTopics.length === (THEME_TOPIC_MAP[selectedTheme]?.length ?? 0) ? '#16a34a' : '#e5e7eb',
                color: selectedTopics.length === (THEME_TOPIC_MAP[selectedTheme]?.length ?? 0) ? 'white' : '#374151',
                alignItems: 'center', justifyContent: 'center', lineHeight: 1, border: '1px solid #9ca3af', cursor: 'pointer'
              }}>✓</span>
            </button>
          )}
        </div>
        <TopicSelector selectedTheme={selectedTheme} selectedTopics={selectedTopics} allSelectedTopics={allSelectedTopics} onTopicToggle={handleTopicToggle} />
      </div>
    </div>
  );
};
