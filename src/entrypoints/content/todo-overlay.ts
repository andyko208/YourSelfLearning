import type { TodoItem } from '../../utils/storage';
import { browser } from '../../utils/browser-api';
import { StorageUtils } from './storage-utils';
import { todoService } from '../popup/services/todo-service';

export enum TodoState {
  BEGIN = 'BEGIN',
  TASK_SELECTED = 'TASK_SELECTED',
  AFTER_COUNTDOWN = 'AFTER_COUNTDOWN'
}

export interface TodoOverlayCallbacks {
  onTodoComplete: () => void;
  onClose: () => void;
}

export class TodoOverlay {
  private overlay: HTMLElement | null = null;
  private currentState: TodoState = TodoState.BEGIN;
  private todos: TodoItem[];
  private isGeneralTodos: boolean = false;
  private callbacks: TodoOverlayCallbacks;
  private countdownTimer: number | null = null;
  private selectedTask: TodoItem | null = null;

  // Performance monitoring
  private performanceMonitor = {
    frameCount: 0,
    lastTime: performance.now(),
    fps: 60,
    lowFpsCount: 0,
    effectsEnabled: true
  };

  // Animation state
  private holdToCloseTimer: number | null = null;

  // General todos for when user has no personal todos
  private static readonly GENERAL_TODOS: TodoItem[] = [
    {
      id: 'general-drink-water',
      title: '💧 Drink a glass of water',
      completed: false,
      createdAt: Date.now()
    },
    {
      id: 'general-stretch',
      title: '🧘‍♀️ Take a quick stretch break',
      completed: false,
      createdAt: Date.now()
    },
    {
      id: 'general-breathe',
      title: '🌬️ Take 3 deep breaths',
      completed: false,
      createdAt: Date.now()
    },
    {
      id: 'general-stand-up',
      title: '🪑 Stand up and walk around',
      completed: false,
      createdAt: Date.now()
    },
    {
      id: 'general-mindful',
      title: '🧠 Practice 1 minute of mindfulness',
      completed: false,
      createdAt: Date.now()
    }
  ];

  constructor(todos: TodoItem[], callbacks: TodoOverlayCallbacks, isGeneralTodos: boolean = false) {
    this.todos = todos.length > 0 ? todos : TodoOverlay.GENERAL_TODOS.slice(0, 3);
    this.isGeneralTodos = todos.length === 0 || isGeneralTodos;
    this.callbacks = callbacks;

    // Start performance monitoring
    if (this.shouldUseAnimations()) {
      this.startPerformanceMonitoring();
    }
  }

  /**
   * Create and show the todo overlay
   */
  show(): void {
    this.createOverlay();
    this.setState(TodoState.BEGIN);
    document.body.appendChild(this.overlay!);

    // Focus management for accessibility
    this.setupFocusTrap();

    // Set initial focus to first todo button
    setTimeout(() => {
      const firstTodo = this.overlay?.querySelector('.todo-item') as HTMLButtonElement;
      if (firstTodo) {
        firstTodo.focus();
      }
    }, 100);
  }

