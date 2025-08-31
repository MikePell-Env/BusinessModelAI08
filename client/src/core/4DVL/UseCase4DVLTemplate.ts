/**
 * Use Case 4DVL Template Base Class
 * 
 * Abstract base class for all use case templates (Business Model, Financials, SWOT, What If)
 * Each template provides a different 4DVL visualization perspective of the same underlying data.
 * Templates are views into the same Envisioner data source - they don't own the data,
 * they just render it differently based on their area of focus.
 */

import { Scene } from '@babylonjs/core';
import { FourDVLScene, FourDVLRenderer } from './4DVLCore';
import { DataSourceAdapter } from '../data/DataSourceAdapter';

export interface UseCaseTemplateConfig {
  name: string;
  description: string;
  supportedDataSources: string[];
  defaultCameraPreset: string;
  validCameraPresets: string[];
}

export interface UseCaseTemplateState {
  isLoaded: boolean;
  isActive: boolean;
  hasData: boolean;
  lastUpdate: Date | null;
}

/**
 * Abstract base class for all use case templates
 */
export abstract class UseCase4DVLTemplate {
  protected config: UseCaseTemplateConfig;
  protected state: UseCaseTemplateState;
  protected scene: Scene | null = null;
  protected renderer: FourDVLRenderer | null = null;
  protected dataAdapter: DataSourceAdapter | null = null;
  protected dvlScene: FourDVLScene | null = null;

  constructor(config: UseCaseTemplateConfig) {
    this.config = config;
    this.state = {
      isLoaded: false,
      isActive: false,
      hasData: false,
      lastUpdate: null
    };
  }

  /**
   * Load the template into the scene
   */
  public async load(scene: Scene, dataSource?: any): Promise<void> {
    this.scene = scene;
    this.renderer = new FourDVLRenderer(scene);

    if (dataSource) {
      await this.loadDataSource(dataSource);
    }

    // Create the 4DVL scene for this template
    this.dvlScene = await this.create4DVLScene();
    
    // Render the scene
    if (this.dvlScene && this.renderer) {
      await this.renderer.renderScene(this.dvlScene);
    }

    this.state.isLoaded = true;
    this.state.isActive = true;
  }

  /**
   * Unload the template from the scene
   */
  public async unload(): Promise<void> {
    // Template-specific cleanup
    await this.performCleanup();

    this.scene = null;
    this.renderer = null;
    this.dataAdapter = null;
    this.dvlScene = null;

    this.state.isLoaded = false;
    this.state.isActive = false;
  }

  /**
   * Update the template with new data
   */
  public async updateData(newData: any): Promise<void> {
    if (this.dataAdapter) {
      await this.dataAdapter.updateData(newData);
    }

    if (this.renderer && this.dvlScene) {
      // Update the 4DVL scene with new data
      this.dvlScene = await this.create4DVLScene();
      await this.renderer.renderScene(this.dvlScene);
    }

    this.state.lastUpdate = new Date();
  }

  /**
   * Get template configuration
   */
  public getConfig(): UseCaseTemplateConfig {
    return { ...this.config };
  }

  /**
   * Get template state
   */
  public getState(): UseCaseTemplateState {
    return { ...this.state };
  }

  // Abstract methods that each template must implement
  protected abstract create4DVLScene(): Promise<FourDVLScene>;
  protected abstract loadDataSource(dataSource: any): Promise<void>;
  protected abstract performCleanup(): Promise<void>;

  // Optional methods that templates can override
  protected onDataUpdate(data: any): void {
    // Default implementation - templates can override
  }

  protected onInteraction(interactionType: string, targetId: string): void {
    // Default implementation - templates can override
  }
}