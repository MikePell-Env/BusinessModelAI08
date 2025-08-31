
import { Scene, AbstractMesh, Material, Texture } from '@babylonjs/core';

/**
 * Memory Manager - Proper resource disposal following Babylon.js patterns
 */
export class MemoryManager {
  private disposables: Array<{ dispose: () => void }> = [];

  public track<T extends { dispose: () => void }>(resource: T): T {
    this.disposables.push(resource);
    return resource;
  }

  public disposeAll(): void {
    // Dispose in reverse order (Babylon.js best practice)
    for (let i = this.disposables.length - 1; i >= 0; i--) {
      try {
        this.disposables[i].dispose();
      } catch (error) {
        console.warn('Memory cleanup warning:', error);
      }
    }
    this.disposables.length = 0;
  }

  public static disposeSceneResources(scene: Scene): void {
    // Proper scene cleanup following Babylon.js documentation
    scene.meshes.slice().forEach(mesh => {
      if (mesh.material) {
        mesh.material.dispose();
      }
      mesh.dispose();
    });
    
    scene.textures.slice().forEach(texture => texture.dispose());
    scene.dispose();
  }
}
