import { Vector3, AbstractMesh, TransformNode } from '@babylonjs/core';
import { debugLog } from '@/lib/debug/DebugLogger';

export interface BMCObjectDescriptor {
  mesh: AbstractMesh;
  sectionName: string;
  objectType: 'main_bmc' | 'separate_glb';
  transformNode?: TransformNode; // Only for main BMC sections
  rootMesh?: AbstractMesh; // Only for separate GLB objects
}

export class UnifiedBMCTransformSystem {
  private objects = new Map<string, BMCObjectDescriptor>();

  // Register objects in the unified system
  registerObject(sectionName: string, descriptor: BMCObjectDescriptor) {
    this.objects.set(sectionName, descriptor);
    // Object registered
  }

  // Universal height manipulation (handles different object types)
  setHeight(sectionName: string, height: number): boolean {
    const obj = this.objects.get(sectionName);
    if (!obj) {
      debugLog.warn('transform', `Object not found: ${sectionName}`);
      return false;
    }

    if (obj.objectType === 'main_bmc' && obj.transformNode) {
      // Main BMC sections use transformNode scaling
      obj.transformNode.scaling.y = height;
      // Height updated
    } else if (obj.objectType === 'separate_glb') {
      // Separate GLB objects use mesh scaling directly
      obj.mesh.scaling.y = height;
      // Height updated
    }
    return true;
  }

  // Universal position manipulation
  setPosition(sectionName: string, x: number, y: number, z: number): boolean {
    const obj = this.objects.get(sectionName);
    if (!obj) {
      debugLog.warn('transform', `Object not found: ${sectionName}`);
      return false;
    }

    if (obj.objectType === 'main_bmc') {
      // Main BMC sections cannot be repositioned individually (part of single mesh)
      debugLog.warn('transform', `Cannot reposition main BMC section: ${sectionName}`);
      return false;
    } else if (obj.objectType === 'separate_glb' && obj.rootMesh) {
      // Separate GLB objects can be repositioned via root mesh
      obj.rootMesh.position = new Vector3(x, y, z);
      debugLog.verbose('transform', `Separate GLB: ${sectionName} moved to (${x}, ${y}, ${z})`);
    }
    return true;
  }

  // Universal scaling manipulation
  setScale(sectionName: string, x: number, y: number, z: number): boolean {
    const obj = this.objects.get(sectionName);
    if (!obj) {
      debugLog.warn('transform', `Object not found: ${sectionName}`);
      return false;
    }

    if (obj.objectType === 'main_bmc' && obj.transformNode) {
      obj.transformNode.scaling = new Vector3(x, y, z);
      debugLog.verbose('transform', `Main BMC: ${sectionName} scaled to (${x}, ${y}, ${z})`);
    } else if (obj.objectType === 'separate_glb' && obj.rootMesh) {
      obj.rootMesh.scaling = new Vector3(x, y, z);
      debugLog.verbose('transform', `Separate GLB: ${sectionName} scaled to (${x}, ${y}, ${z})`);
    }
    return true;
  }

  // Get current transformation data
  getTransformData(sectionName: string): any {
    const obj = this.objects.get(sectionName);
    if (!obj) return null;

    if (obj.objectType === 'main_bmc' && obj.transformNode) {
      return {
        type: 'main_bmc',
        position: obj.transformNode.position.asArray(),
        rotation: obj.transformNode.rotation.asArray(),
        scaling: obj.transformNode.scaling.asArray()
      };
    } else if (obj.objectType === 'separate_glb' && obj.rootMesh) {
      return {
        type: 'separate_glb',
        position: obj.rootMesh.position.asArray(),
        rotation: obj.rootMesh.rotation.asArray(),
        scaling: obj.rootMesh.scaling.asArray(),
        meshPosition: obj.mesh.position.asArray(),
        meshScaling: obj.mesh.scaling.asArray()
      };
    }
    return null;
  }

  // Export all transformation data for debugging
  exportAllTransforms(): Record<string, any> {
    const transforms: Record<string, any> = {};
    this.objects.forEach((obj, name) => {
      transforms[name] = this.getTransformData(name);
    });
    return transforms;
  }

  // Get all registered objects
  getAllObjects(): string[] {
    return Array.from(this.objects.keys());
  }

  // Debug coordinate system
  debugCoordinateSystem() {
    // Debug info removed for performance
  }
}
