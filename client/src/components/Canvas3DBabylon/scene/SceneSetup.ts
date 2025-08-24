
import { 
  Scene, 
  ArcRotateCamera,
  HemisphericLight,
  DirectionalLight,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Color4,
  Vector3
} from '@babylonjs/core';

export interface CameraState {
  alpha: number;
  beta: number;
  radius: number;
}

export interface SceneSetupOptions {
  savedCameraState?: CameraState;
  isOrthographic?: boolean;
}

export class SceneSetup {
  private scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Initialize complete scene setup
   */
  initialize(options: SceneSetupOptions = {}) {
    // Set background color
    this.scene.clearColor = new Color4(233/255, 236/255, 239/255, 1.0);

    // Setup lighting
    this.setupLighting();

    // Create cameras
    const { perspectiveCamera, orthographicCamera } = this.setupCameras(options);

    // Create ground
    this.createGround();

    console.log('✅ Scene setup completed');

    return { perspectiveCamera, orthographicCamera };
  }

  /**
   * Setup scene lighting
   */
  private setupLighting(): void {
    // Ambient light
    const hemisphericLight = new HemisphericLight("hemisphericLight", new Vector3(0, 1, 0), this.scene);
    hemisphericLight.intensity = 1.3;

    // Directional light for shadows and definition
    const directionalLight = new DirectionalLight("directionalLight", new Vector3(-1, -1, -1), this.scene);
    directionalLight.intensity = 1.9;

    console.log('💡 Lighting setup completed');
  }

  /**
   * Setup cameras
   */
  private setupCameras(options: SceneSetupOptions) {
    const { savedCameraState, isOrthographic = false } = options;

    // Perspective camera
    const perspectiveCamera = new ArcRotateCamera(
      "perspectiveCamera",
      savedCameraState?.alpha ?? -Math.PI / 2.5,
      savedCameraState?.beta ?? Math.PI / 6,
      savedCameraState?.radius ?? 25,
      Vector3.Zero(),
      this.scene
    );
    
    if (this.scene.getEngine().getRenderingCanvas()) {
      perspectiveCamera.attachControl(this.scene.getEngine().getRenderingCanvas()!, true);
    }
    
    perspectiveCamera.wheelPrecision = 50;
    perspectiveCamera.lowerRadiusLimit = 5;
    perspectiveCamera.upperRadiusLimit = 25;
    perspectiveCamera.lowerBetaLimit = 0.1;
    perspectiveCamera.upperBetaLimit = Math.PI / 2.2;

    // Orthographic (top view) camera
    const orthographicCamera = new ArcRotateCamera(
      "topViewCamera",
      -Math.PI / 2,
      0.01,
      28,
      Vector3.Zero(),
      this.scene
    );
    orthographicCamera.fov = 0.6;
    orthographicCamera.lowerRadiusLimit = 15;
    orthographicCamera.upperRadiusLimit = 40;

    // Set active camera
    this.scene.activeCamera = isOrthographic ? orthographicCamera : perspectiveCamera;

    console.log('📹 Cameras setup completed');
    return { perspectiveCamera, orthographicCamera };
  }

  /**
   * Create ground plane
   */
  private createGround(): void {
    const ground = MeshBuilder.CreateGround("ground", { width: 20, height: 14 }, this.scene);
    const groundMaterial = new StandardMaterial("groundMaterial", this.scene);
    groundMaterial.diffuseColor = new Color3(0.8, 0.8, 0.9);
    groundMaterial.alpha = 0.5;
    ground.material = groundMaterial;
    ground.isPickable = false;

    console.log('🌍 Ground created');
  }
}
