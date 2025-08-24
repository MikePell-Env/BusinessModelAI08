
import { 
  Scene, 
  StandardMaterial, 
  Color3, 
  AbstractMesh,
  Engine,
  Material
} from '@babylonjs/core';

export interface MaterialConfig {
  diffuseColor: Color3;
  specularColor?: Color3;
  specularPower?: number;
  ambientColor?: Color3;
  emissiveColor?: Color3;
  alpha?: number;
}

export class SafeMaterialManager {
  private scene: Scene;
  private materialCache: Map<string, StandardMaterial> = new Map();
  private isInitialized: boolean = false;
  private maxMaterials: number = 20; // Prevent WebGL resource exhaustion

  constructor(scene: Scene) {
    this.scene = scene;
    this.initialize();
  }

  private initialize(): void {
    try {
      // Pre-create base materials to avoid runtime allocation
      this.createBaseMaterials();
      this.isInitialized = true;
      console.log('✅ SafeMaterialManager initialized successfully');
    } catch (error) {
      console.error('❌ SafeMaterialManager initialization failed:', error);
      this.isInitialized = false;
    }
  }

  private createBaseMaterials(): void {
    const baseMaterials = [
      { name: 'default_grey', config: { diffuseColor: new Color3(0.07, 0.07, 0.07) } },
      { name: 'hover_blue', config: { diffuseColor: new Color3(0.0, 0.3, 0.8) } },
      { name: 'selected_blue', config: { 
        diffuseColor: new Color3(0.0, 0.3, 0.8),
        emissiveColor: new Color3(0.0, 0.1, 0.2)
      }},
      { name: 'cost_red', config: { diffuseColor: new Color3(0.35, 0.0, 0.0) } },
      { name: 'revenue_green', config: { diffuseColor: new Color3(0.0, 0.20, 0.12) } }
    ];

    baseMaterials.forEach(({ name, config }) => {
      this.createMaterial(name, config);
    });
  }

  public createMaterial(name: string, config: MaterialConfig): StandardMaterial | null {
    if (!this.isInitialized) {
      console.warn('⚠️ SafeMaterialManager not initialized');
      return null;
    }

    // Check cache first
    if (this.materialCache.has(name)) {
      return this.materialCache.get(name)!;
    }

    // Check material limit
    if (this.materialCache.size >= this.maxMaterials) {
      console.warn('⚠️ Material limit reached, reusing existing material');
      return this.materialCache.get('default_grey') || null;
    }

    try {
      const material = new StandardMaterial(name, this.scene);
      
      // Apply configuration safely
      material.diffuseColor = config.diffuseColor.clone();
      material.specularColor = config.specularColor?.clone() || new Color3(0.2, 0.2, 0.2);
      material.specularPower = config.specularPower || 32;
      material.ambientColor = config.ambientColor?.clone() || config.diffuseColor.scale(0.4);
      
      if (config.emissiveColor) {
        material.emissiveColor = config.emissiveColor.clone();
      }
      
      if (config.alpha !== undefined) {
        material.alpha = config.alpha;
        material.alphaMode = Engine.ALPHA_PREMULTIPLIED;
      }

      // Babylon.js best practices for stability
      material.needDepthPrePass = true;
      material.backFaceCulling = true;
      material.freeze(); // Optimize for performance

      this.materialCache.set(name, material);
      console.log(`✅ Created material: ${name}`);
      
      return material;
    } catch (error) {
      console.error(`❌ Failed to create material ${name}:`, error);
      return this.materialCache.get('default_grey') || null;
    }
  }

  public getMaterial(name: string): StandardMaterial | null {
    return this.materialCache.get(name) || null;
  }

  public applyMaterialSafely(mesh: AbstractMesh, materialName: string): boolean {
    if (!this.isInitialized || !mesh) {
      return false;
    }

    try {
      const material = this.getMaterial(materialName);
      if (!material) {
        console.warn(`⚠️ Material not found: ${materialName}`);
        return false;
      }

      // Store current state for rollback
      const previousMaterial = mesh.material;
      const previousVisibility = mesh.visibility;
      const previousEnabled = mesh.isEnabled();

      // Apply material
      mesh.material = material;

      // Verify application was successful
      if (mesh.material !== material) {
        console.error('❌ Material application failed, rolling back');
        mesh.material = previousMaterial;
        return false;
      }

      // Restore visibility states
      mesh.visibility = previousVisibility;
      mesh.setEnabled(previousEnabled);

      return true;
    } catch (error) {
      console.error(`❌ Failed to apply material ${materialName} to ${mesh.name}:`, error);
      return false;
    }
  }

  public getStats(): object {
    return {
      initialized: this.isInitialized,
      materialsCreated: this.materialCache.size,
      maxMaterials: this.maxMaterials,
      availableSlots: this.maxMaterials - this.materialCache.size
    };
  }

  public dispose(): void {
    this.materialCache.forEach(material => {
      try {
        material.dispose();
      } catch (error) {
        console.warn('Warning during material disposal:', error);
      }
    });
    this.materialCache.clear();
    this.isInitialized = false;
    console.log('🧹 SafeMaterialManager disposed');
  }
}
