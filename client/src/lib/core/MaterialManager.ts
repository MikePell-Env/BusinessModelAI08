import { Scene, StandardMaterial, Color3, AbstractMesh } from '@babylonjs/core';

export interface MaterialState {
  type: 'normal' | 'selected' | 'hover' | 'dimmed';
  sectionId: string;
}

export interface MaterialConfig {
  baseColor: Color3;
  emissiveColor?: Color3;
  alpha?: number;
  specularColor?: Color3;
  specularPower?: number;
}

/**
 * Centralized Material Manager following Babylon.js best practices
 * - Single source of truth for all material operations
 * - Material pooling to prevent duplicate creation
 * - No runtime material disposal (performance optimization)
 * - State-based material application
 */
export class MaterialManager {
  private scene: Scene;
  private materialPool: Map<string, StandardMaterial> = new Map();
  private sectionMaterialMap: Map<string, string> = new Map(); // sectionId -> current material key
  private disposed: boolean = false;

  constructor(scene: Scene) {
    this.scene = scene;
    console.log('🎨 MaterialManager initialized with pooling system');
  }

  /**
   * Get or create a material for a specific section and state
   */
  private getMaterial(sectionId: string, state: MaterialState['type']): StandardMaterial {
    const materialKey = `${sectionId}_${state}`;
    
    if (!this.materialPool.has(materialKey)) {
      this.materialPool.set(materialKey, this.createMaterial(sectionId, state, materialKey));
      console.log(`🎨 Created NEW material: ${materialKey} (pool size: ${this.materialPool.size})`);
    } else {
      console.log(`🎨 Reusing EXISTING material: ${materialKey} (pool size: ${this.materialPool.size})`);
    }
    
    return this.materialPool.get(materialKey)!;
  }

  /**
   * Create a new material based on section and state
   */
  private createMaterial(sectionId: string, state: MaterialState['type'], materialName: string): StandardMaterial {
    const material = new StandardMaterial(materialName, this.scene);
    const config = this.getMaterialConfig(sectionId, state);

    // Apply configuration
    material.diffuseColor = config.baseColor.clone();
    material.emissiveColor = config.emissiveColor || Color3.Black();
    material.alpha = config.alpha ?? 1.0;
    material.specularColor = config.specularColor || new Color3(0.2, 0.2, 0.2);
    material.specularPower = config.specularPower || 64;
    
    // Performance optimizations
    material.backFaceCulling = false;
    // DISABLED: Freeze causing crashes after multiple clicks
    // material.freeze(); // Freeze for performance until state change needed

    console.log(`🎨 Created material: ${materialName}`);
    return material;
  }

  /**
   * Get material configuration for a section and state
   * Follows documented 3D Top View Selection Rules and coordinate system quirks
   */
  private getMaterialConfig(sectionId: string, state: MaterialState['type']): MaterialConfig {
    const baseColor = this.getBaseColor(sectionId);

    switch (state) {
      case 'selected':
        // Rule 3: Selected Object Visual State - exact colors from docs
        return {
          baseColor: new Color3(0.0, 0.3, 0.8), // Selection Blue
          emissiveColor: new Color3(0.0, 0.1, 0.2), // Selection Emissive
          alpha: 1.0
        };

      case 'hover':
        // Same as selected for consistency
        return {
          baseColor: new Color3(0.0, 0.3, 0.8), 
          emissiveColor: Color3.Black(),
          alpha: 1.0
        };

      case 'dimmed':
        // Rule 2: Non-selected objects when something is selected
        // 3D Top View: NO dimming/transparency - maintain original state
        return {
          baseColor: baseColor.clone(), // Keep original color
          emissiveColor: Color3.Black(),
          alpha: 1.0 // Always 100% opaque in top view
        };

      case 'normal':
      default:
        // Rule 1: Default state - documented color standards
        return {
          baseColor: baseColor.clone(),
          emissiveColor: Color3.Black(),
          alpha: 1.0
        };
    }
  }

  /**
   * Get base color for a section following documented color standards
   * Preserves coordinate system positioning quirks for separate GLB models
   */
  private getBaseColor(sectionId: string): Color3 {
    switch (sectionId) {
      case 'Cost Structure':
        // Cost Structure Red - positioned at X=-10.1 (appears left)
        return new Color3(0.35, 0.0, 0.0);
      case 'Revenue Streams':
        // Revenue Streams Green - positioned at X=-0.221 (appears right)
        return new Color3(0.0, 0.20, 0.12);
      default:
        // Default Grey for main BMC sections
        return new Color3(0.07, 0.07, 0.07);
    }
  }

  /**
   * Check if section uses dark materials when dimmed
   */
  private isDarkSection(sectionId: string): boolean {
    return sectionId === 'Revenue Streams' || sectionId === 'Cost Structure';
  }

