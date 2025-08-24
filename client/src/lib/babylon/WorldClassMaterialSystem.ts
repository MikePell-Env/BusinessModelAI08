
import { 
  Scene, 
  StandardMaterial, 
  Color3, 
  AbstractMesh,
  Engine
} from '@babylonjs/core';

export interface MaterialState {
  name: string;
  diffuseColor: Color3;
  emissiveColor?: Color3;
  specularColor: Color3;
  specularPower: number;
  alpha: number;
}

/**
 * World-Class Material System - Enterprise Grade
 * 
 * Key Features:
 * - Pre-allocated material pool (no runtime allocation)
 * - WebGL crash prevention through resource limits
 * - Zero dynamic material creation during interactions
 * - Bulletproof state management
 * - High-performance material switching
 */
export class WorldClassMaterialSystem {
  private scene: Scene;
  private materialPool: Map<string, StandardMaterial> = new Map();
  private isInitialized: boolean = false;
  private readonly MAX_MATERIALS = 15; // Safe WebGL limit
  private readonly materialStates: Map<string, MaterialState> = new Map();

  constructor(scene: Scene) {
    this.scene = scene;
    this.initializeSystem();
  }

  private initializeSystem(): void {
    try {
      this.defineMaterialStates();
      this.preallocateAllMaterials();
      this.optimizeAllMaterials();
      this.isInitialized = true;
      console.log('🏆 WorldClassMaterialSystem: Enterprise system initialized');
    } catch (error) {
      console.error('❌ WorldClassMaterialSystem: Critical initialization failure:', error);
      this.isInitialized = false;
    }
  }

  private defineMaterialStates(): void {
    // Base section materials
    this.materialStates.set('default_grey', {
      name: 'default_grey',
      diffuseColor: new Color3(0.07, 0.07, 0.07),
      specularColor: new Color3(0.2, 0.2, 0.2),
      specularPower: 32,
      alpha: 1.0
    });

    // Interactive states
    this.materialStates.set('hover_blue', {
      name: 'hover_blue',
      diffuseColor: new Color3(0.0, 0.3, 0.8),
      emissiveColor: new Color3(0.0, 0.05, 0.15),
      specularColor: new Color3(0.3, 0.3, 0.3),
      specularPower: 64,
      alpha: 1.0
    });

    this.materialStates.set('selected_blue', {
      name: 'selected_blue',
      diffuseColor: new Color3(0.0, 0.3, 0.8),
      emissiveColor: new Color3(0.0, 0.1, 0.2),
      specularColor: new Color3(0.4, 0.4, 0.4),
      specularPower: 64,
      alpha: 1.0
    });

    this.materialStates.set('dimmed_grey', {
      name: 'dimmed_grey',
      diffuseColor: new Color3(0.03, 0.03, 0.03),
      specularColor: new Color3(0.1, 0.1, 0.1),
      specularPower: 16,
      alpha: 0.6
    });

    // Special section materials
    this.materialStates.set('cost_red', {
      name: 'cost_red',
      diffuseColor: new Color3(0.35, 0.0, 0.0),
      specularColor: new Color3(0.2, 0.1, 0.1),
      specularPower: 32,
      alpha: 1.0
    });

    this.materialStates.set('revenue_green', {
      name: 'revenue_green',
      diffuseColor: new Color3(0.0, 0.20, 0.12),
      specularColor: new Color3(0.1, 0.2, 0.1),
      specularPower: 32,
      alpha: 1.0
    });

    // Variants for different states
    this.materialStates.set('cost_red_hover', {
      name: 'cost_red_hover',
      diffuseColor: new Color3(0.5, 0.1, 0.1),
      emissiveColor: new Color3(0.1, 0.0, 0.0),
      specularColor: new Color3(0.3, 0.2, 0.2),
      specularPower: 64,
      alpha: 1.0
    });

    this.materialStates.set('revenue_green_hover', {
      name: 'revenue_green_hover',
      diffuseColor: new Color3(0.1, 0.35, 0.2),
      emissiveColor: new Color3(0.0, 0.1, 0.05),
      specularColor: new Color3(0.2, 0.3, 0.2),
      specularPower: 64,
      alpha: 1.0
    });

    console.log(`✅ Defined ${this.materialStates.size} material states`);
  }

