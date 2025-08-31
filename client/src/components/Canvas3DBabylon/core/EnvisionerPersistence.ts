/**
 * Envisioner Persistence Manager
 * 
 * Manages the persistent spatial state of the Envisioner across template switches.
 * Ensures the master transform maintains its exact position, orientation, and scale.
 */

import { TransformNode, Vector3, Quaternion, Scene } from '@babylonjs/core';
import { debugLog } from '@/lib/debug/DebugLogger';

export interface EnvisionerSpatialState {
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
  isInitialized: boolean;
}

/**
 * Singleton manager for Envisioner spatial persistence
 */
export class EnvisionerPersistence {
  private static instance: EnvisionerPersistence | null = null;
  private spatialState: EnvisionerSpatialState | null = null;
  private masterTransform: TransformNode | null = null;

  private constructor() {}

  public static getInstance(): EnvisionerPersistence {
    if (!EnvisionerPersistence.instance) {
      EnvisionerPersistence.instance = new EnvisionerPersistence();
    }
    return EnvisionerPersistence.instance;
  }

  /**
   * Get or create the persistent master transform
   * This will reuse the existing transform if available, preserving spatial properties
   */
  public getOrCreateMasterTransform(scene: Scene, templateName: string, cameraPreset?: string): TransformNode {
    // If we already have a master transform, reuse it
    if (this.masterTransform && !this.masterTransform.isDisposed()) {
      debugLog.info('envisioner', `♻️ Reusing existing master transform for template: ${templateName}`);

      // CRITICAL FIX: FORCE position to be absolutely locked - no drift allowed
      this.masterTransform.position.x = 0; // Always centered horizontally 
      this.masterTransform.position.y = 2; // Consistent vertical position
      this.masterTransform.position.z = 0; // Always centered in depth

      // CRITICAL FIX: Template-specific rotation handling
      // Both templates need 180° rotation to face camera properly
      if (templateName.toLowerCase() === 'financials') {
        // Financials template - consistent rotation for all presets
        this.masterTransform.rotation.y = Math.PI; // 180 degrees to face camera
        this.masterTransform.rotation.x = 0; // No X tilt for Financials - camera handles positioning
      } else {
        // Business Model template - original 180° rotation for BMC orientation
        this.masterTransform.rotation.y = Math.PI; // 180 degrees clockwise rotation
        this.masterTransform.rotation.x = Math.PI / 12 + (5 * Math.PI / 180) + (-10 * Math.PI / 180) + (-10 * Math.PI / 180);
      }

      return this.masterTransform;
    }

    // Create new master transform with preserved spatial state
    this.masterTransform = new TransformNode("EnvisionerMasterTransform", scene);

    if (this.spatialState && this.spatialState.isInitialized) {
      // Restore position and scale only - rotation is template-specific
      this.masterTransform.position = this.spatialState.position.clone();
      this.masterTransform.scaling = this.spatialState.scale.clone();

      debugLog.info('envisioner', `🔄 Restored Envisioner position and scale for template: ${templateName}`);
    } else {
      // Initialize with default spatial properties
      this.initializeDefaultSpatialProperties(templateName);
      debugLog.info('envisioner', `🏗️ Created new Envisioner master transform for template: ${templateName}`);
    }

    // CRITICAL: Apply template-specific rotation AFTER restoring position/scale
    // This rotation is set ONCE at initialization and stays constant during camera transitions
    if (templateName.toLowerCase() === 'financials') {
      // Financials template - consistent rotation for all presets
      this.masterTransform.rotation.y = Math.PI; // 180 degrees to face camera
      this.masterTransform.rotation.x = 0; // No X tilt for Financials - camera handles positioning
    } else {
      // Business Model template - original 180° rotation for BMC orientation
      this.masterTransform.rotation.y = Math.PI; // 180 degrees clockwise rotation
      this.masterTransform.rotation.x = Math.PI / 12 + (5 * Math.PI / 180) + (-10 * Math.PI / 180) + (-10 * Math.PI / 180);
    }

    return this.masterTransform;
  }

