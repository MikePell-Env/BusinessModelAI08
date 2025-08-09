/**
 * Dedicated Label Management System
 * 
 * This manager ensures labels remain visible and independent of parent mesh material changes.
 * It provides a unified interface for all label operations across the BMC system.
 */

import { AbstractMesh, StandardMaterial, Scene } from '@babylonjs/core';

export class LabelManager {
  private labels: Map<string, AbstractMesh> = new Map();
  private labelMaterials: Map<string, StandardMaterial> = new Map();
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
   * Register a label with the manager
   */
  registerLabel(labelName: string, labelMesh: AbstractMesh, material: StandardMaterial) {
    this.labels.set(labelName, labelMesh);
    this.labelMaterials.set(labelName, material);
    
    // Ensure label is always visible
    this.ensureLabelVisibility(labelName);
    
    console.log(`📋 Label registered: ${labelName}`);
  }

  /**
   * Ensure a specific label remains visible
   */
  ensureLabelVisibility(labelName: string) {
    const label = this.labels.get(labelName);
    const material = this.labelMaterials.get(labelName);
    
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
   * Ensure ALL registered labels remain visible
   */
  ensureAllLabelsVisible() {
    this.labels.forEach((label, labelName) => {
      this.ensureLabelVisibility(labelName);
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

// Global label manager instance
export const globalLabelManager = new LabelManager();