/**
 * Reusable double-click detection handler for Babylon.js meshes
 * Provides reliable double-click detection with configurable threshold
 */

import { ActionManager, ExecuteCodeAction } from '@babylonjs/core';
import { debugLog } from '../debug/DebugLogger';

export interface DoubleClickConfig {
  threshold?: number;  // Time threshold for double-click in ms
  onSingleClick?: () => void;
  onDoubleClick?: () => void;
}

export class DoubleClickHandler {
  private lastClickTime: number = 0;
  private threshold: number;
  private sectionName: string;

  constructor(sectionName: string, config: DoubleClickConfig = {}) {
    this.sectionName = sectionName;
    this.threshold = config.threshold || 300;
  }

  /**
   * Register double-click handler on a mesh's action manager
   */
  register(
    actionManager: ActionManager,
    onSingleClick: () => void,
    onDoubleClick: () => void
  ): void {
    actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
        const currentTime = Date.now();
        const timeDifference = currentTime - this.lastClickTime;
        
        debugLog.verbose('interaction', `Click on ${this.sectionName}, time diff: ${timeDifference}ms`);
        
        if (timeDifference < this.threshold && timeDifference > 50) {
          // Double-click detected
          debugLog.info('interaction', `Double-click detected on ${this.sectionName}`);
          onDoubleClick();
          this.lastClickTime = 0; // Reset to prevent triple-clicks
        } else {
          // Single click
          debugLog.verbose('interaction', `Single click on ${this.sectionName}`);
          onSingleClick();
          this.lastClickTime = currentTime;
        }
      })
    );
  }
}

/**
 * Factory function to create and register a double-click handler
 */
export function setupDoubleClick(
  sectionName: string,
  actionManager: ActionManager,
  onSingleClick: () => void,
  onDoubleClick: () => void,
  threshold: number = 300
): void {
  const handler = new DoubleClickHandler(sectionName, { threshold });
  handler.register(actionManager, onSingleClick, onDoubleClick);
}