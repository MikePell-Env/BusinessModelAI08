import { 
  Scene, 
  ArcRotateCamera, 
  FreeCamera, 
  Vector3, 
  Animation,
  AnimationGroup,
  IAnimationKey,
  EasingFunction,
  ExponentialEase,
  Mesh,
  StandardMaterial,
  Color3
} from '@babylonjs/core';
import { debugLog } from '@/lib/debug/DebugLogger';

interface CameraTransitionOptions {
  duration?: number; // in milliseconds
  easing?: boolean;
}

interface GeometryAnimationOptions {
  duration?: number;
  easing?: boolean;
  onComplete?: () => void;
}

export class ViewTransitionManager {
  private scene: Scene;
  private activeTransitions: Map<string, AnimationGroup> = new Map();
  
  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Smoothly transition between perspective and orthographic cameras
   */
  public transitionToCamera(
    fromCamera: ArcRotateCamera | FreeCamera,
    toCamera: ArcRotateCamera | FreeCamera,
    options: CameraTransitionOptions = {}
  ): Promise<void> {
    const { duration = 600, easing = true } = options;
    
    return new Promise((resolve) => {
      debugLog.verbose('animation', `Smooth camera transition over ${duration}ms`);
      
      // Create a single interpolation instead of switching cameras
      if (fromCamera instanceof ArcRotateCamera && toCamera instanceof FreeCamera) {
        // Perspective to orthographic
        this.smoothPerspToOrtho(fromCamera, toCamera, duration, easing, resolve);
      } else if (fromCamera instanceof FreeCamera && toCamera instanceof ArcRotateCamera) {
        // Orthographic to perspective  
        this.smoothOrthoToPersp(fromCamera, toCamera, duration, easing, resolve);
      } else {
        // Same camera type
        this.scene.activeCamera = toCamera;
        resolve();
      }
    });
  }

