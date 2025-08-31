
/**
 * Envisioner Unified Manager
 * 
 * Single bridge that connects the core Envisioner system with Babylon.js visual components.
 * Handles template switching while maintaining spatial persistence and proper 4DVL content loading.
 */

import { Scene } from '@babylonjs/core';
import { Envisioner, EnvisionerConfig } from '../../../core/Envisioner';
import { EnvisionerDataContext, createEnvisionerObject } from '../../../core/objects/EnvisionerObject';
import { EnvisionerFoundation } from './EnvisionerFoundation';
import { EnvisionerPersistence } from './EnvisionerPersistence';
import { FinancialsTemplate } from '../../../core/templates/FinancialsTemplate';
import { debugLog } from '../../../lib/debug/DebugLogger';

export class EnvisionerUnifiedManager {
  private scene: Scene;
  private coreEnvisioner: Envisioner | null = null;
  private foundation: EnvisionerFoundation | null = null;
  private persistence: EnvisionerPersistence;
  private currentTemplateName: string | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
    this.persistence = EnvisionerPersistence.getInstance();
  }

  /**
   * Initialize the unified system with a data context
   */
  public async initialize(templateName: string): Promise<void> {
    debugLog.info('unified', `🚀 Initializing Envisioner Unified Manager for template: ${templateName}`);

    try {
      // Create mock data context for testing
      const dataContext: EnvisionerDataContext = {
        sourceType: 'json',
        sourceMetadata: { filename: 'test-data.json' },
        dataCategories: templateName === 'financials' ? ['financial'] : ['strategic'],
        detectedTemplates: [],
        primaryTemplate: templateName
      };

      // Get persistent master transform
      const masterTransform = this.persistence.getOrCreateMasterTransform(
        this.scene, 
        templateName
      );

      // Initialize foundation if not already created
      if (!this.foundation) {
        this.foundation = new EnvisionerFoundation(this.scene, masterTransform);
        await this.foundation.initialize();
      }

      // Create template-specific foundation labels
      await this.foundation.createTemplateLabels(templateName);

      // Initialize core Envisioner if not already created
      if (!this.coreEnvisioner) {
        const config: EnvisionerConfig = {
          groundPlaneSize: { width: 20, height: 14 },
          labelSystem: { enabled: true, fontFamily: 'Arial', fontSize: 14 },
          interactionSystem: { enabled: true, hoverEnabled: true, clickEnabled: true },
          cameraSystem: { presets: ['FRONT', 'PERSPECTIVE_LEFT'], defaultPreset: 'FRONT' }
        };

        this.coreEnvisioner = new Envisioner(this.scene, config, dataContext);
        await this.coreEnvisioner.initialize();
      }

      // Load template-specific content
      await this.loadTemplateContent(templateName);
      
      this.currentTemplateName = templateName;
      debugLog.info('unified', `✅ Envisioner Unified Manager initialized for: ${templateName}`);

    } catch (error) {
      debugLog.error('unified', `❌ Failed to initialize unified manager: ${error}`);
      throw error;
    }
  }

  /**
   * Switch to a different template while preserving spatial state
   */
  public async switchTemplate(newTemplateName: string): Promise<void> {
    if (this.currentTemplateName === newTemplateName) {
      debugLog.info('unified', `⚡ Template ${newTemplateName} already active`);
      return;
    }

    debugLog.info('unified', `🔄 Switching from ${this.currentTemplateName} to ${newTemplateName}`);

    try {
      // Clear template-specific content but preserve foundation
      await this.clearTemplateContent();

      // Update foundation labels for new template
      if (this.foundation) {
        await this.foundation.createTemplateLabels(newTemplateName);
      }

      // Update master transform for new template (handles position lock + rotation)
      this.persistence.getOrCreateMasterTransform(this.scene, newTemplateName);

      // Load new template content
      await this.loadTemplateContent(newTemplateName);

      this.currentTemplateName = newTemplateName;
      debugLog.info('unified', `✅ Template switched to: ${newTemplateName}`);

    } catch (error) {
      debugLog.error('unified', `❌ Failed to switch template: ${error}`);
      throw error;
    }
  }

  /**
   * Load content for specific template
   */
  private async loadTemplateContent(templateName: string): Promise<void> {
    if (templateName.toLowerCase() === 'financials') {
      await this.loadFinancialsContent();
    } else if (templateName.toLowerCase() === 'business-model') {
      await this.loadBusinessModelContent();
    }
  }

  /**
   * Load Financials 4DVL content using the proper template
   */
  private async loadFinancialsContent(): Promise<void> {
    debugLog.info('unified', '💰 Loading Financials 4DVL content...');

    try {
      // Create and load the actual FinancialsTemplate with 4DVL content
      const financialsTemplate = new FinancialsTemplate();
      
      // Mock financial data
      const mockDataSource = {
        totalRevenue: 1200,
        totalExpenses: 800,
        netProfit: 400,
        netLoss: 0
      };

      // Get master transform for parenting
      const masterTransform = this.persistence.getMasterTransform();
      if (!masterTransform) {
        throw new Error('Master transform not available');
      }

      // Load the template with the scene and data context
      const dataContext: EnvisionerDataContext = {
        sourceType: 'json',
        sourceMetadata: { filename: 'financials-data.json' },
        dataCategories: ['financial'],
        detectedTemplates: [],
        primaryTemplate: 'financials'
      };

      await financialsTemplate.load(this.scene, dataContext);
      
      debugLog.info('unified', '✅ Financials 4DVL content loaded successfully');

    } catch (error) {
      debugLog.error('unified', `❌ Failed to load Financials content: ${error}`);
      
      // Fallback to simple placeholder objects if 4DVL fails
      debugLog.info('unified', '🔄 Using fallback Financials objects...');
      await this.createFinancialsFallbackObjects();
    }
  }

  /**
   * Fallback method to create simple financial objects if 4DVL fails
   */
  private async createFinancialsFallbackObjects(): Promise<void> {
    // Simple colored boxes as placeholders - this ensures something always renders
    const { MeshBuilder, StandardMaterial, Color3 } = await import('@babylonjs/core');
    const masterTransform = this.persistence.getMasterTransform()!;

    const financialObjects = [
      { name: 'Revenue', pos: [-2, 0, 2], color: [0.2, 0.8, 0.3] },
      { name: 'Loss', pos: [-2, 0, -2], color: [1.0, 0.8, 0.0] },
      { name: 'Expenses', pos: [2, 0, 2], color: [0.8, 0.2, 0.2] },
      { name: 'Profit', pos: [2, 0, -2], color: [0.1, 0.1, 0.1] }
    ];

    financialObjects.forEach(obj => {
      const box = MeshBuilder.CreateBox(`${obj.name}_fallback`, { size: 1 }, this.scene);
      box.position.set(obj.pos[0], obj.pos[1] + 0.5, obj.pos[2]);
      box.parent = masterTransform;

      const material = new StandardMaterial(`${obj.name}_material`, this.scene);
      material.diffuseColor = new Color3(obj.color[0], obj.color[1], obj.color[2]);
      box.material = material;
    });
  }

  /**
   * Load Business Model content (placeholder for now)
   */
  private async loadBusinessModelContent(): Promise<void> {
    debugLog.info('unified', '🏢 Loading Business Model content...');
    // This would load BMC 4DVL content when ready
    // For now, it's just a placeholder that preserves existing BMC functionality
  }

  /**
   * Clear template-specific content while preserving foundation
   */
  private async clearTemplateContent(): Promise<void> {
    // Remove template-specific meshes but preserve foundation (ground, rails, lights)
    const meshesToRemove = this.scene.meshes.filter(mesh => 
      !mesh.name.startsWith('envisioner') && // Keep foundation components
      !mesh.name.includes('Ground') &&
      !mesh.name.includes('Rail') &&
      mesh.parent // Only remove objects that are parented (template content)
    );

    meshesToRemove.forEach(mesh => {
      if (mesh.dispose) {
        mesh.dispose();
      }
    });

    debugLog.verbose('unified', `🗑️ Cleared ${meshesToRemove.length} template-specific objects`);
  }

  /**
   * Get the master transform for external use
   */
  public getMasterTransform() {
    return this.persistence.getMasterTransform();
  }

  /**
   * Update camera preset and adjust master transform rotation accordingly
   */
  public updateCameraPreset(cameraPreset: string): void {
    if (this.currentTemplateName) {
      this.persistence.updateRotationForCameraPreset(this.currentTemplateName, cameraPreset);
    }
  }

  /**
   * Get current template name
   */
  public getCurrentTemplateName(): string | null {
    return this.currentTemplateName;
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    if (this.coreEnvisioner) {
      this.coreEnvisioner.dispose();
    }
    if (this.foundation) {
      this.foundation.dispose();
    }
    this.persistence.dispose();
  }
}
/**
 * Envisioner Unified Manager
 * 
 * Single bridge that connects the core Envisioner system with Babylon.js visual components.
 * Handles template switching while maintaining spatial persistence and proper 4DVL content loading.
 */

import { Scene } from '@babylonjs/core';
import { Envisioner, EnvisionerConfig } from '../../../core/Envisioner';
import { EnvisionerDataContext, createEnvisionerObject } from '../../../core/objects/EnvisionerObject';
import { EnvisionerFoundation } from './EnvisionerFoundation';
import { EnvisionerPersistence } from './EnvisionerPersistence';
import { FinancialsTemplate } from '../../../core/templates/FinancialsTemplate';
import { debugLog } from '../../../lib/debug/DebugLogger';

export class EnvisionerUnifiedManager {
  private scene: Scene;
  private coreEnvisioner: Envisioner | null = null;
  private foundation: EnvisionerFoundation | null = null;
  private persistence: EnvisionerPersistence;
  private currentTemplateName: string | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
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
        }
      });
    }

    debugLog.info('unified', '✅ Financials 4DVL content loaded');
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