  /**
   * Initialize default spatial properties for the Envisioner
   */
  private initializeDefaultSpatialProperties(templateName: string): void {
    if (!this.masterTransform) return;

    // CRITICAL: Set position FIRST and lock it - no shifting allowed
    this.masterTransform.position.x = 0; // Always centered horizontally 
    this.masterTransform.position.y = 2; // Consistent vertical position
    this.masterTransform.position.z = 0; // Always centered in depth

    // Set default rotation and scale - CRITICAL: Template-specific rotation
    if (templateName.toLowerCase() === 'financials') {
      // Financials template - 180° rotation to face camera
      this.masterTransform.rotation.y = Math.PI; // 180 degrees to face camera
      this.masterTransform.rotation.x = 0; // No X tilt for Financials
    } else {
      // Business Model template - original 180° rotation for BMC orientation
      this.masterTransform.rotation.y = Math.PI; // 180 degrees clockwise rotation
      this.masterTransform.rotation.x = Math.PI / 12 + (5 * Math.PI / 180) + (-10 * Math.PI / 180) + (-10 * Math.PI / 180);
    }

    // Apply dynamic scaling based on canvas size
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const canvasWidth = canvas.clientWidth;
      const canvasHeight = canvas.clientHeight;
      const scaleFactor = (Math.min(canvasWidth, canvasHeight) / 600) * 1.2;
      this.masterTransform.scaling = new Vector3(scaleFactor, scaleFactor, scaleFactor);
    } else {
      this.masterTransform.scaling = Vector3.One();
    }

    // Save the initial state
    this.saveSpatialState();
  }

  /**
   * Save the current spatial state for persistence
   */
  public saveSpatialState(): void {
    if (!this.masterTransform) return;

    this.spatialState = {
      position: new Vector3(0, 2, 0), // Always use fixed position, don't save drift
      rotation: this.masterTransform.rotation.clone(),
      scale: this.masterTransform.scaling.clone(),
      isInitialized: true
    };

    debugLog.verbose('envisioner', 'Spatial state saved with fixed position');
  }

  /**
   * Get the master transform for external updates
   */
  public getMasterTransform(): TransformNode | null {
    return this.masterTransform;
  }

  /**
   * Update master transform rotation based on template and camera preset
   */
  public updateRotationForCameraPreset(templateName: string, cameraPreset: string): void {
    if (!this.masterTransform) return;

    if (templateName.toLowerCase() === 'financials') {
      // Financials template - check if FRONT preset needs X tilt like Business Model TOP
      this.masterTransform.rotation.y = Math.PI; // 180 degrees to face camera
      if (cameraPreset === 'FRONT') {
        // FRONT preset tilts forward moderately for dead-on front view
        this.masterTransform.rotation.x = Math.PI / 4; // 45 degrees forward tilt
      } else {
        this.masterTransform.rotation.x = 0; // No X tilt for other presets
      }
    } else {
      // Business Model template - original 180° rotation for BMC orientation
      this.masterTransform.rotation.y = Math.PI; // 180 degrees clockwise rotation
      this.masterTransform.rotation.x = Math.PI / 12 + (5 * Math.PI / 180) + (-10 * Math.PI / 180) + (-10 * Math.PI / 180);
    }
  }

  /**
   * Update spatial properties and save state
   */
  public updateSpatialProperties(position?: Vector3, rotation?: Quaternion, scale?: Vector3): void {
    if (!this.masterTransform) return;

    // CRITICAL: NEVER allow position updates - always lock to center
    // This prevents any drift from external position modifications
    this.masterTransform.position.x = 0; // Always centered horizontally 
    this.masterTransform.position.y = 2; // Consistent vertical position
    this.masterTransform.position.z = 0; // Always centered in depth

    if (rotation) {
      this.masterTransform.rotationQuaternion = rotation.clone();
    }

    if (scale) {
      this.masterTransform.scaling = scale.clone();
    }

    this.saveSpatialState();
  }

  /**
   * Get the current spatial state
   */
  public getSpatialState(): EnvisionerSpatialState | null {
    return this.spatialState;
  }

  /**
   * Dispose of resources (for cleanup)
   */
  public dispose(): void {
    if (this.masterTransform && !this.masterTransform.isDisposed()) {
      this.masterTransform.dispose();
    }
    this.masterTransform = null;
    this.spatialState = null;
  }

  /**
   * Reset the persistence manager (for testing or full resets)
   */
  public static reset(): void {
    if (EnvisionerPersistence.instance) {
      EnvisionerPersistence.instance.dispose();
      EnvisionerPersistence.instance = null;
    }
  }
}