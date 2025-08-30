/**
 * Template Discovery and Capability Mapping
 * 
 * Analyzes data sources and determines which templates are most suitable
 * for visualization. Provides confidence scoring and recommendations.
 */

import { Vector3 } from '@babylonjs/core';
import { EnvisionerTemplateCapability, EnvisionerDataContext } from '../objects/EnvisionerObject';
import { TemplateRegistry } from '../templates/TemplateRegistry';

/**
 * Data analysis patterns for template discovery
 */
interface DataPattern {
  pattern: string;
  keywords: string[];
  dataStructures: string[];
  templateRelevance: Record<string, number>; // templateId -> confidence score
}

/**
 * Template Discovery Engine
 */
export class TemplateDiscovery {
  private static patterns: DataPattern[] = [
    {
      pattern: 'business_model_canvas',
      keywords: ['business model', 'value proposition', 'customer segment', 'revenue stream', 'key partner'],
      dataStructures: ['canvas', 'sections', 'strategic'],
      templateRelevance: {
        'business-model': 0.95,
        'swot': 0.6,
        'what-if': 0.3,
        'financials': 0.2
      }
    },
    {
      pattern: 'financial_data',
      keywords: ['revenue', 'expenses', 'profit', 'loss', 'budget', 'financial', 'income'],
      dataStructures: ['numbers', 'currency', 'periods', 'metrics'],
      templateRelevance: {
        'financials': 0.95,
        'what-if': 0.7,
        'business-model': 0.4,
        'swot': 0.2
      }
    },
    {
      pattern: 'swot_analysis',
      keywords: ['strengths', 'weaknesses', 'opportunities', 'threats', 'swot', 'strategic analysis'],
      dataStructures: ['quadrants', 'categories', 'analysis'],
      templateRelevance: {
        'swot': 0.95,
        'business-model': 0.5,
        'what-if': 0.4,
        'financials': 0.1
      }
    },
    {
      pattern: 'scenario_planning',
      keywords: ['scenario', 'forecast', 'prediction', 'what if', 'simulation', 'probability'],
      dataStructures: ['scenarios', 'variables', 'outcomes', 'timeline'],
      templateRelevance: {
        'what-if': 0.95,
        'financials': 0.6,
        'business-model': 0.3,
        'swot': 0.2
      }
    }
  ];

  /**
   * Analyze data source and discover suitable templates
   */
  public static async discoverTemplates(dataContext: EnvisionerDataContext): Promise<EnvisionerTemplateCapability[]> {
    const capabilities: EnvisionerTemplateCapability[] = [];
    const registry = TemplateRegistry.getInstance();
    const allTemplates = registry.getAllTemplates();

    for (const templateInfo of allTemplates) {
      const capability = await this.analyzeTemplateCapability(templateInfo.id, dataContext);
      if (capability) {
        capabilities.push(capability);
      }
    }

    // Sort by confidence score
    return capabilities.sort((a, b) => b.confidenceScore - a.confidenceScore);
  }

  /**
   * Analyze a specific template's capability for the given data
   */
  private static async analyzeTemplateCapability(
    templateId: string, 
    dataContext: EnvisionerDataContext
  ): Promise<EnvisionerTemplateCapability | null> {
    const registry = TemplateRegistry.getInstance();
    const templateInfo = registry.getTemplateInfo(templateId);
    
    if (!templateInfo) return null;

    const confidenceScore = this.calculateConfidenceScore(templateId, dataContext);
    const template = registry.createTemplate(templateId);
    const config = template.getConfig();

    return {
      templateId,
      name: templateInfo.name,
      category: templateInfo.category,
      dataRequirements: templateInfo.supportedDataSources,
      spatialRequirements: {
        minBoundingBox: this.getMinBoundingBox(templateId),
        preferredCameraPresets: config.validCameraPresets
      },
      isAvailable: this.checkDataCompatibility(templateInfo.supportedDataSources, dataContext.sourceType),
      confidenceScore
    };
  }

  /**
   * Calculate confidence score for template suitability
   */
  private static calculateConfidenceScore(templateId: string, dataContext: EnvisionerDataContext): number {
    let score = 0;
    let totalWeight = 0;

    // Analyze patterns
    for (const pattern of this.patterns) {
      const patternWeight = 0.4;
      const relevance = pattern.templateRelevance[templateId] || 0;
      const patternMatch = this.matchPattern(pattern, dataContext);
      
      score += relevance * patternMatch * patternWeight;
      totalWeight += patternWeight;
    }

    // Data source compatibility
    const sourceWeight = 0.3;
    const registry = TemplateRegistry.getInstance();
    const templateInfo = registry.getTemplateInfo(templateId);
    const sourceCompatibility = templateInfo?.supportedDataSources.includes(dataContext.sourceType) ? 1 : 0.5;
    
    score += sourceCompatibility * sourceWeight;
    totalWeight += sourceWeight;

    // Data categories alignment
    const categoryWeight = 0.3;
    const categoryMatch = this.matchCategories(templateId, dataContext.dataCategories);
    
    score += categoryMatch * categoryWeight;
    totalWeight += categoryWeight;

    return Math.min(1, score / totalWeight);
  }

  /**
   * Match data patterns against template
   */
  private static matchPattern(pattern: DataPattern, dataContext: EnvisionerDataContext): number {
    let matches = 0;
    let total = pattern.keywords.length;

    // Check keywords against data categories and metadata
    const searchText = [
      ...dataContext.dataCategories,
      dataContext.sourceMetadata.filename || '',
    ].join(' ').toLowerCase();

    for (const keyword of pattern.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        matches++;
      }
    }

    return total > 0 ? matches / total : 0;
  }

  /**
   * Match template categories with data categories
   */
  private static matchCategories(templateId: string, dataCategories: string[]): number {
    const templateCategories: Record<string, string[]> = {
      'business-model': ['strategic', 'business', 'planning', 'canvas'],
      'financials': ['financial', 'accounting', 'budget', 'revenue'],
      'swot': ['analysis', 'strategic', 'planning', 'assessment'],
      'what-if': ['forecasting', 'simulation', 'planning', 'scenarios']
    };

    const templateCats = templateCategories[templateId] || [];
    const matches = dataCategories.filter(cat => 
      templateCats.some(tCat => cat.toLowerCase().includes(tCat) || tCat.includes(cat.toLowerCase()))
    ).length;

    return Math.min(1, matches / Math.max(1, templateCats.length));
  }

  /**
   * Check data source compatibility
   */
  private static checkDataCompatibility(supportedSources: string[], sourceType: string): boolean {
    return supportedSources.includes(sourceType);
  }

  /**
   * Get minimum bounding box for template
   */
  private static getMinBoundingBox(templateId: string): Vector3 {
    const boundingBoxes: Record<string, Vector3> = {
      'business-model': new Vector3(30, 5, 15),
      'financials': new Vector3(10, 8, 10),
      'swot': new Vector3(20, 5, 20),
      'what-if': new Vector3(25, 6, 12)
    };

    return boundingBoxes[templateId] || new Vector3(20, 5, 20);
  }

  /**
   * Get primary template recommendation
   */
  public static async getPrimaryTemplate(dataContext: EnvisionerDataContext): Promise<string | null> {
    const capabilities = await this.discoverTemplates(dataContext);
    return capabilities.length > 0 ? capabilities[0].templateId : null;
  }
}