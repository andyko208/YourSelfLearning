import { browser } from '../../utils/browser-api';
import { StorageUtils } from './storage-utils';

export enum ClipState {
  BEGIN = 'BEGIN',
  PLAYING = 'PLAYING',
  AFTER_COUNTDOWN = 'AFTER_COUNTDOWN'
}

export interface ClipOverlayCallbacks {
  onClipComplete: () => void;
  onClose: () => void;
}

export class ClipOverlay {
  private overlay: HTMLElement | null = null;
  private currentState: ClipState = ClipState.BEGIN;
  private callbacks: ClipOverlayCallbacks;
  private countdownTimer: number | null = null;
  private videoEnded = false;
  private selectedVideoId: string = '';

  // Motivational video pool - easily expandable
  private static readonly MOTIVATIONAL_VIDEOS = [
    {
      id: '6fBRjY-r80Y',
      title: 'Rocket Motivation',
      duration: 'short' // under 2 minutes
    },
    {
      id: 'tZDsIH0aNEU',
      title: 'Success Mindset',
      duration: 'medium' // 2-5 minutes
    }
    // Future videos can be added here with metadata
  ];

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

  constructor(callbacks: ClipOverlayCallbacks) {
    this.callbacks = callbacks;
    this.selectedVideoId = this.selectOptimalVideo();

    // Start performance monitoring
    if (this.shouldUseAnimations()) {
      this.startPerformanceMonitoring();
    }
  }

  /**
   * Select optimal video using intelligent rotation strategy
   */
  private selectOptimalVideo(): string {
    const videos = ClipOverlay.MOTIVATIONAL_VIDEOS;

    // Strategy 1: Time-based rotation (changes every hour)
    const hourOfDay = new Date().getHours();
    const timeBasedIndex = hourOfDay % videos.length;

    // Strategy 2: Tab-specific rotation (different video per tab)
    const tabSeed = this.generateTabSeed();
    const tabBasedIndex = tabSeed % videos.length;

    // Strategy 3: Random with session persistence
    const sessionKey = 'ysl_current_video_session';
    const stored = sessionStorage.getItem(sessionKey);

    let selectedIndex: number;

    if (stored) {
      // Use stored video for this session
      const storedData = JSON.parse(stored);
      const isExpired = Date.now() - storedData.timestamp > 30 * 60 * 1000; // 30 min

      if (!isExpired) {
        selectedIndex = storedData.index;
      } else {
        // Session expired, rotate to next video
        selectedIndex = (storedData.index + 1) % videos.length;
      }
    } else {
      // New session: combine time and tab strategies
      selectedIndex = (timeBasedIndex + tabBasedIndex) % videos.length;
    }

    // Store selection for session persistence
    sessionStorage.setItem(sessionKey, JSON.stringify({
      index: selectedIndex,
      timestamp: Date.now()
    }));

    console.log(`[YourSelfLearning] Selected video: ${videos[selectedIndex].title} (${videos[selectedIndex].id})`);
    return videos[selectedIndex].id;
  }

  /**
   * Generate a consistent seed based on tab characteristics
   */
  private generateTabSeed(): number {
    const url = window.location.href;
    const timestamp = Math.floor(Date.now() / (1000 * 60 * 60)); // Changes every hour

    // Create a simple hash from URL and timestamp
    let hash = 0;
    const seedString = url + timestamp.toString();

    for (let i = 0; i < seedString.length; i++) {
      const char = seedString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash);
  }

  /**
   * Create and show the clip overlay
   */
  show(): void {
    this.createOverlay();
    this.setState(ClipState.BEGIN);
    document.body.appendChild(this.overlay!);

    // Focus management for accessibility
    this.setupFocusTrap();

    // Set initial focus to the video container for accessibility
    setTimeout(() => {
      const videoContainer = this.overlay?.querySelector('.video-container') as HTMLElement;
      if (videoContainer) {
        videoContainer.focus();
      }
    }, 100);
  }

