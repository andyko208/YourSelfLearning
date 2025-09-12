import type { LessonWithShuffledAnswers } from '../../utils/lesson-parser';
import { StorageUtils } from './storage-utils';

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
  
  // Performance monitoring
  private performanceMonitor = {
    frameCount: 0,
    lastTime: performance.now(),
    fps: 60,
    lowFpsCount: 0,
    effectsEnabled: true
  };
  
  // Animation state
  private answerSelectedTime: number = 0;
  private timeBonusActive: boolean = true;
  private holdToCloseTimer: number | null = null;

  constructor(lesson: LessonWithShuffledAnswers, callbacks: LessonOverlayCallbacks) {
    this.lesson = lesson;
    this.callbacks = callbacks;
    
    // Add debug methods to global window for console testing
    (window as any).debugBonusTracker = () => StorageUtils.debugBonusTracker();
    (window as any).resetBonusTracker = () => StorageUtils.resetBonusTracker();
    
    // Start performance monitoring
    if (this.shouldUseAnimations()) {
      this.startPerformanceMonitoring();
    }
  }

  /**
   * Create and show the lesson overlay
   */
  show(): void {
    this.createOverlay();
    this.setState(LessonState.BEGIN);
    document.body.appendChild(this.overlay!);
    
    // Focus management for accessibility
    this.setupFocusTrap();
    
    // Set initial focus to first answer button
    setTimeout(() => {
      const firstAnswer = this.overlay?.querySelector('.lesson-answer') as HTMLButtonElement;
      if (firstAnswer) {
        firstAnswer.focus();
      }
    }, 100);
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
          0%, 100% { filter: drop-shadow(0 0 0 rgba(0,0,0,0.0)); }
          50% { filter: drop-shadow(0 0 10px rgba(0,0,0,0.6)); }
        }

        @keyframes successBounce {
          0% { transform: scale(1); }
          30% { transform: scale(1.06); }
          60% { transform: scale(0.98); }
          100% { transform: scale(1); }
        }
        
        @keyframes curiosityRingFill {
          0% { stroke-dashoffset: 283; }
          100% { stroke-dashoffset: 0; }
        }
        
        @keyframes sparkleGlint {
          0% { transform: scale(0) rotate(0deg); opacity: 0; }
          50% { transform: scale(1.2) rotate(180deg); opacity: 1; }
          100% { transform: scale(0) rotate(360deg); opacity: 0; }
        }
        
        @keyframes holdRingFill {
          0% { stroke-dashoffset: 283; }
          100% { stroke-dashoffset: 0; }
        }
        
        @keyframes timeBonusPulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.1); opacity: 1; }
        }
        
        @keyframes bonusNotificationPulse {
          0%, 100% { 
            transform: translateX(-50%) scale(1);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
          }
          50% { 
            transform: translateX(-50%) scale(1.05);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6);
          }
        }
        
      @keyframes blackBurst {
          0% { transform: scale(0) rotate(0deg); opacity: 1; }
          100% { transform: scale(3) rotate(720deg); opacity: 0; }
        }
        
        .xscroll-sparkle {
          position: absolute;
          width: 20px;
          height: 20px;
          pointer-events: none;
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
      <div class="lesson-panel" role="dialog" aria-labelledby="lesson-question" aria-describedby="lesson-explanation" style="
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
          <h2 id="lesson-question" class="lesson-question" style="
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
              <button class="lesson-answer" data-answer-index="${index}" aria-label="Answer option ${index + 1}: ${answer.text}" style="
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
          <div id="lesson-explanation" class="lesson-explanation" aria-live="polite" style="
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
              <div class="learn-more-wrapper" style="
                position: relative !important;
                display: inline-block !important;
              ">
                <!-- Time Bonus Notification -->
                <div class="time-bonus-notification" style="
                  position: absolute !important;
                  bottom: -45px !important;
                  left: 50% !important;
                  transform: translateX(-50%) !important;
                  background: #000000 !important;
                  color: #ffffff !important;
                  padding: 6px 12px !important;
                  border-radius: 20px !important;
                  font-size: 13px !important;
                  font-weight: 700 !important;
                  white-space: nowrap !important;
                  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
                  border: 2px solid #333333 !important;
                  opacity: 0 !important;
                  transition: opacity 0.3s ease !important;
                  z-index: 10 !important;
                  display: flex !important;
                  align-items: center !important;
                  gap: 6px !important;
                ">
                  <span style="font-size: 16px !important;">⚡</span>
                  <span class="bonus-text">QUICK CLICK: +2% Battery</span>
                  <span class="bonus-timer" style="
                    background: rgba(255, 255, 255, 0.2) !important;
                    padding: 2px 6px !important;
                    border-radius: 10px !important;
                    font-size: 12px !important;
                    min-width: 20px !important;
                    text-align: center !important;
                  ">3</span>
                </div>
                
                <a href="${this.lesson.reference}" target="_blank" class="learn-more-btn" aria-label="Learn more about this topic. Click within 3 seconds for bonus brain battery." style="
                  background: linear-gradient(145deg, rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.08)) !important;
                  color: #000000 !important;
                  text-decoration: none !important;
                  padding: 14px 28px !important;
                  border-radius: 12px !important;
                  border: 2px solid rgba(0, 0, 0, 0.08) !important;
                  font-weight: 700 !important;
                  font-size: 15px !important;
                  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
                  position: relative !important;
                  overflow: hidden !important;
                  display: inline-flex !important;
                  align-items: center !important;
                  gap: 8px !important;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.5) !important;
                  transform: scale(1) !important;
                  min-width: 160px !important;
                  justify-content: center !important;
                ">
                  <span class="learn-more-text" style="
                    position: relative !important;
                    z-index: 2 !important;
                  ">Learn More</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="
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
              </div>
              <button class="countdown-button" disabled style="
                background: linear-gradient(145deg, rgba(0, 0, 0, 0.03), rgba(0, 0, 0, 0.06)) !important;
                color: rgba(0, 0, 0, 0.4) !important;
                border: 2px solid rgba(0, 0, 0, 0.05) !important;
                padding: 14px 28px !important;
                border-radius: 12px !important;
                font-weight: 700 !important;
                font-size: 15px !important;
                cursor: not-allowed !important;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
                min-width: 160px !important;
                position: relative !important;
                overflow: hidden !important;
                opacity: 0.6 !important;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
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

    // Add close button handler with hold-to-close functionality
    const closeButton = this.overlay.querySelector('.countdown-button') as HTMLButtonElement;
    if (closeButton) {
      // Setup hold-to-close interaction once the button is enabled
      const originalClickHandler = (e: Event) => {
        if (!closeButton.disabled) {
          e.preventDefault(); // Prevent default click
        }
      };
      closeButton.addEventListener('click', originalClickHandler);
    }
    
    // Add Learn More button enhanced interactions
    const learnMoreBtn = this.overlay.querySelector('.learn-more-btn') as HTMLAnchorElement;
    const learnMoreWrapper = this.overlay.querySelector('.learn-more-wrapper') as HTMLElement;
    if (learnMoreBtn && learnMoreWrapper) {
      this.setupLearnMoreInteractions(learnMoreBtn, learnMoreWrapper);
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
  private async handleCloseClick(): Promise<void> {
    if (this.currentState !== LessonState.AFTER_COUNTDOWN) return;
    
    console.log(`🎯 Lesson completed! Tracking completion...`);
    // Track lesson completion for bonus notification logic
    await StorageUtils.incrementLessonCompletedAndCheckBonus();
    
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
        this.renderChoiceSelectedState().catch(error => {
          console.error('Error rendering choice selected state:', error);
        });
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
  private async renderChoiceSelectedState(): Promise<void> {
    if (!this.selectedAnswer) {
      return;
    }
    
    // Track answer selection time for time bonus
    this.answerSelectedTime = Date.now();
    
    // Start time bonus countdown only if bonus should be shown
    const shouldShowBonus = await StorageUtils.shouldShowTimeBonusNotification();
    console.log(`🎯 Lesson overlay: shouldShowBonus=${shouldShowBonus}`);
    if (shouldShowBonus) {
      console.log(`🎯 Starting time bonus countdown!`);
      this.startTimeBonusCountdown();
    } else {
      console.log(`🎯 No bonus this lesson`);
      // No bonus notification, so no time bonus available
      this.timeBonusActive = false;
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
      this.announceToScreenReader('Correct! Great job!');
    } else {
      this.announceToScreenReader('Incorrect. The correct answer is now highlighted.');
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
      countdownText.textContent = 'Hold 3s to Close';
      
      // Update button styling for enabled state - gradient background
      closeButton.style.setProperty('background', 'linear-gradient(145deg, rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.08))', 'important');
      closeButton.style.setProperty('color', '#000000', 'important');
      closeButton.style.setProperty('border', '2px solid rgba(0, 0, 0, 0.08)', 'important');
      closeButton.style.setProperty('cursor', 'pointer', 'important');
      closeButton.style.setProperty('opacity', '1', 'important');
      closeButton.style.setProperty('transform', 'scale(1)', 'important');
      closeButton.style.setProperty('padding', '14px 28px', 'important');
      closeButton.style.setProperty('font-size', '15px', 'important');
      closeButton.style.setProperty('font-weight', '700', 'important');
      closeButton.style.setProperty('box-shadow', '0 1px 3px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.5)', 'important');
      closeButton.style.setProperty('min-width', '160px', 'important');
      closeButton.style.setProperty('position', 'relative', 'important');
      
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
      
      // Setup hold-to-close interaction
      this.setupHoldToClose(closeButton);
      
      // Add subtle bounce animation
      setTimeout(() => {
        closeButton.style.animation = 'successBounce 2s infinite !important';
      }, 400);
    }
    
    // Make Learn More button prominent with subtle animation
    const learnMoreBtn = this.overlay?.querySelector('.learn-more-btn') as HTMLAnchorElement;
    if (learnMoreBtn) {
      learnMoreBtn.style.animation = 'none !important';
      learnMoreBtn.style.transform = 'scale(1) !important';
    }
  }

  /**
   * Add X mark for wrong answer
   */
  private addShakeAnimation(button: HTMLElement): void {
    // Add X mark indicator
    const existing = button.querySelector('.xscroll-x-mark');
    if (!existing) {
      const mark = document.createElement('span');
      mark.className = 'xscroll-x-mark';
      mark.style.cssText = `
        position: absolute !important;
        right: 14px !important;
        top: 14px !important;
        width: 22px !important;
        height: 22px !important;
        border-radius: 50% !important;
        background: #ff4444 !important;
        color: white !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-weight: 800 !important;
        font-size: 14px !important;
        box-shadow: 0 2px 8px rgba(255, 68, 68, 0.3) !important;
        transform: scale(0) !important;
        z-index: 3 !important;
        pointer-events: none !important;
        animation: xscroll-check-pop 300ms cubic-bezier(0.68, -0.55, 0.265, 1.55) 1 forwards !important;
      `;
      mark.textContent = '✕';
      button.appendChild(mark);
    }

    // Subtle shake animation on the answer text
    const content = button.querySelector('.answer-text') as HTMLElement;
    if (content) {
      content.style.removeProperty('animation');
      // Force reflow
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      (content as any).offsetHeight;
      content.style.cssText += `
        animation: xscroll-shake 400ms cubic-bezier(0.68, -0.55, 0.265, 1.55) 1 !important;
      `;
    }
  }
  /**
   * Add checkmark for correct answer
   */
  private addSuccessAnimation(button: HTMLElement): void {
    // Add checkmark indicator
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
        background: #4CAF50 !important;
        color: white !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-weight: 800 !important;
        font-size: 14px !important;
        box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3) !important;
        transform: scale(0) !important;
        z-index: 3 !important;
        pointer-events: none !important;
        animation: xscroll-check-pop 300ms cubic-bezier(0.68, -0.55, 0.265, 1.55) 1 forwards !important;
      `;
      mark.textContent = '✓';
      button.appendChild(mark);
    }

    // Subtle success animation on the answer text
    const content = button.querySelector('.answer-text') as HTMLElement;
    if (content) {
      content.style.removeProperty('animation');
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      (content as any).offsetHeight;
      content.style.cssText += `
        animation: xscroll-success-pop 350ms cubic-bezier(0.4, 0, 0.2, 1) 1 !important;
      `;
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
      background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%) !important;
      color: white !important;
      padding: 16px 32px !important;
      border-radius: 50px !important;
      font-size: 24px !important;
      font-weight: bold !important;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4) !important;
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

    // Create warm glow effect with vibrant colors
    const originalBoxShadow = panel.style.boxShadow;
    panel.animate([
      { boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)' },
      { boxShadow: '0 0 60px rgba(255, 107, 53, 0.4), 0 0 100px rgba(247, 147, 30, 0.3), 0 20px 60px rgba(0, 0, 0, 0.2)' },
      { boxShadow: '0 0 80px rgba(255, 107, 53, 0.6), 0 0 140px rgba(247, 147, 30, 0.4), 0 20px 60px rgba(0, 0, 0, 0.2)' },
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
          rgba(255, 107, 53, 0.8) 50%, 
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
   * Get vibrant celebration colors - warm, joyful colors for genuine success feeling
   */
  private getVibrantColor(): string {
    const colors = [
      '#FF6B35', // Vibrant orange
      '#F7931E', // Bright orange  
      '#FFD23F', // Golden yellow
      '#06D6A0', // Emerald green
      '#118AB2', // Ocean blue
      '#EF476F', // Coral pink
      '#FF9F1C', // Warm orange
      '#2D7DD2', // Sky blue
      '#95D5B2', // Mint green
      '#F72585', // Magenta
      '#4361EE', // Electric blue
      '#F77F00', // Amber
      '#06FFA5', // Bright mint
      '#FB5607', // Red orange
      '#FFBE0B', // Sunflower yellow
      '#8338EC', // Purple
      '#3A86FF', // Bright blue
      '#FF006E', // Hot pink
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
    
    
    // Clear hold-to-close timer
    if (this.holdToCloseTimer) {
      clearTimeout(this.holdToCloseTimer);
      this.holdToCloseTimer = null;
    }

    // Remove overlay from DOM
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }

    // Call close callback
    this.callbacks.onClose();
    
    this.overlay = null;
    this.selectedAnswer = null;
    this.answerSelectedTime = 0;
    this.timeBonusActive = true;
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
  
  /**
   * Utility: Check if user prefers reduced motion
   */
  private shouldUseAnimations(): boolean {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  
  /**
   * Utility: Throttle function for performance-sensitive operations
   */
  private throttle<T extends (...args: any[]) => void>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    let timeoutId: number | null = null;
    
    return (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCall;
      
      if (timeSinceLastCall >= delay) {
        lastCall = now;
        func(...args);
      } else {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => {
          lastCall = Date.now();
          func(...args);
        }, delay - timeSinceLastCall);
      }
    };
  }
  
  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    const checkFPS = () => {
      const now = performance.now();
      const delta = now - this.performanceMonitor.lastTime;
      
      if (delta >= 1000) {
        this.performanceMonitor.fps = Math.round((this.performanceMonitor.frameCount * 1000) / delta);
        this.performanceMonitor.frameCount = 0;
        this.performanceMonitor.lastTime = now;
        
        // Disable effects if FPS is consistently low
        if (this.performanceMonitor.fps < 30) {
          this.performanceMonitor.lowFpsCount++;
          if (this.performanceMonitor.lowFpsCount >= 3) {
            this.performanceMonitor.effectsEnabled = false;
            console.log('🎬 Disabling advanced effects due to low FPS');
          }
        } else {
          this.performanceMonitor.lowFpsCount = 0;
        }
      }
      
      this.performanceMonitor.frameCount++;
      
      if (this.overlay) {
        requestAnimationFrame(checkFPS);
      }
    };
    
    requestAnimationFrame(checkFPS);
  }
  
  /**
   * Check if advanced effects should be enabled
   */
  private shouldEnableEffects(): boolean {
    return this.performanceMonitor.effectsEnabled && this.shouldUseAnimations();
  }
  
  /**
   * Setup enhanced Learn More button interactions
   */
  private setupLearnMoreInteractions(btn: HTMLAnchorElement, wrapper: HTMLElement): void {
    // Click handler with time bonus check
    btn.addEventListener('click', async (e) => {
      const clickTime = Date.now();
      const timeSinceAnswer = clickTime - this.answerSelectedTime;
      const fastClick = timeSinceAnswer <= 3000; // Within 3 seconds
      
      // Show gold burst for fast clicks
      if (fastClick && this.shouldEnableEffects()) {
        this.showGoldBurst(btn);
        this.announceToScreenReader('Fast click! You earned 2% brain battery bonus.');
      } else if (fastClick) {
        this.announceToScreenReader('Fast click! You earned 2% brain battery bonus.');
      }
      
      try {
        await StorageUtils.rewardForLearnMore(fastClick);
      } catch (error) {
        console.error('Error rewarding learn more click:', error);
      }
    });
    
    // Enhanced hover interactions with delicious gradient
    btn.addEventListener('mouseenter', () => {
      // Enhanced gradient on hover - more pronounced and inviting
      btn.style.background = 'linear-gradient(145deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.18)) !important';
      btn.style.transform = 'scale(1.02) translateY(-1px) !important';
      btn.style.boxShadow = '0 3px 10px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.3) !important';
      btn.style.borderColor = 'rgba(0, 0, 0, 0.12) !important';
      const arrow = btn.querySelector('svg');
      if (arrow) {
        (arrow as SVGElement).style.transform = 'translate(2px, -2px) !important';
      }
    });
    
    btn.addEventListener('mouseleave', () => {
      // Reset to original gradient background
      btn.style.background = 'linear-gradient(145deg, rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.08)) !important';
      btn.style.transform = 'scale(1) !important';
      btn.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.5) !important';
      btn.style.borderColor = 'rgba(0, 0, 0, 0.08) !important';
      const arrow = btn.querySelector('svg');
      if (arrow) {
        (arrow as SVGElement).style.transform = 'translate(0, 0) !important';
      }
    });
  }
  
  /**
   * Show gold burst animation for fast clicks
   */
  private showGoldBurst(element: HTMLElement): void {
    const burst = document.createElement('div');
    burst.style.cssText = `
      position: absolute !important;
      top: 50% !important;
      left: 50% !important;
      width: 100px !important;
      height: 100px !important;
      background: radial-gradient(circle, rgba(0, 0, 0, 0.8) 0%, transparent 70%) !important;
      transform: translate(-50%, -50%) scale(0) rotate(0deg) !important;
      pointer-events: none !important;
      z-index: 10 !important;
      animation: blackBurst 0.6s ease-out forwards !important;
    `;
    
    element.appendChild(burst);
    setTimeout(() => burst.remove(), 600);
  }
  
  /**
   * Show sparkle effect
   */
  private showSparkle(element: HTMLElement): void {
    const sparkle = document.createElement('div');
    sparkle.className = 'xscroll-sparkle';
    sparkle.innerHTML = '✨';
    sparkle.style.cssText = `
      position: absolute !important;
      top: -10px !important;
      right: -10px !important;
      font-size: 24px !important;
      animation: sparkleGlint 0.6s ease-out forwards !important;
      pointer-events: none !important;
      z-index: 10 !important;
    `;
    
    element.appendChild(sparkle);
    setTimeout(() => sparkle.remove(), 600);
  }
  
  
  /**
   * Start time bonus countdown
   */
  private startTimeBonusCountdown(): void {
    const timeBonusNotification = this.overlay?.querySelector('.time-bonus-notification') as HTMLElement;
    const bonusTimer = this.overlay?.querySelector('.bonus-timer') as HTMLElement;
    
    // Show the notification
    if (timeBonusNotification) {
      timeBonusNotification.style.opacity = '1';
      
      // Animate notification entrance with bounce
      timeBonusNotification.animate([
        { transform: 'translateX(-50%) translateY(-10px) scale(0.8)', opacity: 0 },
        { transform: 'translateX(-50%) translateY(0) scale(1.1)', opacity: 1 },
        { transform: 'translateX(-50%) translateY(0) scale(1)', opacity: 1 }
      ], {
        duration: 400,
        easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      });
      
      // Add continuous pulse animation
      setTimeout(() => {
        timeBonusNotification.style.animation = 'bonusNotificationPulse 1s ease-in-out infinite !important';
      }, 400);
    }
    
    
    // Countdown timer for notification
    let timeLeft = 3;
    const countdownInterval = setInterval(() => {
      timeLeft--;
      if (bonusTimer) {
        bonusTimer.textContent = timeLeft.toString();
        
        // Pulse animation on timer update
        bonusTimer.animate([
          { transform: 'scale(1)' },
          { transform: 'scale(1.2)' },
          { transform: 'scale(1)' }
        ], {
          duration: 200,
          easing: 'ease-in-out'
        });
      }
      
      if (timeLeft <= 0) {
        clearInterval(countdownInterval);
        this.timeBonusActive = false;
        
        // Hide notification with fade out
        if (timeBonusNotification) {
          timeBonusNotification.style.opacity = '0';
        }
      }
    }, 1000);
  }
  
  /**
   * Setup focus trap for accessibility
   */
  private setupFocusTrap(): void {
    if (!this.overlay) return;
    
    const focusableElements = this.overlay.querySelectorAll(
      'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    );
    
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    // Handle Tab key for focus trap
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };
    
    // Handle Escape key to close
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.currentState === LessonState.AFTER_COUNTDOWN) {
        this.handleCloseClick();
      }
    };
    
    this.overlay.addEventListener('keydown', handleTabKey);
    this.overlay.addEventListener('keydown', handleEscapeKey);
  }
  
  /**
   * Announce messages to screen readers
   */
  private announceToScreenReader(message: string): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.style.cssText = `
      position: absolute !important;
      left: -10000px !important;
      width: 1px !important;
      height: 1px !important;
      overflow: hidden !important;
    `;
    announcement.textContent = message;
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      announcement.remove();
    }, 1000);
  }
  
  /**
   * Setup hold-to-close interaction for Close button with progressive background darkening
   */
  private setupHoldToClose(button: HTMLButtonElement): void {
    let isHolding = false;
    let holdStartTime = 0;
    let animationFrame: number | null = null;
    const originalBackground = 'linear-gradient(145deg, rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.08))';
    const originalText = button.querySelector('.countdown-text')?.textContent || 'Hold 3s to Close';
    const countdownText = button.querySelector('.countdown-text') as HTMLElement;
    
    // Add hover effect for close button with gradient
    const addHoverEffect = () => {
      if (button.disabled || isHolding) return;
      button.style.background = 'linear-gradient(145deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.18)) !important';
      button.style.transform = 'scale(1.02) !important';
      button.style.boxShadow = '0 3px 10px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.3) !important';
    };
    
    const removeHoverEffect = () => {
      if (button.disabled || isHolding) return;
      button.style.background = originalBackground + ' !important';
      button.style.transform = 'scale(1) !important';
      button.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.5) !important';
    };
    
    const startHold = () => {
      if (button.disabled) return;
      
      isHolding = true;
      holdStartTime = Date.now();
      button.style.transform = 'scale(0.98) !important';
      
      // Progressive background darkening animation
      const animate = () => {
        if (!isHolding) return;
        
        const elapsed = Date.now() - holdStartTime;
        const progress = Math.min(elapsed / 3000, 1); // 3000ms (3 seconds) to complete
        
        // Calculate darkness based on progress - gradient gets darker
        const startOpacity = 0.02 + (progress * 0.5); // 0.02 to 0.52
        const endOpacity = 0.08 + (progress * 0.72);  // 0.08 to 0.8
        button.style.background = `linear-gradient(145deg, rgba(0, 0, 0, ${startOpacity}), rgba(0, 0, 0, ${endOpacity})) !important`;
        
        // Update text color to white as background darkens
        if (endOpacity > 0.4) {
          button.style.color = '#ffffff !important';
        }
        
        // Update countdown text to show remaining time
        const remainingSeconds = Math.ceil(3 - (progress * 3));
        if (countdownText && remainingSeconds > 0) {
          countdownText.textContent = `Hold ${remainingSeconds}s...`;
        }
        
        if (progress >= 1) {
          // Hold complete - trigger close
          this.handleCloseClick();
          releaseHold();
        } else {
          animationFrame = requestAnimationFrame(animate);
        }
      };
      
      animationFrame = requestAnimationFrame(animate);
    };
    
    const releaseHold = () => {
      isHolding = false;
      button.style.transform = 'scale(1) !important';
      button.style.background = originalBackground + ' !important';
      button.style.color = '#000000 !important';
      button.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.5) !important';
      
      // Restore original text
      if (countdownText) {
        countdownText.textContent = originalText;
      }
      
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }
    };
    
    // Hover effects
    button.addEventListener('mouseenter', addHoverEffect);
    button.addEventListener('mouseleave', () => {
      removeHoverEffect();
      if (isHolding) {
        releaseHold();
      }
    });
    
    // Mouse events
    button.addEventListener('mousedown', startHold);
    button.addEventListener('mouseup', releaseHold);
    
    // Touch events
    button.addEventListener('touchstart', startHold);
    button.addEventListener('touchend', releaseHold);
    button.addEventListener('touchcancel', releaseHold);
    
    // Keyboard support (Enter key)
    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !button.disabled) {
        this.handleCloseClick();
      }
    });
    
    // Add aria-label
    button.setAttribute('aria-label', 'Hold for 3 seconds to close lesson - button will darken as you hold');
  }
}
