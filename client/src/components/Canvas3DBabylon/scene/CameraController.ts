/**
 * Camera controller for BMC 3D visualization
 * Manages perspective and orthographic camera modes
 */

import { 
  Scene,
  ArcRotateCamera,
  FreeCamera,
  Vector3,
  Tools
} from '@babylonjs/core';
import { debugLog } from '@/lib/debug/DebugLogger';

export type CameraMode = '3D View' | '3D Top';

interface CameraState {
  position: Vector3;
  target: Vector3;
  alpha?: number;
  beta?: number;
  radius?: number;
}

export class CameraController {
  private scene: Scene;
  private perspectiveCamera: ArcRotateCamera;
  private orthographicCamera: FreeCamera;
  private currentMode: CameraMode = '3D View';
  private savedStates: Map<CameraMode, CameraState> = new Map();

  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    this.scene = scene;
    
    // Initialize perspective camera (3D View)
    this.perspectiveCamera = this.createPerspectiveCamera(canvas);
    
    // Initialize orthographic camera (3D Top)
    this.orthographicCamera = this.createOrthographicCamera();
    
    // Set initial active camera
    this.scene.activeCamera = this.perspectiveCamera;
    
    debugLog.verbose('camera', 'Camera controller initialized');
  }

  private createPerspectiveCamera(canvas: HTMLCanvasElement): ArcRotateCamera {
    const camera = new ArcRotateCamera(
      "PerspectiveCamera",
      Tools.ToRadians(-90),  // alpha (horizontal rotation)
      Tools.ToRadians(60),   // beta (vertical rotation)
      25,                    // radius (distance)
      new Vector3(0, 0, 0),  // target
      this.scene
    );
    
    // Camera positioning and constraints
    camera.setPosition(new Vector3(-20, 15, -20));
    camera.setTarget(Vector3.Zero());
    
    // Rotation limits
    camera.lowerBetaLimit = 0.1;
    camera.upperBetaLimit = Math.PI / 2 - 0.1;
    
    // Zoom limits
    camera.lowerRadiusLimit = 10;
    camera.upperRadiusLimit = 50;
    
    // Controls
    camera.attachControl(canvas, true);
    camera.wheelPrecision = 50;
    camera.panningSensibility = 100;
    camera.angularSensibilityX = 500;
    camera.angularSensibilityY = 500;
    
    return camera;
  }

  private createOrthographicCamera(): FreeCamera {
    const camera = new FreeCamera(
      "OrthographicCamera",
      new Vector3(0, 30, 0),
      this.scene
    );
    
    // Look straight down with proper rotation for reference image match
    camera.setTarget(new Vector3(0, 0, 0));
    
    // Rotate camera to match reference image orientation:
    // - Cost Structure (red) at bottom-left
    // - Revenue Streams (green) at bottom-right
    camera.rotation.z = Math.PI; // 180-degree rotation around Z-axis
    
    // Set orthographic mode
    camera.mode = FreeCamera.ORTHOGRAPHIC_CAMERA;
    
    // Define the orthographic view box
    const orthoSize = 15;
    camera.orthoLeft = -orthoSize;
    camera.orthoRight = orthoSize;
    camera.orthoTop = orthoSize;
    camera.orthoBottom = -orthoSize;
    
    return camera;
  }

  public switchToMode(mode: CameraMode): void {
    // Save current camera state
    this.saveCameraState();
    
    // Switch camera based on mode
    if (mode === '3D Top') {
      this.scene.activeCamera = this.orthographicCamera;
      
      // Position for top-down view with proper orientation
      this.orthographicCamera.position = new Vector3(0, 30, 0);
      this.orthographicCamera.setTarget(new Vector3(0, 0, 0));
      this.orthographicCamera.rotation.z = Math.PI; // 180-degree rotation around Z-axis
      
      debugLog.info('camera', 'Switched to 3D Top view (orthographic)');
    } else {
      this.scene.activeCamera = this.perspectiveCamera;
      
      // Restore saved state if available
      const savedState = this.savedStates.get('3D View');
      if (savedState) {
        this.perspectiveCamera.setPosition(savedState.position);
        this.perspectiveCamera.setTarget(savedState.target);
        if (savedState.alpha !== undefined) this.perspectiveCamera.alpha = savedState.alpha;
        if (savedState.beta !== undefined) this.perspectiveCamera.beta = savedState.beta;
        if (savedState.radius !== undefined) this.perspectiveCamera.radius = savedState.radius;
      }
      
      debugLog.info('camera', 'Switched to 3D View (perspective)');
    }
    
    this.currentMode = mode;
  }

  private saveCameraState(): void {
    if (this.currentMode === '3D View' && this.perspectiveCamera) {
      this.savedStates.set('3D View', {
        position: this.perspectiveCamera.position.clone(),
        target: this.perspectiveCamera.target.clone(),
        alpha: this.perspectiveCamera.alpha,
        beta: this.perspectiveCamera.beta,
        radius: this.perspectiveCamera.radius
      });
    } else if (this.currentMode === '3D Top' && this.orthographicCamera) {
      this.savedStates.set('3D Top', {
        position: this.orthographicCamera.position.clone(),
        target: this.orthographicCamera.getTarget().clone()
      });
    }
  }

  public getCurrentMode(): CameraMode {
    return this.currentMode;
  }

  public getActiveCamera(): ArcRotateCamera | FreeCamera {
    return this.scene.activeCamera as ArcRotateCamera | FreeCamera;
  }

  public resetCamera(): void {
    if (this.currentMode === '3D View') {
      this.perspectiveCamera.setPosition(new Vector3(-20, 15, -20));
      this.perspectiveCamera.setTarget(Vector3.Zero());
    } else {
      this.orthographicCamera.position = new Vector3(0, 30, 0);
      this.orthographicCamera.setTarget(new Vector3(0, 0, 0));
      this.orthographicCamera.rotation.z = Math.PI; // 180-degree rotation around Z-axis
    }
    
    debugLog.info('camera', `Camera reset for ${this.currentMode} mode`);
  }
}