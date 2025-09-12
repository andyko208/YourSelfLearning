import React, { useEffect, useRef, useState } from 'react';
import { THEME_TOPIC_MAP } from '../../../../utils/lessons-index';

type Theme = string;

interface TopicSelectorProps {
  selectedTheme: Theme;
  selectedTopics: string[];
  allSelectedTopics: string[]; // Global topics across all themes
  onTopicToggle: (topic: string) => void;
}

export const TopicSelector: React.FC<TopicSelectorProps> = ({ selectedTheme, selectedTopics, allSelectedTopics, onTopicToggle }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [showArrows, setShowArrows] = useState(false);
  const [canScroll, setCanScroll] = useState({ canScrollLeft: false, canScrollRight: false });
  const scrollRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<{ rafId: number | null; target: number; velocity: number }>({ rafId: null, target: 0, velocity: 0 });

  // Get only topics from the selected theme
  const currentThemeTopics = THEME_TOPIC_MAP[selectedTheme] || [];

  // Use GLOBAL topic count for deselection prevention
  const canDeselectTopic = (topicToCheck: string): boolean => {
    // If this topic is not selected, we can always "toggle" it (i.e., select it)
    if (!selectedTopics.includes(topicToCheck)) {
      return true;
    }
    
    // If this topic is selected, check what would happen if we removed it GLOBALLY
    const globalTopicsAfterRemoval = allSelectedTopics.filter(t => t !== topicToCheck);
    const wouldHaveZeroTopicsGlobally = globalTopicsAfterRemoval.length === 0;
    // Prevent deselection only if it would leave us with 0 topics GLOBALLY
    return !wouldHaveZeroTopicsGlobally;
  };

  const checkScroll = () => {
    if (!scrollRef.current) return { canScrollLeft: false, canScrollRight: false };
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    const canScrollLeft = scrollLeft > 0;
    const canScrollRight = scrollLeft < scrollWidth - clientWidth - 5;
    return { canScrollLeft, canScrollRight };
  };

  useEffect(() => {
    const handleScroll = () => {
      setCanScroll(checkScroll());
    };

    const el = scrollRef.current;
    if (el) {
      animRef.current.target = el.scrollLeft;
      animRef.current.velocity = 0;
      el.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll(); // Initial check
    }

    return () => {
      el?.removeEventListener('scroll', handleScroll);
    };
  }, [currentThemeTopics]);

  // Cleanup any pending animation on unmount
  useEffect(() => {
    return () => {
      const rafId = animRef.current.rafId;
      if (rafId != null) cancelAnimationFrame(rafId);
      animRef.current.rafId = null;
    };
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
    scrollRef.current.style.cursor = 'grabbing';
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const endDrag = () => {
    if (!scrollRef.current) return;
    setIsDragging(false);
    scrollRef.current.style.cursor = 'grab';
  };

  const scrollBy = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = 132;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  // Allow vertical wheel to scroll horizontally with smoothing, but preserve native horizontal swipes
  const onWheel = (e: React.WheelEvent) => {
    const el = scrollRef.current;
    if (!el) return;

    const { deltaX, deltaY } = e;
    // If the gesture is primarily horizontal, let the browser handle it for smooth trackpad swipes
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Native horizontal scrolling is smooth; do not interfere
      // Also cancel our custom animation to avoid fighting momentum
      if (animRef.current.rafId != null) {
        cancelAnimationFrame(animRef.current.rafId);
        animRef.current.rafId = null;
      }
      animRef.current.target = el.scrollLeft;
      animRef.current.velocity = 0;
      return;
    }

    // Otherwise, map vertical scroll to horizontal
    if (deltaY !== 0) {
      e.preventDefault();
      const maxLeft = el.scrollWidth - el.clientWidth;
      // Kinetic model: accumulate velocity and apply friction per frame for snappy, smooth motion
      const SENS = 2.6;     // sensitivity multiplier (higher = faster)
      const FRICTION = 0.92; // velocity retention per frame
      const MIN_VEL = 0.3;   // stop threshold

      animRef.current.velocity += deltaY * SENS;

      if (animRef.current.rafId == null) {
        const tick = () => {
          const node = scrollRef.current;
          if (!node) { animRef.current.rafId = null; animRef.current.velocity = 0; return; }
          let next = node.scrollLeft + animRef.current.velocity;
          // Clamp to bounds and kill velocity at edges
          if (next < 0) { next = 0; animRef.current.velocity = 0; }
          else if (next > maxLeft) { next = maxLeft; animRef.current.velocity = 0; }
          node.scrollLeft = next;
          setCanScroll(checkScroll());

          // Apply friction and continue if above threshold
          animRef.current.velocity *= FRICTION;
          if (Math.abs(animRef.current.velocity) < MIN_VEL) {
            animRef.current.velocity = 0;
            animRef.current.rafId = null;
            return;
          }
          animRef.current.rafId = requestAnimationFrame(tick);
        };
        animRef.current.rafId = requestAnimationFrame(tick);
      }
    }
  };

  // Keyboard support for accessibility: arrow keys to scroll
  const onKeyDown = (e: React.KeyboardEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = 132;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      el.scrollBy({ left: -amount, behavior: 'smooth' });
      setCanScroll(checkScroll());
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      el.scrollBy({ left: amount, behavior: 'smooth' });
      setCanScroll(checkScroll());
    }
  };

  const handleTopicClick = (topic: string) => {
    if (isDragging) return;
    
    const canToggleThisTopic = canDeselectTopic(topic);
    if (canToggleThisTopic) {
      onTopicToggle(topic);
    }
  };

  return (
    <div 
      style={{
        position: 'relative',
        width: 'fit-content',
        maxWidth: '100%',
        backgroundColor: '#f5f5f5',
        border: '2px solid black',
        borderRadius: '24px',
        padding: '14px'
      }}
      onMouseEnter={() => setShowArrows(true)}
      onMouseLeave={() => { setShowArrows(false); endDrag(); }}
    >
      {/* Left Arrow */}
      <button
        onClick={() => scrollBy('left')}
        style={{
          position: 'absolute', left: '-2px', top: '50%', transform: 'translateY(-50%)', height: '120px',
          backgroundColor: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', zIndex: 10, opacity: showArrows && canScroll.canScrollLeft ? 0.8 : 0,
          visibility: showArrows && canScroll.canScrollLeft ? 'visible' : 'hidden', transition: 'opacity 0.2s ease, visibility 0.2s ease', padding: 0, outline: 'none'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = showArrows && canScroll.canScrollLeft ? '0.8' : '0')}
      >
        <svg width="16" height="24" viewBox="0 0 16 24" fill="none">
          <path d="M12 18L6 12L12 6" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Scrollable topics */}
      <div
        ref={scrollRef}
        style={{
          display: 'flex', gap: '8px', overflowX: 'auto', overflowY: 'hidden', scrollBehavior: 'smooth', cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none', maxWidth: '394px', scrollbarWidth: 'none', msOverflowStyle: 'none', outline: 'none'

        }}
        tabIndex={0}
        role="region"
        aria-label="Topic selector"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
      >
        {currentThemeTopics.map((topic) => {
          const isSelected = selectedTopics.includes(topic);
          const canToggleThisTopic = canDeselectTopic(topic);
          const isProtectedTopic = isSelected && !canToggleThisTopic;

          return (
            <div
              key={topic}  
              onClick={() => handleTopicClick(topic)}
              title={isProtectedTopic ? 'At least one topic must be selected globally' : ''}
              style={{
                minWidth: '120px', width: '120px', height: '100px',
                backgroundColor: 'white',
                border: `3px solid ${isSelected ? '#4CAF50' : 'black'}`,
                borderRadius: '16px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                cursor: canToggleThisTopic ? 'pointer' : 'not-allowed',
                opacity: isProtectedTopic ? 0.6 : 1,
                transition: 'all 0.2s ease', position: 'relative',
                boxShadow: isSelected ? '0 4px 8px rgba(76, 175, 80, 0.2)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (canToggleThisTopic && !isSelected) e.currentTarget.style.backgroundColor = '#f9f9f9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              {isSelected && (
                <div style={{
                  position: 'absolute', top: '6px', right: '6px', width: '22px', height: '22px',
                  backgroundColor: isProtectedTopic ? '#ccc' : '#4CAF50',
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: '14px', fontWeight: 'bold',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>✓</div>
              )}
              <div style={{
                fontSize: '13px', fontWeight: 500,
                color: isSelected ? (isProtectedTopic ? '#666' : '#4CAF50') : 'black',
                textAlign: 'center'
              }}>
                {topic.replace(/\b\w/g, (c) => c.toUpperCase())}
              </div>
            </div>
          );
        })}
      </div>

      {/* Right Arrow */}
      <button
        onClick={() => scrollBy('right')}
        style={{
          position: 'absolute', right: '-2px', top: '50%', transform: 'translateY(-50%)', height: '120px', backgroundColor: 'transparent',
          border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10,
          opacity: showArrows && canScroll.canScrollRight ? 0.8 : 0, visibility: showArrows && canScroll.canScrollRight ? 'visible' : 'hidden',
          transition: 'opacity 0.2s ease, visibility 0.2s ease', padding: 0, outline: 'none'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = showArrows && canScroll.canScrollRight ? '0.8' : '0')}
      >
        <svg width="16" height="24" viewBox="0 0 16 24" fill="none">
          <path d="M4 18L10 12L4 6" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <style>{`div::-webkit-scrollbar{display:none;}`}</style>
    </div>
  );
};
