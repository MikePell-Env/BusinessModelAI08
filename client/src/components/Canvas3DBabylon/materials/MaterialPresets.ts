/**
 * Material Presets for BMC visualization
 * Provides business-themed materials with visual impact
 */

import { 
  Scene,
  StandardMaterial,
  PBRMetallicRoughnessMaterial,
  Color3,
  Texture
} from '@babylonjs/core';
import { debugLog } from '@/lib/debug/DebugLogger';

export type MaterialTheme = 
  | 'high_performance'
  | 'medium_performance' 
  | 'needs_improvement'
  | 'growth_area'
  | 'cost_center'
  | 'revenue_generator'
  | 'default';

export class MaterialPresets {
  private scene: Scene;
  private materials: Map<string, StandardMaterial | PBRMetallicRoughnessMaterial> = new Map();

  constructor(scene: Scene) {
    this.scene = scene;
    this.initializePresets();
  }

  private initializePresets(): void {
    // High Performance - Metallic shine
    const highPerf = new PBRMetallicRoughnessMaterial('high_performance', this.scene);
    highPerf.baseColor = new Color3(0.85, 0.85, 0.95);
    highPerf.metallic = 0.9;
    highPerf.roughness = 0.1;
    highPerf.emissiveColor = new Color3(0.1, 0.15, 0.3);
    this.materials.set('high_performance', highPerf);

    // Medium Performance - Clean plastic
    const mediumPerf = new StandardMaterial('medium_performance', this.scene);
    mediumPerf.diffuseColor = new Color3(0.6, 0.7, 0.85);
    mediumPerf.specularColor = new Color3(0.3, 0.35, 0.4);
    mediumPerf.specularPower = 64;
    mediumPerf.emissiveColor = new Color3(0.05, 0.05, 0.1);
    this.materials.set('medium_performance', mediumPerf);

    // Needs Improvement - Rough wood texture
    const needsImprovement = new PBRMetallicRoughnessMaterial('needs_improvement', this.scene);
    needsImprovement.baseColor = new Color3(0.45, 0.25, 0.15);
    needsImprovement.metallic = 0.0;
    needsImprovement.roughness = 0.85;
    
    // Add wood texture if available
    try {
      const woodTexture = new Texture('/textures/wood.jpg', this.scene);
      needsImprovement.baseTexture = woodTexture;
    } catch (e) {
      debugLog.warn('materials', 'Wood texture not found, using color only');
    }
    this.materials.set('needs_improvement', needsImprovement);

    // Growth Area - Transparent glass
    const growthArea = new PBRMetallicRoughnessMaterial('growth_area', this.scene);
    growthArea.baseColor = new Color3(0.9, 0.95, 1.0);
    growthArea.metallic = 0.0;
    growthArea.roughness = 0.0;
    growthArea.alpha = 0.6;
    growthArea.emissiveColor = new Color3(0.0, 0.2, 0.4);
    growthArea.transparencyMode = PBRMetallicRoughnessMaterial.PBRMATERIAL_ALPHABLEND;
    this.materials.set('growth_area', growthArea);

    // Cost Center - Soft fabric feel
    const costCenter = new StandardMaterial('cost_center', this.scene);
    costCenter.diffuseColor = new Color3(0.5, 0.35, 0.25);
    costCenter.specularColor = new Color3(0.1, 0.08, 0.05);
    costCenter.specularPower = 8;
    costCenter.emissiveColor = new Color3(0.02, 0.01, 0.0);
    this.materials.set('cost_center', costCenter);

    // Revenue Generator - Gold metallic
    const revenueGen = new PBRMetallicRoughnessMaterial('revenue_generator', this.scene);
    revenueGen.baseColor = new Color3(1.0, 0.85, 0.3);
    revenueGen.metallic = 0.85;
    revenueGen.roughness = 0.2;
    revenueGen.emissiveColor = new Color3(0.3, 0.2, 0.0);
    this.materials.set('revenue_generator', revenueGen);

    // Default BMC material
    const defaultMat = new StandardMaterial('default', this.scene);
    defaultMat.diffuseColor = new Color3(0.2, 0.2, 0.25);
    defaultMat.specularColor = new Color3(0.2, 0.2, 0.2);
    defaultMat.specularPower = 32;
    this.materials.set('default', defaultMat);

    debugLog.info('materials', 'Material presets initialized');
  }

