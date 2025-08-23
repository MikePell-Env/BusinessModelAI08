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
  ActionManager,
  MeshBuilder,
  StandardMaterial,
  DynamicTexture,
  Mesh
} from '@babylonjs/core';
import { debugLog } from '@/lib/debug/DebugLogger';

export class SceneSetup {
  private engine: Engine;
  public scene: Scene;
  private ground: Mesh | null = null;

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
    this.createGround();
    this.createRails();
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
    hemisphericLight.diffuse = new Color3(1, 1, 1);
    hemisphericLight.specular = new Color3(0.8, 0.8, 0.8);
    hemisphericLight.groundColor = new Color3(0.5, 0.5, 0.5); // Softer ground reflection
    
    // Main directional light - positioned to cast softer shadows
    const mainLight = new DirectionalLight(
      "mainLight", 
      new Vector3(-1, -2, -1), 
      this.scene
    );
    mainLight.position = new Vector3(10, 20, 10);
    mainLight.intensity = 1.8; // Increased for better illumination
    mainLight.diffuse = new Color3(1, 1, 1);
    mainLight.specular = new Color3(0.9, 0.9, 0.9); // Stronger highlights for polish
    
    // Fill light from opposite angle - softens shadows
    const fillLight = new DirectionalLight(
      "fillLight",
      new Vector3(1, -1, 1),
      this.scene
    );
    fillLight.position = new Vector3(-10, 15, -10);
    fillLight.intensity = 0.8; // Gentler fill light
    fillLight.diffuse = new Color3(0.95, 0.95, 1); // Slightly cool tint
    fillLight.specular = new Color3(0.4, 0.4, 0.4); // Subtle highlights
    
    // Rim light for edge highlighting - creates professional "pop"
    const rimLight = new DirectionalLight(
      "rimLight",
      new Vector3(0, 1, -1),
      this.scene
    );
    rimLight.position = new Vector3(0, 10, -15);
    rimLight.intensity = 0.6;
    rimLight.diffuse = new Color3(0.9, 0.9, 1); // Cool rim lighting
    rimLight.specular = new Color3(1, 1, 1); // Strong rim highlights
    
    debugLog.verbose('scene', 'Professional 4-point lighting setup complete');
  }

  private setupEnvironment(): void {
    // Create optimized environment for PBR materials to work properly
    const environmentHelper = this.scene.createDefaultEnvironment({
      createGround: false, // We create our own ground
      createSkybox: false, // Disable skybox to show scene clearColor background
      skyboxSize: 100,
      skyboxColor: new Color3(0.95, 0.95, 0.97), // Not used since createSkybox is false
      groundColor: new Color3(0.9, 0.9, 0.9)
    });
    
    debugLog.verbose('scene', 'Environment configured');
  }

  private createGround(): void {
    // Create ground with powder blue background and white gridlines
    this.ground = MeshBuilder.CreateGround("ground", { width: 20, height: 14 }, this.scene);
    
    // Create dynamic texture for powder blue grid pattern with white lines
    const gridTexture = new DynamicTexture("gridTexture", {width: 1024, height: 1024}, this.scene, false);
    const gridContext = gridTexture.getContext();
    
    // Fill with custom powder blue background
    gridContext.fillStyle = "#a7dbfc"; // Custom powder blue background
    gridContext.fillRect(0, 0, 1024, 1024);
    
    // Draw white grid lines
    gridContext.strokeStyle = "#FFFFFF"; // White grid lines
    gridContext.lineWidth = 1; // Thin 1px grid lines
    
    // Draw vertical lines (spacing every 32 pixels)
    for (let i = 0; i <= 1024; i += 32) {
      gridContext.beginPath();
      gridContext.moveTo(i, 0);
      gridContext.lineTo(i, 1024);
      gridContext.stroke();
    }
    
    // Draw horizontal lines (spacing every 32 pixels)
    for (let i = 0; i <= 1024; i += 32) {
      gridContext.beginPath();
      gridContext.moveTo(0, i);
      gridContext.lineTo(1024, i);
      gridContext.stroke();
    }
    
    gridTexture.update();
    
    // Apply powder blue material with white grid texture to ground
    const groundMaterial = new StandardMaterial("groundMaterial", this.scene);
    groundMaterial.diffuseTexture = gridTexture;
    groundMaterial.specularColor = new Color3(0.1, 0.1, 0.2); // Subtle blue-tinted specular reflection
    groundMaterial.specularPower = 64; // Higher value for sharper reflections
    groundMaterial.alpha = 0.5; // 50% opacity
    this.ground.material = groundMaterial;
    
    // Make ground pickable for background clicks
    this.ground.isPickable = true;
    this.ground.actionManager = new ActionManager(this.scene);
    
    debugLog.verbose('scene', 'Ground with grid texture created');
  }

  private createRails(): void {
    // Create extruded border rails on all sides
    const railHeight = 0.15; // Reduced from 0.3 to 0.15
    const railWidth = 0.2;
    const railColor = new Color3(0.3, 0.3, 0.3); // Darker grey rail color
    
    // Create rail material
    const railMaterial = new StandardMaterial("railMaterial", this.scene);
    railMaterial.diffuseColor = railColor;
    railMaterial.specularColor = new Color3(0, 0, 0);
    
    // North rail (back) - extends full width including rail thickness for flush corners
    const northRail = MeshBuilder.CreateBox("northRail", {
      width: 20 + railWidth*2, // Ground width + rail thickness on both sides for flush corners
      height: railHeight,
      depth: railWidth
    }, this.scene);
    northRail.position = new Vector3(0, railHeight/2, -7 - railWidth/2); // 14/2 = 7
    northRail.material = railMaterial;
    
    // South rail (front) - extends full width including rail thickness for flush corners
    const southRail = MeshBuilder.CreateBox("southRail", {
      width: 20 + railWidth*2, // Ground width + rail thickness on both sides for flush corners
      height: railHeight,
      depth: railWidth
    }, this.scene);
    southRail.position = new Vector3(0, railHeight/2, 7 + railWidth/2); // 14/2 = 7
    southRail.material = railMaterial;
    
    // East rail (right) - only spans ground depth (not including rail thickness to avoid overlap)
    const eastRail = MeshBuilder.CreateBox("eastRail", {
      width: railWidth,
      height: railHeight,
      depth: 14 // Only ground depth, no extension needed
    }, this.scene);
    eastRail.position = new Vector3(10 + railWidth/2, railHeight/2, 0); // 20/2 = 10
    eastRail.material = railMaterial;
    
    // West rail (left) - only spans ground depth (not including rail thickness to avoid overlap)
    const westRail = MeshBuilder.CreateBox("westRail", {
      width: railWidth,
      height: railHeight,
      depth: 14 // Only ground depth, no extension needed
    }, this.scene);
    westRail.position = new Vector3(-10 - railWidth/2, railHeight/2, 0); // 20/2 = 10
    westRail.material = railMaterial;
    
    debugLog.verbose('scene', 'Border rails created');
  }

  public getGround(): Mesh | null {
    return this.ground;
  }

  public getEngine(): Engine {
    return this.engine;
  }

  public getScene(): Scene {
    return this.scene;
  }

  public startRenderLoop(renderCallback: () => void): void {
    this.engine.runRenderLoop(renderCallback);
  }

  public stopRenderLoop(): void {
    this.engine.stopRenderLoop();
  }

  public resize(): void {
    this.engine.resize();
  }

  public dispose(): void {
    this.scene.dispose();
    this.engine.dispose();
  }
}