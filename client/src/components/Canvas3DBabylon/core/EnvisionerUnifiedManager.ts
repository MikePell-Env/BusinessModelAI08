/**
 * Envisioner Unified Manager
 * 
 * Single bridge that connects the core Envisioner system with Babylon.js visual components.
 * Handles template switching while maintaining spatial persistence and proper 4DVL content loading.
 */

import { Scene, ArcRotateCamera, AbstractMesh } from '@babylonjs/core';
import { Envisioner, EnvisionerConfig } from '../../../core/Envisioner';
import { EnvisionerDataContext, createEnvisionerObject } from '../../../core/objects/EnvisionerObject';
import { EnvisionerFoundation } from './EnvisionerFoundation';
import { EnvisionerPersistence } from './EnvisionerPersistence';
import { TemplateManager } from './TemplateManager';
// import { FinancialsTemplate } from '../../../core/templates/FinancialsTemplate'; // Not used - BMCModelLoader handles Financials
import { debugLog } from '../../../lib/debug/DebugLogger';
import { checkpoints } from '../../../lib/debug/CheckpointSystem';
import { TemplateRegistry } from '../../../core/templates/TemplateRegistry';

export class EnvisionerUnifiedManager {
  private scene: Scene;
  private camera: ArcRotateCamera | null = null;
  private coreEnvisioner: Envisioner | null = null;
  private foundation: EnvisionerFoundation | null = null;
  private persistence: EnvisionerPersistence;
  private templateManager: TemplateManager;
  private currentTemplateName: string | null = null;
  private loadedTemplates: Set<string> = new Set();

  constructor(scene: Scene, camera?: ArcRotateCamera) {
    this.scene = scene;
    this.camera = camera || null;
    this.persistence = EnvisionerPersistence.getInstance();
    this.templateManager = new TemplateManager(scene);
  }

  /**
   * Initialize the unified system with a data context
   */
  public async initialize(templateName: string): Promise<void> {
    debugLog.info('unified', `🚀 Initializing Envisioner Unified Manager for template: ${templateName}`);

    // Step 1: Get persistent master transform
    const masterTransform = this.persistence.getOrCreateMasterTransform(this.scene, templateName);

    // Step 2: Initialize foundation platform (ground, rails, lighting) - ONLY ONCE
    if (!this.foundation) {
      this.foundation = new EnvisionerFoundation(this.scene, masterTransform);
      await this.foundation.initialize();
    }

    // Step 3: Create foundation labels for this template
    await this.foundation.createTemplateLabels(templateName);

    // Step 4: Template manager uses dynamic filtering - no registration needed

    // Step 5: Initialize core Envisioner if not exists
    if (!this.coreEnvisioner) {
      const dataContext: EnvisionerDataContext = {
        sourceType: 'json',
        sourceMetadata: { filename: 'default_data.json' },
        dataCategories: templateName === 'financials' ? ['financial'] : ['strategic'],
        detectedTemplates: [],
        primaryTemplate: templateName
      };

      const config: EnvisionerConfig = {
        groundPlaneSize: { width: 20, height: 14 },
        labelSystem: { enabled: true, fontFamily: 'Arial', fontSize: 14 },
        interactionSystem: { enabled: true, hoverEnabled: true, clickEnabled: true },
        cameraSystem: { presets: ['FRONT', 'PERSPECTIVE_LEFT', 'PERSPECTIVE_RIGHT'], defaultPreset: 'FRONT' }
      };

      this.coreEnvisioner = new Envisioner(this.scene, config, dataContext);
      await this.coreEnvisioner.initialize();
    }

    // Step 6: Show the current template (will dynamically find meshes)
    this.templateManager.showTemplate(templateName);
    this.currentTemplateName = templateName;

    debugLog.info('unified', '✅ Envisioner Unified Manager initialized');
  }

  /**
   * Switch to a different template while preserving spatial state
   */
  public async switchTemplate(newTemplateName: string): Promise<void> {
    if (this.currentTemplateName === newTemplateName) {
      debugLog.verbose('unified', `Template ${newTemplateName} already active`);
      return;
    }

    debugLog.info('unified', `🔄 Switching template from ${this.currentTemplateName} to ${newTemplateName}`);

    // Step 1: Update foundation labels for new template ONLY
    if (this.foundation) {
      await this.foundation.createTemplateLabels(newTemplateName);
    }

    // Step 2: Update master transform rotation for new template
    this.persistence.updateRotationForCameraPreset(newTemplateName, 'FRONT');

    // Step 3: Simply show the new template (hides others automatically)
    this.templateManager.showTemplate(newTemplateName);

    // Step 4: CRITICAL FIX - Update camera target to master transform position
    this.updateCameraTarget();

    this.currentTemplateName = newTemplateName;

    debugLog.info('unified', `✅ Template switched to ${newTemplateName}`);
  }

  /**
   * Load ALL templates on initialization (but keep them hidden)
   */
  private async loadAllTemplates(): Promise<void> {
    debugLog.info('unified', 'Loading all templates...');

    // Load Business Model template
    if (!this.loadedTemplates.has('business-model')) {
      await this.loadBusinessModelContent();
      this.loadedTemplates.add('business-model');
    }

    // Load Financials template  
    if (!this.loadedTemplates.has('financials')) {
      await this.loadFinancialsContent();
      this.loadedTemplates.add('financials');
    }

    debugLog.info('unified', 'All templates loaded');
  }

