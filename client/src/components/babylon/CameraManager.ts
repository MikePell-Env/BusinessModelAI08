
import { Scene, ArcRotateCamera, FreeCamera, Vector3 } from '@babylonjs/core';

export class CameraManager {
  private scene: Scene;
  private perspectiveCamera: ArcRotateCamera | null = null;
  private orthoCamera: FreeCamera | null = null;
  private orthoEventHandlers: any = null;

  constructor(scene: Scene, canvasElement: HTMLCanvasElement) {
    this.scene = scene;
    this.initializeCameras(canvasElement);
  }

  private initializeCameras(canvasElement: HTMLCanvasElement) {
    // Create perspective camera
    this.perspectiveCamera = new ArcRotateCamera(
      "perspectiveCamera",
      -Math.PI / 2.5,
      Math.PI / 6,
      25,
      Vector3.Zero(),
      this.scene
    );
    this.perspectiveCamera.setTarget(Vector3.Zero());
    this.perspectiveCamera.attachControl(canvasElement, true);
    
    // Camera limits
    this.perspectiveCamera.wheelPrecision = 50;
    this.perspectiveCamera.lowerRadiusLimit = 5;
    this.perspectiveCamera.upperRadiusLimit = 25;
    this.perspectiveCamera.lowerBetaLimit = 0.1;
    this.perspectiveCamera.upperBetaLimit = Math.PI / 2.2;

    // Create orthographic camera
    this.orthoCamera = new FreeCamera("orthoCamera", new Vector3(0, 15, 0), this.scene);
    this.orthoCamera.setTarget(Vector3.Zero());
    this.orthoCamera.rotation.x = Math.PI / 2;
    this.orthoCamera.rotation.y = 0;
    this.orthoCamera.rotation.z = 0;
    this.orthoCamera.mode = 1; // ORTHOGRAPHIC_CAMERA

    // Set orthographic projection
    const aspectRatio = canvasElement.width / canvasElement.height;
    const orthoSize = 8.5;
    
    if (aspectRatio > 1) {
      this.orthoCamera.orthoTop = orthoSize;
      this.orthoCamera.orthoBottom = -orthoSize;
      this.orthoCamera.orthoLeft = -orthoSize * aspectRatio;
      this.orthoCamera.orthoRight = orthoSize * aspectRatio;
    } else {
      this.orthoCamera.orthoTop = orthoSize / aspectRatio;
      this.orthoCamera.orthoBottom = -orthoSize / aspectRatio;
      this.orthoCamera.orthoLeft = -orthoSize;
      this.orthoCamera.orthoRight = orthoSize;
    }

    this.orthoCamera.minZ = 0.1;
    this.orthoCamera.maxZ = 100;
    this.orthoCamera.inputs.clear();
    
    this.setupOrthoControls(canvasElement);
  }

  private setupOrthoControls(canvas: HTMLCanvasElement) {
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      const currentSize = this.orthoCamera!.orthoTop || 8.5;
      const newSize = Math.max(2, Math.min(15, currentSize * zoomFactor));
      
      const aspectRatio = canvas.width / canvas.height;
      if (aspectRatio > 1) {
        this.orthoCamera!.orthoTop = newSize;
        this.orthoCamera!.orthoBottom = -newSize;
        this.orthoCamera!.orthoLeft = -newSize * aspectRatio;
        this.orthoCamera!.orthoRight = newSize * aspectRatio;
      } else {
        this.orthoCamera!.orthoTop = newSize / aspectRatio;
        this.orthoCamera!.orthoBottom = -newSize / aspectRatio;
        this.orthoCamera!.orthoLeft = -newSize;
        this.orthoCamera!.orthoRight = newSize;
      }
    };
    
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        canvas.style.cursor = 'grabbing';
        e.preventDefault();
      }
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - lastMouseX;
      const deltaY = e.clientY - lastMouseY;
      const moveSpeed = 0.02;
      
      this.orthoCamera!.position.x -= deltaX * moveSpeed;
      this.orthoCamera!.position.z -= deltaY * moveSpeed;
      this.orthoCamera!.setTarget(new Vector3(this.orthoCamera!.position.x, 0, this.orthoCamera!.position.z));
      
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      e.preventDefault();
    };
    
    const handleMouseUp = () => {
      isDragging = false;
      canvas.style.cursor = 'grab';
    };
    
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    
    canvas.style.cursor = 'grab';
    
    this.orthoEventHandlers = {
      wheel: handleWheel,
      mousedown: handleMouseDown,
      mousemove: handleMouseMove,
      mouseup: handleMouseUp,
      canvas: canvas
    };
  }

  setCameraMode(isOrthographic: boolean) {
    if (isOrthographic) {
      this.scene.activeCamera = this.orthoCamera;
    } else {
      this.scene.activeCamera = this.perspectiveCamera;
    }
  }

  getCameras() {
    return {
      perspective: this.perspectiveCamera,
      orthographic: this.orthoCamera
    };
  }

  restoreCameraState(alpha: number, beta: number, radius: number) {
    if (this.perspectiveCamera) {
      this.perspectiveCamera.alpha = alpha;
      this.perspectiveCamera.beta = beta;
      this.perspectiveCamera.radius = radius;
    }
  }

  dispose() {
    if (this.orthoEventHandlers && this.orthoEventHandlers.canvas) {
      const canvas = this.orthoEventHandlers.canvas;
      canvas.removeEventListener('wheel', this.orthoEventHandlers.wheel);
      canvas.removeEventListener('mousedown', this.orthoEventHandlers.mousedown);
      canvas.removeEventListener('mousemove', this.orthoEventHandlers.mousemove);
      canvas.removeEventListener('mouseup', this.orthoEventHandlers.mouseup);
      canvas.removeEventListener('mouseleave', this.orthoEventHandlers.mouseup);
      this.orthoEventHandlers = null;
    }
  }
}
