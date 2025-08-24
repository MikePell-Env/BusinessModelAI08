/**
 * Scene setup and initialization for BMC 3D visualization
 */

import { 
  Engine, 
  Scene, 
  HemisphericLight, 
  DirectionalLight,
  Color3, 
  Color4,
  Vector3,
  ActionManager
} from '@babylonjs/core';
import { debugLog } from '@/lib/debug/DebugLogger';

export class SceneSetup {
  private engine: Engine;
  private scene: Scene;

  constructor(canvas: HTMLCanvasElement) {
    // Initialize engine with high-quality settings for clear label rendering (matching existing)
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: true, // Enable anti-aliasing for smoother edges
      adaptToDeviceRatio: true, // Use device pixel ratio for crisp rendering
      powerPreference: "high-performance" // Request high-performance GPU
    }, true); // Enable adaptive quality
    
    this.scene = new Scene(this.engine);
    this.setupScene();
    this.setupLighting();
    this.setupEnvironment();
  }

  private setupScene(): void {
    // Set background to light grey to match documentation
    // RGB(229, 231, 235) = normalized (0.898, 0.906, 0.922) - light grey
    this.scene.clearColor = new Color4(0.898, 0.906, 0.922, 1.0);
    
    // Enable pointer interactions on the scene
    this.scene.actionManager = new ActionManager(this.scene);
    
    debugLog.verbose('scene', 'Scene initialized with optimized settings');
  }

  private setupLighting(): void {
    // Dark, moody lighting for rich object definition
    const hemisphericLight = new HemisphericLight(
      "hemisphericLight", 
      new Vector3(0, 1, 0), 
      this.scene
    );
    hemisphericLight.intensity = 0.12; // Extremely low ambient for dark objects
    hemisphericLight.diffuse = new Color3(0.25, 0.25, 0.28); // Very dark ambient
    hemisphericLight.specular = new Color3(0.0, 0.0, 0.0); // No ambient specular
    hemisphericLight.groundColor = new Color3(0.05, 0.05, 0.06); // Nearly black ground

    // Primary light heavily reduced for darker objects
    const directionalLight = new DirectionalLight(
      "directionalLight", 
      new Vector3(-1.8, -0.3, -1.0), // Strong side angle
      this.scene
    );
    directionalLight.intensity = 0.65; // Much lower intensity for darker scene
    directionalLight.diffuse = new Color3(0.7, 0.68, 0.63); // Dimmer, warm light
    directionalLight.specular = new Color3(0.1, 0.09, 0.08); // Minimal specular

    // Extremely subtle fill light
    const fillLight = new DirectionalLight(
      "fillLight",
      new Vector3(1.2, -0.4, 0.6), // Opposite angle
      this.scene
    );
    fillLight.intensity = 0.15; // Barely visible fill
    fillLight.diffuse = new Color3(0.35, 0.37, 0.42); // Very dark cool fill
    fillLight.specular = new Color3(0.0, 0.0, 0.0); // No specular

    debugLog.verbose('scene', 'Dark moody lighting for rich object definition');
  }

  private setupEnvironment(): void {
    // Optional: Add skybox for reflections (commented out for performance)
    // const skybox = MeshBuilder.CreateBox("skyBox", { size: 1000.0 }, this.scene);
    // const skyboxMaterial = new StandardMaterial("skyBox", this.scene);
    // skyboxMaterial.backFaceCulling = false;
    // skyboxMaterial.reflectionTexture = new CubeTexture("/textures/skybox", this.scene);
    // skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
    // skybox.material = skyboxMaterial;
    
    debugLog.verbose('scene', 'Environment setup complete');
  }

  public getEngine(): Engine {
    return this.engine;
  }

  public getScene(): Scene {
    return this.scene;
  }

  public startRenderLoop(renderCallback: () => void): void {
    this.engine.runRenderLoop(renderCallback);
    
    // Handle window resize
    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }

  public dispose(): void {
    this.scene.dispose();
    this.engine.dispose();
  }
}