import { Color3 } from '@babylonjs/core';

export interface EnvisionerSection {
  name: string;
  color: Color3;
  displayName?: string; // For UI display if different from name
}

/**
 * Legacy Envisioner Template interface
 * Maintained for backward compatibility with existing Canvas3DBabylon component
 */
export interface EnvisionerTemplate {
  name: string;
  displayName?: string;
  description?: string;
  sections: EnvisionerSection[];
  
  // Configuration for specific sections that need special handling
  revenueStreamsEnabled?: boolean;
  costStructureEnabled?: boolean;
  
  // Ground plane and border settings
  showGroundPlane?: boolean;
  showBorderGeometry?: boolean;
  
  // Camera presets
  cameraPresets?: {
    default: 'TOP' | 'FRONT' | 'PERSPECTIVE_LEFT' | 'PERSPECTIVE_RIGHT';
    available: Array<'TOP' | 'FRONT' | 'PERSPECTIVE_LEFT' | 'PERSPECTIVE_RIGHT'>;
  };
}

export const createEnvisionerTemplate = (
  name: string,
  sections: EnvisionerSection[],
  options: {
    displayName?: string;
    description?: string;
    revenueStreamsEnabled?: boolean;
    costStructureEnabled?: boolean;
    showGroundPlane?: boolean;
    showBorderGeometry?: boolean;
  } = {}
): EnvisionerTemplate => {
  return {
    name,
    displayName: options.displayName || name,
    description: options.description || `${name} template`,
    sections,
    revenueStreamsEnabled: options.revenueStreamsEnabled ?? false,
    costStructureEnabled: options.costStructureEnabled ?? false,
    showGroundPlane: options.showGroundPlane ?? true,
    showBorderGeometry: options.showBorderGeometry ?? true,
  };
};
