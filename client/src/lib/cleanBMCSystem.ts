/**
 * CLEAN BMC SYSTEM - Fresh Start
 * Simple, reliable BMC object and label management
 */

import { AbstractMesh, StandardMaterial, Color3 } from '@babylonjs/core';

interface BMCItem {
  mesh: AbstractMesh;
  material: StandardMaterial;
  label?: AbstractMesh;
  labelMaterial?: StandardMaterial;
  originalHeight: number;
  name: string;
}

export class CleanBMCSystem {
  private items = new Map<string, BMCItem>();
  private selectedItem: string | null = null;

  // Register a BMC item (mesh + material + original height)
  registerItem(name: string, mesh: AbstractMesh, material: StandardMaterial, originalHeight: number) {
    this.items.set(name, {
      mesh,
      material,
      originalHeight,
      name
    });
    
    // Set default appearance
    this.setDefaultAppearance(name);
    console.log(`✓ Registered BMC item: ${name}`);
  }

  // Add a label to an existing BMC item
  addLabel(itemName: string, labelMesh: AbstractMesh, labelMaterial: StandardMaterial) {
    const item = this.items.get(itemName);
    if (item) {
      item.label = labelMesh;
      item.labelMaterial = labelMaterial;
      this.makeLabelVisible(itemName);
      console.log(`✓ Added label to: ${itemName}`);
    } else {
      console.error(`Cannot add label - item not found: ${itemName}`);
    }
  }

  // Make a label always visible
  private makeLabelVisible(itemName: string) {
    const item = this.items.get(itemName);
    if (!item?.label || !item?.labelMaterial) return;

    // Force visibility
    item.label.isVisible = true;
    item.label.setEnabled(true);
    
    // Force material properties
    item.labelMaterial.alpha = 1.0;
    item.labelMaterial.backFaceCulling = false;
    
    if (item.labelMaterial.emissiveColor) {
      item.labelMaterial.emissiveColor.set(0.7, 0.7, 0.7);
    }
    
    item.labelMaterial.useAlphaFromDiffuseTexture = true;
    item.labelMaterial.disableLighting = false;
  }

  // Set default appearance for an item
  private setDefaultAppearance(itemName: string) {
    const item = this.items.get(itemName);
    if (!item) return;

    // Default color: medium dark grey
    const defaultColor = new Color3(0.07, 0.07, 0.07);
    item.material.diffuseColor = defaultColor;
    item.material.alpha = 1.0;
    item.mesh.scaling.y = item.originalHeight;

    this.makeLabelVisible(itemName);
  }

  // Handle hover
  onHover(itemName: string, isHovered: boolean) {
    if (this.selectedItem) return; // No hover when selected

    const item = this.items.get(itemName);
    if (!item) {
      console.error(`Hover: Item not found: ${itemName}. Available:`, Array.from(this.items.keys()));
      return;
    }

    if (isHovered) {
      // Hover color: bright blue
      item.material.diffuseColor = new Color3(0.0, 0.3, 0.8);
    } else {
      // Back to default
      this.setDefaultAppearance(itemName);
    }
  }

  // Handle selection
  onSelect(itemName: string) {
    const currentSelection = this.selectedItem;
    
    if (currentSelection === itemName) {
      // Deselect
      this.selectedItem = null;
      this.setDefaultAppearance(itemName);
      console.log(`Deselected: ${itemName}`);
    } else {
      // Select new
      this.selectedItem = itemName;
      this.updateAllVisuals();
      console.log(`Selected: ${itemName}`);
    }
  }

  // Update all visual states based on current selection
  private updateAllVisuals() {
    this.items.forEach((item, name) => {
      if (name === this.selectedItem) {
        // Selected: bright blue, full height
        item.material.diffuseColor = new Color3(0.0, 0.3, 0.8);
        item.material.alpha = 1.0;
        item.mesh.scaling.y = item.originalHeight;
      } else if (this.selectedItem) {
        // Others when selected: dim, flattened
        item.material.diffuseColor = new Color3(0.07, 0.07, 0.07);
        item.material.alpha = 0.5;
        item.mesh.scaling.y = 0.1;
      } else {
        // Default state
        this.setDefaultAppearance(name);
      }
      
      // Always keep labels visible
      this.makeLabelVisible(name);
    });
  }

  // Clear selection
  clearSelection() {
    this.selectedItem = null;
    this.updateAllVisuals();
  }

  // Force all labels visible
  forceAllLabelsVisible() {
    this.items.forEach((item, name) => {
      this.makeLabelVisible(name);
    });
  }

  // Get all registered items
  getAllItems(): string[] {
    return Array.from(this.items.keys());
  }
}

// Global instance
export const cleanBMCSystem = new CleanBMCSystem();