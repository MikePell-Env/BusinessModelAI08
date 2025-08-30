/**
 * Core Envisioner Object Definition
 * 
 * Defines the foundational object structure for an Envisioner instance.
 * Contains spatial properties, appearance, and template capabilities that persist
 * across template changes.
 */

import { Vector3, Color3, Quaternion } from '@babylonjs/core';

/**
 * 3D Spatial properties of the Envisioner
 */
export interface EnvisionerSpatialProperties {
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
  boundingBox: {
    min: Vector3;
    max: Vector3;
  };
}

/**
 * Visual appearance properties of the Envisioner
 */
export interface EnvisionerAppearance {
  groundPlane: {
    enabled: boolean;
    material: {
      baseColor: Color3;
      transparency: number;
      texture?: string;
    };
    size: { width: number; height: number; };
  };
  borderGeometry: {
    enabled: boolean;
    style: 'wireframe' | 'solid' | 'glow';
    color: Color3;
    thickness: number;
  };
  lighting: {
    preset: 'business' | 'financial' | 'strategic' | 'analytical';
    intensity: number;
    shadows: boolean;
  };
  background: {
    type: 'color' | 'gradient' | 'environment';
    primary: Color3;
    secondary?: Color3;
  };
}

/**
 * Template capability and discovery
 */
export interface EnvisionerTemplateCapability {
  templateId: string;
  name: string;
  category: string;
  dataRequirements: string[];
  spatialRequirements: {
    minBoundingBox: Vector3;
    preferredCameraPresets: string[];
  };
  isAvailable: boolean;
  confidenceScore: number; // 0-1, how well this template fits the data
}

/**
 * Data source information and template discovery
 */
export interface EnvisionerDataContext {
  sourceType: 'powerpoint' | 'excel' | 'word' | 'json' | 'api';
  sourceMetadata: {
    filename?: string;
    sheets?: string[];
    slides?: number;
    lastModified?: Date;
  };
  dataCategories: string[]; // e.g., ['financial', 'strategic', 'operational']
  detectedTemplates: EnvisionerTemplateCapability[];
  primaryTemplate: string; // Most suitable template based on data analysis
}

/**
 * Core Envisioner Object
 * 
 * The persistent object that maintains state across template changes
 */
export interface EnvisionerObject {
  id: string;
  name: string;
  
  // 3D Spatial Properties (preserved across template changes)
  spatial: EnvisionerSpatialProperties;
  
  // Visual Appearance (can be augmented by templates)
  appearance: EnvisionerAppearance;
  
  // Data and Template Context
  dataContext: EnvisionerDataContext;
  
  // Current State
  state: {
    currentTemplateId: string | null;
    isLoading: boolean;
    lastUpdated: Date;
    interactionState: 'idle' | 'loading' | 'interacting' | 'transitioning';
  };
  
  // Metadata
  metadata: {
    version: string;
    createdAt: Date;
    creator: string;
    tags: string[];
  };
}

/**
 * Factory function to create default Envisioner object
 */
export function createEnvisionerObject(
  id: string,
  name: string,
  dataContext: EnvisionerDataContext
): EnvisionerObject {
  return {
    id,
    name,
    spatial: {
      position: Vector3.Zero(),
      rotation: Quaternion.Identity(),
      scale: Vector3.One(),
      boundingBox: {
        min: new Vector3(-15, 0, -15),
        max: new Vector3(15, 5, 15)
      }
    },
    appearance: {
      groundPlane: {
        enabled: true,
        material: {
          baseColor: new Color3(0.95, 0.95, 0.95),
          transparency: 0.1,
        },
        size: { width: 30, height: 30 }
      },
      borderGeometry: {
        enabled: true,
        style: 'wireframe',
        color: new Color3(0.7, 0.7, 0.7),
        thickness: 1.0
      },
      lighting: {
        preset: 'business',
        intensity: 1.0,
        shadows: true
      },
      background: {
        type: 'gradient',
        primary: new Color3(0.9, 0.9, 0.95),
        secondary: new Color3(0.8, 0.8, 0.9)
      }
    },
    dataContext,
    state: {
      currentTemplateId: null,
      isLoading: false,
      lastUpdated: new Date(),
      interactionState: 'idle'
    },
    metadata: {
      version: '1.0.0',
      createdAt: new Date(),
      creator: 'system',
      tags: []
    }
  };
}