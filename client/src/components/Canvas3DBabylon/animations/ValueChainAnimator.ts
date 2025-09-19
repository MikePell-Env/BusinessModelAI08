/**
 * Value Chain Animator for BMC 3D visualization
 * 
 * Provides sequential lighting/pulsing animation that follows the value creation flow:
 * Key Resources → Key Activities → Value Propositions → Customer Relationships → Revenue Streams
 * 
 * This animation helps visualize how money and value flows through the business model.
 */

import { 
  Scene,
  AbstractMesh,
  Color3,
  Animation,
  AnimationGroup,
  CubicEase,
  EasingFunction,
  StandardMaterial,
  PBRMetallicRoughnessMaterial
} from '@babylonjs/core';
import { debugLog } from '@/lib/debug/DebugLogger';
import { BMCComponentName } from '@/types/bmcState';

export interface ValueChainStep {
  sectionName: BMCComponentName;
  displayName: string;
  description: string;
}

export class ValueChainAnimator {
  private scene: Scene;
  private isRunning: boolean = false;
  private stepDuration: number = 667; // 0.67 seconds per step (3x faster)
  private pauseDuration: number = 167; // 0.167 seconds between steps (3x faster)
  private meshMap: Map<BMCComponentName, AbstractMesh> = new Map();
  private originalMaterials: Map<BMCComponentName, any> = new Map();
  private activeAnimatables: any[] = [];
  private activeTimers: NodeJS.Timeout[] = [];
  private mainLoopTimer: NodeJS.Timeout | null = null;
  
  // Define the value chain flow sequence
  private readonly valueChainSequence: ValueChainStep[] = [
    {
      sectionName: 'KeyResources',
      displayName: 'Key Resources',
      description: 'Essential assets required for the business'
    },
    {
      sectionName: 'KeyActivities', 
      displayName: 'Key Activities',
      description: 'Critical activities that create value'
    },
    {
      sectionName: 'ValueProposition',
      displayName: 'Value Proposition', 
      description: 'Products/services that create customer value'
    },
    {
      sectionName: 'CustomerRelationships',
      displayName: 'Customer Relationships',
      description: 'How we maintain and grow customer connections'
    },
    {
      sectionName: 'RevenueStreams',
      displayName: 'Revenue Streams',
      description: 'Cash generated from value delivered to customers'
    }
  ];

  // Animation colors
  private readonly colors = {
    idle: new Color3(0.07, 0.07, 0.07), // Default dark grey
    active: new Color3(0.8, 0.2, 0.8), // Bright magenta for active step
    trail: new Color3(0.4, 0.1, 0.4), // Dim magenta for trail effect
    emissive: new Color3(1.0, 0.3, 1.0), // Bright emissive magenta
    flash: new Color3(1.0, 0.8, 1.0) // Bright flash magenta
  };

  constructor(scene: Scene) {
    this.scene = scene;
    debugLog.info('animator', 'ValueChainAnimator initialized');
  }

  /**
   * Register a mesh for a BMC section
   */
  public registerMesh(sectionName: BMCComponentName, mesh: AbstractMesh): void {
    this.meshMap.set(sectionName, mesh);
    
    // Store original material for restoration
    if (mesh.material) {
      this.originalMaterials.set(sectionName, {
        diffuseColor: mesh.material instanceof StandardMaterial ? 
          mesh.material.diffuseColor?.clone() : null,
        baseColor: mesh.material instanceof PBRMetallicRoughnessMaterial ? 
          mesh.material.baseColor?.clone() : null,
        emissiveColor: mesh.material instanceof StandardMaterial ?
          mesh.material.emissiveColor?.clone() : 
          mesh.material instanceof PBRMetallicRoughnessMaterial ?
          mesh.material.emissiveColor?.clone() : null
      });
    }
    
    debugLog.verbose('animator', `Registered mesh for ${sectionName}`);
  }

  /**
   * Start the value chain animation
   */
  public startAnimation(): void {
    if (this.isRunning) {
      debugLog.warn('animator', 'Value chain animation is already running');
      return;
    }

    if (this.meshMap.size === 0) {
      debugLog.error('animator', 'No meshes registered for animation');
      return;
    }

    this.isRunning = true;
    debugLog.info('animator', '🚀 Starting Value Chain Animation');
    
    this.runAnimationLoop();
  }

