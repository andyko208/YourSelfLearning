import type { LessonWithShuffledAnswers } from '../../utils/lesson-parser';

export enum LessonState {
  BEGIN = 'BEGIN',
  CHOICE_SELECTED = 'CHOICE_SELECTED', 
  AFTER_COUNTDOWN = 'AFTER_COUNTDOWN'
}

export interface LessonOverlayCallbacks {
  onLessonComplete: () => void;
  onClose: () => void;
}

export class LessonOverlay {
  private overlay: HTMLElement | null = null;
  private currentState: LessonState = LessonState.BEGIN;
  private lesson: LessonWithShuffledAnswers;
  private callbacks: LessonOverlayCallbacks;
  private countdownTimer: number | null = null;
  private selectedAnswer: { text: string; isCorrect: boolean } | null = null;

  constructor(lesson: LessonWithShuffledAnswers, callbacks: LessonOverlayCallbacks) {
    this.lesson = lesson;
    this.callbacks = callbacks;
  }

  /**
   * Create and show the lesson overlay
   */
  show(): void {
    this.createOverlay();
    this.setState(LessonState.BEGIN);
    document.body.appendChild(this.overlay!);
  }

  /**
   * Create the overlay DOM structure
   */
  private createOverlay(): void {
    this.overlay = document.createElement('div');
    this.overlay.className = 'lesson-overlay';
    
    // Add inline styles to ensure overlay displays properly (bypasses CSS injection issues)
    this.overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgb(0, 0, 0) !important;
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      z-index: 2147483647 !important;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
    `;
    
    this.overlay.innerHTML = `
      <div class="lesson-panel" style="
        background: white !important;
        border-radius: 20px !important;
        padding: 40px !important;
        max-width: 600px !important;
        width: 90% !important;
        max-height: 80vh !important;
        overflow-y: auto !important;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
        text-align: center !important;
      ">
        <div class="lesson-content">
          <h2 class="lesson-question" style="
            font-size: 24px !important;
            font-weight: 700 !important;
            color: #333 !important;
            margin: 0 0 30px 0 !important;
            line-height: 1.4 !important;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
          ">${this.lesson.question}</h2>
          <div class="lesson-answers" style="
            display: flex !important;
            flex-direction: column !important;
            gap: 15px !important;
            margin-bottom: 30px !important;
          ">
            ${this.lesson.answers.map((answer, index) => `
              <button class="lesson-answer" data-answer-index="${index}" style="
                background: #f8f9fa !important;
                border: 2px solid #e9ecef !important;
                border-radius: 12px !important;
                padding: 20px !important;
                font-size: 16px !important;
                font-weight: 600 !important;
                color: #495057 !important;
                cursor: pointer !important;
                transition: all 0.2s ease !important;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
                text-align: left !important;
              ">
                ${answer.text}
              </button>
            `).join('')}
          </div>
          <div class="lesson-explanation" style="
            display: none;
            margin-top: 20px !important;
            padding: 20px !important;
            background: #f8f9fa !important;
            border-radius: 12px !important;
            border-left: 4px solid #007bff !important;
          ">
            <p class="explanation-text" style="
              font-size: 16px !important;
              color: #495057 !important;
              margin: 0 0 20px 0 !important;
              line-height: 1.5 !important;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
            ">${this.lesson.explanation}</p>
            <div class="lesson-actions" style="
              display: flex !important;
              justify-content: center !important;
              align-items: center !important;
              gap: 20px !important;
              flex-wrap: wrap !important;
            ">
              <a href="${this.lesson.reference}" target="_blank" class="learn-more-btn" style="
                background: #007bff !important;
                color: white !important;
                text-decoration: none !important;
                padding: 12px 24px !important;
                border-radius: 8px !important;
                font-weight: 600 !important;
                font-size: 14px !important;
                transition: all 0.2s ease !important;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
              ">
                Learn More
              </a>
              <button class="countdown-button" disabled style="
                background: #6c757d !important;
                color: white !important;
                border: none !important;
                padding: 12px 24px !important;
                border-radius: 8px !important;
                font-weight: 600 !important;
                font-size: 14px !important;
                cursor: not-allowed !important;
                transition: all 0.2s ease !important;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
                min-width: 80px !important;
              ">
                5
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add answer click handlers
    const answerButtons = this.overlay.querySelectorAll('.lesson-answer');
    answerButtons.forEach(button => {
      button.addEventListener('click', this.handleAnswerClick.bind(this));
    });

    // Add close button handler (initially disabled)
    const closeButton = this.overlay.querySelector('.countdown-button');
    closeButton?.addEventListener('click', this.handleCloseClick.bind(this));
  }

  /**
   * Handle answer selection
   */
  private handleAnswerClick(event: Event): void {
    if (this.currentState !== LessonState.BEGIN) return;

    const button = event.target as HTMLButtonElement;
    const answerIndex = parseInt(button.dataset.answerIndex || '0');
    this.selectedAnswer = this.lesson.answers[answerIndex];
    
    this.setState(LessonState.CHOICE_SELECTED);
  }

  /**
   * Handle close button click
   */
  private handleCloseClick(): void {
    if (this.currentState !== LessonState.AFTER_COUNTDOWN) return;
    
    this.callbacks.onLessonComplete();
    this.cleanup();
  }

