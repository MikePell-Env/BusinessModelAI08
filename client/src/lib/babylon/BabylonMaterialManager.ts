import { 
  Scene, 
  Material, 
  StandardMaterial, 
  PBRMetallicRoughnessMaterial,
  Texture,
  Color3,
  Vector4
} from '@babylonjs/core';

export interface MaterialPreset {
  name: string;
  type: 'standard' | 'pbr';
  baseColor: Color3;
  textureMap?: string;
  normalMap?: string;
  roughness?: number;
  metallic?: number;
  emissive?: Color3;
  specularColor?: Color3;
  specularPower?: number;
  alpha?: number;
}

export interface MaterialDataBinding {
  sectionId: string;
  materialProperty: 'color' | 'roughness' | 'metallic' | 'emissive';
  dataSource: string;
  valueRange: [number, number];
  materialRange: [any, any];
}

export class BabylonMaterialManager {
  private scene: Scene;
  private materialCache: Map<string, Material> = new Map();
  private textureCache: Map<string, Texture> = new Map();
  private presetLibrary: Map<string, MaterialPreset> = new Map();

  constructor(scene: Scene) {
    this.scene = scene;
    this.registerBusinessPresets();
  }

  private registerBusinessPresets(): void {
    // High performance - polished metal
    this.presetLibrary.set('high_performance', {
      name: 'High Performance Metal',
      type: 'pbr',
      baseColor: new Color3(0.8, 0.8, 0.9),
      roughness: 0.1,
      metallic: 0.9,
      emissive: new Color3(0.1, 0.1, 0.2)
    });

    // Medium performance - clean plastic
    this.presetLibrary.set('medium_performance', {
      name: 'Medium Performance Plastic',
      type: 'standard',
      baseColor: new Color3(0.6, 0.7, 0.8),
      specularColor: new Color3(0.3, 0.3, 0.3),
      specularPower: 32
    });

    // Needs improvement - rough wood
    this.presetLibrary.set('needs_improvement', {
      name: 'Needs Improvement Wood',
      type: 'pbr',
      baseColor: new Color3(0.4, 0.25, 0.15),
      textureMap: '/textures/wood.jpg',
      roughness: 0.8,
      metallic: 0.0
    });

    // Growth area - transparent glass
    this.presetLibrary.set('growth_area', {
      name: 'Growth Area Glass',
      type: 'pbr',
      baseColor: new Color3(0.9, 0.95, 1.0),
      roughness: 0.0,
      metallic: 0.0,
      alpha: 0.4,
      emissive: new Color3(0.0, 0.1, 0.2)
    });

    // Cost center - soft fabric
    this.presetLibrary.set('cost_center', {
      name: 'Cost Center Fabric',
      type: 'standard',
      baseColor: new Color3(0.5, 0.4, 0.3),
      specularColor: new Color3(0.1, 0.1, 0.1),
      specularPower: 8
    });

    // Revenue generator - shiny metal
    this.presetLibrary.set('revenue_generator', {
      name: 'Revenue Generator Gold',
      type: 'pbr',
      baseColor: new Color3(1.0, 0.8, 0.2),
      roughness: 0.2,
      metallic: 0.8,
      emissive: new Color3(0.2, 0.1, 0.0)
    });
  }

