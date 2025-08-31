/**
 * Envisioner Unified Layout System
 * 
 * Provides standardized content positioning for all templates to ensure
 * visual consistency during template switches. All templates use the same
 * grid-based layout system with predefined content zones.
 */

import { Vector3 } from '@babylonjs/core';

export interface ContentZone {
  id: string;
  position: Vector3;
  description: string;
  size: { width: number; height: number; depth: number };
}

/**
 * Standardized 3x3 content grid for all templates
 * Based on the foundation's 20x14 grid with consistent spacing
 */
export const STANDARD_CONTENT_ZONES: Record<string, ContentZone> = {
  // Top row
  TOP_LEFT: {
    id: 'top_left',
    position: new Vector3(-6, 0, 4),
    description: 'Top left content area',
    size: { width: 4, height: 2, depth: 4 }
  },
  TOP_CENTER: {
    id: 'top_center', 
    position: new Vector3(0, 0, 4),
    description: 'Top center content area',
    size: { width: 4, height: 2, depth: 4 }
  },
  TOP_RIGHT: {
    id: 'top_right',
    position: new Vector3(6, 0, 4),
    description: 'Top right content area', 
    size: { width: 4, height: 2, depth: 4 }
  },

  // Middle row
  MIDDLE_LEFT: {
    id: 'middle_left',
    position: new Vector3(-6, 0, 0),
    description: 'Middle left content area',
    size: { width: 4, height: 2, depth: 4 }
  },
  MIDDLE_CENTER: {
    id: 'middle_center',
    position: new Vector3(0, 0, 0),
    description: 'Middle center content area',
    size: { width: 4, height: 2, depth: 4 }
  },
  MIDDLE_RIGHT: {
    id: 'middle_right',
    position: new Vector3(6, 0, 0),
    description: 'Middle right content area',
    size: { width: 4, height: 2, depth: 4 }
  },

  // Bottom row  
  BOTTOM_LEFT: {
    id: 'bottom_left',
    position: new Vector3(-6, 0, -4),
    description: 'Bottom left content area',
    size: { width: 4, height: 2, depth: 4 }
  },
  BOTTOM_CENTER: {
    id: 'bottom_center',
    position: new Vector3(0, 0, -4),
    description: 'Bottom center content area',
    size: { width: 4, height: 2, depth: 4 }
  },
  BOTTOM_RIGHT: {
    id: 'bottom_right',
    position: new Vector3(6, 0, -4),
    description: 'Bottom right content area',
    size: { width: 4, height: 2, depth: 4 }
  }
} as const;

/**
 * Template-specific content zone mappings
 * Each template declares which zones it uses for which content
 */
export interface TemplateLayoutMapping {
  templateId: string;
  contentMappings: Record<string, string>; // contentType -> zoneId
}

export const TEMPLATE_LAYOUTS: Record<string, TemplateLayoutMapping> = {
  'business-model': {
    templateId: 'business-model',
    contentMappings: {
      'key_partners': 'TOP_LEFT',
      'key_activities': 'TOP_CENTER', 
      'key_resources': 'TOP_RIGHT',
      'value_propositions': 'MIDDLE_CENTER',
      'customer_relationships': 'MIDDLE_RIGHT',
      'channels': 'BOTTOM_LEFT',
      'customer_segments': 'BOTTOM_RIGHT',
      'cost_structure': 'BOTTOM_LEFT',
      'revenue_streams': 'BOTTOM_RIGHT'
    }
  },
  
  'financials': {
    templateId: 'financials',
    contentMappings: {
      'revenue': 'TOP_LEFT',
      'revenue_pl': 'TOP_CENTER', 
      'expenses': 'BOTTOM_LEFT',
      'expenses_pl': 'BOTTOM_CENTER'
    }
  },

  'swot': {
    templateId: 'swot',
    contentMappings: {
      'strengths': 'TOP_LEFT',
      'weaknesses': 'TOP_RIGHT',
      'opportunities': 'BOTTOM_LEFT', 
      'threats': 'BOTTOM_RIGHT'
    }
  },

  'what-if': {
    templateId: 'what-if',
    contentMappings: {
      'scenario_baseline': 'MIDDLE_LEFT',
      'scenario_optimistic': 'TOP_CENTER',
      'scenario_pessimistic': 'BOTTOM_CENTER',
      'comparison_results': 'MIDDLE_RIGHT'
    }
  }
} as const;

/**
 * Get standardized position for content in any template
 */
export function getContentPosition(templateId: string, contentType: string): Vector3 {
  const layout = TEMPLATE_LAYOUTS[templateId];
  if (!layout) {
    console.warn(`No layout found for template: ${templateId}`);
    return new Vector3(0, 0, 0);
  }

  const zoneId = layout.contentMappings[contentType];
  if (!zoneId) {
    console.warn(`No zone mapping for content type: ${contentType} in template: ${templateId}`);
    return new Vector3(0, 0, 0);
  }

  const zone = STANDARD_CONTENT_ZONES[zoneId];
  if (!zone) {
    console.warn(`Invalid zone ID: ${zoneId}`);
    return new Vector3(0, 0, 0);
  }

  return zone.position.clone();
}

/**
 * Get all content positions for a template
 */
export function getTemplateLayout(templateId: string): Record<string, Vector3> {
  const layout = TEMPLATE_LAYOUTS[templateId];
  if (!layout) return {};

  const positions: Record<string, Vector3> = {};
  Object.entries(layout.contentMappings).forEach(([contentType, zoneId]) => {
    const zone = STANDARD_CONTENT_ZONES[zoneId];
    if (zone) {
      positions[contentType] = zone.position.clone();
    }
  });

  return positions;
}