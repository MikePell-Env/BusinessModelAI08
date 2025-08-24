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
  private topViewCamera: ArcRotateCamera;
  private currentMode: CameraMode = '3D View';
  private savedStates: Map<CameraMode, CameraState> = new Map();

  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    this.scene = scene;
    
    // Initialize perspective camera (3D View)
    this.perspectiveCamera = this.createPerspectiveCamera(canvas);
    
    // Initialize top view camera (3D Top) - perspective, not orthographic
    this.topViewCamera = this.createTopViewCamera(canvas);
    
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

  private createTopViewCamera(canvas: HTMLCanvasElement): ArcRotateCamera {
    const camera = new ArcRotateCamera(
      "TopViewCamera",
      Tools.ToRadians(-90),  // alpha (horizontal rotation)
      Tools.ToRadians(0.1),  // beta (almost straight down)
      30,                    // radius (distance)
      new Vector3(0, 0, 0),  // target
      this.scene
    );
    
    // Position directly above looking down
    camera.setPosition(new Vector3(0, 30, 0));
    camera.setTarget(Vector3.Zero());
    
    // Minimal rotation limits for top view
    camera.lowerBetaLimit = 0.05;
    camera.upperBetaLimit = 0.2; // Allow slight angle adjustment
    
    // Zoom limits
    camera.lowerRadiusLimit = 15;
    camera.upperRadiusLimit = 50;
    
    // Controls
    camera.attachControl(canvas, true);
    camera.wheelPrecision = 50;
    camera.panningSensibility = 100;
    camera.angularSensibilityX = 500;
    camera.angularSensibilityY = 500;
    
    return camera;
  }

  public switchToMode(mode: CameraMode): void {
    // Save current camera state
    this.saveCameraState();
    
    // Switch camera based on mode
    if (mode === '3D Top') {
      this.scene.activeCamera = this.topViewCamera;
      
      // Position for top-down view (perspective)
      this.topViewCamera.position = new Vector3(0, 30, 0);
      this.topViewCamera.setTarget(new Vector3(0, 0, 0));
      this.topViewCamera.beta = Tools.ToRadians(0.1); // Almost straight down
      this.topViewCamera.radius = 30;
      
      debugLog.info('camera', 'Switched to 3D Top view (perspective)');
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
    } else if (this.currentMode === '3D Top' && this.topViewCamera) {
      this.savedStates.set('3D Top', {
        position: this.topViewCamera.position.clone(),
        target: this.topViewCamera.target.clone(),
        alpha: this.topViewCamera.alpha,
        beta: this.topViewCamera.beta,
        radius: this.topViewCamera.radius
      });
    }
  }

  public getCurrentMode(): CameraMode {
    return this.currentMode;
  }

  public getActiveCamera(): ArcRotateCamera {
    return this.scene.activeCamera as ArcRotateCamera;
  }

  public resetCamera(): void {
    if (this.currentMode === '3D View') {
      this.perspectiveCamera.setPosition(new Vector3(-20, 15, -20));
      this.perspectiveCamera.setTarget(Vector3.Zero());
    } else {
      this.topViewCamera.position = new Vector3(0, 30, 0);
      this.topViewCamera.setTarget(new Vector3(0, 0, 0));
      this.topViewCamera.beta = Tools.ToRadians(0.1);
      this.topViewCamera.radius = 30;
    }
    
    debugLog.info('camera', `Camera reset for ${this.currentMode} mode`);
  }
}