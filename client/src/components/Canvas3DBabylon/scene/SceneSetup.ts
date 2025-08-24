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
    // Minimal lighting to match 3D View's rich shadows and depth
    const hemisphericLight = new HemisphericLight(
      "hemisphericLight", 
      new Vector3(0, 1, 0), 
      this.scene
    );
    hemisphericLight.intensity = 0.25; // Very low ambient to preserve shadows
    hemisphericLight.diffuse = new Color3(0.4, 0.4, 0.45); // Dark ambient light
    hemisphericLight.specular = new Color3(0.05, 0.05, 0.05); // Almost no ambient specular
    hemisphericLight.groundColor = new Color3(0.1, 0.1, 0.12); // Very dark ground

    // Single strong directional light from the side for dramatic shadows
    const directionalLight = new DirectionalLight(
      "directionalLight", 
      new Vector3(-1.5, -0.4, -0.8), // Extreme side angle for top-view shadows
      this.scene
    );
    directionalLight.intensity = 1.0; // Controlled intensity
    directionalLight.diffuse = new Color3(0.85, 0.83, 0.78); // Slightly warm light
    directionalLight.specular = new Color3(0.2, 0.18, 0.15); // Subtle specular only

    // Very subtle fill to prevent complete blackness
    const fillLight = new DirectionalLight(
      "fillLight",
      new Vector3(1.0, -0.3, 0.5), // Opposite side for minimal fill
      this.scene
    );
    fillLight.intensity = 0.25; // Very gentle fill
    fillLight.diffuse = new Color3(0.5, 0.52, 0.58); // Cool, dark fill
    fillLight.specular = new Color3(0.0, 0.0, 0.0); // No specular from fill

    debugLog.verbose('scene', 'Minimal lighting for rich shadows matching 3D View depth');
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