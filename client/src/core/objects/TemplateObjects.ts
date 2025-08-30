/**
 * Template-Specific Central Objects
 * 
 * Defines the core data structures and visual properties for each template type.
 * These objects represent the central focus of each template's visualization.
 */

import { Vector3, Color3 } from '@babylonjs/core';

/**
 * Base interface for all template central objects
 */
export interface TemplateCentralObject {
  id: string;
  templateType: string;
  name: string;
  dataBinding: Record<string, any>;
  visualProperties: Record<string, any>;
  interactionCapabilities: string[];
}

/**
 * Business Model Template Central Object
 * Represents the 9-section business model canvas
 */
export interface BusinessModelObject extends TemplateCentralObject {
  templateType: 'business-model';
  sections: {
    keyPartners: BusinessModelSection;
    keyActivities: BusinessModelSection;
    keyResources: BusinessModelSection;
    valuePropositions: BusinessModelSection;
    customerRelationships: BusinessModelSection;
    channels: BusinessModelSection;
    customerSegments: BusinessModelSection;
    costStructure: BusinessModelSection;
    revenueStreams: BusinessModelSection;
  };
  canvas: {
    layout: 'traditional' | 'modern' | 'compact';
    colorScheme: 'categorical' | 'gradient' | 'monochrome';
    sectionSpacing: number;
  };
}

export interface BusinessModelSection {
  name: string;
  position: Vector3;
  color: Color3;
  content: string[];
  category: 'infrastructure' | 'value' | 'customers' | 'finances';
  isPopulated: boolean;
}

/**
 * Financials Template Central Object
 * Represents financial data with height-based visualization
 */
export interface FinancialsObject extends TemplateCentralObject {
  templateType: 'financials';
  financialData: {
    revenue: FinancialMetric;
    expenses: FinancialMetric;
    profit: FinancialMetric;
    loss: FinancialMetric;
  };
  visualization: {
    heightScale: number;
    maxHeight: number;
    anchorTypes: Record<string, 'top' | 'bottom'>;
    animationDuration: number;
  };
  timeframe: {
    period: 'monthly' | 'quarterly' | 'yearly';
    startDate: Date;
    endDate: Date;
  };
}

export interface FinancialMetric {
  name: string;
  value: number;
  currency: string;
  position: Vector3;
  color: Color3;
  trend: 'up' | 'down' | 'stable';
  confidence: number; // 0-1
}

/**
 * SWOT Template Central Object
 * Represents the 4-quadrant SWOT analysis
 */
export interface SWOTObject extends TemplateCentralObject {
  templateType: 'swot';
  quadrants: {
    strengths: SWOTQuadrant;
    weaknesses: SWOTQuadrant;
    opportunities: SWOTQuadrant;
    threats: SWOTQuadrant;
  };
  analysis: {
    strategicFocus: 'offensive' | 'defensive' | 'balanced';
    priorityQuadrant: keyof SWOTObject['quadrants'];
    crossAnalysis: SWOTCrossAnalysis[];
  };
}

export interface SWOTQuadrant {
  name: string;
  position: Vector3;
  color: Color3;
  items: string[];
  category: 'internal_positive' | 'internal_negative' | 'external_positive' | 'external_negative';
  weight: number; // 0-1, importance relative to other quadrants
}

export interface SWOTCrossAnalysis {
  combination: string; // e.g., "Strengths-Opportunities"
  strategies: string[];
  priority: 'high' | 'medium' | 'low';
}

/**
 * What If Template Central Object
 * Represents scenario analysis and predictive modeling
 */
export interface WhatIfObject extends TemplateCentralObject {
  templateType: 'what-if';
  scenarios: {
    baseline: WhatIfScenario;
    optimistic: WhatIfScenario;
    realistic: WhatIfScenario;
    pessimistic: WhatIfScenario;
  };
  variables: WhatIfVariable[];
  simulation: {
    timeHorizon: number; // months
    simulationSteps: number;
    uncertaintyFactors: string[];
  };
  analysis: {
    riskTolerance: 'low' | 'medium' | 'high';
    preferredScenario: keyof WhatIfObject['scenarios'];
    sensitivityAnalysis: Record<string, number>;
  };
}

