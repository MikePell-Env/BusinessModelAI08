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
    // Dramatic lighting setup for strong top surface shading and shadows
    const hemisphericLight = new HemisphericLight(
      "hemisphericLight", 
      new Vector3(0, 1, 0), 
      this.scene
    );
    hemisphericLight.intensity = 0.4; // Much lower ambient for stronger shadows
    hemisphericLight.diffuse = new Color3(0.6, 0.6, 0.7); // Darker ambient light
    hemisphericLight.specular = new Color3(0.05, 0.05, 0.05); // Minimal specular from ambient
    hemisphericLight.groundColor = new Color3(0.15, 0.15, 0.2); // Very dark ground for depth

    // Main directional light from upper angle to create top surface shadows
    const directionalLight = new DirectionalLight(
      "directionalLight", 
      new Vector3(-1.0, -0.8, -0.8), // Steeper angle for better top surface shadows
      this.scene
    );
    directionalLight.intensity = 1.8; // Strong directional lighting
    directionalLight.diffuse = new Color3(1.0, 0.98, 0.95); // Warm white light
    directionalLight.specular = new Color3(0.4, 0.38, 0.35); // Enhanced specular for surface detail

    // Secondary angled light for additional surface definition
    const secondaryLight = new DirectionalLight(
      "secondaryLight",
      new Vector3(0.6, -0.7, -1.0), // Different angle for cross-shadowing
      this.scene
    );
    secondaryLight.intensity = 0.8; // Medium strength secondary light
    secondaryLight.diffuse = new Color3(0.85, 0.88, 0.9); // Cool secondary light
    secondaryLight.specular = new Color3(0.2, 0.22, 0.25);

    // Rim light from side for edge definition
    const rimLight = new DirectionalLight(
      "rimLight",
      new Vector3(1.5, -0.2, 0.5), // Low side angle for rim lighting
      this.scene
    );
    rimLight.intensity = 0.5; // Moderate rim lighting
    rimLight.diffuse = new Color3(0.7, 0.75, 0.8); // Cool rim color
    rimLight.specular = new Color3(0.15, 0.18, 0.2);

    debugLog.verbose('scene', 'Dramatic lighting system configured for strong top surface shading');
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