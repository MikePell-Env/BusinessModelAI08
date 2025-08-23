import React from 'react';
import { 
  Scene,
  StandardMaterial,
  PBRMetallicRoughnessMaterial,
  Color3,
  Texture,
  AbstractMesh
} from '@babylonjs/core';

export interface MaterialPreset {
  name: string;
  type: 'standard' | 'pbr';
  baseColor: Color3;
  emissiveColor?: Color3;
  specularColor?: Color3;
  roughness?: number;
  metallic?: number;
  alpha?: number;
}

export const MATERIAL_PRESETS: Record<string, MaterialPreset> = {
  // Default BMC section material
  default: {
    name: 'default',
    type: 'standard',
    baseColor: new Color3(0.2, 0.2, 0.2), // Dark gray
    alpha: 1.0
  },
  
  // Selected state material
  selected: {
    name: 'selected',
    type: 'standard',
    baseColor: new Color3(0.3, 0.6, 1.0), // Blue highlight
    emissiveColor: new Color3(0.1, 0.2, 0.4),
    alpha: 1.0
  },
  
  // Hovered state material
  hovered: {
    name: 'hovered',
    type: 'standard',
    baseColor: new Color3(0.4, 0.4, 0.4), // Light gray
    emissiveColor: new Color3(0.05, 0.05, 0.05),
    alpha: 1.0
  },
  
  // Faded state material (for non-selected objects)
  faded: {
    name: 'faded',
    type: 'standard',
    baseColor: new Color3(0.15, 0.15, 0.15), // Very dark gray
    alpha: 0.6
  },

  // Label materials
  labelVisible: {
    name: 'labelVisible',
    type: 'standard',
    baseColor: new Color3(1, 1, 1),
    alpha: 1.0
  },

  labelFaded: {
    name: 'labelFaded',
    type: 'standard',
    baseColor: new Color3(0.8, 0.8, 0.8),
    alpha: 0.7
  }
};

interface MaterialManagerProps {
  scene: Scene;
}

export const useMaterialManager = ({ scene }: { scene: Scene | null }) => {
  const materialCache = React.useRef<Map<string, StandardMaterial | PBRMetallicRoughnessMaterial>>(new Map());

  const createMaterialFromPreset = (preset: MaterialPreset): StandardMaterial | PBRMetallicRoughnessMaterial | null => {
    if (!scene) return null;
    
    let material: StandardMaterial | PBRMetallicRoughnessMaterial;

    if (preset.type === 'pbr') {
      material = new PBRMetallicRoughnessMaterial(preset.name, scene);
      const pbrMaterial = material as PBRMetallicRoughnessMaterial;
      
      pbrMaterial.baseColor = preset.baseColor;
      if (preset.roughness !== undefined) pbrMaterial.roughness = preset.roughness;
      if (preset.metallic !== undefined) pbrMaterial.metallic = preset.metallic;
      if (preset.emissiveColor) pbrMaterial.emissiveColor = preset.emissiveColor;
    } else {
      material = new StandardMaterial(preset.name, scene);
      const stdMaterial = material as StandardMaterial;
      
      stdMaterial.diffuseColor = preset.baseColor;
      if (preset.specularColor) stdMaterial.specularColor = preset.specularColor;
      if (preset.emissiveColor) stdMaterial.emissiveColor = preset.emissiveColor;
    }

    if (preset.alpha !== undefined) {
      material.alpha = preset.alpha;
    }

    return material;
  };

  const getMaterial = (presetName: string): StandardMaterial | PBRMetallicRoughnessMaterial | null => {
    if (!scene) return null;
    
    // Check cache first
    if (materialCache.current.has(presetName)) {
      return materialCache.current.get(presetName)!;
    }

    // Get preset
    const preset = MATERIAL_PRESETS[presetName];
    if (!preset) {
      console.warn(`Material preset not found: ${presetName}`);
      return null;
    }

    // Create material
    const material = createMaterialFromPreset(preset);
    if (!material) return null;
    
    // Cache material
    materialCache.current.set(presetName, material);
    
    return material;
  };

  const applyMaterialToMesh = (mesh: AbstractMesh, presetName: string) => {
    if (!scene) return;
    const material = getMaterial(presetName);
    if (material) {
      mesh.material = material;
    }
  };

  const createCustomMaterial = (
    name: string, 
    baseColor: Color3, 
    options?: Partial<MaterialPreset>
  ): StandardMaterial | null => {
    if (!scene) return null;
    
    const material = new StandardMaterial(name, scene);
    material.diffuseColor = baseColor;
    
    if (options?.emissiveColor) material.emissiveColor = options.emissiveColor;
    if (options?.specularColor) material.specularColor = options.specularColor;
    if (options?.alpha !== undefined) material.alpha = options.alpha;
    
    return material;
  };

  const createTexturedMaterial = (name: string, texturePath: string): StandardMaterial | null => {
    if (!scene) return null;
    
    const material = new StandardMaterial(name, scene);
    material.diffuseTexture = new Texture(texturePath, scene);
    return material;
  };

  // Visual state management
  const setMeshVisualState = (mesh: AbstractMesh, state: 'default' | 'selected' | 'hovered' | 'faded') => {
    applyMaterialToMesh(mesh, state);
  };

  const setMeshesVisualState = (meshes: AbstractMesh[], state: 'default' | 'selected' | 'hovered' | 'faded') => {
    meshes.forEach(mesh => setMeshVisualState(mesh, state));
  };

  // Cleanup
  const dispose = () => {
    materialCache.current.forEach(material => {
      try {
        material.dispose();
      } catch (error) {
        console.warn('Error disposing material:', error);
      }
    });
    materialCache.current.clear();
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => dispose();
  }, []);

  return {
    getMaterial,
    applyMaterialToMesh,
    createCustomMaterial,
    createTexturedMaterial,
    setMeshVisualState,
    setMeshesVisualState,
    dispose
  };
};