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
    const { duration = 800, easing = true } = options;
    
    return new Promise((resolve) => {
      debugLog.verbose('animation', `Starting camera transition over ${duration}ms`);
      
      // For perspective to orthographic transition
      if (fromCamera instanceof ArcRotateCamera && toCamera instanceof FreeCamera) {
        this.transitionPerspectiveToOrtho(fromCamera, toCamera, duration, easing, resolve);
      }
      // For orthographic to perspective transition
      else if (fromCamera instanceof FreeCamera && toCamera instanceof ArcRotateCamera) {
        this.transitionOrthoToPerspective(fromCamera, toCamera, duration, easing, resolve);
      }
      // Same camera type transition
      else {
        this.scene.activeCamera = toCamera;
        resolve();
      }
    });
  }

  private transitionPerspectiveToOrtho(
    perspCamera: ArcRotateCamera,
    orthoCamera: FreeCamera,
    duration: number,
    useEasing: boolean,
    onComplete: () => void
  ): void {
    // Create intermediate camera for smooth transition
    const transitionCamera = new ArcRotateCamera(
      'transitionCamera',
      perspCamera.alpha,
      perspCamera.beta,
      perspCamera.radius,
      perspCamera.target.clone(),
      this.scene
    );
    
    // Set as active camera
    this.scene.activeCamera = transitionCamera;
    transitionCamera.attachControl(this.scene.getEngine().getRenderingCanvas(), true);
    
    // Target values for top-down view
    const targetAlpha = perspCamera.alpha; // Keep same rotation
    const targetBeta = 0.01; // Almost straight down
    const targetRadius = 22; // Height for orthographic view
    const targetPosition = new Vector3(0, 22, -10); // Final ortho position
    
    // Create animations
    const alphaAnim = this.createAnimation('alpha', targetAlpha, duration, useEasing);
    const betaAnim = this.createAnimation('beta', targetBeta, duration, useEasing);
    const radiusAnim = this.createAnimation('radius', targetRadius, duration, useEasing);
    
    // Apply animations
    transitionCamera.animations = [alphaAnim, betaAnim, radiusAnim];
    
    // Start animation
    this.scene.beginAnimation(transitionCamera, 0, 60, false, 1, () => {
      // Switch to orthographic camera
      this.scene.activeCamera = orthoCamera;
      transitionCamera.dispose();
      debugLog.verbose('animation', 'Transition to orthographic complete');
      onComplete();
    });
  }

  private transitionOrthoToPerspective(
    orthoCamera: FreeCamera,
    perspCamera: ArcRotateCamera,
    duration: number,
    useEasing: boolean,
    onComplete: () => void
  ): void {
    // Create transition camera starting from ortho-like position
    const transitionCamera = new ArcRotateCamera(
      'transitionCamera',
      perspCamera.alpha,
      0.01, // Start from top-down
      22, // Start from ortho height
      Vector3.Zero(),
      this.scene
    );
    
    // Set as active camera
    this.scene.activeCamera = transitionCamera;
    transitionCamera.attachControl(this.scene.getEngine().getRenderingCanvas(), true);
    
    // Target values from perspective camera
    const targetBeta = perspCamera.beta;
    const targetRadius = perspCamera.radius;
    
    // Create animations
    const betaAnim = this.createAnimation('beta', targetBeta, duration, useEasing);
    const radiusAnim = this.createAnimation('radius', targetRadius, duration, useEasing);
    
    // Apply animations
    transitionCamera.animations = [betaAnim, radiusAnim];
    
    // Start animation
    this.scene.beginAnimation(transitionCamera, 0, 60, false, 1, () => {
      // Switch to perspective camera
      this.scene.activeCamera = perspCamera;
      transitionCamera.dispose();
      debugLog.verbose('animation', 'Transition to perspective complete');
      onComplete();
    });
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
      
      this.scene.beginAnimation(mesh, 0, 60, false, 60 / (duration / 1000), () => {
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