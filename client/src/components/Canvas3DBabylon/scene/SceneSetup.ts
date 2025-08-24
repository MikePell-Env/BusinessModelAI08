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
    // Natural lighting setup matching 3D View shadow quality
    const hemisphericLight = new HemisphericLight(
      "hemisphericLight", 
      new Vector3(0, 1, 0), 
      this.scene
    );
    hemisphericLight.intensity = 0.3; // Low but not extreme ambient
    hemisphericLight.diffuse = new Color3(0.5, 0.5, 0.55); // Neutral ambient
    hemisphericLight.specular = new Color3(0.1, 0.1, 0.1); // Minimal ambient specular
    hemisphericLight.groundColor = new Color3(0.2, 0.2, 0.25); // Subtle ground light

    // Main directional light for natural shadow casting
    const directionalLight = new DirectionalLight(
      "directionalLight", 
      new Vector3(-0.8, -1.0, -0.6), // Natural angle for good shadows
      this.scene
    );
    directionalLight.intensity = 1.2; // Moderate strength
    directionalLight.diffuse = new Color3(0.9, 0.88, 0.82); // Warm natural light
    directionalLight.specular = new Color3(0.25, 0.23, 0.2); // Moderate specular

    // Fill light for shadow detail
    const fillLight = new DirectionalLight(
      "fillLight",
      new Vector3(0.6, -0.8, -0.8), // Fill in shadows softly
      this.scene
    );
    fillLight.intensity = 0.4; // Gentle fill
    fillLight.diffuse = new Color3(0.65, 0.68, 0.75); // Cool fill light
    fillLight.specular = new Color3(0.08, 0.1, 0.12); // Very subtle specular

    debugLog.verbose('scene', 'Natural lighting configured to match 3D View shadow quality');
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