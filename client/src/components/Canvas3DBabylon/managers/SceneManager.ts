
import { Engine, Scene, Color4, ActionManager } from '@babylonjs/core';
import { debugLog } from '../../../lib/debug/DebugLogger';
import { MaterialPool } from '../materials/MaterialPool';

export interface SceneManagerConfig {
  antialias?: boolean;
  adaptToDeviceRatio?: boolean;
  preserveDrawingBuffer?: boolean;
  powerPreference?: 'default' | 'high-performance' | 'low-power';
}

export class SceneManager {
  private engine: Engine | null = null;
  private scene: Scene | null = null;
  private canvas: HTMLCanvasElement;
  private materialPool: MaterialPool | null = null;
  private isDisposed = false;

  constructor(canvas: HTMLCanvasElement, config: SceneManagerConfig = {}) {
    this.canvas = canvas;
    this.initialize(config);
  }

  private initialize(config: SceneManagerConfig): void {
    try {
      // Initialize engine with optimized settings
      this.engine = new Engine(this.canvas, true, {
        preserveDrawingBuffer: config.preserveDrawingBuffer ?? true,
        stencil: true,
        antialias: config.antialias ?? true,
        adaptToDeviceRatio: config.adaptToDeviceRatio ?? true,
        powerPreference: config.powerPreference ?? "high-performance"
      }, true);

      this.scene = new Scene(this.engine);
      this.setupScene();
      this.materialPool = MaterialPool.getInstance(this.scene);

      debugLog.info('scene', '✅ SceneManager initialized successfully');
    } catch (error) {
      debugLog.error('scene', `❌ SceneManager initialization failed: ${error}`);
      throw error;
    }
  }

  private setupScene(): void {
    if (!this.scene) return;

    // Set light grey background to match documentation
    this.scene.clearColor = new Color4(233 / 255, 236 / 255, 239 / 255, 1.0);
    
    // Enable pointer interactions
    this.scene.actionManager = new ActionManager(this.scene);
    
    // Set environment for PBR materials
    this.scene.environmentIntensity = 0.5;

    debugLog.verbose('scene', 'Scene configured with optimal settings');
  }

  public getEngine(): Engine | null {
    return this.engine;
  }

  public getScene(): Scene | null {
    return this.scene;
  }

  public getMaterialPool(): MaterialPool | null {
    return this.materialPool;
  }

  public startRenderLoop(renderCallback: () => void): void {
    if (!this.engine) return;

    this.engine.runRenderLoop(() => {
      if (!this.isDisposed && this.scene && !this.scene.isDisposed) {
        renderCallback();
        this.scene.render();
      }
    });

    // Handle window resize
    window.addEventListener('resize', this.handleResize);
    debugLog.verbose('scene', 'Render loop started');
  }

  private handleResize = (): void => {
    if (this.engine && !this.engine.isDisposed) {
      this.engine.resize();
    }
  };

  public dispose(): void {
    this.isDisposed = true;
    
    window.removeEventListener('resize', this.handleResize);
    
    if (this.materialPool) {
      this.materialPool.disposeAll();
    }
    
    if (this.scene) {
      this.scene.dispose();
    }
    
    if (this.engine) {
      this.engine.dispose();
    }

    debugLog.info('scene', '🗑️ SceneManager disposed');
  }
}
