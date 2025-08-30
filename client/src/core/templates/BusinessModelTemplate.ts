/**
 * Business Model Use Case Template
 * 
 * Implements the Business Model Canvas visualization using 4DVL conventions.
 * Reads business model data and displays it as a 9-section interactive canvas.
 */

import { UseCase4DVLTemplate, UseCaseTemplateConfig } from '../4DVL/UseCase4DVLTemplate';
import { 4DVLScene, 4DVLObject } from '../4DVL/4DVLCore';
import { DataSourceAdapter } from '../data/DataSourceAdapter';
import { Vector3, Color3 } from '@babylonjs/core';

export class BusinessModelTemplate extends UseCase4DVLTemplate {
  constructor() {
    const config: UseCaseTemplateConfig = {
      name: 'Business Model',
      description: 'Interactive Business Model Canvas with 9 core sections',
      supportedDataSources: ['powerpoint', 'json', 'excel'],
      defaultCameraPreset: 'TOP',
      validCameraPresets: ['TOP', 'PERSPECTIVE_LEFT', 'PERSPECTIVE_RIGHT']
    };
    super(config);
  }

  protected async create4DVLScene(): Promise<4DVLScene> {
    const businessModelSections = [
      { name: 'Key Partners', position: new Vector3(-15, 0, 7.5), color: new Color3(0.2, 0.6, 0.9) },
      { name: 'Key Activities', position: new Vector3(-7.5, 0, 7.5), color: new Color3(0.3, 0.7, 0.8) },
      { name: 'Key Resources', position: new Vector3(-7.5, 0, 2.5), color: new Color3(0.4, 0.8, 0.7) },
      { name: 'Value Propositions', position: new Vector3(0, 0, 5), color: new Color3(0.9, 0.6, 0.2) },
      { name: 'Customer Relationships', position: new Vector3(7.5, 0, 7.5), color: new Color3(0.8, 0.7, 0.3) },
      { name: 'Customer Channels', position: new Vector3(7.5, 0, 2.5), color: new Color3(0.7, 0.8, 0.4) },
      { name: 'Customer Segments', position: new Vector3(15, 0, 5), color: new Color3(0.6, 0.9, 0.2) },
      { name: 'Cost Structure', position: new Vector3(-7.5, 0, -5), color: new Color3(0.9, 0.3, 0.3) },
      { name: 'Revenue Streams', position: new Vector3(7.5, 0, -5), color: new Color3(0.3, 0.9, 0.3) }
    ];

    const objects: 4DVLObject[] = businessModelSections.map(section => ({
      id: section.name.replace(/\s+/g, ''),
      name: section.name,
      geometry: {
        id: `${section.name}_geometry`,
        type: 'glb',
        source: '/models/BusinessModel.glb',
        position: section.position,
        rotation: Vector3.Zero(),
        scaling: Vector3.One(),
        materials: [{
          id: `${section.name}_material`,
          type: 'standard',
          baseColor: section.color,
          properties: {}
        }]
      },
      labels: [{
        id: `${section.name}_label`,
        type: 'flat',
        text: section.name,
        position: new Vector3(section.position.x, section.position.y + 0.6, section.position.z),
        style: {
          fontSize: 16,
          fontFamily: 'Arial',
          color: new Color3(1, 1, 1)
        }
      }],
      behaviors: [{
        id: `${section.name}_click`,
        trigger: 'click',
        action: 'panel',
        parameters: { panelType: 'content' },
        targetIds: [section.name.replace(/\s+/g, '')]
      }],
      dataBindings: [{
        sourceField: section.name.toLowerCase().replace(/\s+/g, ''),
        targetProperty: 'content',
        transform: (value: any) => Array.isArray(value) ? value.join('\n• ') : value
      }],
      metadata: {
        sectionType: 'businessModel',
        category: this.getSectionCategory(section.name)
      }
    }));

    return {
      id: 'business_model_scene',
      name: 'Business Model Canvas',
      objects,
      globalBehaviors: [],
      dataSchema: {},
      renderSettings: {
        lighting: 'business_model',
        camera: 'top_view',
        background: 'neutral'
      }
    };
  }

  protected async loadDataSource(dataSource: any): Promise<void> {
    // Load business model data from the provided source
    // This integrates with existing canvas data structure
  }

  protected async performCleanup(): Promise<void> {
    // Business model specific cleanup
  }

  private getSectionCategory(sectionName: string): string {
    const categories: Record<string, string> = {
      'Key Partners': 'infrastructure',
      'Key Activities': 'infrastructure', 
      'Key Resources': 'infrastructure',
      'Value Propositions': 'value',
      'Customer Relationships': 'customers',
      'Customer Channels': 'customers',
      'Customer Segments': 'customers',
      'Cost Structure': 'finances',
      'Revenue Streams': 'finances'
    };
    return categories[sectionName] || 'unknown';
  }
}