  private smoothPerspToOrtho(
    perspCamera: ArcRotateCamera,
    orthoCamera: FreeCamera,
    duration: number,
    useEasing: boolean,
    onComplete: () => void
  ): void {
    const startTime = performance.now();
    
    // Calculate the target position for straight-down view
    // Maintain same X and Z from perspective camera's view center
    const startAlpha = perspCamera.alpha;
    const startBeta = perspCamera.beta;
    const startRadius = perspCamera.radius;
    const startTarget = perspCamera.target.clone();
    
    // Target is straight down view (beta = 0)
    const endBeta = 0.01; // Nearly 0 for top-down
    const endRadius = 15; // Match ortho camera height
    
    // Use perspective camera during transition
    this.scene.activeCamera = perspCamera;
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Apply easing
      const t = useEasing ? this.easeInOutCubic(progress) : progress;
      
      // Smoothly interpolate camera parameters
      perspCamera.beta = startBeta * (1 - t) + endBeta * t;
      perspCamera.radius = startRadius * (1 - t) + endRadius * t;
      
      // Keep target at origin for consistent view
      perspCamera.target = Vector3.Lerp(startTarget, Vector3.Zero(), t);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Set ortho camera position to match final perspective view
        orthoCamera.position.x = perspCamera.position.x;
        orthoCamera.position.y = 15; // Keep ortho height
        orthoCamera.position.z = perspCamera.position.z;
        
        // Update ortho camera target to match
        const newTarget = new Vector3(
          perspCamera.position.x,
          0,
          perspCamera.position.z
        );
        orthoCamera.setTarget(newTarget);
        
        // Switch to ortho camera
        this.scene.activeCamera = orthoCamera;
        debugLog.verbose('animation', 'Smooth transition to orthographic complete');
        onComplete();
      }
    };
    
    requestAnimationFrame(animate);
  }

  private smoothOrthoToPersp(
    orthoCamera: FreeCamera,
    perspCamera: ArcRotateCamera,
    duration: number,
    useEasing: boolean,
    onComplete: () => void
  ): void {
    // Create temp camera that matches ortho view position
    const tempCamera = new ArcRotateCamera(
      'tempTransition',
      perspCamera.alpha,
      0.01, // Start flat like ortho
      15, // Match ortho height
      new Vector3(
        orthoCamera.position.x,
        0,
        orthoCamera.position.z
      ), // Start from ortho's ground position
      this.scene
    );
    
    const startTime = performance.now();
    const startBeta = 0.01;
    const startRadius = 15;
    const startTarget = tempCamera.target.clone();
    
    const endBeta = perspCamera.beta;
    const endRadius = perspCamera.radius;
    const endTarget = perspCamera.target.clone();
    
    // Use temp camera during transition
    this.scene.activeCamera = tempCamera;
    tempCamera.attachControl(this.scene.getEngine().getRenderingCanvas(), true);
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Apply easing
      const t = useEasing ? this.easeInOutCubic(progress) : progress;
      
      // Interpolate camera properties
      tempCamera.beta = startBeta * (1 - t) + endBeta * t;
      tempCamera.radius = startRadius * (1 - t) + endRadius * t;
      tempCamera.target = Vector3.Lerp(startTarget, endTarget, t);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Update perspective camera to match final position
        perspCamera.beta = endBeta;
        perspCamera.radius = endRadius;
        perspCamera.target = endTarget;
        
        // Switch to final perspective camera
        this.scene.activeCamera = perspCamera;
        tempCamera.dispose();
        debugLog.verbose('animation', 'Smooth transition to perspective complete');
        onComplete();
      }
    };
    
    requestAnimationFrame(animate);
  }
  
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Smoothly animate mesh height changes
   */
  public animateMeshHeight(
    mesh: Mesh,
    targetHeight: number,
    options: GeometryAnimationOptions = {}
  ): Promise<void> {
    const { duration = 400, easing = true, onComplete } = options;
    
    return new Promise((resolve) => {
      const currentHeight = mesh.scaling.y;
      
      if (Math.abs(currentHeight - targetHeight) < 0.01) {
        resolve();
        return;
      }
      
      debugLog.verbose('animation', `Animating height from ${currentHeight} to ${targetHeight}`);
      
      // Create height animation
      const heightAnim = new Animation(
        'heightAnimation',
        'scaling.y',
        60,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );
      
      const keys: IAnimationKey[] = [
        { frame: 0, value: currentHeight },
        { frame: 60, value: targetHeight }
      ];
      
      heightAnim.setKeys(keys);
      
      if (easing) {
        const easingFunction = new ExponentialEase();
        easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
        heightAnim.setEasingFunction(easingFunction);
      }
      
      mesh.animations = [heightAnim];
      
      // Much slower animation speed for very pronounced effect
      this.scene.beginAnimation(mesh, 0, 60, false, 60 / (duration / 1000) * 0.3, () => {
        if (onComplete) onComplete();
        resolve();
      });
    });
  }

  /**
   * Smoothly animate material color changes (for hover/selection)
   */
  public animateMaterialColor(
    mesh: Mesh,
    targetColor: Color3,
    property: 'diffuseColor' | 'emissiveColor' = 'diffuseColor',
    options: GeometryAnimationOptions = {}
  ): Promise<void> {
    const { duration = 200, easing = true } = options;
    
    return new Promise((resolve) => {
      const material = mesh.material as StandardMaterial;
      if (!material) {
        resolve();
        return;
      }
      
      const currentColor = material[property] || new Color3(0, 0, 0);
      
      // Create color animation for each component
      const animations: Animation[] = [];
      
      (['r', 'g', 'b'] as const).forEach(component => {
        const colorAnim = new Animation(
          `colorAnimation${component}`,
          `${property}.${component}`,
          60,
          Animation.ANIMATIONTYPE_FLOAT,
          Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        const keys: IAnimationKey[] = [
          { frame: 0, value: currentColor[component] },
          { frame: 60, value: targetColor[component] }
        ];
        
        colorAnim.setKeys(keys);
        
        if (easing) {
          const easingFunction = new ExponentialEase();
          easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
          colorAnim.setEasingFunction(easingFunction);
        }
        
        animations.push(colorAnim);
      });
      
      material.animations = animations;
      
      this.scene.beginAnimation(material, 0, 60, false, 60 / (duration / 1000), () => {
        resolve();
      });
    });
  }

  /**
   * Animate multiple meshes simultaneously
   */
  public animateMeshGroup(
    meshes: Mesh[],
    animations: { 
      height?: number;
      color?: Color3;
      colorProperty?: 'diffuseColor' | 'emissiveColor';
    },
    options: GeometryAnimationOptions = {}
  ): Promise<void> {
    const promises: Promise<void>[] = [];
    
    meshes.forEach(mesh => {
      if (animations.height !== undefined) {
        promises.push(this.animateMeshHeight(mesh, animations.height, options));
      }
      
      if (animations.color) {
        promises.push(this.animateMaterialColor(
          mesh, 
          animations.color, 
          animations.colorProperty || 'diffuseColor',
          options
        ));
      }
    });
    
    return Promise.all(promises).then(() => {});
  }

  private createAnimation(
    property: string,
    targetValue: number,
    duration: number,
    useEasing: boolean
  ): Animation {
    const animation = new Animation(
      `${property}Animation`,
      property,
      60,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    const keys: IAnimationKey[] = [
      { frame: 0, value: undefined }, // Will use current value
      { frame: 60, value: targetValue }
    ];
    
    animation.setKeys(keys);
    
    if (useEasing) {
      const easingFunction = new ExponentialEase();
      easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
      animation.setEasingFunction(easingFunction);
    }
    
    return animation;
  }

  /**
   * Stop all active transitions
   */
  public stopAllTransitions(): void {
    this.activeTransitions.forEach(group => group.stop());
    this.activeTransitions.clear();
    debugLog.verbose('animation', 'All transitions stopped');
  }

  public dispose(): void {
    this.stopAllTransitions();
  }
}