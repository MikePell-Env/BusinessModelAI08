/**
 * Core Envisioner Platform
 * 
 * The foundational 3D platform that manages templates and maintains persistent spatial state.
 * It manages the ground plane, labels, and all core logic and interactions for content displayed on top.
 * 
 * Key architecture principles:
 * - Camera system management and preset coordination
 * - Template lifecycle management
 * - Data source integration coordination
 */

import { Scene, Vector3, TransformNode } from '@babylonjs/core';
import { UseCase4DVLTemplate } from './4DVL/UseCase4DVLTemplate';
import { DataSourceAdapter } from './data/DataSourceAdapter';
import { EnvisionerObject, EnvisionerDataContext, createEnvisionerObject } from './objects/EnvisionerObject';
import { TemplateDiscovery } from './discovery/TemplateDiscovery';

export interface EnvisionerConfig {
  groundPlaneSize: { width: number; height: number };
  labelSystem: {
    enabled: boolean;
    fontFamily: string;
    fontSize: number;
  };
  interactionSystem: {
    enabled: boolean;
    hoverEnabled: boolean;
    clickEnabled: boolean;
  };
  cameraSystem: {
    presets: string[];
    defaultPreset: string;
  };
}

export interface EnvisionerState {
  currentTemplate: string | null;
  isLoading: boolean;
  activeInteractions: string[];
  dataConnections: string[];
}

/**
 * Core Envisioner Platform
 * 
 * IMPORTANT: One Envisioner instance per data source/Office file.
 * The same Envisioner is reused across different template views (Business Model, Financials, etc.)
 * Each template provides a different 4DVL representation of the same underlying data.
 */
export class Envisioner {
  private scene: Scene;
  private config: EnvisionerConfig;
  private state: EnvisionerState;
  private activeTemplate: UseCase4DVLTemplate | null = null;
  private dataAdapter: DataSourceAdapter | null = null;
  
  // Core object definition - the persistent state of this Envisioner
  private envisionerObject: EnvisionerObject;
  
  // CRITICAL: The persistent master transform that maintains spatial properties across template switches
  private masterTransform: TransformNode | null = null;

  constructor(scene: Scene, config: EnvisionerConfig, dataContext: EnvisionerDataContext) {
    this.scene = scene;
    this.config = config;
    
    // Create the core Envisioner object
    this.envisionerObject = createEnvisionerObject(
      `envisioner_${Date.now()}`,
      `Envisioner for ${dataContext.sourceMetadata.filename || 'data source'}`,
      dataContext
    );
    this.state = {
      currentTemplate: null,
      isLoading: false,
      activeInteractions: [],
      dataConnections: []
    };
  }

  /**
   * Initialize the Envisioner platform and create the persistent master transform
   */
  public async initialize(): Promise<void> {
    // Create the master transform that will persist across all template switches
    this.createPersistentMasterTransform();
    
    await this.setupGroundPlane();
    await this.setupLabelSystem();
    await this.setupInteractionSystem();
    await this.setupCameraSystem();
    
    // Discover available templates based on data context
    const capabilities = await TemplateDiscovery.discoverTemplates(this.envisionerObject.dataContext);
    this.envisionerObject.dataContext.detectedTemplates = capabilities;
    
    // Set primary template
    const primaryTemplate = await TemplateDiscovery.getPrimaryTemplate(this.envisionerObject.dataContext);
    if (primaryTemplate) {
      this.envisionerObject.dataContext.primaryTemplate = primaryTemplate;
    }
    
    // Update state
    this.envisionerObject.state.lastUpdated = new Date();
  }

  /**
   * Create the persistent master transform that maintains Envisioner spatial properties
   * This transform will NOT be recreated when switching templates
   */
  private createPersistentMasterTransform(): void {
    if (this.masterTransform) {
      // Already exists - preserve it
      return;
    }

    // Create the master transform node with spatial properties from EnvisionerObject
    this.masterTransform = new TransformNode("envisionerMasterTransform", this.scene);
    
    // CRITICAL: ALWAYS force lock position during creation to prevent any initialization drift
    this.masterTransform.position.x = 0; // Always centered horizontally 
    this.masterTransform.position.y = 2; // Consistent vertical position (elevated from ground)
    this.masterTransform.position.z = 0; // Always centered in depth
    
    // Apply other spatial properties
    const spatial = this.envisionerObject.spatial;
    this.masterTransform.rotationQuaternion = spatial.rotation.clone();
    this.masterTransform.scaling = spatial.scale.clone();
    
    // Update spatial data to match locked position
    this.envisionerObject.spatial.position = new Vector3(0, 2, 0);
    
    console.log(`🏗️ Envisioner master transform created at LOCKED position: (0, 2, 0)`);
  }