export interface WhatIfScenario {
  name: string;
  position: Vector3;
  color: Color3;
  probability: number; // 0-1
  outcome: number;
  confidence: number; // 0-1
  variables: Record<string, number>;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface WhatIfVariable {
  name: string;
  type: 'financial' | 'market' | 'operational' | 'external';
  currentValue: number;
  range: { min: number; max: number; };
  impact: number; // -1 to 1, effect on outcomes
  controllability: 'high' | 'medium' | 'low';
}

/**
 * Factory functions for creating template objects
 */
export function createBusinessModelObject(id: string, name: string): BusinessModelObject {
  const defaultSection = (sectionName: string, pos: Vector3, color: Color3, category: BusinessModelSection['category']): BusinessModelSection => ({
    name: sectionName,
    position: pos,
    color,
    content: [],
    category,
    isPopulated: false
  });

  return {
    id,
    templateType: 'business-model',
    name,
    dataBinding: {},
    visualProperties: {},
    interactionCapabilities: ['click', 'hover', 'edit', 'export'],
    sections: {
      keyPartners: defaultSection('Key Partners', new Vector3(-15, 0, 7.5), new Color3(0.2, 0.6, 0.9), 'infrastructure'),
      keyActivities: defaultSection('Key Activities', new Vector3(-7.5, 0, 7.5), new Color3(0.3, 0.7, 0.8), 'infrastructure'),
      keyResources: defaultSection('Key Resources', new Vector3(-7.5, 0, 2.5), new Color3(0.4, 0.8, 0.7), 'infrastructure'),
      valuePropositions: defaultSection('Value Propositions', new Vector3(0, 0, 5), new Color3(0.9, 0.6, 0.2), 'value'),
      customerRelationships: defaultSection('Customer Relationships', new Vector3(7.5, 0, 7.5), new Color3(0.8, 0.7, 0.3), 'customers'),
      channels: defaultSection('Channels', new Vector3(7.5, 0, 2.5), new Color3(0.7, 0.8, 0.4), 'customers'),
      customerSegments: defaultSection('Customer Segments', new Vector3(15, 0, 5), new Color3(0.6, 0.9, 0.2), 'customers'),
      costStructure: defaultSection('Cost Structure', new Vector3(-7.5, 0, -5), new Color3(0.9, 0.3, 0.3), 'finances'),
      revenueStreams: defaultSection('Revenue Streams', new Vector3(7.5, 0, -5), new Color3(0.3, 0.9, 0.3), 'finances')
    },
    canvas: {
      layout: 'traditional',
      colorScheme: 'categorical',
      sectionSpacing: 5
    }
  };
}

export function createFinancialsObject(id: string, name: string): FinancialsObject {
  return {
    id,
    templateType: 'financials',
    name,
    dataBinding: {},
    visualProperties: {},
    interactionCapabilities: ['click', 'hover', 'animate', 'compare'],
    financialData: {
      revenue: {
        name: 'Revenue',
        value: 0,
        currency: 'USD',
        position: new Vector3(-2, 0, 2),
        color: new Color3(0.2, 0.8, 0.3),
        trend: 'stable',
        confidence: 0.8
      },
      expenses: {
        name: 'Expenses',
        value: 0,
        currency: 'USD',
        position: new Vector3(2, 0, 2),
        color: new Color3(0.8, 0.2, 0.2),
        trend: 'stable',
        confidence: 0.8
      },
      profit: {
        name: 'Profit',
        value: 0,
        currency: 'USD',
        position: new Vector3(2, 0, -2),
        color: new Color3(0.1, 0.1, 0.1),
        trend: 'stable',
        confidence: 0.6
      },
      loss: {
        name: 'Loss',
        value: 0,
        currency: 'USD',
        position: new Vector3(-2, 0, -2),
        color: new Color3(1.0, 0.8, 0.0),
        trend: 'stable',
        confidence: 0.6
      }
    },
    visualization: {
      heightScale: 1.0,
      maxHeight: 5.0,
      anchorTypes: {
        revenue: 'bottom',
        expenses: 'bottom',
        profit: 'top',
        loss: 'top'
      },
      animationDuration: 800
    },
    timeframe: {
      period: 'monthly',
      startDate: new Date(),
      endDate: new Date()
    }
  };
}