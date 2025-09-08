import { browser } from './browser-api';

export interface Lesson {
  question: string;
  correctAnswer: string;
  wrongAnswer: string;
  explanation: string;
  reference: string;
}

export interface LessonWithShuffledAnswers extends Lesson {
  answers: {
    text: string;
    isCorrect: boolean;
  }[];
}

export const THEME_TOPIC_MAP: Record<'how-to' | 'what-is' | 'why', string[]> = {
  'how-to': ['control', 'learn', 'speak', 'feel'],
  'what-is': ['money', 'relationship', 'life', 'art'],
  'why': ['survive', 'love', 'hate', 'suffer']
};

export const TOPIC_DESCRIPTIONS: Record<string, string> = {
  control: 'Practical ways to control impulses and attention.',
  learn: 'Tactics to accelerate learning efficiently.',
  speak: 'Tips to communicate with clarity and impact.',
  feel: 'Understanding and managing emotions effectively.',
  money: 'Core concepts behind money and value.',
  relationship: 'Foundations of healthy relationships.',
  life: 'Mental models for navigating life.',
  art: 'Appreciation and understanding of creative expression.',
  survive: 'Reasons and strategies for resilience.',
  love: 'Why love shapes choices and behavior.',
  hate: 'Understanding aversion and its effects.',
  suffer: 'Making sense of pain and hardship.'
};

class LessonParser {
  private lessons: Lesson[] = [];
  private loaded = false;
  private loadedKey: string | null = null; // theme|topic1,topic2 cache key

  /**
   * Parse TSV content into lesson objects
   */
  private parseTSV(content: string): Lesson[] {
    const lines = content.trim().split('\n');
    
    // Skip header line
    const dataLines = lines.slice(1);
    
    return dataLines.map((line) => {
      const columns = line.split('\t');
      
      if (columns.length < 5) {
        throw new Error(`Invalid TSV format: expected 5 columns, got ${columns.length}`);
      }
      
      return {
        question: columns[0].trim(),
        correctAnswer: columns[1].trim(),
        wrongAnswer: columns[2].trim(),
        explanation: columns[3].trim(),
        reference: columns[4].trim()
      };
    });
  }

  /**
   * Build lesson file path
   */
  private getLessonFilePath(theme: 'how-to' | 'what-is' | 'why', topic: string): string {
    const slug = `${theme}-${topic}.tsv`;
    return `lessons/${slug}` as any;
  }

  /**
   * Load lessons for specific topics
   */
  async loadLessons(topics?: { theme: 'how-to' | 'what-is' | 'why'; topics: string[] }): Promise<void> {
    try {
      const theme = topics?.theme ?? 'how-to';
      const topicList = topics?.topics?.length ? topics.topics : ['control'];
      const cacheKey = `${theme}|${topicList.sort().join(',')}`;
      if (this.loaded && this.loadedKey === cacheKey) {
        return;
      }

      const allLessons: Lesson[] = [];
      for (const topic of topicList) {
        const url = browser.runtime.getURL(this.getLessonFilePath(theme, topic));
        try {
          const resp = await fetch(url);
          if (resp.ok) {
            const txt = await resp.text();
            allLessons.push(...this.parseTSV(txt));
          }
        } catch (e) {
          // Skip missing files gracefully
        }
      }

      // If no lessons loaded (e.g., missing files), build a guaranteed fallback from first topic of theme
      if (allLessons.length === 0) {
        const fallbackTopic = THEME_TOPIC_MAP[theme][0];
        const fallbackUrl = browser.runtime.getURL(`lessons/${theme}-${fallbackTopic}.tsv` as any);
        const fallbackResp = await fetch(fallbackUrl);
        const content = await fallbackResp.text();
        this.lessons = this.parseTSV(content);
      } else {
        this.lessons = allLessons;
      }

      this.loaded = true;
      this.loadedKey = cacheKey;
    } catch (error) {
      console.error('Error loading lessons:', error);
      throw error;
    }
  }

  /**
   * Get a random lesson from the loaded pool
   */
  getRandomLesson(): Lesson {
    if (!this.loaded || this.lessons.length === 0) {
      throw new Error('Lessons not loaded. Call loadLessons() first.');
    }
    
    // If a single topic selected with a single row, always return that one
    if (this.lessons.length === 1) {
      return this.lessons[0];
    }
    const randomIndex = Math.floor(Math.random() * this.lessons.length);
    return this.lessons[randomIndex];
  }

  /**
   * Shuffle answers for display (randomize correct/incorrect position)
   */
  shuffleAnswers(lesson: Lesson): LessonWithShuffledAnswers {
    const answers = [
      { text: lesson.correctAnswer, isCorrect: true },
      { text: lesson.wrongAnswer, isCorrect: false }
    ];
    
    // Fisher-Yates shuffle
    for (let i = answers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [answers[i], answers[j]] = [answers[j], answers[i]];
    }
    
    return {
      ...lesson,
      answers
    };
  }

  /**
   * Get a random lesson with shuffled answers ready for display
   */
  getRandomLessonForDisplay(): LessonWithShuffledAnswers {
    const lesson = this.getRandomLesson();
    return this.shuffleAnswers(lesson);
  }

  /**
   * Get total number of loaded lessons
   */
  getLessonCount(): number {
    return this.lessons.length;
  }

  /**
   * Check if lessons are loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }
}

// Export singleton instance
export const lessonParser = new LessonParser();