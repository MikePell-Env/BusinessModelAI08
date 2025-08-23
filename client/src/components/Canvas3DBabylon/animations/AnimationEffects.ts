/**
 * Animation Effects for BMC 3D visualization
 * Provides smooth transitions and visual effects
 */

import { 
  Scene,
  AbstractMesh,
  Vector3,
  Color3,
  Animation,
  AnimationGroup,
  CubicEase,
  EasingFunction,
  StandardMaterial,
  PBRMetallicRoughnessMaterial
} from '@babylonjs/core';
import { debugLog } from '@/lib/debug/DebugLogger';

export class AnimationEffects {
  private scene: Scene;
  private activeAnimations: Map<string, AnimationGroup> = new Map();

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Animate mesh height with smooth easing
   */
  public animateHeight(mesh: AbstractMesh, targetHeight: number, duration: number = 1000): Promise<void> {
    return new Promise((resolve) => {
      const startHeight = mesh.scaling.y;
      const animationName = `height_${mesh.name}_${Date.now()}`;
      
      const heightAnimation = new Animation(
        animationName,
        'scaling.y',
        60,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );

      // Create easing function for smooth animation
      const easingFunction = new CubicEase();
      easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
      heightAnimation.setEasingFunction(easingFunction);

      // Define animation keys
      const keys = [
        { frame: 0, value: startHeight },
        { frame: 60 * (duration / 1000), value: targetHeight }
      ];
      heightAnimation.setKeys(keys);

      // Apply animation to mesh
      mesh.animations = [heightAnimation];
      
      const animatable = this.scene.beginAnimation(
        mesh, 
        0, 
        60 * (duration / 1000), 
        false,
        1,
        () => {
          debugLog.verbose('animation', `Height animation completed for ${mesh.name}`);
          resolve();
        }
      );
    });
  }

  /**
   * Pulse effect for selection
   */
  public pulseSelection(mesh: AbstractMesh): void {
    const animationName = `pulse_${mesh.name}`;
    
    // Stop existing pulse if any
    this.stopAnimation(animationName);

    const scaleAnimation = new Animation(
      animationName,
      'scaling',
      60,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CYCLE
    );

    const keys = [
      { frame: 0, value: mesh.scaling.clone() },
      { frame: 15, value: mesh.scaling.multiply(new Vector3(1.05, 1.05, 1.05)) },
      { frame: 30, value: mesh.scaling.clone() }
    ];
    scaleAnimation.setKeys(keys);

    mesh.animations.push(scaleAnimation);
    
    const animatable = this.scene.beginAnimation(mesh, 0, 30, true, 2);
    
    // Store for later cleanup
    const animGroup = new AnimationGroup(animationName, this.scene);
    this.activeAnimations.set(animationName, animGroup);
  }

  /**
   * Smooth color transition
   */
  public transitionColor(
    mesh: AbstractMesh, 
    targetColor: Color3, 
    duration: number = 500
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!mesh.material) {
        resolve();
        return;
      }

      let currentColor: Color3;
      let colorProperty: string;

      if (mesh.material instanceof StandardMaterial) {
        currentColor = mesh.material.diffuseColor || new Color3(0.5, 0.5, 0.5);
        colorProperty = 'diffuseColor';
      } else if (mesh.material instanceof PBRMetallicRoughnessMaterial) {
        currentColor = mesh.material.baseColor;
        colorProperty = 'baseColor';
      } else {
        resolve();
        return;
      }

      const colorAnimation = new Animation(
        `color_${mesh.name}_${Date.now()}`,
        `material.${colorProperty}`,
        60,
        Animation.ANIMATIONTYPE_COLOR3,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );

      const easingFunction = new CubicEase();
      easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
      colorAnimation.setEasingFunction(easingFunction);

      const keys = [
        { frame: 0, value: currentColor },
        { frame: 60 * (duration / 1000), value: targetColor }
      ];
      colorAnimation.setKeys(keys);

      mesh.material.animations = [colorAnimation];
      
