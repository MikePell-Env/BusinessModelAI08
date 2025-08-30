/**
 * Template Registry
 * 
 * Central registry for all use case templates in the 4D Time Machine for Business.
 * Manages template discovery, instantiation, and lifecycle.
 */

import { UseCase4DVLTemplate } from '../4DVL/UseCase4DVLTemplate';
import { BusinessModelTemplate } from './BusinessModelTemplate';
import { FinancialsTemplate } from './FinancialsTemplate';
import { SWOTTemplate } from './SWOTTemplate';
import { WhatIfTemplate } from './WhatIfTemplate';

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  supportedDataSources: string[];
  category: string;
  isEnabled: boolean;
}

/**
 * Registry for managing all available use case templates
 */
export class TemplateRegistry {
  private static instance: TemplateRegistry | null = null;
  private templates: Map<string, () => UseCase4DVLTemplate> = new Map();
  private templateInfo: Map<string, TemplateInfo> = new Map();

  private constructor() {
    this.registerBuiltInTemplates();
  }

  public static getInstance(): TemplateRegistry {
    if (!TemplateRegistry.instance) {
      TemplateRegistry.instance = new TemplateRegistry();
    }
    return TemplateRegistry.instance;
  }

  /**
   * Register built-in templates
   */
  private registerBuiltInTemplates(): void {
    // Business Model Template
    this.registerTemplate('business-model', () => new BusinessModelTemplate(), {
      id: 'business-model',
      name: 'Business Model',
      description: 'Interactive Business Model Canvas with 9 core sections',
      version: '1.0.0',
      supportedDataSources: ['powerpoint', 'json', 'excel'],
      category: 'strategy',
      isEnabled: true
    });

    // Financials Template  
    this.registerTemplate('financials', () => new FinancialsTemplate(), {
      id: 'financials',
      name: 'Financials',
      description: 'Interactive financial visualization with dynamic height representation',
      version: '1.0.0',
      supportedDataSources: ['excel', 'json', 'powerpoint'],
      category: 'finance',
      isEnabled: true
    });

    // SWOT Template
    this.registerTemplate('swot', () => new SWOTTemplate(), {
      id: 'swot',
      name: 'SWOT',
      description: 'SWOT Analysis visualization with four strategic quadrants',
      version: '1.0.0',
      supportedDataSources: ['powerpoint', 'json', 'excel'],
      category: 'analysis',
      isEnabled: true
    });

    // What If Template
    this.registerTemplate('what-if', () => new WhatIfTemplate(), {
      id: 'what-if',
      name: 'What If',
      description: 'Scenario analysis and predictive modeling with temporal visualization',
      version: '1.0.0',
      supportedDataSources: ['excel', 'json', 'api'],
      category: 'simulation',
      isEnabled: true
    });
  }

  /**
   * Register a new template
   */
  public registerTemplate(
    id: string, 
    factory: () => UseCase4DVLTemplate, 
    info: TemplateInfo
  ): void {
    this.templates.set(id, factory);
    this.templateInfo.set(id, info);
  }

  /**
   * Create an instance of a template
   */
  public createTemplate(id: string): UseCase4DVLTemplate {
    const factory = this.templates.get(id);
    if (!factory) {
      throw new Error(`Template '${id}' not found in registry`);
    }
    return factory();
  }

  /**
   * Get template information
   */
  public getTemplateInfo(id: string): TemplateInfo | null {
    return this.templateInfo.get(id) || null;
  }

  /**
   * Get all available templates
   */
  public getAllTemplates(): TemplateInfo[] {
    return Array.from(this.templateInfo.values());
  }

  /**
   * Get templates by category
   */
  public getTemplatesByCategory(category: string): TemplateInfo[] {
    return this.getAllTemplates().filter(template => template.category === category);
  }

  /**
   * Check if template exists
   */
  public hasTemplate(id: string): boolean {
    return this.templates.has(id);
  }

  /**
   * Get enabled templates only
   */
  public getEnabledTemplates(): TemplateInfo[] {
    return this.getAllTemplates().filter(template => template.isEnabled);
  }
}