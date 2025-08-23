import React, { useRef, MutableRefObject } from 'react';
import { 
  ArcRotateCamera,
  FreeCamera,
  Vector3,
  Scene,
  Engine
} from '@babylonjs/core';

interface CameraControllerProps {
  scene: Scene | null;
  canvas: HTMLCanvasElement | null;
  isOrthographic: boolean;
  camera3DState: { alpha: number; beta: number; radius: number } | null;
  onSaveCamera3DState: (alpha: number, beta: number, radius: number) => void;
}

interface CameraRefs {
  perspectiveCamera: MutableRefObject<ArcRotateCamera | null>;
  orthographicCamera: MutableRefObject<FreeCamera | null>;
  orthoEventHandlers: MutableRefObject<any>;
}

export const useCameraController = ({
  scene,
  canvas,
  isOrthographic,
  camera3DState,
  onSaveCamera3DState
}: CameraControllerProps): CameraRefs => {
  const perspectiveCameraRef = useRef<ArcRotateCamera | null>(null);
  const orthographicCameraRef = useRef<FreeCamera | null>(null);
  const orthoEventHandlersRef = useRef<any>(null);

  const initializePerspectiveCamera = () => {
    // Create perspective camera (ArcRotateCamera for orbital controls)
    const perspectiveCamera = new ArcRotateCamera(
      "perspectiveCamera", 
      Math.PI / 4,    // alpha (horizontal rotation)
      Math.PI / 3,    // beta (vertical rotation) 
      12,             // radius (distance from target)
      new Vector3(0, 1, 0), // target position
      scene
    );

    // Restore camera state if available
    if (camera3DState) {
      perspectiveCamera.alpha = camera3DState.alpha;
      perspectiveCamera.beta = camera3DState.beta;
      perspectiveCamera.radius = camera3DState.radius;
    }

    // Configure camera controls
    perspectiveCamera.attachControl(canvas, true);
    perspectiveCamera.setTarget(Vector3.Zero());
    
    // Set camera limits for better UX
    perspectiveCamera.lowerRadiusLimit = 8;
    perspectiveCamera.upperRadiusLimit = 20;
    perspectiveCamera.lowerBetaLimit = 0.1;
    perspectiveCamera.upperBetaLimit = (Math.PI / 2) * 0.9;

    // Auto-save camera state on changes
    perspectiveCamera.onViewMatrixChangedObservable.add(() => {
      onSaveCamera3DState(
        perspectiveCamera.alpha,
        perspectiveCamera.beta,
        perspectiveCamera.radius
      );
    });

    perspectiveCameraRef.current = perspectiveCamera;
    return perspectiveCamera;
  };

  const initializeOrthographicCamera = () => {
    // Create orthographic camera for top-down view
    const orthoCamera = new FreeCamera("orthographicCamera", new Vector3(0, 15, 0), scene);
    orthoCamera.setTarget(new Vector3(0, 0, 0));
    orthoCamera.mode = FreeCamera.ORTHOGRAPHIC_CAMERA;

    // Set orthographic bounds
    const aspectRatio = canvas.width / canvas.height;
    const orthoSize = 8.5;
    
    if (aspectRatio > 1) {
      orthoCamera.orthoTop = orthoSize;
      orthoCamera.orthoBottom = -orthoSize;
      orthoCamera.orthoLeft = -orthoSize * aspectRatio;
      orthoCamera.orthoRight = orthoSize * aspectRatio;
    } else {
      orthoCamera.orthoTop = orthoSize / aspectRatio;
      orthoCamera.orthoBottom = -orthoSize / aspectRatio;
      orthoCamera.orthoLeft = -orthoSize;
      orthoCamera.orthoRight = orthoSize;
    }

    // Disable default rotation controls for pure top-down view
    orthoCamera.inputs.clear();

    orthographicCameraRef.current = orthoCamera;
    return orthoCamera;
  };

  const setupOrthographicControls = (orthoCamera: FreeCamera) => {
    if (!canvas || !orthoCamera) return;

    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaY > 0 ? 1.1 : 0.9;
      const currentSize = orthoCamera.orthoTop || 8.5;
      const newSize = Math.max(2, Math.min(15, currentSize * delta));
      
      const aspectRatio = canvas.width / canvas.height;
      if (aspectRatio > 1) {
        orthoCamera.orthoTop = newSize;
        orthoCamera.orthoBottom = -newSize;
        orthoCamera.orthoLeft = -newSize * aspectRatio;
        orthoCamera.orthoRight = newSize * aspectRatio;
      } else {
        orthoCamera.orthoTop = newSize / aspectRatio;
        orthoCamera.orthoBottom = -newSize / aspectRatio;
        orthoCamera.orthoLeft = -newSize;
        orthoCamera.orthoRight = newSize;
      }
    };

    const onMouseDown = (event: MouseEvent) => {
      if (event.button === 0) {
        isDragging = true;
        lastX = event.clientX;
        lastY = event.clientY;
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!isDragging) return;
      
      const deltaX = event.clientX - lastX;
      const deltaY = event.clientY - lastY;
      const sensitivity = 0.02;
      
      if (event.shiftKey) {
        // Shift + drag: Horizontal translation (Z-axis movement)
        const translationZ = -deltaY * sensitivity;
        
        orthoCamera.position.z += translationZ;
        const target = orthoCamera.getTarget();
        target.z += translationZ;
        orthoCamera.setTarget(target);
      } else {
        // Normal drag: Left/right panning (X-axis)
        const translationX = deltaX * sensitivity;
        
        orthoCamera.position.x -= translationX;
        const target = orthoCamera.getTarget();
        target.x -= translationX;
        orthoCamera.setTarget(target);
      }
      
      lastX = event.clientX;
      lastY = event.clientY;
      event.preventDefault();
      event.stopPropagation();
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    // Add event listeners
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('mousedown', onMouseDown, true);
    canvas.addEventListener('mousemove', onMouseMove, true);
    canvas.addEventListener('mouseup', onMouseUp, true);
    canvas.addEventListener('mouseleave', onMouseUp, true);

    // Store handlers for cleanup
    orthoEventHandlersRef.current = {
      wheel: onWheel,
      mousedown: onMouseDown,
      mousemove: onMouseMove,
      mouseup: onMouseUp,
      canvas: canvas
    };
  };

  const switchCamera = (useOrthographic: boolean) => {
    const perspectiveCamera = perspectiveCameraRef.current;
    const orthoCamera = orthographicCameraRef.current;
    
    if (!perspectiveCamera || !orthoCamera) return;

    if (useOrthographic) {
      scene.activeCamera = orthoCamera;
      setupOrthographicControls(orthoCamera);
    } else {
      // Clean up orthographic controls
      if (orthoEventHandlersRef.current && orthoEventHandlersRef.current.canvas) {
        const canvas = orthoEventHandlersRef.current.canvas;
        const handlers = orthoEventHandlersRef.current;
        if (handlers.wheel) canvas.removeEventListener('wheel', handlers.wheel);
        if (handlers.mousedown) canvas.removeEventListener('mousedown', handlers.mousedown, true);
        if (handlers.mousemove) canvas.removeEventListener('mousemove', handlers.mousemove, true);
        if (handlers.mouseup) {
          canvas.removeEventListener('mouseup', handlers.mouseup, true);
          canvas.removeEventListener('mouseleave', handlers.mouseup, true);
        }
      }
      
      scene.activeCamera = perspectiveCamera;
    }
  };

  // Initialize cameras
  React.useEffect(() => {
    if (scene && canvas) {
      const perspectiveCamera = initializePerspectiveCamera();
      const orthoCamera = initializeOrthographicCamera();
      
      // Set initial active camera
      scene.activeCamera = isOrthographic ? orthoCamera : perspectiveCamera;
    }
  }, [scene, canvas]);

  // Early return if scene or canvas not ready
  if (!scene || !canvas) {
    return {
      perspectiveCamera: { current: null },
      orthographicCamera: { current: null },
      orthoEventHandlers: { current: null }
    };
  }

  // Handle camera switching
  React.useEffect(() => {
    switchCamera(isOrthographic);
  }, [isOrthographic]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (orthoEventHandlersRef.current && orthoEventHandlersRef.current.canvas) {
        const canvas = orthoEventHandlersRef.current.canvas;
        const handlers = orthoEventHandlersRef.current;
        if (handlers.wheel) canvas.removeEventListener('wheel', handlers.wheel);
        if (handlers.mousedown) canvas.removeEventListener('mousedown', handlers.mousedown, true);
        if (handlers.mousemove) canvas.removeEventListener('mousemove', handlers.mousemove, true);
        if (handlers.mouseup) {
          canvas.removeEventListener('mouseup', handlers.mouseup, true);
          canvas.removeEventListener('mouseleave', handlers.mouseup, true);
        }
      }
    };
  }, []);

  return {
    perspectiveCamera: perspectiveCameraRef,
    orthographicCamera: orthographicCameraRef,
    orthoEventHandlers: orthoEventHandlersRef
  };
};