      this.scene.beginAnimation(
        mesh.material,
        0,
        60 * (duration / 1000),
        false,
        1,
        () => {
          debugLog.verbose('animation', `Color transition completed for ${mesh.name}`);
          resolve();
        }
      );
    });
  }

  /**
   * Hover float effect
   */
  public startHoverFloat(mesh: AbstractMesh): void {
    const animationName = `hover_${mesh.name}`;
    
    // Stop existing hover if any
    this.stopAnimation(animationName);

    const baseY = mesh.position.y;
    const floatAnimation = new Animation(
      animationName,
      'position.y',
      60,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CYCLE
    );

    const keys = [
      { frame: 0, value: baseY },
      { frame: 30, value: baseY + 0.2 },
      { frame: 60, value: baseY }
    ];
    floatAnimation.setKeys(keys);

    mesh.animations.push(floatAnimation);
    this.scene.beginAnimation(mesh, 0, 60, true, 0.5);
    
    const animGroup = new AnimationGroup(animationName, this.scene);
    this.activeAnimations.set(animationName, animGroup);
  }

  /**
   * Stop hover float effect
   */
  public stopHoverFloat(mesh: AbstractMesh): void {
    const animationName = `hover_${mesh.name}`;
    this.stopAnimation(animationName);
    
    // Reset to original position with smooth transition
    const resetAnimation = new Animation(
      `reset_${mesh.name}`,
      'position.y',
      60,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const currentY = mesh.position.y;
    const baseY = Math.floor(currentY * 10) / 10; // Round to nearest 0.1
    
    const keys = [
      { frame: 0, value: currentY },
      { frame: 10, value: baseY }
    ];
    resetAnimation.setKeys(keys);

    mesh.animations = [resetAnimation];
    this.scene.beginAnimation(mesh, 0, 10, false);
  }

  /**
   * Camera shake effect
   */
  public cameraShake(intensity: number = 0.5, duration: number = 300): void {
    const camera = this.scene.activeCamera;
    if (!camera) return;

    const originalPosition = camera.position.clone();
    let elapsed = 0;
    const interval = 16; // ~60fps

    const shake = setInterval(() => {
      elapsed += interval;
      
      if (elapsed >= duration) {
        clearInterval(shake);
        camera.position = originalPosition;
        return;
      }

      // Random shake with decreasing intensity
      const decay = 1 - (elapsed / duration);
      const offsetX = (Math.random() - 0.5) * intensity * decay;
      const offsetY = (Math.random() - 0.5) * intensity * decay;
      const offsetZ = (Math.random() - 0.5) * intensity * decay;

      camera.position = originalPosition.add(new Vector3(offsetX, offsetY, offsetZ));
    }, interval);
  }

  /**
   * Ripple effect from click point
   */
  public createRipple(position: Vector3, color: Color3 = new Color3(0.5, 0.7, 1.0)): void {
    // This would create a visual ripple effect at the click position
    // Implementation would involve creating a temporary plane with animated material
    debugLog.verbose('animation', `Ripple effect at position ${position}`);
  }

  /**
   * Stop a specific animation
   */
  private stopAnimation(animationName: string): void {
    const animGroup = this.activeAnimations.get(animationName);
    if (animGroup) {
      animGroup.stop();
      this.activeAnimations.delete(animationName);
    }
    
    // Also stop any scene animations with this name
    this.scene.stopAnimation(this.scene.meshes.find(m => 
      m.animations.some(a => a.name === animationName)
    ));
  }

  /**
   * Stop all animations
   */
  public stopAllAnimations(): void {
    this.activeAnimations.forEach((animGroup) => {
      animGroup.stop();
    });
    this.activeAnimations.clear();
    
    this.scene.stopAllAnimations();
    debugLog.info('animation', 'All animations stopped');
  }

  /**
   * Entrance animation for meshes
   */
  public async animateEntrance(meshes: AbstractMesh[], stagger: number = 100): Promise<void> {
    const promises = meshes.map((mesh, index) => {
      return new Promise<void>((resolve) => {
        // Start invisible and below
        mesh.visibility = 0;
        const originalY = mesh.position.y;
        mesh.position.y = originalY - 2;

        setTimeout(() => {
          // Animate visibility
          const visAnimation = new Animation(
            `entrance_vis_${mesh.name}`,
            'visibility',
            60,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT
          );
          visAnimation.setKeys([
            { frame: 0, value: 0 },
            { frame: 30, value: 1 }
          ]);

          // Animate position
          const posAnimation = new Animation(
            `entrance_pos_${mesh.name}`,
            'position.y',
            60,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT
          );
          
          const easingFunction = new CubicEase();
          easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
          posAnimation.setEasingFunction(easingFunction);
          
          posAnimation.setKeys([
            { frame: 0, value: originalY - 2 },
            { frame: 30, value: originalY }
          ]);

          mesh.animations = [visAnimation, posAnimation];
          this.scene.beginAnimation(mesh, 0, 30, false, 1, () => {
            resolve();
          });
        }, index * stagger);
      });
    });

    await Promise.all(promises);
    debugLog.info('animation', 'Entrance animation completed');
  }
}