  /**
   * Load template-specific content (Financials 4DVL objects, BMC sections, etc.)
   */
  private async loadTemplateContent(templateName: string): Promise<void> {
    if (templateName.toLowerCase() === 'financials') {
      await this.loadFinancialsContent();
    } else if (templateName.toLowerCase() === 'business-model') {
      await this.loadBusinessModelContent();
    }
  }

  /**
   * Financials content handled by BMCModelLoader in main component
   */
  private async loadFinancialsContent(): Promise<void> {
    debugLog.info('unified', '📊 Financials handled by BMCModelLoader in main component');
    // BMCModelLoader loads the Financials GLB model directly
    // Template manager finds the meshes dynamically
  }

  /**
   * Fallback method to create simple financial objects if 4DVL fails
   */
  private async createFinancialsFallbackObjects(): Promise<void> {
    // Simple colored boxes as placeholders - this ensures something always renders
    const { MeshBuilder, StandardMaterial, Color3 } = await import('@babylonjs/core');
    const masterTransform = this.persistence.getMasterTransform()!;

    // Use EXACT Business Model Canvas positions to eliminate visual shift
    const { Vector3 } = await import('@babylonjs/core');

    const financialObjects = [
      { name: 'Revenue', pos: new Vector3(-3, 0, 2), color: [0.2, 0.8, 0.3] },    // Left side, front
      { name: 'Loss', pos: new Vector3(-3, 0, -2), color: [1.0, 0.8, 0.0] },      // Left side, back  
      { name: 'Expenses', pos: new Vector3(3, 0, 2), color: [0.8, 0.2, 0.2] },    // Right side, front
      { name: 'Profit', pos: new Vector3(3, 0, -2), color: [0.1, 0.1, 0.1] }      // Right side, back
    ];

    financialObjects.forEach(obj => {
      const box = MeshBuilder.CreateBox(`${obj.name}_fallback`, { size: 1 }, this.scene);
      box.position.copyFrom(obj.pos);
      box.position.y += 0.5;
      box.parent = masterTransform;

      // DISABLED: Let EnvisionerPersistence manage position only (revert if needed)
      // masterTransform.position.x = 0;
      // masterTransform.position.y = 2;
      // masterTransform.position.z = 0;

      const material = new StandardMaterial(`${obj.name}_material`, this.scene);
      material.diffuseColor = new Color3(obj.color[0], obj.color[1], obj.color[2]);
      box.material = material;
    });

    // Template manager will find fallback meshes dynamically by name patterns
  }

  /**
   * Business Model content handled by main component
   */
  private async loadBusinessModelContent(): Promise<void> {
    debugLog.info('unified', '🏢 Business Model handled by BMCModelLoader');
    // BMCModelLoader in main component creates meshes
    // Template manager finds them dynamically
  }

  /**
   * Unload current template content while preserving foundation
   */
  private async unloadCurrentTemplateContent(): Promise<void> {
    if (!this.currentTemplateName) return;

    debugLog.verbose('unified', `🗑️ Unloading ${this.currentTemplateName} content...`);

    if (this.currentTemplateName.toLowerCase() === 'financials') {
      // Remove financial objects but keep foundation
      const financialMeshes = this.scene.meshes.filter(mesh => 
        mesh.name.includes('Revenue') || 
        mesh.name.includes('Expenses') || 
        mesh.name.includes('Profit') || 
        mesh.name.includes('Loss')
      );

      financialMeshes.forEach(mesh => mesh.dispose());
    } else if (this.currentTemplateName.toLowerCase() === 'business-model') {
      // Remove BMC objects but keep foundation
      const bmcMeshes = this.scene.meshes.filter(mesh => 
        mesh.name.includes('BMC') || 
        mesh.name.includes('Section')
      );

      bmcMeshes.forEach(mesh => mesh.dispose());
    }

    debugLog.verbose('unified', '✅ Template content unloaded');
  }

  /**
   * Get the foundation instance for external access
   */
  public getFoundation(): EnvisionerFoundation | null {
    return this.foundation;
  }

  /**
   * Refresh template visibility - useful after async mesh loading
   */
  public refreshTemplateVisibility(): void {
    if (this.currentTemplateName) {
      this.templateManager.refreshCurrentTemplate();
      debugLog.info('unified', `Refreshed visibility for ${this.currentTemplateName}`);
    }
  }

  /**
   * Get the core Envisioner instance
   */
  public getCoreEnvisioner(): Envisioner | null {
    return this.coreEnvisioner;
  }

  /**
   * Get the master transform
   */
  public getMasterTransform() {
    return this.persistence.getMasterTransform();
  }

  /**
   * Update camera target to master transform position
   * CRITICAL: Prevents "shift left" issue during template switches
   */
  private updateCameraTarget(): void {
    if (!this.camera) {
      debugLog.warn('unified', 'No camera reference available for target update');
      return;
    }

    const masterTransform = this.persistence.getMasterTransform();
    if (!masterTransform) {
      debugLog.warn('unified', 'No master transform available for camera target');
      return;
    }

    // Update camera target to master transform position
    this.camera.setTarget(masterTransform.position.clone());
    debugLog.info('unified', `Updated camera target to master transform position`);
  }

  /**
   * Update camera preset and adjust rotation accordingly
   */
  public updateCameraPreset(preset: string): void {
    if (this.currentTemplateName) {
      this.persistence.updateRotationForCameraPreset(this.currentTemplateName, preset);
    }
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    if (this.foundation) {
      this.foundation.dispose();
    }

    if (this.coreEnvisioner) {
      this.coreEnvisioner.dispose();
    }

    this.persistence.dispose();
    debugLog.info('unified', '🗑️ Envisioner Unified Manager disposed');
  }
}