/**
 * Interaction Handler for BMC 3D visualization
 * Manages click, double-click, and hover interactions
 */

import { 
  Scene,
  AbstractMesh,
  ActionManager,
  ExecuteCodeAction,
  Vector3
} from '@babylonjs/core';
import { debugLog } from '@/lib/debug/DebugLogger';
import { CleanBMCSystem } from '@/lib/cleanBMCSystem';

interface ClickTimer {
  lastClickTime: number;
  sectionName: string;
}

export type InteractionCallback = {
  onSingleClick?: (sectionName: string) => void;
  onDoubleClick?: (sectionName: string, position: Vector3) => void;
  onHoverEnter?: (sectionName: string) => void;
  onHoverExit?: (sectionName: string) => void;
};

export class InteractionHandler {
  private scene: Scene;
  private cleanBMC: CleanBMCSystem | null = null;
  private clickTimers: Map<string, number> = new Map();
  private doubleClickThreshold: number = 300; // milliseconds
  private callbacks: InteractionCallback = {};

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Set the CleanBMCSystem reference
   */
  public setCleanBMC(cleanBMC: CleanBMCSystem): void {
    this.cleanBMC = cleanBMC;
    debugLog.verbose('interaction', 'CleanBMC reference set');
  }

  /**
   * Register interaction callbacks
   */
  public registerCallbacks(callbacks: InteractionCallback): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
    debugLog.verbose('interaction', 'Interaction callbacks registered');
  }

  /**
   * Setup interactions for a BMC mesh
   */
  public setupMeshInteractions(mesh: AbstractMesh, sectionName: string): void {
    // Ensure mesh has action manager
    if (!mesh.actionManager) {
      mesh.actionManager = new ActionManager(this.scene);
    }

    // Ensure mesh is pickable
    mesh.isPickable = true;

    // Setup click handling with double-click detection
    this.setupClickHandling(mesh, sectionName);

    // Setup hover handling
    this.setupHoverHandling(mesh, sectionName);

    debugLog.verbose('interaction', `Interactions setup for ${sectionName}`);
  }

  /**
   * Setup click and double-click handling with proper behavior
   */
  private setupClickHandling(mesh: AbstractMesh, sectionName: string): void {
    mesh.actionManager?.registerAction(
      new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
        const currentTime = Date.now();
        const lastClickTime = this.clickTimers.get(sectionName) || 0;
        const timeDifference = currentTime - lastClickTime;

        debugLog.critical(`Click detected on ${sectionName}, time diff: ${timeDifference}ms`);

        if (timeDifference < this.doubleClickThreshold && timeDifference > 50) {
          // Double-click detected
          debugLog.critical(`DOUBLE-CLICK detected on ${sectionName}!`);

          // Rule 4: Double-click on selected object shows popup panel
          if (this.cleanBMC && this.cleanBMC.getSelectedObject() === sectionName) {
            // Trigger double-click callback to show panel
            if (this.callbacks.onDoubleClick) {
              const position = mesh.getAbsolutePosition();
              this.callbacks.onDoubleClick(sectionName, position);
            }
          } else {
            // Double-click on unselected object: first select it, then show panel
            if (this.cleanBMC) {
              this.cleanBMC.onSelect(sectionName);
            }
            if (this.callbacks.onDoubleClick) {
              const position = mesh.getAbsolutePosition();
              this.callbacks.onDoubleClick(sectionName, position);
            }
          }

          // Reset timer to prevent triple-clicks
          this.clickTimers.set(sectionName, 0);
        } else {
          // Single click
          debugLog.critical(`Single click on ${sectionName}`);

          // DEBUG: Log current state before selection
          if (this.cleanBMC) {
            console.log(`🔍 DEBUG: Before selection - Current selected: ${this.cleanBMC.getSelectedObject()}`);
            console.log(`🔍 DEBUG: About to select: ${sectionName}`);

            this.cleanBMC.onSelect(sectionName);

            console.log(`🔍 DEBUG: After selection - New selected: ${this.cleanBMC.getSelectedObject()}`);
          }

          // Trigger single-click callback
          if (this.callbacks.onSingleClick) {
            this.callbacks.onSingleClick(sectionName);
          }

          // Update click timer
          this.clickTimers.set(sectionName, currentTime);
        }
      })
    );
  }

  /**
   * Setup hover handling
   */
  private setupHoverHandling(mesh: AbstractMesh, sectionName: string): void {
    // Hover enter
    mesh.actionManager?.registerAction(
      new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
        debugLog.verbose('interaction', `Hover enter: ${sectionName}`);

        // Handle hover via CleanBMC
        if (this.cleanBMC) {
          this.cleanBMC.onHover(sectionName, true);
        }

        // Trigger hover enter callback
        if (this.callbacks.onHoverEnter) {
          this.callbacks.onHoverEnter(sectionName);
        }
      })
    );

    // Hover exit
    mesh.actionManager?.registerAction(
      new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
        debugLog.verbose('interaction', `Hover exit: ${sectionName}`);

        // Handle hover via CleanBMC
        if (this.cleanBMC) {
          this.cleanBMC.onHover(sectionName, false);
        }

        // Trigger hover exit callback
        if (this.callbacks.onHoverExit) {
          this.callbacks.onHoverExit(sectionName);
        }
      })
    );
  }

  /**
   * Setup background click handler to clear selection
   */
  public setupBackgroundClickHandler(onBackgroundClick: () => void): void {
    this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === 1) { // POINTERDOWN
        const pickedMesh = pointerInfo.pickInfo?.pickedMesh;

        // If no mesh was picked or it's the ground, clear selection
        if (!pickedMesh || pickedMesh.name === 'ground') {
          debugLog.verbose('interaction', 'Background clicked - clearing selection');

          // Clear selection via CleanBMC
          if (this.cleanBMC) {
            this.cleanBMC.clearSelection();
          }

          // Trigger callback
          onBackgroundClick();
        }
      }
    });
  }

  /**
   * Set double-click threshold
   */
  public setDoubleClickThreshold(threshold: number): void {
    this.doubleClickThreshold = threshold;
    debugLog.verbose('interaction', `Double-click threshold set to ${threshold}ms`);
  }

  /**
   * Clear all click timers
   */
  public clearClickTimers(): void {
    this.clickTimers.clear();
    debugLog.verbose('interaction', 'All click timers cleared');
  }
}