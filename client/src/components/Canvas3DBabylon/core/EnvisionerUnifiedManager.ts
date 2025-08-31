/**
 * Envisioner Unified Manager
 * 
 * Single bridge that connects the core Envisioner system with Babylon.js visual components.
 * Handles template switching while maintaining spatial persistence and proper 4DVL content loading.
 */

import { Scene, ArcRotateCamera } from '@babylonjs/core';
import { Envisioner, EnvisionerConfig } from '../../../core/Envisioner';
import { EnvisionerDataContext, createEnvisionerObject } from '../../../core/objects/EnvisionerObject';
import { EnvisionerFoundation } from './EnvisionerFoundation';
import { EnvisionerPersistence } from './EnvisionerPersistence';
import { FinancialsTemplate } from '../../../core/templates/FinancialsTemplate';
import { debugLog } from '../../../lib/debug/DebugLogger';

export class EnvisionerUnifiedManager {
  private scene: Scene;
  private camera: ArcRotateCamera | null = null;
  private coreEnvisioner: Envisioner | null = null;
  private foundation: EnvisionerFoundation | null = null;
  private persistence: EnvisionerPersistence;
  private currentTemplateName: string | null = null;

  constructor(scene: Scene, camera?: ArcRotateCamera) {
    this.scene = scene;
    this.camera = camera || null;
    this.persistence = EnvisionerPersistence.getInstance();
  }

  /**
   * Initialize the unified system with a data context
   */
  public async initialize(templateName: string): Promise<void> {
    debugLog.info('unified', `🚀 Initializing Envisioner Unified Manager for template: ${templateName}`);

    // Step 1: Get persistent master transform
    const masterTransform = this.persistence.getOrCreateMasterTransform(this.scene, templateName);

    // Step 2: Initialize foundation platform (ground, rails, lighting)
    this.foundation = new EnvisionerFoundation(this.scene, masterTransform);
    await this.foundation.initialize();

    // Step 3: Create foundation labels for this template
    await this.foundation.createTemplateLabels(templateName);

    // Step 4: Initialize core Envisioner if not exists
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

    // Step 5: Load template content
    await this.loadTemplateContent(templateName);

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


    // Step 1: Unload current template content (but preserve foundation)
    await this.unloadCurrentTemplateContent();

    // Step 2: Update foundation labels for new template
    if (this.foundation) {
      await this.foundation.createTemplateLabels(newTemplateName);
    }

    // Step 3: Update master transform rotation for new template
    this.persistence.updateRotationForCameraPreset(newTemplateName, 'FRONT');

    // Step 4: Load new template content
    await this.loadTemplateContent(newTemplateName);

    // Step 5: CRITICAL FIX - Update camera target to master transform position
    this.updateCameraTarget();

    this.currentTemplateName = newTemplateName;
    
    debugLog.info('unified', `✅ Template switched to ${newTemplateName}`);
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
   * Load Financials template using proper 4DVL system
   */
  private async loadFinancialsContent(): Promise<void> {
    debugLog.info('unified', '📊 Loading Financials 4DVL content...');

    try {
      // Create and load Financials template
      const financialsTemplate = new FinancialsTemplate();

      // Sample financial data
      const sampleData = {
        totalRevenue: 1200,
        totalExpenses: 800,
        netProfit: 400,
        netLoss: 0
      };

      await financialsTemplate.load(this.scene, sampleData);

      // Ensure content is parented to master transform
      const masterTransform = this.persistence.getMasterTransform();
      if (masterTransform) {
        // Parent all financial objects to master transform
        const financialMeshes = this.scene.meshes.filter(mesh => 
          mesh.name.includes('Revenue') || 
          mesh.name.includes('Expenses') || 
          mesh.name.includes('Profit') || 
          mesh.name.includes('Loss')
        );

        financialMeshes.forEach(mesh => {
          if (!mesh.parent) {
            mesh.parent = masterTransform;
            // DISABLED: Let EnvisionerPersistence manage position only (revert if needed)
            // masterTransform.position.x = 0;
            // masterTransform.position.y = 2;
            // masterTransform.position.z = 0;
          }
        });
      }

      debugLog.info('unified', '✅ Financials 4DVL content loaded');
    } catch (error) {
      debugLog.error('unified', `❌ Failed to load Financials content: ${error}`);

      // Skip fallback - BMCModelLoader handles Financials GLB loading
      debugLog.info('unified', '⏸️ Skipping fallback objects - GLB system active');
    }
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
      { name: 'Revenue', pos: new Vector3(-0.221, 0, 2), color: [0.2, 0.8, 0.3] },    // Same X as Revenue Streams
      { name: 'Loss', pos: new Vector3(-0.221, 0, -2), color: [1.0, 0.8, 0.0] },      // Same X as Revenue Streams  
      { name: 'Expenses', pos: new Vector3(-10.1, 0, 2), color: [0.8, 0.2, 0.2] },   // Same X as Cost Structure
      { name: 'Profit', pos: new Vector3(-10.1, 0, -2), color: [0.1, 0.1, 0.1] }     // Same X as Cost Structure
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
  }

  /**
   * Load Business Model template content
   */
  private async loadBusinessModelContent(): Promise<void> {
    debugLog.info('unified', '🏢 Loading Business Model content...');

    // For now, use existing BMC system - will be upgraded to 4DVL in future
    // This maintains backward compatibility while we transition

    debugLog.info('unified', '✅ Business Model content loaded');
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
      console.log('❌ CAMERA UPDATE FAILED: No camera reference available');
      return;
    }

    const masterTransform = this.persistence.getMasterTransform();
    if (!masterTransform) {
      console.log('❌ CAMERA UPDATE FAILED: No master transform available');
      return;
    }

    // Get current camera target before update
    const oldTarget = this.camera.getTarget();
    console.log(`📹 BEFORE: Camera target at (${oldTarget.x.toFixed(3)}, ${oldTarget.y.toFixed(3)}, ${oldTarget.z.toFixed(3)})`);

    // Update camera target to master transform position
    this.camera.setTarget(masterTransform.position.clone());
    
    // Get new camera target after update
    const newTarget = this.camera.getTarget();
    console.log(`📹 AFTER: Camera target at (${newTarget.x.toFixed(3)}, ${newTarget.y.toFixed(3)}, ${newTarget.z.toFixed(3)})`);
    console.log(`📹 Master transform at (${masterTransform.position.x.toFixed(3)}, ${masterTransform.position.y.toFixed(3)}, ${masterTransform.position.z.toFixed(3)})`);
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