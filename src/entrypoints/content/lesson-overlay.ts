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
    // Add animation keyframes if not already present
    if (!document.getElementById('xscroll-lesson-animations')) {
      const style = document.createElement('style');
      style.id = 'xscroll-lesson-animations';
      style.textContent = `
        @keyframes xscroll-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-5px); }
          40% { transform: translateX(5px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }

        @keyframes xscroll-success-pop {
          0% { transform: scale(1); }
          40% { transform: scale(1.08); }
          70% { transform: scale(0.98); }
          100% { transform: scale(1); }
        }

        @keyframes xscroll-success-glow {
          0% { box-shadow: 0 4px 10px rgba(86, 171, 47, 0.2); }
          50% { box-shadow: 0 10px 25px rgba(86, 171, 47, 0.45); }
          100% { box-shadow: 0 6px 15px rgba(86, 171, 47, 0.3); }
        }

        @keyframes xscroll-check-pop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }

        @keyframes pulseGlow {
          0%, 100% { filter: drop-shadow(0 0 0 rgba(102,126,234,0.0)); }
          50% { filter: drop-shadow(0 0 10px rgba(102,126,234,0.6)); }
        }

        @keyframes successBounce {
          0% { transform: scale(1); }
          30% { transform: scale(1.06); }
          60% { transform: scale(0.98); }
          100% { transform: scale(1); }
        }
      `;
      document.head.appendChild(style);
    }

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
                background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%) !important;
                border: 2px solid transparent !important;
                border-radius: 16px !important;
                padding: 24px 28px !important;
                font-size: 17px !important;
                font-weight: 600 !important;
                color:rgb(0, 0, 0) !important;
                cursor: pointer !important;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
                text-align: left !important;
                position: relative !important;
                overflow: hidden !important;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
                border-color: transparent !important;
                transform: translateY(0) scale(1) !important;
                will-change: transform !important;
              ">
                <span style="
                  position: relative !important;
                  z-index: 2 !important;
                  display: flex !important;
                  align-items: center !important;
                  gap: 12px !important;
                ">
                  <span class="answer-text">${answer.text}</span>
                </span>
                <span class="answer-ripple" style="
                  position: absolute !important;
                  top: 50% !important;
                  left: 50% !important;
                  transform: translate(-50%, -50%) !important;
                  width: 0 !important;
                  height: 0 !important;
                  border-radius: 50% !important;
                  background: rgba(58, 134, 255, 0.3) !important;
                  pointer-events: none !important;
                  opacity: 0 !important;
                "></span>
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
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                color: white !important;
                text-decoration: none !important;
                padding: 16px 32px !important;
                border-radius: 12px !important;
                font-weight: 700 !important;
                font-size: 16px !important;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
                position: relative !important;
                overflow: hidden !important;
                display: inline-flex !important;
                align-items: center !important;
                gap: 8px !important;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4) !important;
                transform: scale(1) !important;
                animation: pulseGlow 2s infinite !important;
              ">
                <span class="learn-more-text" style="
                  position: relative !important;
                  z-index: 2 !important;
                ">Learn More</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="
                  position: relative !important;
                  z-index: 2 !important;
                  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                ">
                  <path d="M7 7h10v10"/>
                  <path d="M7 17L17 7"/>
                </svg>
                <span class="learn-more-shimmer" style="
                  position: absolute !important;
                  top: 0 !important;
                  left: -100% !important;
                  width: 100% !important;
                  height: 100% !important;
                  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent) !important;
                  animation: shimmer 3s infinite !important;
                "></span>
              </a>
              <button class="countdown-button" disabled style="
                background: rgba(108, 117, 125, 0.1) !important;
                color: #6c757d !important;
                border: 2px solid rgba(108, 117, 125, 0.2) !important;
                padding: 12px 20px !important;
                border-radius: 8px !important;
                font-weight: 600 !important;
                font-size: 13px !important;
                cursor: not-allowed !important;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
                min-width: 100px !important;
                position: relative !important;
                overflow: hidden !important;
                opacity: 0.7 !important;
              ">
                <span class="countdown-text" style="
                  position: relative !important;
                  z-index: 2 !important;
                ">5</span>
                <span class="countdown-progress" style="
                  position: absolute !important;
                  bottom: 0 !important;
                  left: 0 !important;
                  width: 100% !important;
                  height: 3px !important;
                  background: rgba(108, 117, 125, 0.3) !important;
                  transform-origin: left !important;
                  transform: scaleX(1) !important;
                  transition: transform 5s linear !important;
                "></span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add answer click handlers and advanced interactions
    const answerButtons = this.overlay.querySelectorAll('.lesson-answer');
    answerButtons.forEach((button, index) => {
      const htmlButton = button as HTMLButtonElement;
      
      // Click handler
      htmlButton.addEventListener('click', this.handleAnswerClick.bind(this));
      
      // Magnetic hover effect
      htmlButton.addEventListener('mouseenter', (e) => {
        if (this.currentState !== LessonState.BEGIN) return;
        
        // Enhance hover state with higher specificity CSS text
        htmlButton.style.cssText += `
          transform: translateY(-2px) scale(1.02) !important;
          box-shadow: 0 8px 16px rgba(24, 26, 30, 0.15), 0 3px 6px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
          border-color: rgba(11, 13, 14, 0.3) !important;
          background: linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%) !important;
        `;

        // Add subtle rotation based on mouse position
        htmlButton.addEventListener('mousemove', this.handleMagneticHover);
      });
      
      // Mouse leave
      htmlButton.addEventListener('mouseleave', (e) => {
        if (this.currentState !== LessonState.BEGIN) return;
        
        // Reset hover state
        htmlButton.style.cssText += `
          transform: translateY(0) scale(1) !important;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
          border-color: transparent !important;
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%) !important;
        `;
        htmlButton.removeEventListener('mousemove', this.handleMagneticHover);
      });
    });

    // Add close button handler (initially disabled)
    const closeButton = this.overlay.querySelector('.countdown-button') as HTMLButtonElement;
    if (closeButton) {
      closeButton.addEventListener('click', this.handleCloseClick.bind(this));
      
      // Add hover effects for enabled state
      closeButton.addEventListener('mouseenter', () => {
        if (!closeButton.disabled) {
          closeButton.style.transform = 'scale(1.05) !important';
          closeButton.style.boxShadow = '0 6px 20px rgba(40, 167, 69, 0.3) !important';
        }
      });
      
      closeButton.addEventListener('mouseleave', () => {
        if (!closeButton.disabled) {
          closeButton.style.transform = 'scale(1) !important';
          closeButton.style.boxShadow = 'none !important';
        }
      });
    }
    
    // Add Learn More button enhanced interactions
    const learnMoreBtn = this.overlay.querySelector('.learn-more-btn') as HTMLAnchorElement;
    if (learnMoreBtn) {
      learnMoreBtn.addEventListener('mouseenter', () => {
        learnMoreBtn.style.transform = 'scale(1.05) translateY(-2px) !important';
        learnMoreBtn.style.boxShadow = '0 8px 30px rgba(102, 126, 234, 0.6) !important';
        const arrow = learnMoreBtn.querySelector('svg');
        if (arrow) {
          (arrow as SVGElement).style.transform = 'translate(3px, -3px) !important';
        }
      });

    }
  }

  /**
   * Handle answer selection
   */
  private handleAnswerClick(event: Event): void {
    if (this.currentState !== LessonState.BEGIN) {
      return;
    }

    const button = event.currentTarget as HTMLButtonElement;
    const answerIndex = parseInt(button.dataset.answerIndex || '0');
    
    this.selectedAnswer = this.lesson.answers[answerIndex];
    
    // Mark the selected button for animation targeting
    button.setAttribute('data-selected', 'true');
    
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
      buttonElement.style.setProperty('background', 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)', 'important');
      buttonElement.style.setProperty('border-color', 'transparent', 'important');
      buttonElement.style.setProperty('color', '#2c3e50', 'important');
      buttonElement.style.setProperty('transform', 'translateY(0) scale(1)', 'important');
      buttonElement.style.setProperty('opacity', '1', 'important');
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
    if (!this.selectedAnswer) {
      return;
    }

    // Disable all answer buttons
    const answerButtons = this.overlay?.querySelectorAll('.lesson-answer');
    answerButtons?.forEach(button => {
      (button as HTMLButtonElement).disabled = true;
    });

    // Apply visual feedback with enhanced animations
    answerButtons?.forEach((button, index) => {
      const answer = this.lesson.answers[index];
      const buttonElement = button as HTMLButtonElement;
      
      if (answer.isCorrect) {
        // Add success checkmark animation
        this.addSuccessAnimation(buttonElement);
      }
      else {
        this.addShakeAnimation(buttonElement);
      }
    });

    // Show confetti for correct answers
    if (this.selectedAnswer.isCorrect) {
      this.showConfetti();
      // Add encouraging message
      this.showEncouragementMessage();
    }

    // Show explanation with entrance animation
    const explanation = this.overlay?.querySelector('.lesson-explanation') as HTMLElement;
    if (explanation) {
      
      // Force override any existing CSS rules that might be hiding it
      explanation.style.setProperty('display', 'block', 'important');
      explanation.style.setProperty('visibility', 'visible', 'important');
      explanation.style.setProperty('opacity', '0', 'important');
      explanation.style.setProperty('transform', 'translateY(20px)', 'important');
      
      // Ensure all child elements are visible and properly styled
      const learnMoreBtn = explanation.querySelector('.learn-more-btn') as HTMLElement;
      const countdownButton = explanation.querySelector('.countdown-button') as HTMLElement;
      
      if (learnMoreBtn) {
        learnMoreBtn.style.setProperty('display', 'inline-flex', 'important');
        learnMoreBtn.style.setProperty('visibility', 'visible', 'important');
        learnMoreBtn.style.setProperty('opacity', '1', 'important');
      }
      
      if (countdownButton) {
        countdownButton.style.setProperty('display', 'inline-block', 'important');
        countdownButton.style.setProperty('visibility', 'visible', 'important');
        countdownButton.style.setProperty('opacity', '0.7', 'important');
      }
            
      // Animate in with more aggressive styling
      setTimeout(() => {
        explanation.style.setProperty('transition', 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)', 'important');
        explanation.style.setProperty('opacity', '1', 'important');
        explanation.style.setProperty('transform', 'translateY(0)', 'important');
        
        // Double-check child elements are still visible after animation
        if (learnMoreBtn) {
          learnMoreBtn.style.setProperty('opacity', '1', 'important');
        }
        if (countdownButton) {
          countdownButton.style.setProperty('opacity', '0.7', 'important');
        }
        
      }, 300);
    }

    // Start countdown with enhanced visuals
    this.startCountdown();
  }

  /**
   * Render state after countdown completes
   */
  private renderAfterCountdownState(): void {
    const closeButton = this.overlay?.querySelector('.countdown-button') as HTMLButtonElement;
    const countdownText = this.overlay?.querySelector('.countdown-text') as HTMLElement;
    const countdownProgress = this.overlay?.querySelector('.countdown-progress') as HTMLElement;
    
    if (closeButton && countdownText) {
      // Remove countdown animation
      closeButton.style.animation = 'none !important';
      
      // Enable and transform the button
      closeButton.disabled = false;
      countdownText.textContent = 'Close';
      
      // Update button styling for enabled state
      closeButton.style.setProperty('background', 'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)', 'important');
      closeButton.style.setProperty('color', 'white', 'important');
      closeButton.style.setProperty('border', 'none', 'important');
      closeButton.style.setProperty('cursor', 'pointer', 'important');
      closeButton.style.setProperty('opacity', '1', 'important');
      closeButton.style.setProperty('transform', 'scale(1)', 'important');
      closeButton.style.setProperty('padding', '14px 28px', 'important');
      closeButton.style.setProperty('font-size', '15px', 'important');
      closeButton.style.setProperty('font-weight', '700', 'important');
      closeButton.style.setProperty('box-shadow', '0 4px 15px rgba(86, 171, 47, 0.3)', 'important');
      closeButton.style.setProperty('min-width', '160px', 'important');
      
      // Hide progress bar
      if (countdownProgress) {
        countdownProgress.style.display = 'none !important';
      }
      
      // Add entrance animation for the enabled button
      closeButton.animate([
        { transform: 'scale(0.9)', opacity: 0.5 },
        { transform: 'scale(1.1)', opacity: 1 },
        { transform: 'scale(1)', opacity: 1 }
      ], {
        duration: 400,
        easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      });
      
      // Add subtle bounce animation
      setTimeout(() => {
        closeButton.style.animation = 'successBounce 2s infinite !important';
      }, 400);
    }
    
    // Make Learn More button even more prominent
    const learnMoreBtn = this.overlay?.querySelector('.learn-more-btn') as HTMLAnchorElement;
    if (learnMoreBtn) {
      learnMoreBtn.style.animation = 'pulseGlow 1.5s infinite !important';
      learnMoreBtn.style.transform = 'scale(1.05) !important';
    }
  }

  /**
   * Add shake animation for wrong answer
   */
  private addShakeAnimation(button: HTMLElement): void {
    // Prefer animating inner content to avoid conflicts with parent transform !important
    const content = (button.querySelector('span') as HTMLElement) || button;

    // Emphasize wrong selection styles
    button.style.cssText += `
      border-color: rgba(220, 53, 69, 0.6) !important;
      background: linear-gradient(135deg, #fff5f5 0%, #ffe3e3 100%) !important;
      color: #842029 !important;
    `;

    // Restart animation reliably
    content.style.removeProperty('animation');
    // Force reflow
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    (content as any).offsetHeight;
    content.style.cssText += `
      animation: xscroll-shake 500ms cubic-bezier(0.68, -0.55, 0.265, 1.55) 1 !important;
    `;
  }
  /**
   * Add success animation for correct answer
   */
  private addSuccessAnimation(button: HTMLElement): void {
    // Visual success styling
    button.style.cssText += `
      border-color: rgba(40, 167, 69, 0.7) !important;
      background: linear-gradient(135deg, #e8f7ed 0%, #d4f3e1 100%) !important;
      color: #0f5132 !important;
    `;

    // Pop/glow animations on inner content to avoid transform conflicts
    const content = (button.querySelector('span') as HTMLElement) || button;
    content.style.removeProperty('animation');
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    (content as any).offsetHeight;
    content.style.cssText += `
      animation: xscroll-success-pop 350ms cubic-bezier(0.4, 0, 0.2, 1) 1 !important;
    `;

    // Glow on button itself
    button.style.removeProperty('animation');
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    (button as any).offsetHeight;
    button.style.cssText += `
      animation: xscroll-success-glow 700ms ease 1 !important;
    `;

    // Add checkmark badge
    const existing = button.querySelector('.xscroll-checkmark');
    if (!existing) {
      const mark = document.createElement('span');
      mark.className = 'xscroll-checkmark';
      mark.style.cssText = `
        position: absolute !important;
        right: 14px !important;
        top: 14px !important;
        width: 22px !important;
        height: 22px !important;
        border-radius: 50% !important;
        background: linear-gradient(135deg, #56ab2f 0%, #a8e063 100%) !important;
        color: white !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-weight: 800 !important;
        font-size: 14px !important;
        box-shadow: 0 6px 18px rgba(86, 171, 47, 0.35) !important;
        transform: scale(0) !important;
        z-index: 3 !important;
        pointer-events: none !important;
        animation: xscroll-check-pop 260ms cubic-bezier(0.68, -0.55, 0.265, 1.55) 1 forwards !important;
      `;
      mark.textContent = '✓';
      button.appendChild(mark);
    }
  }

  /**
   * Show encouraging message for correct answers
   */
  private showEncouragementMessage(): void {
    const messages = [
      '🎯 Brilliant!',
      '⚡ Excellent!',
      '🌟 Outstanding!',
      '💫 Superb!',
      '🎉 Fantastic!'
    ];
    
    const message = messages[Math.floor(Math.random() * messages.length)];
    const messageEl = document.createElement('div');
    messageEl.style.cssText = `
      position: fixed !important;
      top: 20% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) scale(0) !important;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
      color: white !important;
      padding: 16px 32px !important;
      border-radius: 50px !important;
      font-size: 24px !important;
      font-weight: bold !important;
      box-shadow: 0 10px 40px rgba(102, 126, 234, 0.4) !important;
      z-index: 2147483649 !important;
      pointer-events: none !important;
    `;
    messageEl.textContent = message;
    
    document.body.appendChild(messageEl);
    
    // Animate in and out
    messageEl.animate([
      { transform: 'translate(-50%, -50%) scale(0) rotate(-10deg)', opacity: 0 },
      { transform: 'translate(-50%, -50%) scale(1.1) rotate(5deg)', opacity: 1 },
      { transform: 'translate(-50%, -50%) scale(1) rotate(0)', opacity: 1 },
      { transform: 'translate(-50%, -50%) scale(1) rotate(0)', opacity: 1 },
      { transform: 'translate(-50%, -50%) scale(0.9) rotate(-5deg)', opacity: 0 }
    ], {
      duration: 2000,
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    });
    
    setTimeout(() => messageEl.remove(), 2000);
  }

  /**
   * Show advanced confetti animation with multiple layers of celebration
   */
  private showConfetti(): void {
    // Create multiple celebration layers for depth
    this.createFireworkBurst();
    this.createConfettiRain();
    this.createSuccessPulse();
    this.createStarburst();
  }

  /**
   * Create an initial firework burst from the selected answer
   */
  private createFireworkBurst(): void {
    const selectedButton = this.overlay?.querySelector('.lesson-answer[data-selected="true"]');
    if (!selectedButton) return;

    const rect = selectedButton.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const burstContainer = document.createElement('div');
    burstContainer.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      pointer-events: none !important;
      z-index: 2147483648 !important;
    `;

    // Create burst particles
    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div');
      const angle = (360 / 20) * i;
      const velocity = 300 + Math.random() * 200;
      
      particle.style.cssText = `
        position: absolute !important;
        width: 6px !important;
        height: 6px !important;
        background: ${this.getVibrantColor()} !important;
        border-radius: 50% !important;
        left: ${centerX}px !important;
        top: ${centerY}px !important;
        box-shadow: 0 0 6px currentColor !important;
      `;

      // Animate with physics-based motion
      const animation = particle.animate([
        { 
          transform: 'translate(0, 0) scale(1)',
          opacity: 1
        },
        {
          transform: `translate(${Math.cos(angle * Math.PI / 180) * velocity}px, 
                               ${Math.sin(angle * Math.PI / 180) * velocity}px) scale(0)`,
          opacity: 0
        }
      ], {
        duration: 800,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      });

      burstContainer.appendChild(particle);
    }

    document.body.appendChild(burstContainer);
    setTimeout(() => burstContainer.remove(), 1000);
  }

  /**
   * Create physics-based confetti rain
   */
  private createConfettiRain(): void {
    const confettiContainer = document.createElement('div');
    confettiContainer.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      pointer-events: none !important;
      overflow: hidden !important;
      z-index: 2147483647 !important;
    `;
    
    // Create different confetti shapes
    const shapes = ['square', 'rectangle', 'circle', 'triangle'];
    const confettiCount = 60;
    
    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div');
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      const size = 4 + Math.random() * 8;
      const color = this.getVibrantColor();
      const startX = Math.random() * 100;
      const wobble = 30 + Math.random() * 30;
      const rotationSpeed = 200 + Math.random() * 400;
      const fallDuration = 2000 + Math.random() * 2000;
      const delay = Math.random() * 500;
      
      let shapeStyle = '';
      if (shape === 'triangle') {
        shapeStyle = `
          width: 0 !important;
          height: 0 !important;
          border-left: ${size/2}px solid transparent !important;
          border-right: ${size/2}px solid transparent !important;
          border-bottom: ${size}px solid ${color} !important;
          background: transparent !important;
        `;
      } else if (shape === 'rectangle') {
        shapeStyle = `
          width: ${size * 1.5}px !important;
          height: ${size}px !important;
          background: ${color} !important;
        `;
      } else if (shape === 'circle') {
        shapeStyle = `
          width: ${size}px !important;
          height: ${size}px !important;
          border-radius: 50% !important;
          background: ${color} !important;
        `;
      } else {
        shapeStyle = `
          width: ${size}px !important;
          height: ${size}px !important;
          background: ${color} !important;
        `;
      }
      
      confetti.style.cssText = `
        position: absolute !important;
        left: ${startX}% !important;
        top: -20px !important;
        ${shapeStyle}
        opacity: 0.9 !important;
      `;

      // Create complex animation with wobble and rotation
      const keyframes = [
        { 
          transform: 'translateY(0) translateX(0) rotate(0deg)',
          opacity: 0.9
        },
        { 
          transform: `translateY(${window.innerHeight + 20}px) translateX(${wobble}px) rotate(${rotationSpeed}deg)`,
          opacity: 0
        }
      ];

      const animation = confetti.animate(keyframes, {
        duration: fallDuration,
        delay: delay,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      });

      confettiContainer.appendChild(confetti);
    }
    
    document.body.appendChild(confettiContainer);
    setTimeout(() => confettiContainer.remove(), 5000);
  }

  /**
   * Create a success pulse effect on the panel
   */
  private createSuccessPulse(): void {
    const panel = this.overlay?.querySelector('.lesson-panel') as HTMLElement;
    if (!panel) return;

    // Create glow effect
    const originalBoxShadow = panel.style.boxShadow;
    panel.animate([
      { boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)' },
      { boxShadow: '0 0 80px rgba(76, 175, 80, 0.6), 0 20px 60px rgba(0, 0, 0, 0.3)' },
      { boxShadow: '0 0 120px rgba(76, 175, 80, 0.8), 0 20px 60px rgba(0, 0, 0, 0.3)' },
      { boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)' }
    ], {
      duration: 1000,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    });

    // Add scaling pulse
    panel.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(1.02)' },
      { transform: 'scale(1)' }
    ], {
      duration: 400,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    });
  }

  /**
   * Create starburst effect behind the panel
   */
  private createStarburst(): void {
    const starburstContainer = document.createElement('div');
    starburstContainer.style.cssText = `
      position: fixed !important;
      top: 50% !important;
      left: 50% !important;
      width: 0 !important;
      height: 0 !important;
      pointer-events: none !important;
      z-index: 2147483646 !important;
    `;

    // Create rotating stars
    for (let i = 0; i < 8; i++) {
      const star = document.createElement('div');
      const angle = (360 / 8) * i;
      
      star.style.cssText = `
        position: absolute !important;
        width: 4px !important;
        height: 200px !important;
        background: linear-gradient(to bottom, 
          transparent 0%, 
          rgba(255, 215, 0, 0.8) 50%, 
          transparent 100%) !important;
        transform-origin: center !important;
        transform: rotate(${angle}deg) !important;
        opacity: 0 !important;
      `;

      star.animate([
        { 
          opacity: 0,
          transform: `rotate(${angle}deg) scaleY(0)`
        },
        { 
          opacity: 0.8,
          transform: `rotate(${angle}deg) scaleY(1)`
        },
        { 
          opacity: 0,
          transform: `rotate(${angle + 90}deg) scaleY(0)`
        }
      ], {
        duration: 1500,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
      });

      starburstContainer.appendChild(star);
    }

    this.overlay?.insertBefore(starburstContainer, this.overlay.firstChild);
    setTimeout(() => starburstContainer.remove(), 2000);
  }

  /**
   * Get vibrant celebration colors
   */
  private getVibrantColor(): string {
    const colors = [
      '#FF006E', // Pink
      '#FB5607', // Orange
      '#FFBE0B', // Yellow
      '#8338EC', // Purple
      '#3A86FF', // Blue
      '#06FFB4', // Teal
      '#FF4365', // Coral
      '#00F5FF', // Cyan
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }



  /**
   * Start 5-second countdown animation with enhanced visuals
   */
  private startCountdown(): void {
    const closeButton = this.overlay?.querySelector('.countdown-button') as HTMLButtonElement;
    const countdownText = this.overlay?.querySelector('.countdown-text') as HTMLElement;
    const countdownProgress = this.overlay?.querySelector('.countdown-progress') as HTMLElement;
    
    if (!closeButton || !countdownText) return;

    let count = 5;
    countdownText.textContent = count.toString();
    
    // Start progress bar animation
    if (countdownProgress) {
      countdownProgress.style.transform = 'scaleX(0) !important';
      countdownProgress.style.transition = 'transform 5s linear !important';
    }
    
    // Add pulsing effect during countdown
    closeButton.style.animation = 'countdownPulse 1s infinite !important';
    
    // Add countdown pulse keyframes
    if (!document.getElementById('countdown-pulse-animation')) {
      const style = document.createElement('style');
      style.id = 'countdown-pulse-animation';
      style.textContent = `
        @keyframes countdownPulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    this.countdownTimer = window.setInterval(() => {
      count--;
      if (count > 0) {
        countdownText.textContent = count.toString();
        
        // Add number change animation
        countdownText.animate([
          { transform: 'scale(1.2)', opacity: 0.5 },
          { transform: 'scale(1)', opacity: 1 }
        ], {
          duration: 300,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
        });
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
   * Handle magnetic hover effect
   */
  private handleMagneticHover = (e: MouseEvent): void => {
    const button = e.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const deltaX = (x - centerX) / centerX;
    const deltaY = (y - centerY) / centerY;
    
    const rotateX = deltaY * -2;
    const rotateY = deltaX * 2;
    
    button.style.transform = `
      translateY(-2px) 
      scale(1.02) 
      rotateX(${rotateX}deg) 
      rotateY(${rotateY}deg)
      perspective(1000px) !important`;
  };

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