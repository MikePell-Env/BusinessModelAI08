import type { BMCComponentName } from '@/types/bmcState';
import { Texture } from '@babylonjs/core';

/**
 * BMC Utilities
 * 
 * Pure functions and utilities for BMC visualization operations.
 * Includes name mapping, hover handling, and other stateless operations.
 */

/**
 * Convert display section name to BMC component name
 * @param sectionName - User-facing section name (e.g., "Key Partners")
 * @returns BMC component name or null if not found
 */
export const mapSectionNameToBMCComponent = (sectionName: string): BMCComponentName | null => {
  const nameMapping: { [key: string]: BMCComponentName } = {
    'Key Partners': 'KeyPartners',
    'Key Activities': 'KeyActivities', 
    'Key Resources': 'KeyResources',
    'Value Propositions': 'ValueProposition',
    'Customer Relationships': 'CustomerRelationships',
    'CustomerChannels': 'CustomerChannels',  // GLB mesh name is "CustomerChannels"
    'Customer Segments': 'CustomerSegments',
    'Cost Structure': 'CostStructure',
    'Revenue Streams': 'RevenueStreams'
  };
  return nameMapping[sectionName] || null;
};

/**
 * Convert BMC component name to display section name
 * @param componentName - Internal BMC component identifier
 * @returns User-facing section name
 */
export const mapBMCComponentToSectionName = (componentName: BMCComponentName): string => {
  const nameMapping: { [key in BMCComponentName]: string } = {
    'KeyPartners': 'Key Partners',
    'KeyActivities': 'Key Activities', 
    'KeyResources': 'Key Resources',
    'ValueProposition': 'Value Propositions',
    'CustomerRelationships': 'Customer Relationships',
    'CustomerChannels': 'CustomerChannels',  // GLB mesh name is "CustomerChannels"
    'CustomerSegments': 'Customer Segments',
    'CostStructure': 'Cost Structure',
    'RevenueStreams': 'Revenue Streams'
  };
  return nameMapping[componentName];
};

/**
 * Enhance label texture quality by removing visual artifacts
 * @param texture - Babylon.js texture to enhance
 */
export const enhanceLabelTexture = (texture: Texture): void => {
  // Use linear filtering for smooth, anti-aliased text
  texture.updateSamplingMode(Texture.LINEAR_LINEAR);
  
  // Disable texture wrapping for labels
  texture.wrapU = Texture.CLAMP_ADDRESSMODE;
  texture.wrapV = Texture.CLAMP_ADDRESSMODE;
  
  // Enable anisotropic filtering for crisp text at all angles
  texture.anisotropicFilteringLevel = 4;
};