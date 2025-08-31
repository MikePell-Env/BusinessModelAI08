import { Color3 } from '@babylonjs/core';

export interface EnvisionerSection {
  name: string;
  color: Color3;
  displayName?: string; // For UI display if different from name
}

export interface EnvisionerTemplate {
  name: string;
  sections: EnvisionerSection[];
  // Legacy interface - maintained for backward compatibility
  // New templates should use the 4DVL Template system
  
  // Configuration for specific sections that need special handling
  revenueStreamsEnabled: boolean;
  costStructureEnabled: boolean;
  
  // Ground plane and border settings
  showGroundPlane: boolean;
  showBorderGeometry: boolean;
}

export const createEnvisionerTemplate = (
  name: string,
  sections: EnvisionerSection[],
  options: {
    revenueStreamsEnabled?: boolean;
    costStructureEnabled?: boolean;
    showGroundPlane?: boolean;
    showBorderGeometry?: boolean;
  } = {}
): EnvisionerTemplate => {
  return {
    name,
    sections,
    revenueStreamsEnabled: options.revenueStreamsEnabled ?? false,
    costStructureEnabled: options.costStructureEnabled ?? false,
    showGroundPlane: options.showGroundPlane ?? true,
    showBorderGeometry: options.showBorderGeometry ?? true,
  };
};
/**
 * Base template interface for Envisioner templates
 */
export interface EnvisionerTemplate {
  name: string;
  displayName: string;
  description: string;
  sections: Array<{
    name: string;
    displayName: string;
    color: { r: number; g: number; b: number };
    position?: { x: number; y: number; z: number };
  }>;
  revenueStreamsEnabled?: boolean;
  costStructureEnabled?: boolean;
  cameraPresets?: {
    default: 'TOP' | 'FRONT' | 'PERSPECTIVE_LEFT' | 'PERSPECTIVE_RIGHT';
    available: Array<'TOP' | 'FRONT' | 'PERSPECTIVE_LEFT' | 'PERSPECTIVE_RIGHT'>;
  };
}
