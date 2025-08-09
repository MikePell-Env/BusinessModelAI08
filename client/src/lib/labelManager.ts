/**
 * Unified BMC Label Management System
 * 
 * Integrates with BMC state management to ensure labels remain visible
 * and consistent across all view modes and selection states.
 */

import { AbstractMesh, StandardMaterial, Scene } from '@babylonjs/core';
import { BMCComponentName } from '@/types/bmcState';

export class UnifiedBMCLabelManager {
  private labels: Map<BMCComponentName, AbstractMesh> = new Map();
  private labelMaterials: Map<BMCComponentName, StandardMaterial> = new Map();
  private sectionNameMapping: Map<string, BMCComponentName> = new Map();
  private scene: Scene | null = null;

  constructor(scene?: Scene) {
    if (scene) {
      this.scene = scene;
    }
  }

  setScene(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Register a label with unified BMC component mapping
   */
  registerLabel(bmcComponent: BMCComponentName, sectionName: string, labelMesh: AbstractMesh, material: StandardMaterial) {
    this.labels.set(bmcComponent, labelMesh);
    this.labelMaterials.set(bmcComponent, material);
    this.sectionNameMapping.set(sectionName, bmcComponent);
    
    // Ensure label is always visible
    this.ensureLabelVisibility(bmcComponent);
    
    console.log(`📋 BMC Label registered: ${bmcComponent} (${sectionName})`);
  }

  /**
   * Ensure a specific BMC component label remains visible
   */
  ensureLabelVisibility(bmcComponent: BMCComponentName) {
    const label = this.labels.get(bmcComponent);
    const material = this.labelMaterials.get(bmcComponent);
    
    if (label && material) {
      label.isVisible = true;
      material.alpha = 1.0;
      
      // Ensure material properties are correct for visibility
      if (material.emissiveTexture) {
        material.emissiveColor.set(0.8, 0.8, 0.8);
      }
      material.useAlphaFromDiffuseTexture = true;
    }
  }
  
  /**
   * Get BMC component from section name
   */
  getBMCComponentFromSection(sectionName: string): BMCComponentName | null {
    return this.sectionNameMapping.get(sectionName) || null;
  }

  /**
   * Ensure ALL registered BMC labels remain visible
   */
  ensureAllLabelsVisible() {
    this.labels.forEach((label, bmcComponent) => {
      this.ensureLabelVisibility(bmcComponent);
    });
  }

  /**
   * Get all labels by pattern (e.g., contains "Label")
   */
  findLabelsByPattern(pattern: string): AbstractMesh[] {
    if (!this.scene) return [];
    
    return this.scene.meshes.filter(mesh => 
      mesh.name && mesh.name.includes(pattern)
    ) as AbstractMesh[];
  }

  /**
   * Force visibility for all labels in the scene by pattern
   */
  forceAllLabelsVisibleByPattern(pattern: string = "Label") {
    const allLabels = this.findLabelsByPattern(pattern);
    
    allLabels.forEach(label => {
      label.isVisible = true;
      if (label.material && (label.material as any).alpha !== undefined) {
        (label.material as any).alpha = 1.0;
      }
    });
    
    console.log(`🔧 Forced visibility for ${allLabels.length} labels`);
  }

  /**
   * Get label count
   */
  getLabelCount(): number {
    return this.labels.size;
  }

  /**
   * Clear all registered labels
   */
  clear() {
    this.labels.clear();
    this.labelMaterials.clear();
  }
}

// Global unified BMC label manager instance
export const globalBMCLabelManager = new UnifiedBMCLabelManager();