  /**
   * Stop the value chain animation
   */
  public stopAnimation(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    
    // Stop all active animations
    this.activeAnimatables.forEach(animatable => {
      if (animatable && animatable.stop) {
        animatable.stop();
      }
    });
    this.activeAnimatables = [];
    
    // Clear all timers
    this.activeTimers.forEach(timer => clearTimeout(timer));
    this.activeTimers = [];
    
    if (this.mainLoopTimer) {
      clearTimeout(this.mainLoopTimer);
      this.mainLoopTimer = null;
    }

    // Restore all meshes to original state
    this.restoreOriginalStates();
    
    debugLog.info('animator', '⏹️ Value chain animation stopped');
  }

  /**
   * Toggle the animation on/off
   */
  public toggleAnimation(): boolean {
    if (this.isRunning) {
      this.stopAnimation();
      return false;
    } else {
      this.startAnimation();
      return true;
    }
  }

  /**
   * Check if animation is currently running
   */
  public isAnimationRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Main animation loop - cycles through the value chain sequence
   */
  private runAnimationLoop(): void {
    if (!this.isRunning) return;
    
    this.runSequence(0);
  }
  
  /**
   * Run a single sequence of the value chain
   */
  private runSequence(stepIndex: number): void {
    if (!this.isRunning || stepIndex >= this.valueChainSequence.length) {
      if (this.isRunning) {
        // Sequence completed, reset and restart after pause
        this.resetAllToIdle();
        this.mainLoopTimer = setTimeout(() => {
          this.runSequence(0);
        }, 500); // 3x faster loop restart
        this.activeTimers.push(this.mainLoopTimer);
      }
      return;
    }
    
    const step = this.valueChainSequence[stepIndex];
    const mesh = this.meshMap.get(step.sectionName);
    
    if (mesh) {
      debugLog.verbose('animator', `💡 Animating step ${stepIndex + 1}: ${step.displayName}`);
      
      // Animate this step
      this.animateStep(mesh, step, stepIndex, () => {
        // Step completed, move to next after pause
        if (this.isRunning) {
          const nextTimer = setTimeout(() => {
            this.runSequence(stepIndex + 1);
          }, this.pauseDuration);
          this.activeTimers.push(nextTimer);
        }
      });
    } else {
      // Skip missing mesh, continue to next step
      this.runSequence(stepIndex + 1);
    }
  }

  /**
   * Animate a single step in the value chain
   */
  private animateStep(mesh: AbstractMesh, step: ValueChainStep, stepIndex: number, onComplete: () => void): void {
    if (!this.isRunning || !mesh.material) {
      onComplete();
      return;
    }

    // Create pulsing animation for emissive color
    const pulseAnimation = new Animation(
      `valuechain_pulse_${step.sectionName}`,
      'emissiveColor', // Correct path when targeting material directly
      60,
      Animation.ANIMATIONTYPE_COLOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT // Single cycle, not looping
    );

    // Smooth easing for natural pulse effect
    const easingFunction = new CubicEase();
    easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
    pulseAnimation.setEasingFunction(easingFunction);

    // Animation keys for flash + pulsing effect
    const totalFrames = 40; // 0.67 second pulse at 60fps (3x faster)
    const keys = [
      { frame: 0, value: new Color3(0, 0, 0) }, // Start dark
      { frame: 3, value: this.colors.flash }, // Quick flash
      { frame: 6, value: new Color3(0, 0, 0) }, // Flash off
      { frame: totalFrames * 0.3, value: this.colors.emissive }, // Peak brightness
      { frame: totalFrames * 0.7, value: this.colors.emissive }, // Hold brightness
      { frame: totalFrames, value: this.colors.trail } // Fade to trail
    ];
    pulseAnimation.setKeys(keys);

    // Set active base color
    this.setMeshColor(mesh, this.colors.active);
    
    // Set trail effect on previous steps
    this.updateTrailEffect(stepIndex);

    // Start the pulse animation
    if (mesh.material) {
      mesh.material.animations = [pulseAnimation];
      const animatable = this.scene.beginAnimation(
        mesh.material, 
        0, 
        totalFrames, 
        false, // No looping
        1,
        () => {
          // Animation completed, finalize step
          if (this.isRunning) {
            this.setMeshEmissive(mesh, this.colors.trail);
          }
          onComplete();
        }
      );
      
      if (animatable) {
        this.activeAnimatables.push(animatable);
      }
    } else {
      onComplete();
    }
  }