  /**
   * Apply a material state to a mesh (ONLY way to change materials)
   */
  applyMaterialState(mesh: AbstractMesh, sectionId: string, state: MaterialState['type']): void {
    console.log(`🔍 DEBUG MaterialManager: applyMaterialState called - section: ${sectionId}, state: ${state}`);
    
    if (this.disposed) {
      console.warn('⚠️ MaterialManager: Cannot apply state - manager disposed');
      return;
    }

    try {
      console.log(`🔍 DEBUG MaterialManager: Getting material for ${sectionId}_${state}`);
      const material = this.getMaterial(sectionId, state);
      console.log(`🔍 DEBUG MaterialManager: Got material ${material.name}, isFrozen: ${material.isFrozen}`);
      
      // FIXED: Only assign material if it's different (prevent redundant assignments)
      const currentMaterial = mesh.material;
      const needsMaterialChange = currentMaterial !== material;
      
      console.log(`🔍 DEBUG MaterialManager: Current: ${currentMaterial?.name || 'none'}, Target: ${material.name}, needsChange: ${needsMaterialChange}`);
      
      if (needsMaterialChange) {
        console.log(`🔍 DEBUG MaterialManager: Assigning NEW material ${material.name} to mesh`);
        mesh.material = material;
      } else {
        console.log(`🔍 DEBUG MaterialManager: Material ${material.name} already assigned - skipping redundant assignment`);
      }
      
      // Ensure mesh visibility (always needed)
      mesh.setEnabled(true);
      mesh.isVisible = true;

      // Track current material
      this.sectionMaterialMap.set(sectionId, material.name);

      console.log(`🎨 Applied ${state} material to ${sectionId}`);
    } catch (error) {
      console.error(`❌ CRASH in MaterialManager.applyMaterialState(${sectionId}, ${state}):`, error);
      console.error(`❌ Error name: ${error.name}`);
      console.error(`❌ Error message: ${error.message}`);
      console.error(`❌ Stack trace:`, error.stack);
      
      // Fallback: ensure mesh has some material
      try {
        if (!mesh.material) {
          console.log(`🔍 DEBUG MaterialManager: Applying fallback material`);
          const fallbackMaterial = this.getMaterial(sectionId, 'normal');
          mesh.material = fallbackMaterial;
        }
      } catch (fallbackError) {
        console.error(`❌ Even fallback failed:`, fallbackError);
      }
      
      throw error; // Re-throw to trace the call stack
    }
  }

  /**
   * Get current material state for a section
   */
  getCurrentMaterialState(sectionId: string): string | null {
    return this.sectionMaterialMap.get(sectionId) || null;
  }

  /**
   * COMPATIBILITY METHOD: Assign material to mesh (for CleanBMCSystem integration)
   */
  assignMaterial(mesh: AbstractMesh, materialType: string, sectionId: string): void {
    // For now, assign normal state material by default
    this.applyMaterialState(mesh, sectionId, 'normal');
    console.log(`🔗 MaterialManager: Assigned ${materialType} material to ${sectionId}`);
  }

  /**
   * COMPATIBILITY METHOD: Update material properties (for CleanBMCSystem integration)
   */
  updateMaterial(mesh: AbstractMesh, properties: {
    diffuseColor?: Color3;
    emissiveColor?: Color3;
    alpha?: number;
  }): void {
    if (this.disposed || !mesh.material) {
      console.warn('⚠️ MaterialManager: Cannot update material - disposed or no material');
      return;
    }

    try {
      const material = mesh.material as StandardMaterial;
      
      // Unfreeze for updates
      if (material.isFrozen) {
        material.unfreeze();
      }

      // Apply property updates
      if (properties.diffuseColor) {
        material.diffuseColor = properties.diffuseColor.clone();
      }
      if (properties.emissiveColor) {
        material.emissiveColor = properties.emissiveColor.clone();
      }
      if (properties.alpha !== undefined) {
        material.alpha = properties.alpha;
      }

      // Refreeze for performance
      material.freeze();

      console.log(`🎨 MaterialManager: Updated material properties for mesh`);
    } catch (error) {
      console.error('❌ MaterialManager: Failed to update material properties:', error);
    }
  }

  /**
   * Get pool statistics for debugging
   */
  getPoolStats(): { total: number; sections: number; materials: string[] } {
    return {
      total: this.materialPool.size,
      sections: this.sectionMaterialMap.size,
      materials: Array.from(this.materialPool.keys())
    };
  }

  /**
   * Validate all materials are properly assigned
   */
  validateMaterials(): boolean {
    try {
      let allValid = true;
      
      this.materialPool.forEach((material, key) => {
        if (!material || !material.getScene()) {
          console.error(`❌ MaterialManager: Invalid material ${key}`);
          allValid = false;
        }
      });

      return allValid;
    } catch (error) {
      console.error('❌ MaterialManager: Validation failed:', error);
      return false;
    }
  }

  /**
   * Dispose all materials (only on scene cleanup)
   */
  dispose(): void {
    if (this.disposed) return;

    console.log('🎨 MaterialManager: Disposing all materials...');
    
    this.materialPool.forEach((material, key) => {
      try {
        if (material && material.getScene()) {
          material.dispose();
        }
      } catch (error) {
        console.warn(`Warning disposing material ${key}:`, error);
      }
    });

    this.materialPool.clear();
    this.sectionMaterialMap.clear();
    this.disposed = true;
    
    console.log('🎨 MaterialManager disposed');
  }
}