  /**
   * Set the current UI state and update display
   */
  private setState(state: LessonState): void {
    this.currentState = state;
    
    switch (state) {
      case LessonState.BEGIN:
        this.renderBeginState();
        break;
      case LessonState.CHOICE_SELECTED:
        this.renderChoiceSelectedState();
        break;
      case LessonState.AFTER_COUNTDOWN:
        this.renderAfterCountdownState();
        break;
    }
  }

  /**
   * Render the initial state with question and answers
   */
  private renderBeginState(): void {
    // Reset all answer buttons
    const answerButtons = this.overlay?.querySelectorAll('.lesson-answer');
    answerButtons?.forEach(button => {
      const buttonElement = button as HTMLButtonElement;
      buttonElement.disabled = false;
      // Reset to original styles
      buttonElement.style.background = '#f8f9fa !important';
      buttonElement.style.borderColor = '#e9ecef !important';
      buttonElement.style.color = '#495057 !important';
    });

    // Hide explanation
    const explanation = this.overlay?.querySelector('.lesson-explanation') as HTMLElement;
    if (explanation) {
      explanation.style.display = 'none';
    }
  }

  /**
   * Render state after user selects an answer
   */
  private renderChoiceSelectedState(): void {
    if (!this.selectedAnswer) return;

    // Disable all answer buttons
    const answerButtons = this.overlay?.querySelectorAll('.lesson-answer');
    answerButtons?.forEach(button => {
      (button as HTMLButtonElement).disabled = true;
    });

    // Apply visual feedback
    answerButtons?.forEach((button, index) => {
      const answer = this.lesson.answers[index];
      const buttonElement = button as HTMLButtonElement;
      if (answer.isCorrect) {
        buttonElement.style.background = '#d4edda !important';
        buttonElement.style.borderColor = '#28a745 !important';
        buttonElement.style.color = '#155724 !important';
      } else if (answer === this.selectedAnswer) {
        buttonElement.style.background = '#f8d7da !important';
        buttonElement.style.borderColor = '#dc3545 !important';
        buttonElement.style.color = '#721c24 !important';
      }
    });

    // Show confetti for correct answers
    if (this.selectedAnswer.isCorrect) {
      this.showConfetti();
    }

    // Show explanation
    const explanation = this.overlay?.querySelector('.lesson-explanation') as HTMLElement;
    if (explanation) {
      explanation.style.display = 'block';
    }

    // Start countdown
    this.startCountdown();
  }

  /**
   * Render state after countdown completes
   */
  private renderAfterCountdownState(): void {
    const closeButton = this.overlay?.querySelector('.countdown-button') as HTMLButtonElement;
    if (closeButton) {
      closeButton.disabled = false;
      closeButton.textContent = 'Close';
      closeButton.style.background = '#28a745 !important';
      closeButton.style.cursor = 'pointer !important';
    }
  }

  /**
   * Show confetti animation for correct answers
   */
  private showConfetti(): void {
    const confettiContainer = document.createElement('div');
    confettiContainer.style.cssText = `
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      pointer-events: none !important;
      overflow: hidden !important;
    `;
    
    // Create multiple confetti pieces
    for (let i = 0; i < 30; i++) {
      const confetti = document.createElement('div');
      confetti.style.cssText = `
        position: absolute !important;
        width: 8px !important;
        height: 8px !important;
        border-radius: 50% !important;
        left: ${Math.random() * 100}% !important;
        background-color: ${this.getRandomColor()} !important;
        animation: confettiFall 3s linear forwards !important;
        animation-delay: ${Math.random() * 2}s !important;
      `;
      confettiContainer.appendChild(confetti);
    }
    
    // Add keyframes for confetti animation
    if (!document.getElementById('confetti-keyframes')) {
      const style = document.createElement('style');
      style.id = 'confetti-keyframes';
      style.textContent = `
        @keyframes confettiFall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    this.overlay?.appendChild(confettiContainer);
    
    // Remove confetti after animation
    setTimeout(() => {
      confettiContainer.remove();
    }, 3000);
  }

  /**
   * Get random color for confetti
   */
  private getRandomColor(): string {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#fd79a8'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Start 5-second countdown animation
   */
  private startCountdown(): void {
    const closeButton = this.overlay?.querySelector('.countdown-button') as HTMLButtonElement;
    if (!closeButton) return;

    let count = 5;
    closeButton.textContent = count.toString();
    
    this.countdownTimer = window.setInterval(() => {
      count--;
      if (count > 0) {
        closeButton.textContent = count.toString();
      } else {
        // Countdown complete
        if (this.countdownTimer) {
          clearInterval(this.countdownTimer);
          this.countdownTimer = null;
        }
        this.setState(LessonState.AFTER_COUNTDOWN);
      }
    }, 1000);
  }

  /**
   * Clean up and remove overlay
   */
  cleanup(): void {
    // Clear countdown timer
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }

    // Remove overlay from DOM
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }

    // Call close callback
    this.callbacks.onClose();
    
    this.overlay = null;
    this.selectedAnswer = null;
  }

  /**
   * Get current state
   */
  getCurrentState(): LessonState {
    return this.currentState;
  }

  /**
   * Force cleanup (for emergency situations)
   */
  forceCleanup(): void {
    this.cleanup();
  }
}