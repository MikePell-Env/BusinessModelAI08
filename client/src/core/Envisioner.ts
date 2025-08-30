/**
 * Envisioner - Base Platform Architecture
 * 
 * The Envisioner is the foundational platform that acts as the "chess board" for the 4D Time Machine for Business.
 * It manages the ground plane, labels, and all core logic and interactions for content displayed on top.
 * 
 * The Envisioner provides:
 * - Surface control and management
 * - Interaction coordination
 * - Template lifecycle management
 * - Data source integration coordination
 */

import { Scene, Vector3 } from '@babylonjs/core';
import { UseCase4DVLTemplate } from './4DVL/UseCase4DVLTemplate';
import { DataSourceAdapter } from './data/DataSourceAdapter';
import { EnvisionerObject, EnvisionerDataContext, createEnvisionerObject } from './objects/EnvisionerObject';
import { TemplateDiscovery } from './discovery/TemplateDiscovery';

export interface EnvisionerConfig {
  groundPlaneSize: { width: number; height: number };
  labelSystem: {
    enabled: boolean;
    style: 'flat' | 'billboard' | 'embedded';
  };
  interactionMode: 'click' | 'hover' | 'touch';
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
   * Initialize the Envisioner platform
   */
  public async initialize(): Promise<void> {
    await this.setupGroundPlane();
    await this.setupLabelSystem();
    await this.setupInteractionSystem();
    await this.setupCameraSystem();
  }

  /**
   * Initialize with discovered templates (called after construction)
   */
  public async initialize(): Promise<void> {
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
   * Switch to a different template view of the same data
   * The Envisioner reuses the same data source across different template perspectives
   */
  public async switchTemplate(templateName: string): Promise<void> {
    this.state.isLoading = true;
    
    try {
      // Unload current template view
      if (this.activeTemplate) {
        await this.activeTemplate.unload();
      }

      // Load new template view with the same underlying data
      const template = await this.createTemplate(templateName);
      await template.load(this.scene, this.envisionerObject.dataContext); // Use data context
      
      this.activeTemplate = template;
      this.state.currentTemplate = templateName;
      this.envisionerObject.state.currentTemplateId = templateName;
      this.envisionerObject.state.lastUpdated = new Date();
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
   * Update Envisioner configuration
   */
  public updateConfig(newConfig: Partial<EnvisionerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Private implementation methods
  private async setupGroundPlane(): Promise<void> {
    // Ground plane setup implementation
  }

  private async setupLabelSystem(): Promise<void> {
    // Label system setup implementation
  }

  private async setupInteractionSystem(): Promise<void> {
    // Interaction system setup implementation
  }

  private async setupCameraSystem(): Promise<void> {
    // Camera system setup implementation
  }

  private async createTemplate(templateName: string): Promise<UseCase4DVLTemplate> {
    // Template factory implementation
    throw new Error(`Template ${templateName} not implemented yet`);
  }
}