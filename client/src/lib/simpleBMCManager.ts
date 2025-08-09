/**
 * SIMPLE BMC MANAGER
 * Clean, straightforward management of BMC objects and labels
 * No competing systems, no complex hierarchies - just simple state management
 */

import { AbstractMesh, StandardMaterial, Color3, Vector3 } from '@babylonjs/core';

export interface BMCObject {
  mesh: AbstractMesh;
  material: StandardMaterial;
  label?: AbstractMesh;
  labelMaterial?: StandardMaterial;
  originalHeight: number;
  name: string;
}

export class SimpleBMCManager {
  private objects = new Map<string, BMCObject>();
  private selectedObject: string | null = null;

  // Register a BMC object with its mesh and optional label
  registerObject(name: string, mesh: AbstractMesh, material: StandardMaterial, originalHeight: number) {
    this.objects.set(name, {
      mesh,
      material,
      originalHeight,
      name
    });
    
    // Set default appearance
    this.setDefaultAppearance(name);
    console.log(`📋 Registered BMC object: ${name}`);
  }

  // Register a label for an existing BMC object
  registerLabel(objectName: string, labelMesh: AbstractMesh, labelMaterial: StandardMaterial) {
    const obj = this.objects.get(objectName);
    if (obj) {
      obj.label = labelMesh;
      obj.labelMaterial = labelMaterial;
      this.ensureLabelVisible(objectName);
      console.log(`🏷️ Registered label for: ${objectName}`);
    }
  }

  // Select an object (or null to deselect all)
  selectObject(objectName: string | null) {
    if (objectName && !this.objects.has(objectName)) {
      console.error(`🚫 SimpleBMCManager: Cannot select object "${objectName}". Available objects:`, Array.from(this.objects.keys()));
      return;
    }
    this.selectedObject = objectName;
    this.updateAllVisualStates();
    console.log(`🎯 Selected: ${objectName || 'none'}`);
  }

  // Get currently selected object
  getSelectedObject(): string | null {
    return this.selectedObject;
  }

  // Update visual states for all objects based on current selection
  private updateAllVisualStates() {
    this.objects.forEach((obj, name) => {
      if (name === this.selectedObject) {
        // Selected: bright blue, full height
        this.setObjectAppearance(name, new Color3(0.0, 0.3, 0.8), 1.0, obj.originalHeight);
      } else if (this.selectedObject) {
        // Other objects when something is selected: dim grey, flattened
        this.setObjectAppearance(name, new Color3(0.07, 0.07, 0.07), 0.5, 0.1);
      } else {
        // Default state: medium grey, full height
        this.setDefaultAppearance(name);
      }

      // ALWAYS keep labels fully visible
      this.ensureLabelVisible(name);
    });
  }

  // Set default appearance for an object
  private setDefaultAppearance(objectName: string) {
    this.setObjectAppearance(objectName, new Color3(0.07, 0.07, 0.07), 1.0, null);
  }

  // Set object appearance (color, opacity, height)
  private setObjectAppearance(objectName: string, color: Color3, opacity: number, height: number | null) {
    const obj = this.objects.get(objectName);
    if (!obj) return;

    // Apply color
    if ((obj.mesh as any).hasTexture) {
      obj.material.emissiveColor = color.scale(0.3);
    } else {
      obj.material.diffuseColor = color;
    }

    // Apply opacity
    obj.material.alpha = opacity;

    // Apply height (if specified, otherwise use original)
    if (height !== null) {
      obj.mesh.scaling.y = height;
    } else {
      obj.mesh.scaling.y = obj.originalHeight;
    }
  }

  // Ensure a label stays visible regardless of parent object state
  private ensureLabelVisible(objectName: string) {
    const obj = this.objects.get(objectName);
    if (!obj?.label || !obj?.labelMaterial) return;

    // Force label visibility
    obj.label.isVisible = true;
    obj.label.setEnabled(true);

    // Force label material to be fully opaque with correct brightness
    obj.labelMaterial.alpha = 1.0;
    obj.labelMaterial.backFaceCulling = false;
    
    if (obj.labelMaterial.emissiveColor && obj.labelMaterial.emissiveTexture) {
      // Set moderate emissive for good visibility - NOT too bright
      obj.labelMaterial.emissiveColor.set(0.7, 0.7, 0.7);
    }
    
    // Force diffuse texture alpha to be fully visible
    if (obj.labelMaterial.diffuseTexture) {
      (obj.labelMaterial.diffuseTexture as any).level = 1.0;
    }
    
    obj.labelMaterial.useAlphaFromDiffuseTexture = true;
    obj.labelMaterial.disableLighting = false;
    
    console.log(`🏷️ Label forced visible for: ${objectName}`);
  }

  // Set hover state for an object
  setHoverState(objectName: string, isHovered: boolean) {
    if (this.selectedObject) return; // No hover when something is selected

    const obj = this.objects.get(objectName);
    if (!obj) {
      console.error(`🚫 SimpleBMCManager: Cannot find object "${objectName}". Available objects:`, Array.from(this.objects.keys()));
      return;
    }

    if (isHovered) {
      // Hover: bright blue, others stay normal
      this.setObjectAppearance(objectName, new Color3(0.0, 0.3, 0.8), 1.0, obj.originalHeight);
      
      // Keep other objects at default
      this.objects.forEach((otherObj, otherName) => {
        if (otherName !== objectName) {
          this.setDefaultAppearance(otherName);
        }
        this.ensureLabelVisible(otherName);
      });
    } else {
      // Not hovered: return to default
      this.setDefaultAppearance(objectName);
      this.ensureLabelVisible(objectName);
    }
  }

  // Force all labels visible (emergency fix)
  forceAllLabelsVisible() {
    this.objects.forEach((obj, name) => {
      this.ensureLabelVisible(name);
    });
  }

  // Get all registered object names
  getAllObjectNames(): string[] {
    return Array.from(this.objects.keys());
  }

  // Clear all selections
  clearSelection() {
    this.selectObject(null);
  }
}

// Global instance
export const simpleBMCManager = new SimpleBMCManager();