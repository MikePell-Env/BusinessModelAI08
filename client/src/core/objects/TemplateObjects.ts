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
 * Represents comprehensive business model data from startup pitch decks
 */
export interface BusinessModelObject extends TemplateCentralObject {
  templateType: 'business-model';
  
  // Pitch deck slides data structure
  slides: {
    cover: PitchSlide;
    problem: PitchSlide;
    solution: PitchSlide;
    market: PitchSlide;
    product: PitchSlide;
    businessModel: PitchSlide;
    traction: PitchSlide;
    goToMarket: PitchSlide;
    competition: PitchSlide;
    team: PitchSlide;
    financials: PitchSlide;
    ask: PitchSlide;
    vision: PitchSlide;
  };
  
  // Traditional BMC sections (derived from slides)
  bmcSections: {
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
  
  // Visualization settings
  presentation: {
    mode: 'pitch_deck' | 'canvas' | 'hybrid';
    layout: 'traditional' | 'modern' | 'compact';
    colorScheme: 'categorical' | 'gradient' | 'monochrome';
    sectionSpacing: number;
  };
}

/**
 * Pitch deck slide structure
 */
export interface PitchSlide {
  slideNumber: number;
  title: string;
  theme: string;
  purpose: string;
  content: {
    text: string[];
    bulletPoints: string[];
    keyMetrics: Record<string, any>;
    images?: string[];
    charts?: any[];
  };
  position: Vector3;
  color: Color3;
  isPopulated: boolean;
  dataSourceSlide?: number; // Reference to source PowerPoint slide
}

export interface BusinessModelSection {
  name: string;
  position: Vector3;
  color: Color3;
  content: string[];
  category: 'infrastructure' | 'value' | 'customers' | 'finances';
  isPopulated: boolean;
  derivedFromSlides: string[]; // Which pitch slides contribute to this section
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
  const defaultSlide = (slideNum: number, title: string, theme: string, purpose: string, pos: Vector3, color: Color3): PitchSlide => ({
    slideNumber: slideNum,
    title,
    theme,
    purpose,
    content: {
      text: [],
      bulletPoints: [],
      keyMetrics: {}
    },
    position: pos,
    color,
    isPopulated: false
  });

  const defaultSection = (sectionName: string, pos: Vector3, color: Color3, category: BusinessModelSection['category'], derivedFrom: string[]): BusinessModelSection => ({
    name: sectionName,
    position: pos,
    color,
    content: [],
    category,
    isPopulated: false,
    derivedFromSlides: derivedFrom
  });

  return {
    id,
    templateType: 'business-model',
    name,
    dataBinding: {},
    visualProperties: {},
    interactionCapabilities: ['click', 'hover', 'edit', 'export', 'slide_navigation'],
    
    slides: {
      cover: defaultSlide(1, 'Cover', 'Brand identity, tagline, and contact info', 'Introduction and branding', new Vector3(-20, 0, 15), new Color3(0.2, 0.2, 0.8)),
      problem: defaultSlide(2, 'Problem', 'Pain point or unmet need in the market', 'Market problem identification', new Vector3(-15, 0, 15), new Color3(0.8, 0.2, 0.2)),
      solution: defaultSlide(3, 'Solution', 'Your product or service and how it solves the problem', 'Solution presentation', new Vector3(-10, 0, 15), new Color3(0.2, 0.8, 0.2)),
      market: defaultSlide(4, 'Market', 'TAM/SAM/SOM, market size, and growth opportunity', 'Market analysis', new Vector3(-5, 0, 15), new Color3(0.8, 0.6, 0.2)),
      product: defaultSlide(5, 'Product', 'Demo, screenshots, or key features', 'Product demonstration', new Vector3(0, 0, 15), new Color3(0.6, 0.2, 0.8)),
      businessModel: defaultSlide(6, 'Business Model', 'How you make money—pricing, revenue streams', 'Revenue model', new Vector3(5, 0, 15), new Color3(0.2, 0.8, 0.6)),
      traction: defaultSlide(7, 'Traction', 'KPIs, growth metrics, user adoption, revenue to date', 'Growth evidence', new Vector3(10, 0, 15), new Color3(0.8, 0.4, 0.2)),
      goToMarket: defaultSlide(8, 'Go-to-Market', 'Sales strategy, distribution channels, customer acquisition', 'Market strategy', new Vector3(15, 0, 15), new Color3(0.4, 0.8, 0.2)),
      competition: defaultSlide(9, 'Competition', 'Competitive landscape and your differentiation', 'Competitive analysis', new Vector3(20, 0, 15), new Color3(0.8, 0.2, 0.6)),
      team: defaultSlide(10, 'Team', 'Founders, key hires, and relevant experience', 'Team presentation', new Vector3(-15, 0, 10), new Color3(0.2, 0.6, 0.8)),
      financials: defaultSlide(11, 'Financials', 'Forecasts, burn rate, unit economics', 'Financial projections', new Vector3(-5, 0, 10), new Color3(0.6, 0.8, 0.2)),
      ask: defaultSlide(12, 'Ask', 'Funding amount, use of funds, and round details', 'Investment request', new Vector3(5, 0, 10), new Color3(0.8, 0.2, 0.4)),
      vision: defaultSlide(13, 'Vision', 'Long-term roadmap, exit strategy, or impact potential', 'Future vision', new Vector3(15, 0, 10), new Color3(0.4, 0.2, 0.8))
    },
    
    bmcSections: {
      keyPartners: defaultSection('Key Partners', new Vector3(-15, 0, 0), new Color3(0.2, 0.6, 0.9), 'infrastructure', ['team', 'goToMarket']),
      keyActivities: defaultSection('Key Activities', new Vector3(-7.5, 0, 5), new Color3(0.3, 0.7, 0.8), 'infrastructure', ['solution', 'product']),
      keyResources: defaultSection('Key Resources', new Vector3(-7.5, 0, 0), new Color3(0.4, 0.8, 0.7), 'infrastructure', ['team', 'product']),
      valuePropositions: defaultSection('Value Propositions', new Vector3(0, 0, 2.5), new Color3(0.9, 0.6, 0.2), 'value', ['solution', 'problem']),
      customerRelationships: defaultSection('Customer Relationships', new Vector3(7.5, 0, 5), new Color3(0.8, 0.7, 0.3), 'customers', ['goToMarket', 'traction']),
      channels: defaultSection('Channels', new Vector3(7.5, 0, 0), new Color3(0.7, 0.8, 0.4), 'customers', ['goToMarket']),
      customerSegments: defaultSection('Customer Segments', new Vector3(15, 0, 2.5), new Color3(0.6, 0.9, 0.2), 'customers', ['market', 'traction']),
      costStructure: defaultSection('Cost Structure', new Vector3(-7.5, 0, -5), new Color3(0.9, 0.3, 0.3), 'finances', ['financials', 'businessModel']),
      revenueStreams: defaultSection('Revenue Streams', new Vector3(7.5, 0, -5), new Color3(0.3, 0.9, 0.3), 'finances', ['businessModel', 'financials'])
    },
    
    presentation: {
      mode: 'pitch_deck',
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