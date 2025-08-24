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
    // Balanced lighting setup for better shading and less blown-out colors
    const hemisphericLight = new HemisphericLight(
      "hemisphericLight", 
      new Vector3(0, 1, 0), 
      this.scene
    );
    hemisphericLight.intensity = 0.7; // Reduced for more contrast and shadow definition
    hemisphericLight.diffuse = new Color3(0.8, 0.8, 0.85); // Softer ambient light
    hemisphericLight.specular = new Color3(0.1, 0.1, 0.1); // Minimal specular from ambient
    hemisphericLight.groundColor = new Color3(0.25, 0.25, 0.3); // Darker ground for more depth

    const directionalLight = new DirectionalLight(
      "directionalLight", 
      new Vector3(-0.8, -1.2, -0.6), // Adjusted angle for better shadow casting
      this.scene
    );
    directionalLight.intensity = 1.4; // Reduced from 1.9 but still strong enough for definition
    directionalLight.diffuse = new Color3(0.95, 0.95, 1.0); // Slightly cool tone
    directionalLight.specular = new Color3(0.3, 0.3, 0.35); // Reduced specular highlights

    // Add subtle rim light for edge definition
    const rimLight = new DirectionalLight(
      "rimLight",
      new Vector3(1.2, 0.3, 0.8), // More side-angle for better edge separation
      this.scene
    );
    rimLight.intensity = 0.3; // Reduced for subtlety
    rimLight.diffuse = new Color3(0.6, 0.65, 0.7); // Softer cool rim color
    rimLight.specular = new Color3(0.1, 0.1, 0.15);

    debugLog.verbose('scene', 'Balanced lighting system configured for better shading');
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