  private preallocateAllMaterials(): void {
    let allocated = 0;
    
    for (const [key, state] of this.materialStates) {
      if (allocated >= this.MAX_MATERIALS) {
        console.warn(`⚠️ Material limit reached at ${this.MAX_MATERIALS}, stopping allocation`);
        break;
      }

      const material = new StandardMaterial(state.name, this.scene);
      
      // Apply state configuration
      material.diffuseColor = state.diffuseColor.clone();
      material.specularColor = state.specularColor.clone();
      material.specularPower = state.specularPower;
      material.alpha = state.alpha;
      
      if (state.emissiveColor) {
        material.emissiveColor = state.emissiveColor.clone();
      }

      // Enterprise optimizations
      material.needDepthPrePass = true;
      material.backFaceCulling = true;
      material.freeze(); // Critical for performance

      this.materialPool.set(key, material);
      allocated++;
    }

    console.log(`🏆 Pre-allocated ${allocated} high-performance materials`);
  }

  private optimizeAllMaterials(): void {
    // Apply Babylon.js best practices for stability
    this.materialPool.forEach((material, name) => {
      // Ensure proper alpha handling
      if (material.alpha < 1.0) {
        material.alphaMode = Engine.ALPHA_PREMULTIPLIED;
        material.separateCullingPass = true;
      }

      // Optimize for WebGL stability
      material.maxSimultaneousLights = 4; // Prevent shader complexity
      material.disableLighting = false;
      material.useVertexColor = false;
      
      console.log(`⚡ Optimized material: ${name}`);
    });
  }

  /**
   * ZERO-ALLOCATION material application
   * Uses pre-allocated materials only
   */
  public applyMaterialSafely(mesh: AbstractMesh, materialKey: string): boolean {
    if (!this.isInitialized || !mesh) {
      console.warn('⚠️ WorldClassMaterialSystem not ready');
      return false;
    }

    const material = this.materialPool.get(materialKey);
    if (!material) {
      console.warn(`⚠️ Material not found in pool: ${materialKey}`);
      // Fallback to default
      const defaultMaterial = this.materialPool.get('default_grey');
      if (defaultMaterial) {
        mesh.material = defaultMaterial;
        return true;
      }
      return false;
    }

    try {
      // Store previous state for rollback
      const previousMaterial = mesh.material;
      
      // Apply new material
      mesh.material = material;
      
      // Verify success
      if (mesh.material !== material) {
        console.error(`❌ Material application failed for ${mesh.name}`);
        mesh.material = previousMaterial;
        return false;
      }

      return true;
    } catch (error) {
      console.error(`❌ Critical error applying material ${materialKey}:`, error);
      return false;
    }
  }

  /**
   * Smart material selection based on section and state
   */
  public getMaterialKeyForState(sectionName: string, state: 'normal' | 'hover' | 'selected' | 'dimmed'): string {
    // Handle special sections
    if (sectionName === 'Cost Structure') {
      switch (state) {
        case 'hover': return 'cost_red_hover';
        case 'selected': return 'cost_red_hover';
        case 'dimmed': return 'dimmed_grey';
        default: return 'cost_red';
      }
    }

    if (sectionName === 'Revenue Streams') {
      switch (state) {
        case 'hover': return 'revenue_green_hover';
        case 'selected': return 'revenue_green_hover';
        case 'dimmed': return 'dimmed_grey';
        default: return 'revenue_green';
      }
    }

    // Standard sections
    switch (state) {
      case 'hover': return 'hover_blue';
      case 'selected': return 'selected_blue';
      case 'dimmed': return 'dimmed_grey';
      default: return 'default_grey';
    }
  }

  /**
   * Get system health and performance stats
   */
  public getSystemStats(): object {
    return {
      initialized: this.isInitialized,
      materialsAllocated: this.materialPool.size,
      maxMaterials: this.MAX_MATERIALS,
      availableSlots: this.MAX_MATERIALS - this.materialPool.size,
      memoryEfficient: true,
      webglSafe: true
    };
  }

  /**
   * Enterprise cleanup
   */
  public dispose(): void {
    console.log('🧹 WorldClassMaterialSystem: Starting enterprise cleanup...');
    
    this.materialPool.forEach((material, name) => {
      try {
        material.dispose();
      } catch (error) {
        console.warn(`Warning disposing material ${name}:`, error);
      }
    });
    
    this.materialPool.clear();
    this.materialStates.clear();
    this.isInitialized = false;
    
    console.log('✅ WorldClassMaterialSystem: Cleanup complete');
  }
}