  /**
   * Get a material preset by theme
   */
  public getMaterial(theme: MaterialTheme): StandardMaterial | PBRMetallicRoughnessMaterial {
    const material = this.materials.get(theme);
    if (!material) {
      debugLog.warn('materials', `Material theme ${theme} not found, using default`);
      return this.materials.get('default')!;
    }
    return material.clone(`${theme}_${Date.now()}`);
  }

  /**
   * Apply a theme to a mesh with smooth transition
   */
  public applyThemeWithTransition(
    mesh: any, 
    theme: MaterialTheme, 
    duration: number = 1000
  ): void {
    const targetMaterial = this.getMaterial(theme);
    
    // If mesh has existing material, animate the transition
    if (mesh.material) {
      const startMaterial = mesh.material as StandardMaterial;
      const startColor = startMaterial.diffuseColor?.clone() || new Color3(0.2, 0.2, 0.2);
      const targetColor = (targetMaterial as any).diffuseColor || (targetMaterial as any).baseColor;
      
      let elapsed = 0;
      const interval = 16; // ~60fps
      
      const animate = setInterval(() => {
        elapsed += interval;
        const progress = Math.min(elapsed / duration, 1);
        
        // Smooth easing function
        const eased = progress < 0.5 
          ? 2 * progress * progress 
          : -1 + (4 - 2 * progress) * progress;
        
        // Interpolate color
        const currentColor = Color3.Lerp(startColor, targetColor, eased);
        
        if (mesh.material) {
          if (mesh.material instanceof StandardMaterial) {
            mesh.material.diffuseColor = currentColor;
          } else if (mesh.material instanceof PBRMetallicRoughnessMaterial) {
            mesh.material.baseColor = currentColor;
          }
        }
        
        if (progress >= 1) {
          clearInterval(animate);
          mesh.material = targetMaterial;
          debugLog.verbose('materials', `Theme transition completed for ${theme}`);
        }
      }, interval);
    } else {
      // No existing material, apply directly
      mesh.material = targetMaterial;
    }
  }

  /**
   * Get a material for a specific BMC section based on performance
   */
  public getMaterialForSection(sectionName: string, performance?: number): StandardMaterial | PBRMetallicRoughnessMaterial {
    // Map sections to themes based on business logic
    const sectionThemes: { [key: string]: MaterialTheme } = {
      'Revenue Streams': 'revenue_generator',
      'Cost Structure': 'cost_center',
      'Value Propositions': 'high_performance',
      'Customer Segments': 'growth_area',
      'Customer Relationships': 'medium_performance',
      'CustomerChannels': 'medium_performance',
      'Key Partners': 'medium_performance',
      'Key Activities': 'default',
      'Key Resources': 'default'
    };

    // Override with performance-based theme if provided
    if (performance !== undefined) {
      if (performance >= 0.8) return this.getMaterial('high_performance');
      if (performance >= 0.6) return this.getMaterial('medium_performance');
      if (performance >= 0.4) return this.getMaterial('default');
      return this.getMaterial('needs_improvement');
    }

    const theme = sectionThemes[sectionName] || 'default';
    return this.getMaterial(theme);
  }

  /**
   * Create a glowing effect for selected items
   */
  public createSelectionGlow(mesh: any): void {
    if (mesh.material) {
      // Add emissive glow
      if (mesh.material instanceof StandardMaterial) {
        mesh.material.emissiveColor = new Color3(0.2, 0.3, 0.5);
      } else if (mesh.material instanceof PBRMetallicRoughnessMaterial) {
        mesh.material.emissiveColor = new Color3(0.2, 0.3, 0.5);
      }
    }
  }

  /**
   * Remove glow effect
   */
  public removeSelectionGlow(mesh: any): void {
    if (mesh.material) {
      if (mesh.material instanceof StandardMaterial) {
        mesh.material.emissiveColor = new Color3(0, 0, 0);
      } else if (mesh.material instanceof PBRMetallicRoughnessMaterial) {
        mesh.material.emissiveColor = new Color3(0, 0, 0);
      }
    }
  }
}