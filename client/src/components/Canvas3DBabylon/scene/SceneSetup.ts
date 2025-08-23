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
  CubeTexture
} from '@babylonjs/core';
import { debugLog } from '@/lib/debug/DebugLogger';

export class SceneSetup {
  private engine: Engine;
  private scene: Scene;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true);
    this.scene = new Scene(this.engine);
    this.setupScene();
    this.setupLighting();
    this.setupEnvironment();
  }

  private setupScene(): void {
    // Set background color to a subtle gradient (existing color)
    this.scene.clearColor = new Color4(0.05, 0.05, 0.1, 1.0);
    
    // Enable antialiasing and optimization
    this.scene.imageProcessingConfiguration.toneMappingEnabled = true;
    this.scene.imageProcessingConfiguration.contrast = 1.6;
    this.scene.imageProcessingConfiguration.exposure = 0.6;
    
    debugLog.verbose('scene', 'Scene initialized with optimized settings');
  }

  private setupLighting(): void {
    // Ambient light for overall illumination
    const hemisphericLight = new HemisphericLight(
      "HemiLight", 
      new Vector3(0, 1, 0), 
      this.scene
    );
    hemisphericLight.intensity = 0.6;
    hemisphericLight.diffuse = new Color3(0.9, 0.9, 1.0);
    hemisphericLight.specular = new Color3(0.1, 0.1, 0.2);
    hemisphericLight.groundColor = new Color3(0.1, 0.1, 0.15);

    // Main directional light (sun-like)
    const directionalLight = new DirectionalLight(
      "DirectionalLight", 
      new Vector3(-1, -2, -1), 
      this.scene
    );
    directionalLight.intensity = 0.8;
    directionalLight.diffuse = new Color3(1, 0.98, 0.95);
    directionalLight.specular = new Color3(0.2, 0.2, 0.25);

    // Secondary fill light
    const fillLight = new DirectionalLight(
      "FillLight", 
      new Vector3(1, -1, 0.5), 
      this.scene
    );
    fillLight.intensity = 0.3;
    fillLight.diffuse = new Color3(0.8, 0.85, 1.0);

    debugLog.verbose('scene', 'Lighting system configured');
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