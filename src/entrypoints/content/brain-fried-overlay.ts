export interface BrainFriedOverlayCallbacks {
  onClose: () => void;
  onTakeBreak: () => void;
}

export class BrainFriedOverlay {
  private overlay: HTMLElement | null = null;
  private callbacks: BrainFriedOverlayCallbacks;
  private breakTimer: number | null = null;
  private isActive: boolean = false;

  constructor(callbacks: BrainFriedOverlayCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Create and show the brain fried overlay
   */
  show(): void {
    if (this.isActive) {
      return; // Prevent multiple overlays
    }
    
    this.isActive = true;
    this.createOverlay();
    document.body.appendChild(this.overlay!);
    
    // Blur and mute any media on the page
    this.blurPageContent();
    this.muteAllMedia();
  }

  /**
   * Create the overlay DOM structure
   */
  private createOverlay(): void {
    // Add animation keyframes if not already present
    if (!document.getElementById('xscroll-brain-fried-animations')) {
      const style = document.createElement('style');
      style.id = 'xscroll-brain-fried-animations';
      style.textContent = `
        @keyframes brainFriedPulse {
          0%, 100% { 
            transform: scale(1);
            filter: drop-shadow(0 0 20px rgba(255, 68, 68, 0.5));
          }
          50% { 
            transform: scale(1.05);
            filter: drop-shadow(0 0 30px rgba(255, 68, 68, 0.8));
          }
        }

        @keyframes brainFriedGlow {
          0%, 100% { 
            box-shadow: 0 0 40px rgba(255, 68, 68, 0.3);
          }
          50% { 
            box-shadow: 0 0 60px rgba(255, 68, 68, 0.6);
          }
        }

        @keyframes brainFriedFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        @keyframes fadeInUp {
          0% { 
            opacity: 0;
            transform: translateY(30px);
          }
          100% { 
            opacity: 1;
            transform: translateY(0);
          }
        }
      `;
      document.head.appendChild(style);
    }

    this.overlay = document.createElement('div');
    this.overlay.className = 'brain-fried-overlay';
    
    // Full-screen blocking overlay with dark background
    this.overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(0, 0, 0, 0.95) !important;
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      z-index: 2147483647 !important;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
    `;
    
    this.overlay.innerHTML = `
      <div class="brain-fried-panel" style="
        text-align: center !important;
        color: white !important;
        max-width: 500px !important;
        width: 90% !important;
        padding: 60px 40px !important;
        animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) !important;
      ">
        
        <div class="brain-fried-icon" style="
          font-size: 120px !important;
          margin-bottom: 30px !important;
          animation: brainFriedFloat 3s ease-in-out infinite !important;
          filter: drop-shadow(0 0 20px rgba(255, 68, 68, 0.5)) !important;
        ">🔥🧠🔥</div>
        
        <h1 class="brain-fried-title" style="
          font-size: 48px !important;
          font-weight: 900 !important;
          color: #ff4444 !important;
          margin: 0 0 20px 0 !important;
          text-shadow: 0 0 20px rgba(255, 68, 68, 0.5) !important;
          animation: brainFriedPulse 2s ease-in-out infinite !important;
          letter-spacing: 2px !important;
        ">BRAIN FRIED!</h1>
        
        <p class="brain-fried-message" style="
          font-size: 20px !important;
          color: #ffffff !important;
          margin: 0 0 40px 0 !important;
          line-height: 1.6 !important;
          opacity: 0.9 !important;
          font-weight: 400 !important;
        ">
          Your brain needs a break from endless scrolling.<br>
        </p>
        
        <div class="brain-fried-actions" style="
          display: flex !important;
          flex-direction: column !important;
          gap: 20px !important;
          align-items: center !important;
        ">
          
          <div class="recovery-info" style="
            background: rgba(255, 255, 255, 0.1) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            border-radius: 16px !important;
            padding: 20px !important;
            backdrop-filter: blur(10px) !important;
            max-width: 400px !important;
            width: 100% !important;
          ">
            <h3 style="
              color: #ffffff !important;
              font-size: 16px !important;
              font-weight: 600 !important;
              margin: 0 0 12px 0 !important;
            ">Brain Recovery Tips:</h3>
            <ul style="
              color: #cccccc !important;
              font-size: 14px !important;
              line-height: 1.5 !important;
              margin: 0 !important;
              padding-left: 20px !important;
              text-align: left !important;
            ">
              <li style="margin-bottom: 6px !important;">💧 Drink some water</li>
              <li style="margin-bottom: 6px !important;">🌬️ Take deep breaths</li>
              <li style="margin-bottom: 6px !important;">👀 Look away from screens</li>
              <li style="margin-bottom: 6px !important;">🚶 Move your body</li>
            </ul>
          </div>

          <div class="timer-info" style="
            color: #888888 !important;
            font-size: 14px !important;
            opacity: 0.7 !important;
          ">
            Close this tab to recharge your Brain Battery
          </div>
        </div>
      </div>
    `;

    // Add button interactions
    const takeBreakBtn = this.overlay.querySelector('.take-break-btn') as HTMLButtonElement;
    if (takeBreakBtn) {
      takeBreakBtn.addEventListener('click', this.handleTakeBreak.bind(this));
      
      // Enhanced hover effects
      takeBreakBtn.addEventListener('mouseenter', () => {
        takeBreakBtn.style.transform = 'scale(1.05) translateY(-2px) !important';
        takeBreakBtn.style.boxShadow = '0 12px 35px rgba(255, 107, 107, 0.5) !important';
      });
      
      takeBreakBtn.addEventListener('mouseleave', () => {
        takeBreakBtn.style.transform = 'scale(1) translateY(0) !important';
        takeBreakBtn.style.boxShadow = '0 8px 25px rgba(255, 107, 107, 0.3) !important';
      });
    }

    // Prevent scrolling and interactions with background
    document.body.style.overflow = 'hidden';
    
    // Block all clicks on the page behind the overlay
    this.overlay.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
    });
  }

  /**
   * Blur the page content behind the overlay
   */
  private blurPageContent(): void {
    const mainContent = document.body;
    if (mainContent) {
      // Store original filter to restore later
      (mainContent as any)._originalFilter = mainContent.style.filter;
      mainContent.style.transition = 'filter 0.5s ease-in-out';
    }
  }

  /**
   * Mute all audio and video on the page
   */
  private muteAllMedia(): void {
    const mediaElements = document.querySelectorAll('video, audio');
    mediaElements.forEach((element: any) => {
      if (element.volume !== undefined) {
        // Store original volume to restore later
        element._originalVolume = element.volume;
        element.volume = 0;
      }
      if (element.muted !== undefined) {
        element._originalMuted = element.muted;
        element.muted = true;
      }
    });
  }

  /**
   * Restore page content and media
   */
  private restorePageContent(): void {
    // Restore page blur
    const mainContent = document.body;
    if (mainContent && (mainContent as any)._originalFilter !== undefined) {
      mainContent.style.filter = (mainContent as any)._originalFilter;
      delete (mainContent as any)._originalFilter;
    }

    // Restore media
    const mediaElements = document.querySelectorAll('video, audio');
    mediaElements.forEach((element: any) => {
      if (element._originalVolume !== undefined) {
        element.volume = element._originalVolume;
        delete element._originalVolume;
      }
      if (element._originalMuted !== undefined) {
        element.muted = element._originalMuted;
        delete element._originalMuted;
      }
    });

    // Restore scrolling
    document.body.style.overflow = '';
  }

  /**
   * Handle take break button click
   */
  private handleTakeBreak(): void {
    this.callbacks.onTakeBreak();
    this.cleanup();
  }

  /**
   * Check if overlay is currently active
   */
  isOverlayActive(): boolean {
    return this.isActive;
  }

  /**
   * Clean up and remove overlay
   */
  cleanup(): void {
    this.isActive = false;

    // Clear any timers
    if (this.breakTimer) {
      clearTimeout(this.breakTimer);
      this.breakTimer = null;
    }

    // Restore page content
    this.restorePageContent();

    // Remove overlay from DOM
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }

    // Call close callback
    this.callbacks.onClose();
    
    this.overlay = null;
  }

  /**
   * Force cleanup (for emergency situations)
   */
  forceCleanup(): void {
    this.cleanup();
  }
}