  /**
   * Create the overlay DOM structure
   */
  private createOverlay(): void {
    // Add animation keyframes if not already present
    if (!document.getElementById('ysl-clip-animations')) {
      const style = document.createElement('style');
      style.id = 'ysl-clip-animations';
      style.textContent = `
        @keyframes ysl-fade-in {
          0% { opacity: 0; transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }

        @keyframes ysl-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
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
    this.overlay.className = 'clip-overlay';

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

    // Create the iframe with proper video ID interpolation
    const videoSrc = `https://www.youtube.com/embed/${this.selectedVideoId}?autoplay=1&mute=1&controls=0&rel=0&modestbranding=1&showinfo=0&fs=0&iv_load_policy=3&disablekb=1&enablejsapi=1`;

    this.overlay.innerHTML = `
      <div class="clip-panel" role="dialog" aria-labelledby="clip-title" aria-describedby="clip-description" style="
        background: white !important;
        border-radius: 20px !important;
        padding: 40px !important;
        max-width: 800px !important;
        width: 90% !important;
        max-height: 80vh !important;
        overflow-y: auto !important;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
        text-align: center !important;
        animation: ysl-fade-in 0.5s ease-out !important;
      ">
        <div class="clip-content">
          <h2 id="clip-title" class="clip-title" style="
            font-size: 24px !important;
            font-weight: 700 !important;
            color: #333 !important;
            margin: 0 0 30px 0 !important;
            line-height: 1.4 !important;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
          ">GET BACK TO WORK!!</h2>
          
          <div class="video-container" tabindex="0" aria-label="Motivational video player" style="
            position: relative !important;
            width: 100% !important;
            height: 480px !important;
            margin-bottom: 30px !important;
            border-radius: 12px !important;
            overflow: hidden !important;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important;
            outline: none !important;
          ">
            <iframe
              id="youtube-player"
              width="100%"
              height="100%"
              src="${videoSrc}"
              title="Motivational Video"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerpolicy="strict-origin-when-cross-origin"
              allowfullscreen
              style="border-radius: 12px !important;"
            ></iframe>

          </div>

          <div id="clip-explanation" class="clip-explanation" aria-live="polite" style="
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            margin-top: 20px !important;
            padding: 20px !important;
            background: #f8f9fa !important;
            border-radius: 12px !important;
            border-left: 4px solid #ff6b35 !important;
          ">
            <div class="clip-actions" style="
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
                visibility: visible !important;
                opacity: 1 !important;
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
                display: inline-block !important;
                visibility: visible !important;
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

    // Video will start playing muted automatically, buttons are already visible
    setTimeout(() => {
      this.setState(ClipState.PLAYING);
      this.startCountdown(); // Start countdown immediately since buttons are visible
    }, 1000);

    // Add back button interactions
    const backButton = this.overlay.querySelector('.back-button') as HTMLButtonElement;
    if (backButton) {
      this.setupBackButton(backButton);
    }

    // Listen for video end events via postMessage
    window.addEventListener('message', this.handleVideoMessage.bind(this));
  }


  /**
   * Handle YouTube iframe messages
   */
  private handleVideoMessage(event: MessageEvent): void {
    // Accept messages from YouTube domains
    if (!event.origin.includes('youtube.com')) return;

    try {
      let data;

      // Handle both string and object data
      if (typeof event.data === 'string') {
        data = JSON.parse(event.data);
      } else {
        data = event.data;
      }

      // YouTube iframe API sends different event types
      if (data.event === 'video-progress' ||
          data.info?.currentTime ||
          data.event === 'onStateChange' ||
          (data.info && data.info.playerState !== undefined)) {

        // Video is playing
        if (this.currentState === ClipState.PLAYING && !this.videoEnded) {
          // Check if video duration is available and calculate progress
          const duration = data.info?.duration;
          const currentTime = data.info?.currentTime;

          // YouTube player state: 0 = ended, 1 = playing, 2 = paused
          if (data.info?.playerState === 0) {
            // Video ended
            this.prepareForVideoEnd();
          } else if (duration && currentTime && (currentTime / duration) > 0.8) {
            // Video is 80% complete, prepare for end
            this.prepareForVideoEnd();
          }
        }
      }
    } catch (e) {
      // Ignore parsing errors from other postMessage events
    }
  }

  /**
   * Prepare for video end when 80% complete
   */
  private prepareForVideoEnd(): void {
    if (this.videoEnded) return;

    this.videoEnded = true;

    // Wait a bit for the video to finish, then show controls
    setTimeout(() => {
      this.showPostVideoControls();
    }, 3000);
  }

  /**
   * Show controls after video ends
   */
  private showPostVideoControls(): void {
    const explanation = this.overlay?.querySelector('.clip-explanation') as HTMLElement;
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
   * Handle close button click
   */
  private async handleCloseClick(): Promise<void> {
    if (this.currentState !== ClipState.AFTER_COUNTDOWN) return;
    await this.finalizeClipAndClose();
  }

  private async handleBackNavigation(): Promise<void> {
    if (!this.overlay || this.currentState === ClipState.BEGIN) {
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

  private async finalizeClipAndClose(): Promise<void> {
    if (!this.overlay) return;

    try {
      await StorageUtils.incrementLessonCompletedAndCheckBonus();
    } catch (error) {
      console.error('Error updating lesson completion bonus:', error);
    }

    this.callbacks.onClipComplete();
    this.cleanup();
  }

  /**
   * Set the current UI state and update display
   */
  private setState(state: ClipState): void {
    this.currentState = state;

    switch (state) {
      case ClipState.BEGIN:
        this.renderBeginState();
        break;
      case ClipState.PLAYING:
        this.renderPlayingState();
        break;
      case ClipState.AFTER_COUNTDOWN:
        this.renderAfterCountdownState();
        break;
    }
  }

  /**
   * Render the initial state (video will autoplay muted with buttons visible)
   */
  private renderBeginState(): void {
    // Buttons are already visible from HTML, no changes needed
    // Video will start automatically with buttons visible
  }

  /**
   * Render state when video is playing
   */
  private renderPlayingState(): void {
    // Video is now playing (muted initially, then unmuted)
    // Start monitoring for video end via YouTube iframe API messages
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
        this.setState(ClipState.AFTER_COUNTDOWN);
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
      if (e.key === 'Escape' && this.currentState === ClipState.AFTER_COUNTDOWN) {
        this.handleCloseClick();
      }
    };

    this.overlay.addEventListener('keydown', handleTabKey);
    this.overlay.addEventListener('keydown', handleEscapeKey);
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

    // Remove message listener
    window.removeEventListener('message', this.handleVideoMessage.bind(this));

    // Remove overlay from DOM
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }

    // Call close callback
    this.callbacks.onClose();

    this.overlay = null;
  }

  /**
   * Get current state
   */
  getCurrentState(): ClipState {
    return this.currentState;
  }

  /**
   * Force cleanup (for emergency situations)
   */
  forceCleanup(): void {
    this.cleanup();
  }

  /**
   * Add a new motivational video to the pool (for future use)
   * Call this method to expand the video library
   */
  static addMotivationalVideo(id: string, title: string, duration: 'short' | 'medium' | 'long'): void {
    ClipOverlay.MOTIVATIONAL_VIDEOS.push({ id, title, duration });
    console.log(`[XScroll] Added new video: ${title} (${id})`);
  }

  /**
   * Get current video pool info (for debugging)
   */
  static getVideoPoolInfo(): { count: number; videos: Array<{id: string, title: string}> } {
    return {
      count: ClipOverlay.MOTIVATIONAL_VIDEOS.length,
      videos: ClipOverlay.MOTIVATIONAL_VIDEOS.map(v => ({ id: v.id, title: v.title }))
    };
  }
}