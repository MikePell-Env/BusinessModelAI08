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
    // High-contrast dramatic lighting for maximum shadow definition and visual polish
    const hemisphericLight = new HemisphericLight(
      "hemisphericLight", 
      new Vector3(0, 1, 0), 
      this.scene
    );
    hemisphericLight.intensity = 0.15; // Extremely low ambient for deep shadows
    hemisphericLight.diffuse = new Color3(0.35, 0.35, 0.4); // Very dark ambient
    hemisphericLight.specular = new Color3(0.02, 0.02, 0.02); // Almost no ambient specular
    hemisphericLight.groundColor = new Color3(0.08, 0.08, 0.1); // Nearly black ground light

    // Primary directional light for sharp shadow casting
    const directionalLight = new DirectionalLight(
      "directionalLight", 
      new Vector3(-1.2, -0.6, -1.0), // Sharp angle for dramatic shadows
      this.scene
    );
    directionalLight.intensity = 2.2; // Very strong primary light
    directionalLight.diffuse = new Color3(1.0, 0.96, 0.88); // Warm dramatic light
    directionalLight.specular = new Color3(0.6, 0.55, 0.5); // Strong specular highlights

    // Secondary light for depth and surface modeling
    const secondaryLight = new DirectionalLight(
      "secondaryLight",
      new Vector3(0.8, -0.5, -1.2), // Opposing angle for complex shadows
      this.scene
    );
    secondaryLight.intensity = 0.6; // Reduced secondary for shadow preservation
    secondaryLight.diffuse = new Color3(0.7, 0.75, 0.82); // Cool fill light
    secondaryLight.specular = new Color3(0.15, 0.18, 0.22);

    // Key light from high angle for top surface definition
    const keyLight = new DirectionalLight(
      "keyLight",
      new Vector3(-0.4, -0.9, -0.3), // High angle for top surface shadows
      this.scene
    );
    keyLight.intensity = 1.0; // Strong key light
    keyLight.diffuse = new Color3(0.95, 0.92, 0.85); // Warm key light
    keyLight.specular = new Color3(0.3, 0.28, 0.25);

    // Subtle rim light for edge separation
    const rimLight = new DirectionalLight(
      "rimLight",
      new Vector3(1.8, -0.1, 0.3), // Low grazing angle
      this.scene
    );
    rimLight.intensity = 0.4; // Subtle but defined rim
    rimLight.diffuse = new Color3(0.6, 0.65, 0.75); // Cool rim separation
    rimLight.specular = new Color3(0.12, 0.15, 0.18);

    debugLog.verbose('scene', 'High-contrast lighting configured for maximum shadow definition');
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