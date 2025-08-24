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
    // Set background to match 2D view (#e9ecef - light gray)
    // #e9ecef = RGB(233, 236, 239) = normalized (0.914, 0.925, 0.937)
    this.scene.clearColor = new Color4(233/255, 236/255, 239/255, 1.0);
    
    // Enable pointer interactions on the scene
    this.scene.actionManager = new ActionManager(this.scene);
    
    debugLog.verbose('scene', 'Scene initialized with optimized settings');
  }

  private setupLighting(): void {
    // Enhanced lighting setup with better material highlighting
    const hemisphericLight = new HemisphericLight(
      "hemisphericLight", 
      new Vector3(0, 1, 0), 
      this.scene
    );
    hemisphericLight.intensity = 1.3; // Slightly increased for better ambient
    hemisphericLight.diffuse = new Color3(0.95, 0.95, 0.95); // Brighter neutral ambient
    hemisphericLight.specular = new Color3(0.3, 0.3, 0.3); // Increased for better reflections
    hemisphericLight.groundColor = new Color3(0.4, 0.4, 0.45); // Add ground color for depth

    const directionalLight = new DirectionalLight(
      "directionalLight", 
      new Vector3(-1, -1, -1), 
      this.scene
    );
    directionalLight.intensity = 1.9; // Slightly stronger for better definition
    directionalLight.diffuse = new Color3(1, 1, 1);
    directionalLight.specular = new Color3(0.4, 0.4, 0.4); // Enhanced specular highlights

    // Add subtle rim light for edge definition
    const rimLight = new DirectionalLight(
      "rimLight",
      new Vector3(1, 0.5, 1),
      this.scene
    );
    rimLight.intensity = 0.5; // Subtle rim lighting
    rimLight.diffuse = new Color3(0.8, 0.8, 0.9); // Cool rim color
    rimLight.specular = new Color3(0.2, 0.2, 0.2);

    debugLog.verbose('scene', 'Enhanced lighting system configured');
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