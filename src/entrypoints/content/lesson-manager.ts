import { TodoOverlay, type TodoOverlayCallbacks } from './todo-overlay';
import { StorageUtils } from './storage-utils';
import { browser } from '../../utils/browser-api';
import { todoService } from '../popup/services/todo-service';
import type { TodoItem } from '../../utils/storage';

export class LessonManager {
  private currentOverlay: TodoOverlay | null = null;
  private isLessonActive = false;
  private pendingLessonCompletion = false;
  private mediaObserver: MutationObserver | null = null;
  private mediaInterval: number | null = null;
  private pageEventHandlers: {
    wheel: (e: WheelEvent) => void;
    keydown: (e: KeyboardEvent) => void;
  } = {
    wheel: this.disableScrolling.bind(this),
    keydown: this.disableArrowKeys.bind(this)
  };

  constructor() {
    this.setupStorageListener();
  }

  /**
   * Set up initial lesson check
   */
  private setupStorageListener(): void {
    // Initial check
    this.checkShouldTriggerLesson();
  }

  /**
   * Public method to trigger lesson check (called directly from content script)
   */
  async triggerLessonCheck(): Promise<void> {
    await this.checkShouldTriggerLesson();
  }

  /**
   * Check if lesson should be triggered based on scroll count
   */
  private async checkShouldTriggerLesson(): Promise<void> {
    try {
      // Double-check lesson state to prevent race conditions
      if (this.isLessonActive || this.currentOverlay) {
        return;
      }

      const shouldTrigger = await StorageUtils.shouldTriggerLesson();
      
      if (shouldTrigger && !this.isLessonActive && !this.currentOverlay) {
        await this.triggerLesson();
      }
    } catch (error) {
      console.error('Error checking lesson trigger:', error);
    }
  }

  /**
   * Trigger todo overlay display
   */
  private async triggerLesson(): Promise<void> {
    // Triple-check state to prevent multiple overlays
    if (this.isLessonActive || this.currentOverlay) {
      return;
    }

    try {
      // Immediately set local state to prevent race conditions
      this.isLessonActive = true;

      // Set lesson as active in storage
      await StorageUtils.setLessonActive(true);

      // Send message to background script
      try {
        browser.runtime.sendMessage({
          type: 'LESSON_STARTED'
        });
      } catch (msgError) {
        // ignore
      }

      // Freeze page interactions
      this.freezePage();

      // Initialize todo service with user ID
      const userId = await StorageUtils.getUserId();
      todoService.setUserId(userId);

      // Load todos from backend first, then fallback to local storage
      let todos: TodoItem[] = [];

      try {
        // Try to get uncompleted todos from backend
        todos = await todoService.getUncompletedTodos();
        console.log(`Loaded ${todos.length} uncompleted todos from backend for user ${userId}`);
      } catch (error) {
        console.warn('Failed to load todos from backend, falling back to local storage:', error);
      }

      // If no todos from backend, try local storage
      if (todos.length === 0) {
        try {
          const localTodos = await StorageUtils.getTodos();
          todos = localTodos.filter(todo => !todo.completed); // Only show uncompleted local todos
          console.log(`Loaded ${todos.length} uncompleted todos from local storage`);
        } catch (error) {
          console.warn('Failed to load todos from local storage:', error);
        }
      }

      // If still no todos, show general todos
      const useGeneralTodos = todos.length === 0;

      const todoCallbacks: TodoOverlayCallbacks = {
        onTodoComplete: this.handleLessonComplete.bind(this),
        onClose: this.handleLessonClose.bind(this)
      };

      this.currentOverlay = new TodoOverlay(todos, todoCallbacks, useGeneralTodos);
      this.currentOverlay.show();

    } catch (error) {
      console.error('Error triggering todo overlay:', error);
      await this.handleLessonError();
    }
  }

  /**
   * Handle lesson completion (increment count and update storage)
   */
  private async handleLessonComplete(): Promise<void> {
    // Mark completion and let close handler persist in one write
    this.pendingLessonCompletion = true;
  }

  /**
   * Handle lesson close/cleanup
   */
  private async handleLessonClose(): Promise<void> {
    try {
      // Unfreeze page
      this.unfreezePage();
      
      // Clear lesson state
      this.isLessonActive = false;
      this.currentOverlay = null;

      // Persist storage updates in one locked write if completed
      if (this.pendingLessonCompletion) {
        await StorageUtils.completeLessonAndScheduleNext();
        this.pendingLessonCompletion = false;
      } else {
        await StorageUtils.setLessonActive(false);
      }

      // Send message to background script
      try {
        browser.runtime.sendMessage({
          type: 'LESSON_ENDED'
        });
      } catch (msgError) {
        // ignore
      }
    } catch (error) {
      console.error('Error closing lesson:', error);
    }
  }