  /**
   * Create the overlay DOM structure
   */
  private createOverlay(): void {
    // Add animation keyframes if not already present
    if (!document.getElementById('xscroll-todo-animations')) {
      const style = document.createElement('style');
      style.id = 'xscroll-todo-animations';
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

        @keyframes xscroll-check-pop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes successBounce {
          0% { transform: scale(1); }
          30% { transform: scale(1.06); }
          60% { transform: scale(0.98); }
          100% { transform: scale(1); }
        }

        @keyframes countdownPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `;
      document.head.appendChild(style);
    }

    this.overlay = document.createElement('div');
    this.overlay.className = 'todo-overlay';

    // Add inline styles to ensure overlay displays properly
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
      <div class="todo-panel" role="dialog" aria-labelledby="todo-title" aria-describedby="todo-description" style="
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
        <div class="todo-content">
          <h2 id="todo-title" class="todo-title" style="
            font-size: 24px !important;
            font-weight: 700 !important;
            color: #333 !important;
            margin: 0 0 30px 0 !important;
            line-height: 1.4 !important;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
          ">${this.isGeneralTodos ? '🌟 Quick Wellness Break' : '📝 Todo Reminder'}</h2>
          <p id="todo-description" style="
            font-size: 16px !important;
            color: #666 !important;
            margin: 0 0 30px 0 !important;
            line-height: 1.5 !important;
          ">${this.isGeneralTodos ? 'Take a moment for a quick wellness activity:' : 'Take a moment to complete a task from your todo list:'}</p>
          <div class="todo-items" style="
            display: flex !important;
            flex-direction: column !important;
            gap: 15px !important;
            margin-bottom: 30px !important;
          ">
            ${this.todos.slice(0, 3).map((todo, index) => `
              <button class="todo-item" data-todo-id="${todo.id}" aria-label="Mark task as complete: ${todo.title}" style="
                background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%) !important;
                border: 2px solid transparent !important;
                border-radius: 16px !important;
                padding: 24px 28px !important;
                font-size: 17px !important;
                font-weight: 600 !important;
                color: rgb(0, 0, 0) !important;
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
                  <span class="todo-checkbox" style="
                    width: 20px !important;
                    height: 20px !important;
                    border: 2px solid #9ca3af !important;
                    border-radius: 6px !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    color: transparent !important;
                    font-size: 12px !important;
                  ">✓</span>
                  <span class="todo-text">${todo.title}</span>
                </span>
              </button>
            `).join('')}
          </div>
          <div id="todo-explanation" class="todo-explanation" aria-live="polite" style="
            display: none;
            margin-top: 20px !important;
            padding: 20px !important;
            background: #f8f9fa !important;
            border-radius: 12px !important;
            border-left: 4px solid #007bff !important;
          ">
            
            <div class="todo-actions" style="
              display: flex !important;
              justify-content: center !important;
              align-items: center !important;
              gap: 20px !important;
              flex-wrap: wrap !important;
            ">
              <button type="button" class="back-button" aria-label="Go back to your previous tab" style="
                background: linear-gradient(145deg, rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.08)) !important;
                color: #000000 !important;
                border: 2px solid rgba(0, 0, 0, 0.08) !important;
                padding: 14px 28px !important;
                border-radius: 12px !important;
                font-weight: 700 !important;
                font-size: 15px !important;
                cursor: pointer !important;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
                display: inline-flex !important;
                align-items: center !important;
                gap: 10px !important;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.5) !important;
                min-width: 200px !important;
                justify-content: center !important;
              ">
                <span class="back-button-icon" aria-hidden="true" style="font-size: 18px !important;">↩︎</span>
                <span class="back-button-text">Back to previous tab</span>
              </button>
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

    // Add todo click handlers
    const todoButtons = this.overlay.querySelectorAll('.todo-item');
    todoButtons.forEach((button) => {
      const htmlButton = button as HTMLButtonElement;

      // Click handler
      htmlButton.addEventListener('click', this.handleTodoClick.bind(this));

      // Hover effects
      htmlButton.addEventListener('mouseenter', (e) => {
        if (this.currentState !== TodoState.BEGIN) return;
        htmlButton.style.cssText += `
          transform: translateY(-2px) scale(1.02) !important;
          box-shadow: 0 8px 16px rgba(24, 26, 30, 0.15), 0 3px 6px rgba(0, 0, 0, 0.08) !important;
          border-color: rgba(11, 13, 14, 0.3) !important;
          background: linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%) !important;
        `;
      });

      htmlButton.addEventListener('mouseleave', (e) => {
        if (this.currentState !== TodoState.BEGIN) return;
        htmlButton.style.cssText += `
          transform: translateY(0) scale(1) !important;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.06) !important;
          border-color: transparent !important;
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%) !important;
        `;
      });
    });

    // Add back button interactions
    const backButton = this.overlay.querySelector('.back-button') as HTMLButtonElement;
    if (backButton) {
      this.setupBackButton(backButton);
    }
  }

  /**
   * Handle todo selection
   */
  private async handleTodoClick(event: Event): Promise<void> {
    if (this.currentState !== TodoState.BEGIN) {
      return;
    }

    const button = event.currentTarget as HTMLButtonElement;
    const todoId = button.dataset.todoId;

    if (!todoId) return;

    this.selectedTask = this.todos.find(todo => todo.id === todoId) || null;

    if (!this.selectedTask) return;

    // Mark the selected button for animation targeting
    button.setAttribute('data-selected', 'true');

    // Mark task as completed in storage and sync to backend
    if (!this.isGeneralTodos) {
      // For personal todos, update local storage and sync to backend
      try {
        await StorageUtils.toggleTodo(todoId);
        // Also sync to backend if user is authenticated
        await todoService.markTodoCompleted(todoId);
      } catch (error) {
        console.error('Failed to toggle todo:', error);
      }
    } else {
      // For general todos, just sync to backend with a unique identifier
      try {
        // Create a unique identifier for this general todo instance
        const generalTodoId = `general-${todoId}-${Date.now()}`;
        await todoService.syncCompletedTodo({
          id: generalTodoId,
          title: this.selectedTask!.title,
          completed: true,
          createdAt: Date.now()
        });
      } catch (error) {
        console.error('Failed to sync general todo to backend:', error);
      }
    }

    this.setState(TodoState.TASK_SELECTED);
  }

  /**
   * Handle close button click
   */
  private async handleCloseClick(): Promise<void> {
    if (this.currentState !== TodoState.AFTER_COUNTDOWN) return;
    await this.finalizeTodoAndClose();
  }

  private async handleBackNavigation(): Promise<void> {
    if (!this.overlay || this.currentState === TodoState.BEGIN) {
      return;
    }

    try {
      await browser.runtime.sendMessage({
        type: 'NAVIGATE_TO_PREVIOUS_TAB'
      });
    } catch (error) {
      console.error('Failed to request previous tab navigation:', error);
    }
  }

  private async finalizeTodoAndClose(): Promise<void> {
    if (!this.overlay) return;

    try {
      await StorageUtils.incrementLessonCompletedAndCheckBonus();
    } catch (error) {
      console.error('Error updating lesson completion bonus:', error);
    }

    this.callbacks.onTodoComplete();
    this.cleanup();
  }

  /**
   * Set the current UI state and update display
   */
  private setState(state: TodoState): void {
    this.currentState = state;

    switch (state) {
      case TodoState.BEGIN:
        this.renderBeginState();
        break;
      case TodoState.TASK_SELECTED:
        this.renderTaskSelectedState().catch(error => {
          console.error('Error rendering task selected state:', error);
        });
        break;
      case TodoState.AFTER_COUNTDOWN:
        this.renderAfterCountdownState();
        break;
    }
  }

  /**
   * Render the initial state with todo items
   */
  private renderBeginState(): void {
    // Reset all todo buttons
    const todoButtons = this.overlay?.querySelectorAll('.todo-item');
    todoButtons?.forEach(button => {
      const buttonElement = button as HTMLButtonElement;
      buttonElement.disabled = false;
      buttonElement.style.setProperty('background', 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)', 'important');
      buttonElement.style.setProperty('border-color', 'transparent', 'important');
      buttonElement.style.setProperty('color', '#2c3e50', 'important');
      buttonElement.style.setProperty('transform', 'translateY(0) scale(1)', 'important');
      buttonElement.style.setProperty('opacity', '1', 'important');
    });

    // Hide explanation
    const explanation = this.overlay?.querySelector('.todo-explanation') as HTMLElement;
    if (explanation) {
      explanation.style.display = 'none';
    }
  }

  /**
   * Render state after user selects a task
   */
  private async renderTaskSelectedState(): Promise<void> {
    if (!this.selectedTask) {
      return;
    }

    // Disable all todo buttons
    const todoButtons = this.overlay?.querySelectorAll('.todo-item');
    todoButtons?.forEach(button => {
      (button as HTMLButtonElement).disabled = true;
    });

    // Apply visual feedback with animations
    todoButtons?.forEach((button, index) => {
      const buttonElement = button as HTMLButtonElement;
      const todoId = buttonElement.dataset.todoId;

      if (todoId === this.selectedTask?.id) {
        // Add success checkmark animation
        this.addSuccessAnimation(buttonElement);
      } else {
        // Fade out other tasks
        buttonElement.style.opacity = '0.5';
      }
    });

    // Show confetti for task completion
    this.showConfetti();
    this.showEncouragementMessage();
    this.announceToScreenReader('Task completed! Great job!');

    // Show explanation with entrance animation
    const explanation = this.overlay?.querySelector('.todo-explanation') as HTMLElement;
    if (explanation) {
      explanation.style.setProperty('display', 'block', 'important');
      explanation.style.setProperty('visibility', 'visible', 'important');
      explanation.style.setProperty('opacity', '0', 'important');
      explanation.style.setProperty('transform', 'translateY(20px)', 'important');

      // Ensure child elements are visible
      const backButton = explanation.querySelector('.back-button') as HTMLElement;
      const countdownButton = explanation.querySelector('.countdown-button') as HTMLElement;

      if (backButton) {
        backButton.style.setProperty('display', 'inline-flex', 'important');
        backButton.style.setProperty('visibility', 'visible', 'important');
        backButton.style.setProperty('opacity', '1', 'important');
      }

      if (countdownButton) {
        countdownButton.style.setProperty('display', 'inline-block', 'important');
        countdownButton.style.setProperty('visibility', 'visible', 'important');
        countdownButton.style.setProperty('opacity', '0.7', 'important');
      }

      // Animate in
      setTimeout(() => {
        explanation.style.setProperty('transition', 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)', 'important');
        explanation.style.setProperty('opacity', '1', 'important');
        explanation.style.setProperty('transform', 'translateY(0)', 'important');
      }, 300);
    }

    // Start countdown
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
      // Enable and transform the button
      closeButton.disabled = false;
      countdownText.textContent = 'Hold 3s to Close';

      // Update button styling for enabled state
      closeButton.style.setProperty('background', 'linear-gradient(145deg, rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.08))', 'important');
      closeButton.style.setProperty('color', '#000000', 'important');
      closeButton.style.setProperty('border', '2px solid rgba(0, 0, 0, 0.08)', 'important');
      closeButton.style.setProperty('cursor', 'pointer', 'important');
      closeButton.style.setProperty('opacity', '1', 'important');

      // Hide progress bar
      if (countdownProgress) {
        countdownProgress.style.display = 'none !important';
      }

      // Setup hold-to-close interaction
      this.setupHoldToClose(closeButton);

      // Add bounce animation
      setTimeout(() => {
        closeButton.style.animation = 'successBounce 2s infinite !important';
      }, 400);
    }
  }

  /**
   * Add checkmark for completed task
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

    // Update checkbox to completed state
    const checkbox = button.querySelector('.todo-checkbox') as HTMLElement;
    if (checkbox) {
      checkbox.style.background = '#4CAF50';
      checkbox.style.borderColor = '#4CAF50';
      checkbox.style.color = 'white';
    }

    // Success animation on the task text
    const content = button.querySelector('.todo-text') as HTMLElement;
    if (content) {
      content.style.cssText += `
        animation: xscroll-success-pop 350ms cubic-bezier(0.4, 0, 0.2, 1) 1 !important;
        text-decoration: line-through !important;
        color: #6b7280 !important;
      `;
    }
  }

  /**
   * Show encouraging message for task completion
   */
  private showEncouragementMessage(): void {
    const messages = [
      '🎯 Task Complete!',
      '⚡ Well Done!',
      '🌟 Productive!',
      '💫 Great Work!',
      '🎉 Accomplished!'
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
      { transform: 'translate(-50%, -50%) scale(0.9) rotate(-5deg)', opacity: 0 }
    ], {
      duration: 2000,
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    });

    setTimeout(() => messageEl.remove(), 2000);
  }

  /**
   * Show confetti animation for task completion
   */
  private showConfetti(): void {
    this.createFireworkBurst();
    this.createConfettiRain();
    this.createSuccessPulse();
  }

  /**
   * Create firework burst from the completed task
   */
  private createFireworkBurst(): void {
    const selectedButton = this.overlay?.querySelector('.todo-item[data-selected="true"]');
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

      particle.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
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
   * Create confetti rain
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

    const confettiCount = 40;

    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div');
      const size = 4 + Math.random() * 6;
      const color = this.getVibrantColor();
      const startX = Math.random() * 100;
      const wobble = 20 + Math.random() * 20;
      const rotationSpeed = 200 + Math.random() * 300;
      const fallDuration = 2000 + Math.random() * 1500;
      const delay = Math.random() * 500;

      confetti.style.cssText = `
        position: absolute !important;
        left: ${startX}% !important;
        top: -20px !important;
        width: ${size}px !important;
        height: ${size}px !important;
        background: ${color} !important;
        opacity: 0.9 !important;
      `;

      confetti.animate([
        { transform: 'translateY(0) translateX(0) rotate(0deg)', opacity: 0.9 },
        {
          transform: `translateY(${window.innerHeight + 20}px) translateX(${wobble}px) rotate(${rotationSpeed}deg)`,
          opacity: 0
        }
      ], {
        duration: fallDuration,
        delay: delay,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      });

      confettiContainer.appendChild(confetti);
    }

    document.body.appendChild(confettiContainer);
    setTimeout(() => confettiContainer.remove(), 4000);
  }

  /**
   * Create success pulse effect on the panel
   */
  private createSuccessPulse(): void {
    const panel = this.overlay?.querySelector('.todo-panel') as HTMLElement;
    if (!panel) return;

    panel.animate([
      { boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)' },
      { boxShadow: '0 0 60px rgba(76, 175, 80, 0.4), 0 0 100px rgba(76, 175, 80, 0.3), 0 20px 60px rgba(0, 0, 0, 0.2)' },
      { boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)' }
    ], {
      duration: 1000,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    });

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
   * Get vibrant colors for celebrations
   */
  private getVibrantColor(): string {
    const colors = [
      '#4CAF50', // Success green
      '#2196F3', // Blue
      '#FF9800', // Orange
      '#9C27B0', // Purple
      '#00BCD4', // Cyan
      '#8BC34A', // Light green
      '#FFC107', // Amber
      '#E91E63', // Pink
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Start 5-second countdown animation
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
        this.setState(TodoState.AFTER_COUNTDOWN);
      }
    }, 1000);
  }

  /**
   * Setup enhanced back button interactions
   */
  private setupBackButton(button: HTMLButtonElement): void {
    const applyHoverState = () => {
      button.style.background = 'linear-gradient(145deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.18)) !important';
      button.style.transform = 'scale(1.02) translateY(-1px) !important';
      button.style.boxShadow = '0 3px 10px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.3) !important';
      button.style.borderColor = 'rgba(0, 0, 0, 0.12) !important';
    };

    const resetHoverState = () => {
      button.style.background = 'linear-gradient(145deg, rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.08)) !important';
      button.style.transform = 'scale(1) !important';
      button.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.5) !important';
      button.style.borderColor = 'rgba(0, 0, 0, 0.08) !important';
    };

    button.addEventListener('mouseenter', applyHoverState);
    button.addEventListener('focus', applyHoverState);
    button.addEventListener('mouseleave', resetHoverState);
    button.addEventListener('blur', resetHoverState);

    button.addEventListener('click', (event) => {
      event.preventDefault();
      if (button.disabled) return;
      button.disabled = true;
      button.style.cursor = 'wait';
      this.handleBackNavigation().finally(() => {
        if (!this.overlay) {
          return;
        }
        button.disabled = false;
        button.style.cursor = 'pointer';
        resetHoverState();
      });
    });
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

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.currentState === TodoState.AFTER_COUNTDOWN) {
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
   * Setup hold-to-close interaction
   */
  private setupHoldToClose(button: HTMLButtonElement): void {
    let isHolding = false;
    let holdStartTime = 0;
    let animationFrame: number | null = null;
    const originalBackground = 'linear-gradient(145deg, rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.08))';
    const originalText = button.querySelector('.countdown-text')?.textContent || 'Hold 3s to Close';
    const countdownText = button.querySelector('.countdown-text') as HTMLElement;

    const startHold = () => {
      if (button.disabled) return;

      isHolding = true;
      holdStartTime = Date.now();
      button.style.transform = 'scale(0.98) !important';

      const animate = () => {
        if (!isHolding) return;

        const elapsed = Date.now() - holdStartTime;
        const progress = Math.min(elapsed / 3000, 1);

        const startOpacity = 0.02 + (progress * 0.5);
        const endOpacity = 0.08 + (progress * 0.72);
        button.style.background = `linear-gradient(145deg, rgba(0, 0, 0, ${startOpacity}), rgba(0, 0, 0, ${endOpacity})) !important`;

        if (endOpacity > 0.4) {
          button.style.color = '#ffffff !important';
        }

        const remainingSeconds = Math.ceil(3 - (progress * 3));
        if (countdownText && remainingSeconds > 0) {
          countdownText.textContent = `Hold ${remainingSeconds}s...`;
        }

        if (progress >= 1) {
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

      if (countdownText) {
        countdownText.textContent = originalText;
      }

      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }
    };

    button.addEventListener('mousedown', startHold);
    button.addEventListener('mouseup', releaseHold);
    button.addEventListener('mouseleave', releaseHold);
    button.addEventListener('touchstart', startHold);
    button.addEventListener('touchend', releaseHold);
    button.addEventListener('touchcancel', releaseHold);

    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !button.disabled) {
        this.handleCloseClick();
      }
    });
  }

  /**
   * Check if user prefers reduced motion
   */
  private shouldUseAnimations(): boolean {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

        if (this.performanceMonitor.fps < 30) {
          this.performanceMonitor.lowFpsCount++;
          if (this.performanceMonitor.lowFpsCount >= 3) {
            this.performanceMonitor.effectsEnabled = false;
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
    this.selectedTask = null;
  }

  /**
   * Get current state
   */
  getCurrentState(): TodoState {
    return this.currentState;
  }

  /**
   * Force cleanup (for emergency situations)
   */
  forceCleanup(): void {
    this.cleanup();
  }
}