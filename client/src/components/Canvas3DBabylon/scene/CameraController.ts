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
  public perspectiveCamera: ArcRotateCamera;
  public orthographicCamera: FreeCamera;
  private currentMode: CameraMode = '3D View';
  private savedStates: Map<CameraMode, CameraState> = new Map();
  private canvas: HTMLCanvasElement;

  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    this.scene = scene;
    this.canvas = canvas;
    
    // Initialize perspective camera (3D View)
    this.perspectiveCamera = this.createPerspectiveCamera(canvas);
    
    // Initialize orthographic camera (3D Top)
    this.orthographicCamera = this.createOrthographicCamera();
    
    // Setup orthographic controls
    this.setupOrthoControls();
    
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
      new Vector3(0, 15, 0),
      this.scene
    );
    
    // Point camera straight down
    camera.setTarget(new Vector3(0, 0, 0));
    
    // Set orthographic mode
    camera.mode = FreeCamera.ORTHOGRAPHIC_CAMERA;
    
    // Define orthographic viewing volume
    const aspectRatio = this.canvas.width / this.canvas.height;
    const orthoSize = 10;
    
    camera.orthoLeft = -orthoSize * aspectRatio;
    camera.orthoRight = orthoSize * aspectRatio;
    camera.orthoTop = orthoSize;
    camera.orthoBottom = -orthoSize;
    
    // Disable keyboard inputs
    camera.inputs.clear();
    camera.inputs.addMouse();
    // Configure mouse buttons if possible
    const mouseInput = camera.inputs.attached.mouse as any;
    if (mouseInput) {
      mouseInput.buttons = [1, 2]; // Only middle and right mouse for pan/zoom
    }
    
    return camera;
  }

  private setupOrthoControls(): void {
    // Configure inputs for top view
    this.orthographicCamera.attachControl(this.canvas, true);
    
    // Configure inputs for top view
    const inputs = (this.orthographicCamera as any).inputs;
    const pointerInput = inputs?.attached?.pointers;
    if (pointerInput) {
      pointerInput.angularSensibilityX = 0; // No horizontal rotation
      pointerInput.angularSensibilityY = 0; // No vertical rotation
      pointerInput.panningSensibility = 200; // Increase panning sensitivity
    }
    
    // Configure mouse wheel for zoom only  
    const mouseWheelInput = inputs?.attached?.mousewheel;
    if (mouseWheelInput) {
      mouseWheelInput.wheelPrecision = 80; // Balanced zoom sensitivity
    }
    
    // Set panning configuration
    (this.orthographicCamera as any).panningAxis = new Vector3(1, 0, 1); // Allow X and Z panning only
    (this.orthographicCamera as any).panningSensibility = 200; // Panning sensitivity
    (this.orthographicCamera as any).panningInertia = 0.9; // Smooth panning
    
    // Enable panning with left mouse (hold Ctrl) or middle mouse
    (this.orthographicCamera as any).panningMouseButton = 1; // Middle mouse for panning
    
    debugLog.verbose('camera', 'Orthographic controls configured: zoom (wheel) + pan (middle/ctrl+left) only, no rotation');
  }

  public switchToMode(mode: CameraMode): void {
    if (this.currentMode === mode) return;
    
    // Save current camera state
    this.saveCurrentState();
    
    // Switch camera
    if (mode === '3D Top') {
      this.scene.activeCamera = this.orthographicCamera;
      // Re-setup controls when switching to ortho
      this.setupOrthoControls();
    } else {
      this.scene.activeCamera = this.perspectiveCamera;
    }
    
    this.currentMode = mode;
    
    // Restore saved state if available
    this.restoreSavedState(mode);
    
    debugLog.info('camera', `Switched to ${mode} mode`);
  }

  private saveCurrentState(): void {
    const state: CameraState = {
      position: Vector3.Zero(),
      target: Vector3.Zero()
    };
    
    if (this.currentMode === '3D View' && this.perspectiveCamera) {
      state.position = this.perspectiveCamera.position.clone();
      state.target = this.perspectiveCamera.target.clone();
      state.alpha = this.perspectiveCamera.alpha;
      state.beta = this.perspectiveCamera.beta;
      state.radius = this.perspectiveCamera.radius;
    } else if (this.orthographicCamera) {
      state.position = this.orthographicCamera.position.clone();
      state.target = new Vector3(0, 0, 0);
    }
    
    this.savedStates.set(this.currentMode, state);
  }

  private restoreSavedState(mode: CameraMode): void {
    const state = this.savedStates.get(mode);
    if (!state) return;
    
    if (mode === '3D View' && this.perspectiveCamera) {
      if (state.alpha !== undefined) this.perspectiveCamera.alpha = state.alpha;
      if (state.beta !== undefined) this.perspectiveCamera.beta = state.beta;
      if (state.radius !== undefined) this.perspectiveCamera.radius = state.radius;
      this.perspectiveCamera.setTarget(state.target);
    } else if (this.orthographicCamera) {
      this.orthographicCamera.position = state.position.clone();
      this.orthographicCamera.setTarget(state.target);
    }
  }

  public getCurrentMode(): CameraMode {
    return this.currentMode;
  }

  public getActiveCamera(): ArcRotateCamera | FreeCamera {
    return this.currentMode === '3D View' ? this.perspectiveCamera : this.orthographicCamera;
  }

  public dispose(): void {
    this.perspectiveCamera.dispose();
    this.orthographicCamera.dispose();
  }
}