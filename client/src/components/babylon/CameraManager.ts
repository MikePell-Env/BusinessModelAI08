import { Scene, ArcRotateCamera, FreeCamera, Vector3 } from '@babylonjs/core';

export class CameraManager {
  private scene: Scene;
  private canvas: HTMLCanvasElement;
  private perspectiveCamera: ArcRotateCamera | null = null;
  private orthographicCamera: FreeCamera | null = null;
  private orthoEventHandlers: any = null;

  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    this.scene = scene;
    this.canvas = canvas;
    this.initializeCameras(canvas);
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

    // Create orthographic camera - positioned higher and adjusted for BMC model
    this.orthographicCamera = new FreeCamera("orthoCamera", new Vector3(0, 20, 0), this.scene);
    this.orthographicCamera.setTarget(new Vector3(0, 0, 0.9)); // Target the BMC model position
    this.orthographicCamera.rotation.x = Math.PI / 2;
    this.orthographicCamera.rotation.y = 0;
    this.orthographicCamera.rotation.z = 0;
    this.orthographicCamera.mode = 1; // ORTHOGRAPHIC_CAMERA

    // Set orthographic projection - adjusted for scaled BMC model
    const aspectRatio = canvasElement.width / canvasElement.height;
    const orthoSize = 12; // Increased to accommodate 8x scaled BMC model

    if (aspectRatio > 1) {
      this.orthographicCamera.orthoTop = orthoSize;
      this.orthographicCamera.orthoBottom = -orthoSize;
      this.orthographicCamera.orthoLeft = -orthoSize * aspectRatio;
      this.orthographicCamera.orthoRight = orthoSize * aspectRatio;
    } else {
      this.orthographicCamera.orthoTop = orthoSize / aspectRatio;
      this.orthographicCamera.orthoBottom = -orthoSize / aspectRatio;
      this.orthographicCamera.orthoLeft = -orthoSize;
      this.orthographicCamera.orthoRight = orthoSize;
    }

    this.orthographicCamera.minZ = 0.1;
    this.orthographicCamera.maxZ = 100;
    this.orthographicCamera.inputs.clear();

    this.setupOrthoControls(canvasElement);
  }

  private setupOrthoControls(canvas: HTMLCanvasElement) {
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      const currentSize = this.orthographicCamera!.orthoTop || 8.5;
      const newSize = Math.max(2, Math.min(15, currentSize * zoomFactor));

      const aspectRatio = canvas.width / canvas.height;
      if (aspectRatio > 1) {
        this.orthographicCamera!.orthoTop = newSize;
        this.orthographicCamera!.orthoBottom = -newSize;
        this.orthographicCamera!.orthoLeft = -newSize * aspectRatio;
        this.orthographicCamera!.orthoRight = newSize * aspectRatio;
      } else {
        this.orthographicCamera!.orthoTop = newSize / aspectRatio;
        this.orthographicCamera!.orthoBottom = -newSize / aspectRatio;
        this.orthographicCamera!.orthoLeft = -newSize;
        this.orthographicCamera!.orthoRight = newSize;
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

      this.orthographicCamera!.position.x -= deltaX * moveSpeed;
      this.orthographicCamera!.position.z -= deltaY * moveSpeed;
      this.orthographicCamera!.setTarget(new Vector3(this.orthographicCamera!.position.x, 0, this.orthographicCamera!.position.z));

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
      this.scene.activeCamera = this.orthographicCamera;
    } else {
      this.scene.activeCamera = this.perspectiveCamera;
    }
  }

  getCameras() {
    return {
      perspective: this.perspectiveCamera,
      orthographic: this.orthographicCamera
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