  public getMaterial(materialId: string, preset?: string): Material {
    // Check cache first
    const cacheKey = preset ? `${materialId}_${preset}` : materialId;
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)!;
    }

    let material: Material;

    if (preset && this.presetLibrary.has(preset)) {
      material = this.createMaterialFromPreset(materialId, preset);
    } else {
      // Default BMC material (current dark grey)
      material = this.createDefaultBMCMaterial(materialId);
    }

    this.materialCache.set(cacheKey, material);
    return material;
  }

  private createMaterialFromPreset(materialId: string, presetName: string): Material {
    const preset = this.presetLibrary.get(presetName)!;
    
    if (preset.type === 'pbr') {
      const material = new PBRMetallicRoughnessMaterial(`${materialId}_${presetName}`, this.scene);
      material.baseColor = preset.baseColor;
      material.roughness = preset.roughness || 0.5;
      material.metallic = preset.metallic || 0.0;
      
      if (preset.emissive) {
        material.emissiveColor = preset.emissive;
      }
      
      if (preset.alpha !== undefined) {
        material.alpha = preset.alpha;
      }

      // Handle texture mapping
      if (preset.textureMap) {
        const texture = this.getTexture(preset.textureMap);
        material.baseTexture = texture;
      }

      return material;
    } else {
      const material = new StandardMaterial(`${materialId}_${presetName}`, this.scene);
      material.diffuseColor = preset.baseColor;
      
      if (preset.specularColor) {
        material.specularColor = preset.specularColor;
      }
      
      if (preset.specularPower) {
        material.specularPower = preset.specularPower;
      }
      
      if (preset.emissive) {
        material.emissiveColor = preset.emissive;
      }
      
      if (preset.alpha !== undefined) {
        material.alpha = preset.alpha;
      }

      // Handle texture mapping
      if (preset.textureMap) {
        const texture = this.getTexture(preset.textureMap);
        material.diffuseTexture = texture;
      }

      return material;
    }
  }

  private createDefaultBMCMaterial(materialId: string): StandardMaterial {
    const material = new StandardMaterial(materialId, this.scene);
    material.diffuseColor = new Color3(0.07, 0.07, 0.07); // Current dark grey
    material.specularColor = new Color3(0.1, 0.1, 0.1);
    material.specularPower = 32;
    return material;
  }

  private getTexture(texturePath: string): Texture {
    if (this.textureCache.has(texturePath)) {
      return this.textureCache.get(texturePath)!;
    }

    const texture = new Texture(texturePath, this.scene);
    this.textureCache.set(texturePath, texture);
    return texture;
  }

  public applyBusinessTheme(sectionName: string, performanceLevel: 'high' | 'medium' | 'low' | 'growth' | 'cost' | 'revenue'): string {
    const presetMap = {
      'high': 'high_performance',
      'medium': 'medium_performance', 
      'low': 'needs_improvement',
      'growth': 'growth_area',
      'cost': 'cost_center',
      'revenue': 'revenue_generator'
    };

    const preset = presetMap[performanceLevel];
    return `${sectionName}_${preset}`;
  }

  public createColorSequenceMaterial(sectionName: string, color: string): Material {
    const materialId = `${sectionName}_sequence_${Date.now()}`;
    const material = new StandardMaterial(materialId, this.scene);
    
    // Convert hex color to Color3
    const hexColor = color.replace('#', '');
    const r = parseInt(hexColor.substr(0, 2), 16) / 255;
    const g = parseInt(hexColor.substr(2, 2), 16) / 255;
    const b = parseInt(hexColor.substr(4, 2), 16) / 255;
    
    material.diffuseColor = new Color3(r, g, b);
    material.emissiveColor = new Color3(r * 0.2, g * 0.2, b * 0.2); // Subtle glow
    material.specularColor = new Color3(0.3, 0.3, 0.3);
    material.specularPower = 64;

    this.materialCache.set(materialId, material);
    return material;
  }

  // Quick business material access with safe defaults
  public getBusinessMaterial(type: 'metal' | 'wood' | 'plastic' | 'glass' | 'fabric' | 'gold'): StandardMaterial {
    const materialName = `business_${type}_${Date.now()}`;
    const material = new StandardMaterial(materialName, this.scene);
    
    // Ensure material is always visible with safe defaults
    material.alpha = 1.0; // Fully opaque
    material.backFaceCulling = false; // Show both sides
    material.specularColor = new Color3(0.3, 0.3, 0.3);
    material.specularPower = 32;
    
    // Add slight emissive to ensure visibility even without perfect lighting
    const emissiveStrength = 0.1;
    
    switch (type) {
      case 'metal':
        // High performance metallic blue-gray
        material.diffuseColor = new Color3(0.6, 0.7, 0.8);
        material.emissiveColor = new Color3(0.05, 0.07, 0.1);
        material.specularColor = new Color3(0.8, 0.8, 0.9);
        material.specularPower = 64;
        break;
        
      case 'plastic':
        // Medium performance clean plastic
        material.diffuseColor = new Color3(0.5, 0.6, 0.7);
        material.emissiveColor = new Color3(0.05, 0.06, 0.07);
        break;
        
      case 'wood':
        // Low performance wood brown
        material.diffuseColor = new Color3(0.6, 0.4, 0.2);
        material.emissiveColor = new Color3(0.06, 0.04, 0.02);
        material.specularPower = 16;
        break;
        
      case 'glass':
        // Growth area translucent green
        material.diffuseColor = new Color3(0.7, 0.9, 0.7);
        material.emissiveColor = new Color3(0.07, 0.09, 0.07);
        material.alpha = 0.85; // Slightly transparent but visible
        break;
        
      case 'fabric':
        // Cost center matte fabric
        material.diffuseColor = new Color3(0.7, 0.5, 0.5);
        material.emissiveColor = new Color3(0.07, 0.05, 0.05);
        material.specularPower = 8;
        break;
        
      case 'gold':
        // Revenue generator bright gold
        material.diffuseColor = new Color3(1.0, 0.8, 0.2);
        material.emissiveColor = new Color3(0.15, 0.12, 0.03);
        material.specularColor = new Color3(1.0, 0.9, 0.4);
        material.specularPower = 64;
        break;
    }
    
    console.log(`✅ Created safe business material: ${type} (${materialName})`);
    return material;
  }

  public dispose(): void {
    // Clean up materials and textures
    this.materialCache.forEach(material => material.dispose());
    this.textureCache.forEach(texture => texture.dispose());
    this.materialCache.clear();
    this.textureCache.clear();
  }
}