  /**
   * Get the persistent master transform for templates to use
   * This ensures all template content is parented to the same spatial foundation
   */
  public getMasterTransform(): TransformNode {
    if (!this.masterTransform) {
      throw new Error('Master transform not initialized. Call initialize() first.');
    }
    return this.masterTransform;
  }

  /**
   * Update Envisioner spatial properties and apply them to the master transform
   */
  public updateSpatialProperties(position?: Vector3, rotation?: any, scale?: Vector3): void {
    if (!this.masterTransform) return;

    // CRITICAL: NEVER allow position updates - always lock to center
    // This prevents any drift from external position modifications during template switches
    this.masterTransform.position.x = 0; // Always centered horizontally 
    this.masterTransform.position.y = 2; // Consistent vertical position
    this.masterTransform.position.z = 0; // Always centered in depth
    this.envisionerObject.spatial.position = new Vector3(0, 2, 0); // Keep spatial data consistent
    
    if (rotation) {
      this.envisionerObject.spatial.rotation = rotation.clone();
      this.masterTransform.rotationQuaternion = rotation.clone();
    }
    
    if (scale) {
      this.envisionerObject.spatial.scale = scale.clone();
      this.masterTransform.scaling = scale.clone();
    }
    
    this.envisionerObject.state.lastUpdated = new Date();
  }

  /**
   * Switch to a different template view of the same data
   * The Envisioner master transform maintains exact spatial properties across switches
   */
  public async switchTemplate(templateName: string): Promise<void> {
    this.state.isLoading = true;
    
    try {
      // Unload current template view (but preserve master transform)
      if (this.activeTemplate) {
        await this.activeTemplate.unload();
      }

      // Load new template view with the same underlying data
      const template = await this.createTemplate(templateName);
      await template.load(this.scene, this.envisionerObject.dataContext);
      
      this.activeTemplate = template;
      this.state.currentTemplate = templateName;
      this.envisionerObject.state.currentTemplateId = templateName;
      this.envisionerObject.state.lastUpdated = new Date();
      
      // CRITICAL: Ensure the master transform spatial properties are preserved
      console.log(`🔄 Template switched to ${templateName}. Master transform preserved at: (${this.masterTransform?.position.x}, ${this.masterTransform?.position.y}, ${this.masterTransform?.position.z})`);
      
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * Get the core Envisioner object
   */
  public getEnvisionerObject(): EnvisionerObject {
    return this.envisionerObject;
  }
  
  /**
   * Get available templates for this Envisioner
   */
  public getAvailableTemplates(): string[] {
    return this.envisionerObject.dataContext.detectedTemplates
      .filter(t => t.isAvailable)
      .map(t => t.templateId);
  }
  
  /**
   * Get template recommendations sorted by confidence
   */
  public getTemplateRecommendations(): { templateId: string; confidence: number; }[] {
    return this.envisionerObject.dataContext.detectedTemplates
      .filter(t => t.isAvailable)
      .map(t => ({ templateId: t.templateId, confidence: t.confidenceScore }))
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get current state of the Envisioner
   */
  public getState(): EnvisionerState {
    return { ...this.state };
  }

  /**
   * Get current active template
   */
  public getActiveTemplate(): UseCase4DVLTemplate | null {
    return this.activeTemplate;
  }

  private async setupGroundPlane(): Promise<void> {
    // Ground plane setup logic
  }

  private async setupLabelSystem(): Promise<void> {
    // Label system setup logic
  }

  private async setupInteractionSystem(): Promise<void> {
    // Interaction system setup logic
  }

  private async setupCameraSystem(): Promise<void> {
    // Camera system setup logic
  }

  private async createTemplate(templateName: string): Promise<UseCase4DVLTemplate> {
    // Template creation logic
    throw new Error('Template creation not implemented');
  }

  /**
   * Dispose of the Envisioner and cleanup resources
   */
  public dispose(): void {
    if (this.activeTemplate) {
      this.activeTemplate.unload();
    }
    
    if (this.masterTransform) {
      this.masterTransform.dispose();
    }
  }
}