  /**
   * Handle lesson error by cleaning up
   */
  private async handleLessonError(): Promise<void> {
    // Clean up all state
    this.isLessonActive = false;
    this.currentOverlay = null;
    
    // Update storage
    await StorageUtils.setLessonActive(false);
    
    // Unfreeze page
    this.unfreezePage();
  }

  /**
   * Freeze page interactions during lesson
   */
  private freezePage(): void {
    // Start continuous media muting
    this.startMediaMuting();

    // Disable scrolling
    window.addEventListener('wheel', this.pageEventHandlers.wheel, { passive: false });
    
    // Disable arrow keys and page up/down
    window.addEventListener('keydown', this.pageEventHandlers.keydown, true);

    // Store original overflow to restore later
    document.body.style.setProperty('--original-overflow', document.body.style.overflow || 'auto');
    document.body.style.overflow = 'hidden';
  }

  /**
   * Start continuous media muting to handle dynamic content
   */
  private startMediaMuting(): void {
    // Initial mute of all existing media
    this.muteAllMedia();

    // Set up MutationObserver to catch new media elements
    this.mediaObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            // Check if the added node is a media element
            if (element.tagName === 'AUDIO' || element.tagName === 'VIDEO') {
              this.muteMediaElement(element as HTMLMediaElement);
            }
            // Check for media elements within the added node
            const mediaElements = element.querySelectorAll('audio, video') as NodeListOf<HTMLMediaElement>;
            mediaElements.forEach(media => this.muteMediaElement(media));
          }
        });
      });
    });

    // Start observing DOM changes
    this.mediaObserver.observe(document, {
      childList: true,
      subtree: true
    });

    // Set up interval to periodically check for any missed media elements
    this.mediaInterval = window.setInterval(() => {
      this.muteAllMedia();
    }, 500); // Check every 500ms for new media
  }

  /**
   * Mute all media elements on the page
   */
  private muteAllMedia(): void {
    const mediaElements = document.querySelectorAll('audio, video') as NodeListOf<HTMLMediaElement>;
    mediaElements.forEach(media => this.muteMediaElement(media));
    
    // Also check for media in iframes (common on social media sites)
    try {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            const iframeMedia = iframeDoc.querySelectorAll('audio, video') as NodeListOf<HTMLMediaElement>;
            iframeMedia.forEach(media => this.muteMediaElement(media));
          }
        } catch (e) {
          // Ignore cross-origin iframe access errors
        }
      });
    } catch (e) {
      // Ignore any iframe access errors
    }
  }

  /**
   * Mute a single media element
   */
  private muteMediaElement(media: HTMLMediaElement): void {
    if (!media.muted) {
      media.muted = true;
      media.setAttribute('data-xscroll-was-unmuted', 'true');
    }
  }

  /**
   * Stop media muting
   */
  private stopMediaMuting(): void {
    // Disconnect MutationObserver
    if (this.mediaObserver) {
      this.mediaObserver.disconnect();
      this.mediaObserver = null;
    }

    // Clear interval
    if (this.mediaInterval) {
      clearInterval(this.mediaInterval);
      this.mediaInterval = null;
    }
  }

  /**
   * Disable scrolling behavior
   */
  private disableScrolling(e: WheelEvent): void {
    e.preventDefault();
    e.stopPropagation();
  }

  /**
   * Disable arrow keys and page navigation keys
   */
  private disableArrowKeys(e: KeyboardEvent): void {
    const disabledKeys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'];
    
    if (disabledKeys.includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  /**
   * Unfreeze page interactions after lesson
   */
  private unfreezePage(): void {
    // Stop continuous media muting
    this.stopMediaMuting();

    // Unmute previously muted media
    const mediaElements = document.querySelectorAll('audio[data-xscroll-was-unmuted], video[data-xscroll-was-unmuted]') as NodeListOf<HTMLMediaElement>;
    mediaElements.forEach(media => {
      media.muted = false;
      media.removeAttribute('data-xscroll-was-unmuted');
    });

    // Re-enable scrolling
    window.removeEventListener('wheel', this.pageEventHandlers.wheel);
    
    // Re-enable arrow keys
    window.removeEventListener('keydown', this.pageEventHandlers.keydown, true);

    // Restore original overflow
    const originalOverflow = document.body.style.getPropertyValue('--original-overflow') || 'auto';
    document.body.style.overflow = originalOverflow;
    document.body.style.removeProperty('--original-overflow');
  }

  /**
   * Check if lesson is currently active
   */
  isActive(): boolean {
    return this.isLessonActive;
  }

  /**
   * Force close lesson (for emergency cleanup)
   */
  forceClose(): void {
    if (this.currentOverlay) {
      this.currentOverlay.forceCleanup();
    }
    this.handleLessonClose();
  }

  /**
   * Clean up lesson manager (call on page unload)
   */
  cleanup(): void {
    // Stop media muting
    this.stopMediaMuting();
    
    // Force close any active lesson
    if (this.isLessonActive || this.currentOverlay) {
      this.forceClose();
    }
  }
}
