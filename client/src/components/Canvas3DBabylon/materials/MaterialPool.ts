
import { Scene, StandardMaterial, PBRMetallicRoughnessMaterial, Color3 } from '@babylonjs/core';
import { debugLog } from '../../../lib/debug/DebugLogger';

export interface MaterialConfig {
  type: 'standard' | 'pbr';
  diffuseColor?: Color3;
  baseColor?: Color3;
  specularColor?: Color3;
  emissiveColor?: Color3;
  specularPower?: number;
  roughness?: number;
  metallic?: number;
}

export class MaterialPool {
  private static instance: MaterialPool | null = null;
  private materials = new Map<string, StandardMaterial | PBRMetallicRoughnessMaterial>();
  private scene: Scene;

  private constructor(scene: Scene) {
    this.scene = scene;
  }

  public static getInstance(scene: Scene): MaterialPool {
    if (!MaterialPool.instance) {
      MaterialPool.instance = new MaterialPool(scene);
    }
    return MaterialPool.instance;
  }

  public getMaterial(key: string, config: MaterialConfig): StandardMaterial | PBRMetallicRoughnessMaterial {
    if (this.materials.has(key)) {
      debugLog.verbose('material', `♻️ Reusing cached material: ${key}`);
      return this.materials.get(key)!;
    }

    debugLog.verbose('material', `🆕 Creating new material: ${key}`);
    const material = this.createMaterial(key, config);
    this.materials.set(key, material);
    return material;
  }

  private createMaterial(name: string, config: MaterialConfig): StandardMaterial | PBRMetallicRoughnessMaterial {
    if (config.type === 'pbr') {
      const material = new PBRMetallicRoughnessMaterial(name, this.scene);
      if (config.baseColor) material.baseColor = config.baseColor;
      if (config.roughness !== undefined) material.roughness = config.roughness;
      if (config.metallic !== undefined) material.metallic = config.metallic;
      if (config.emissiveColor) material.emissiveColor = config.emissiveColor;
      return material;
    } else {
      const material = new StandardMaterial(name, this.scene);
      if (config.diffuseColor) material.diffuseColor = config.diffuseColor;
      if (config.specularColor) material.specularColor = config.specularColor;
      if (config.emissiveColor) material.emissiveColor = config.emissiveColor;
      if (config.specularPower) material.specularPower = config.specularPower;
      return material;
    }
  }

  public disposeMaterial(key: string): void {
    const material = this.materials.get(key);
    if (material) {
      material.dispose();
      this.materials.delete(key);
      debugLog.verbose('material', `🗑️ Disposed material: ${key}`);
    }
  }

  public disposeAll(): void {
    this.materials.forEach((material, key) => {
      material.dispose();
      debugLog.verbose('material', `🗑️ Disposed material: ${key}`);
    });
    this.materials.clear();
    MaterialPool.instance = null;
  }

  public getStats(): { total: number; keys: string[] } {
    return {
      total: this.materials.size,
      keys: Array.from(this.materials.keys())
    };
  }
}
import { Scene, StandardMaterial, Color3 } from '@babylonjs/core';

/**
 * Material Pool - Prevents memory leaks from repeated material creation
 * Follows Babylon.js best practices for production apps
 */
export class MaterialPool {
  private static instance: MaterialPool | null = null;
  private materials = new Map<string, StandardMaterial>();
  private scene: Scene;

  private constructor(scene: Scene) {
    this.scene = scene;
  }

  public static getInstance(scene: Scene): MaterialPool {
    if (!MaterialPool.instance) {
      MaterialPool.instance = new MaterialPool(scene);
    }
    return MaterialPool.instance;
  }

  public getMaterial(type: string, baseColor: Color3): StandardMaterial {
    const key = `${type}_${baseColor.r}_${baseColor.g}_${baseColor.b}`;
    
    if (!this.materials.has(key)) {
      const material = new StandardMaterial(`pooled_${key}`, this.scene);
      material.diffuseColor = baseColor;
      material.specularColor = new Color3(0.2, 0.2, 0.2);
      material.specularPower = 64;
      material.ambientColor = baseColor.scale(0.4);
      
      this.materials.set(key, material);
      console.log(`📦 Material pool: Created new material ${key}`);
    }
    
    return this.materials.get(key)!;
  }

  public dispose(): void {
    this.materials.forEach(material => material.dispose());
    this.materials.clear();
    MaterialPool.instance = null;
  }
}
