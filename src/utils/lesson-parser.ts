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

class LessonParser {
  private lessons: Lesson[] = [];
  private loaded = false;

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
   * Load lessons from public directory
   */
  async loadLessons(): Promise<void> {
    try {
      const lessonUrl = browser.runtime.getURL('lessons/how-to-control.tsv' as any);
      const response = await fetch(lessonUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to load lessons: ${response.status} ${response.statusText}`);
      }
      
      const content = await response.text();
      this.lessons = this.parseTSV(content);
      this.loaded = true;
      
      // console.log(`Loaded ${this.lessons.length} lessons from TSV file`);
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