interface EmojiThreshold {
  threshold: number;
  emoji: string;
}

const scrollEmojis: EmojiThreshold[] = [
  { threshold: 0, emoji: 'PepeTux.png' },
  { threshold: 5, emoji: 'PepeHands.png' },
];

const timeEmojis: EmojiThreshold[] = [
  { threshold: 0, emoji: 'PepeTux.png' },
  { threshold: 300, emoji: 'PepeHands.png' }, // 5 minutes
  { threshold: 1200, emoji: 'PepeHands.png' }, // 20 minutes
  { threshold: 3600, emoji: 'PepeHands.png' } // 1 hour
];

const lessonEmojis: EmojiThreshold[] = [
  { threshold: 0, emoji: 'PepeHands.png' },
  { threshold: 5, emoji: 'PepeTux.png' },
];

export const getEmojiForMetric = (
  value: number,
  type: 'scroll' | 'time' | 'lesson'
): string => {
  const thresholds = type === 'scroll' ? scrollEmojis :
                     type === 'time' ? timeEmojis : lessonEmojis;
  
  let selectedEmoji = thresholds[0].emoji;
  
  for (const { threshold, emoji } of thresholds) {
    if (value >= threshold) {
      selectedEmoji = emoji;
    }
  }
  
  return `/icon/emoji/${selectedEmoji}`;
};