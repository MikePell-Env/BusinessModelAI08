
import { Scene, AbstractMesh, Texture, Material } from '@babylonjs/core';
import { debugLog } from '../../../lib/debug/DebugLogger';

export interface DisposableAsset {
  dispose(): void;
  name?: string;
  isDisposed?: boolean;
}

export class AssetManager {
  private scene: Scene;
  private meshes = new Set<AbstractMesh>();
  private textures = new Set<Texture>();
  private materials = new Set<Material>();
  private customAssets = new Set<DisposableAsset>();

  constructor(scene: Scene) {
    this.scene = scene;
  }

  public registerMesh(mesh: AbstractMesh): void {
    this.meshes.add(mesh);
    debugLog.verbose('asset', `📦 Registered mesh: ${mesh.name}`);
  }

  public registerTexture(texture: Texture): void {
    this.textures.add(texture);
    debugLog.verbose('asset', `🖼️ Registered texture: ${texture.name}`);
  }

  public registerMaterial(material: Material): void {
    this.materials.add(material);
    debugLog.verbose('asset', `🎨 Registered material: ${material.name}`);
  }

  public registerCustomAsset(asset: DisposableAsset): void {
    this.customAssets.add(asset);
    debugLog.verbose('asset', `🔧 Registered custom asset: ${asset.name || 'unnamed'}`);
  }

  public unregisterMesh(mesh: AbstractMesh): void {
    this.meshes.delete(mesh);
    debugLog.verbose('asset', `📦 Unregistered mesh: ${mesh.name}`);
  }

  public unregisterTexture(texture: Texture): void {
    this.textures.delete(texture);
    debugLog.verbose('asset', `🖼️ Unregistered texture: ${texture.name}`);
  }

  public unregisterMaterial(material: Material): void {
    this.materials.delete(material);
    debugLog.verbose('asset', `🎨 Unregistered material: ${material.name}`);
  }

  public disposeTemplateMeshes(templateName: string): void {
    const meshesToDispose: AbstractMesh[] = [];
    
    this.meshes.forEach(mesh => {
      if (mesh.name.toLowerCase().includes(templateName.toLowerCase()) ||
          (mesh as any).templateName === templateName) {
        meshesToDispose.push(mesh);
      }
    });

    meshesToDispose.forEach(mesh => {
      this.disposeMeshSafely(mesh);
    });

    debugLog.info('asset', `🗑️ Disposed ${meshesToDispose.length} meshes for template: ${templateName}`);
  }

  private disposeMeshSafely(mesh: AbstractMesh): void {
    try {
      // Dispose children first
      if (mesh.getChildren) {
        mesh.getChildren().forEach(child => {
          if (child instanceof AbstractMesh) {
            this.disposeMeshSafely(child);
          }
        });
      }

      // Dispose material if it's unique to this mesh
      if (mesh.material && (mesh.material as any).refCount <= 1) {
        mesh.material.dispose();
        this.materials.delete(mesh.material);
      }

      // Remove from tracking and dispose
      this.meshes.delete(mesh);
      mesh.dispose();
      
      debugLog.verbose('asset', `🗑️ Safely disposed mesh: ${mesh.name}`);
    } catch (error) {
      debugLog.error('asset', `❌ Error disposing mesh ${mesh.name}: ${error}`);
    }
  }

  public disposeAll(): void {
    debugLog.info('asset', '🗑️ Starting comprehensive asset disposal...');

    // Dispose custom assets first
    this.customAssets.forEach(asset => {
      try {
        if (!asset.isDisposed) {
          asset.dispose();
        }
      } catch (error) {
        debugLog.error('asset', `❌ Error disposing custom asset: ${error}`);
      }
    });
    this.customAssets.clear();

    // Dispose meshes (in reverse creation order)
    const meshArray = Array.from(this.meshes).reverse();
    meshArray.forEach(mesh => this.disposeMeshSafely(mesh));

    // Dispose materials
    this.materials.forEach(material => {
      try {
        if (!material.isDisposed) {
          material.dispose();
        }
      } catch (error) {
        debugLog.error('asset', `❌ Error disposing material: ${error}`);
      }
    });
    this.materials.clear();

    // Dispose textures
    this.textures.forEach(texture => {
      try {
        if (!texture.isDisposed) {
          texture.dispose();
        }
      } catch (error) {
        debugLog.error('asset', `❌ Error disposing texture: ${error}`);
      }
    });
    this.textures.clear();

    debugLog.info('asset', '✅ Asset disposal complete');
  }

  public getStats(): { meshes: number; materials: number; textures: number; custom: number } {
    return {
      meshes: this.meshes.size,
      materials: this.materials.size,
      textures: this.textures.size,
      custom: this.customAssets.size
    };
  }
}
