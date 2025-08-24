/**
 * BRIDGE ADAPTER - SceneSetup API Compatibility
 * 
 * Provides identical API to existing SceneSetup but uses CanvasManager internally.
 * This allows testing the new system without changing any existing code.
 */

import { Engine, Scene } from '@babylonjs/core';
import { CanvasManager } from '../unified/CanvasManager';

/**
 * Bridge adapter that makes CanvasManager look like the original SceneSetup
 * 
 * SAFETY: Provides IDENTICAL API - drop-in replacement for testing
 */
export class SceneSetupAdapter {
  private canvasManager: CanvasManager;
  private engine: Engine;
  private scene: Scene;

  constructor(canvas: HTMLCanvasElement) {
    // Create CanvasManager internally but expose SceneSetup API
    this.canvasManager = new CanvasManager(canvas);
    this.engine = this.canvasManager.getEngine();
    this.scene = this.canvasManager.getScene();
    
    console.log('[SceneAdapter] Bridge adapter initialized - using CanvasManager internally');
  }

  /**
   * EXACT API MATCH: getEngine(): Engine
   */
  public getEngine(): Engine {
    return this.engine;
  }

  /**
   * EXACT API MATCH: getScene(): Scene
   */
  public getScene(): Scene {
    return this.scene;
  }

  /**
   * EXACT API MATCH: startRenderLoop(renderCallback: () => void): void
   */
  public startRenderLoop(renderCallback: () => void): void {
    console.log('[SceneAdapter] Starting render loop');
    this.canvasManager.startRenderLoop();
  }

  /**
   * EXACT API MATCH: dispose(): void
   */
  public dispose(): void {
    console.log('[SceneAdapter] Disposing scene setup');
    this.canvasManager.dispose();
  }

  /**
   * Access to internal CanvasManager for advanced operations
   * (Not part of original API but useful for integration)
   */
  public getCanvasManager(): CanvasManager {
    return this.canvasManager;
  }
}