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

export type CameraMode = '3D View';

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
  // Removed orthographic camera - only perspective needed
  private currentMode: CameraMode = '3D View';
  private savedStates: Map<CameraMode, CameraState> = new Map();

  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    this.scene = scene;

    // Initialize perspective camera (3D View)
    this.perspectiveCamera = this.createPerspectiveCamera(canvas);

    // Only perspective camera needed

    // Set initial active camera
    this.scene.activeCamera = this.perspectiveCamera;

    debugLog.verbose('camera', 'Camera controller initialized');
  }

  private createPerspectiveCamera(canvas: HTMLCanvasElement): ArcRotateCamera {
    // Use TOP preset values for default initialization
    const camera = new ArcRotateCamera(
      "PerspectiveCamera",
      Math.PI/2,             // alpha: TOP preset (90 degrees rotation)
      0.01,                  // beta: TOP preset (almost perfectly top-down)
      55,                    // radius: TOP preset (proper zoom level)
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

  // Removed orthographic camera - only perspective needed

  public switchToMode(mode: CameraMode): void {
    // Only 3D View mode available now
    this.scene.activeCamera = this.perspectiveCamera;
    this.currentMode = mode;
    debugLog.info('camera', 'Camera set to 3D View (perspective)');
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
    }
  }

  public getCurrentMode(): CameraMode {
    return this.currentMode;
  }

  public getActiveCamera(): ArcRotateCamera | FreeCamera {
    return this.scene.activeCamera as ArcRotateCamera | FreeCamera;
  }

  public resetCamera(): void {
    // Reset perspective camera to TOP preset values for consistent initialization
    this.perspectiveCamera.alpha = Math.PI/2;
    this.perspectiveCamera.beta = 0.01;
    this.perspectiveCamera.radius = 55;
    this.perspectiveCamera.setTarget(Vector3.Zero());
    debugLog.info('camera', 'Camera reset to default state');
  }
}