  /**
   * Update trail effect for previous steps
   */
  private updateTrailEffect(currentStepIndex: number): void {
    for (let i = 0; i < currentStepIndex; i++) {
      const previousStep = this.valueChainSequence[i];
      const previousMesh = this.meshMap.get(previousStep.sectionName);
      
      if (previousMesh) {
        this.setMeshColor(previousMesh, this.colors.trail);
        this.setMeshEmissive(previousMesh, new Color3(0.15, 0.05, 0.15));
      }
    }
  }

  /**
   * Reset all meshes to idle state
   */
  private resetAllToIdle(): void {
    this.meshMap.forEach((mesh, sectionName) => {
      this.setMeshColor(mesh, this.colors.idle);
      this.setMeshEmissive(mesh, new Color3(0, 0, 0));
    });
  }

  /**
   * Restore all meshes to their original material states
   */
  private restoreOriginalStates(): void {
    this.meshMap.forEach((mesh, sectionName) => {
      const original = this.originalMaterials.get(sectionName);
      if (original && mesh.material) {
        if (mesh.material instanceof StandardMaterial) {
          if (original.diffuseColor) {
            mesh.material.diffuseColor = original.diffuseColor;
          }
          if (original.emissiveColor) {
            mesh.material.emissiveColor = original.emissiveColor;
          }
        } else if (mesh.material instanceof PBRMetallicRoughnessMaterial) {
          if (original.baseColor) {
            mesh.material.baseColor = original.baseColor;
          }
          if (original.emissiveColor) {
            mesh.material.emissiveColor = original.emissiveColor;
          }
        }
      }
    });
    
    debugLog.verbose('animator', 'Restored original material states');
  }

  /**
   * Set mesh color safely (handles both StandardMaterial and PBRMetallicRoughnessMaterial)
   */
  private setMeshColor(mesh: AbstractMesh, color: Color3): void {
    if (!this.isRunning || !mesh.material) return;

    if (mesh.material instanceof StandardMaterial) {
      mesh.material.diffuseColor = color.clone();
    } else if (mesh.material instanceof PBRMetallicRoughnessMaterial) {
      mesh.material.baseColor = color.clone();
    }
  }

  /**
   * Set mesh emissive color safely
   */
  private setMeshEmissive(mesh: AbstractMesh, color: Color3): void {
    if (!this.isRunning || !mesh.material) return;

    if (mesh.material instanceof StandardMaterial) {
      mesh.material.emissiveColor = color.clone();
    } else if (mesh.material instanceof PBRMetallicRoughnessMaterial) {
      mesh.material.emissiveColor = color.clone();
    }
  }


  /**
   * Get information about the current animation sequence
   */
  public getAnimationInfo() {
    return {
      isRunning: this.isRunning,
      sequence: this.valueChainSequence,
      registeredMeshes: Array.from(this.meshMap.keys()),
      stepDuration: this.stepDuration,
      pauseDuration: this.pauseDuration
    };
  }

  /**
   * Update animation timing
   */
  public setTiming(stepDuration: number, pauseDuration: number): void {
    this.stepDuration = stepDuration;
    this.pauseDuration = pauseDuration;
    debugLog.info('animator', `Updated timing: step=${stepDuration}ms, pause=${pauseDuration}ms`);
  }

  /**
   * Cleanup - dispose of all resources
   */
  public dispose(): void {
    this.stopAnimation();
    this.meshMap.clear();
    this.originalMaterials.clear();
    this.activeAnimatables = [];
    this.activeTimers = [];
    debugLog.info('animator', 'ValueChainAnimator disposed');
  }
}