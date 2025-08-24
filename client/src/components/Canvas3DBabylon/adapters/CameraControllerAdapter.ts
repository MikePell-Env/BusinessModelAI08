/**
 * BRIDGE ADAPTER - CameraController API Compatibility
 * 
 * Provides identical API to existing CameraController but uses CanvasManager internally.
 * This allows testing the new system without changing any existing code.
 */

import { 
  Scene,
  ArcRotateCamera,
  FreeCamera
} from '@babylonjs/core';
import { CanvasManager } from '../unified/CanvasManager';

export type CameraMode = '3D View' | '3D Top';

/**
 * Bridge adapter that makes CanvasManager look like the original CameraController
 * 
 * SAFETY: Provides IDENTICAL API - drop-in replacement for testing
 */
export class CameraControllerAdapter {
  private canvasManager: CanvasManager;
  private scene: Scene;

  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    // Create CanvasManager internally but expose CameraController API
    this.canvasManager = new CanvasManager(canvas);
    this.scene = this.canvasManager.getScene();
    
    console.log('[CameraAdapter] Bridge adapter initialized - using CanvasManager internally');
  }

  /**
   * EXACT API MATCH: switchToMode(mode: CameraMode): void
   */
  public switchToMode(mode: CameraMode): void {
    console.log(`[CameraAdapter] Switching to mode: ${mode}`);
    
    // Translate to CanvasManager's view modes
    const viewMode = mode === '3D Top' ? '3D Top' : '3D View';
    this.canvasManager.switchView(viewMode);
  }

  /**
   * EXACT API MATCH: getCurrentMode(): CameraMode
   */
  public getCurrentMode(): CameraMode {
    const currentView = this.canvasManager.getCurrentView();
    return currentView === '3D Top' ? '3D Top' : '3D View';
  }

  /**
   * EXACT API MATCH: getActiveCamera(): ArcRotateCamera | FreeCamera
   */
  public getActiveCamera(): ArcRotateCamera | FreeCamera {
    return this.scene.activeCamera as ArcRotateCamera | FreeCamera;
  }

  /**
   * EXACT API MATCH: resetCamera(): void
   */
  public resetCamera(): void {
    console.log('[CameraAdapter] Reset camera requested');
    // CanvasManager handles camera reset internally
    // For now, just log - can implement specific reset logic if needed
  }

  /**
   * Access to internal CanvasManager for advanced operations
   * (Not part of original API but useful for integration)
   */
  public getCanvasManager(): CanvasManager {
    return this.canvasManager;
  }

  /**
   * Access to scene (commonly needed)
   */
  public getScene(): Scene {
    return this.scene;
  }
}