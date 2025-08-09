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
      // Force label visibility
      label.isVisible = true;
      label.setEnabled(true);
      
      // Ensure material alpha is full
      material.alpha = 1.0;
      material.backFaceCulling = false; // Ensure visibility from all angles
      
      // Force emissive properties for visibility
      if (material.emissiveTexture) {
        material.emissiveColor.set(0.9, 0.9, 0.9); // Brighter
      }
      material.useAlphaFromDiffuseTexture = true;
      material.needDepthPrePass = false; // Prevent depth issues
      
      console.log(`🔧 FORCED visibility for ${bmcComponent} label`);
    } else {
      console.warn(`⚠️ Label not found for visibility enforcement: ${bmcComponent}`);
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
      label.setEnabled(true);
      
      if (label.material) {
        const material = label.material as any;
        if (material.alpha !== undefined) {
          material.alpha = 1.0;
        }
        if (material.emissiveColor && material.emissiveTexture) {
          material.emissiveColor.set(0.9, 0.9, 0.9);
        }
        material.backFaceCulling = false;
        material.useAlphaFromDiffuseTexture = true;
      }
    });
    
    console.log(`🔧 EMERGENCY: Forced visibility for ${allLabels.length} labels by pattern`);
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