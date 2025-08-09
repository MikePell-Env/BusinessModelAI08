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

  // Make a label always visible at 100% opacity - NEVER change label opacity
  private makeLabelVisible(itemName: string) {
    const item = this.items.get(itemName);
    if (!item?.label || !item?.labelMaterial) {
      console.warn(`⚠️ Cannot make label visible - missing label or material for: ${itemName}`);
      return;
    }

    console.log(`🔧 Making label visible for: ${itemName}, current alpha: ${item.labelMaterial.alpha}`);
    
    // FORCE label visibility - NEVER change opacity from 100%
    item.label.isVisible = true;
    item.label.setEnabled(true);
    
    // CRITICAL: Override parent visibility inheritance using Babylon.js proper method
    item.label.visibility = 1.0; // Force full visibility regardless of parent
    
    // CRITICAL: Always keep label material at 100% opacity
    item.labelMaterial.alpha = 1.0;
    item.labelMaterial.backFaceCulling = false;
    item.labelMaterial.useAlphaFromDiffuseTexture = true;
    item.labelMaterial.disableLighting = false;
    
    // CRITICAL: Use ALPHATEST mode to enable PNG transparency while staying opaque
    (item.labelMaterial as any).transparencyMode = 1; // Material.MATERIAL_ALPHATEST = 1
    
    // REMOVE emissive override that may interfere with PNG texture rendering
    // Keep original emissive settings to avoid texture corruption
    
    // Keep original diffuse color - don't override to white (breaks PNG transparency)
    // item.labelMaterial.diffuseColor should remain as originally set
    
    // Ensure PNG texture renders correctly without interference
    if (item.labelMaterial.diffuseTexture) {
      (item.labelMaterial.diffuseTexture as any).level = 1.0;
      (item.labelMaterial.diffuseTexture as any).hasAlpha = true;
      // Critical: Enable alpha from diffuse texture for PNG transparency
      item.labelMaterial.useAlphaFromDiffuseTexture = true;
      
      // Ensure texture filtering doesn't corrupt pixels
      (item.labelMaterial.diffuseTexture as any).wrapU = 1; // CLAMP
      (item.labelMaterial.diffuseTexture as any).wrapV = 1; // CLAMP
    }
    
    // CRITICAL: Labels must participate in normal depth testing, not render on top
    item.label.renderingGroupId = 0; // Same group as 3D objects for proper occlusion
    
    // Enable proper depth testing for labels
    if (item.labelMaterial) {
      item.labelMaterial.needDepthPrePass = false; // Normal depth testing
      (item.labelMaterial as any).depthFunction = 515; // Engine.LEQUAL for normal depth testing
    }
    
    console.log(`✅ Label ${itemName} visibility enforced: visibility=${item.label.visibility}, alpha=${item.labelMaterial.alpha}, renderingGroup=${item.label.renderingGroupId}`);
  }

  // Set default appearance for an item
  private setDefaultAppearance(itemName: string) {
    const item = this.items.get(itemName);
    if (!item) return;

    // Default: medium dark grey, full opacity, original height
    item.material.diffuseColor = new Color3(0.07, 0.07, 0.07);
    item.material.alpha = 1.0;
    item.mesh.scaling.y = item.originalHeight;

    // Always ensure label visibility
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
      // Hover: bright blue color, keep full opacity and height
      item.material.diffuseColor = new Color3(0.0, 0.3, 0.8);
      item.material.alpha = 1.0;
      item.mesh.scaling.y = item.originalHeight;
    } else {
      // Back to default: medium dark grey
      item.material.diffuseColor = new Color3(0.07, 0.07, 0.07);
      item.material.alpha = 1.0;
      item.mesh.scaling.y = item.originalHeight;
    }
    
    // Always ensure label stays visible
    this.makeLabelVisible(itemName);
  }

  // Handle selection
  onSelect(itemName: string) {
    const currentSelection = this.selectedItem;
    
    if (currentSelection === itemName) {
      // Deselect - restore ALL objects to default state
      this.selectedItem = null;
      this.restoreAllToDefault();
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
    console.log(`🎨 Updating all visuals, selected: ${this.selectedItem}`);
    
    this.items.forEach((item, name) => {
      console.log(`🎨 Processing ${name}:`, {
        isSelected: name === this.selectedItem,
        hasLabel: !!item.label,
        hasMaterial: !!item.labelMaterial,
        currentAlpha: item.labelMaterial?.alpha
      });
      
      // ALWAYS update labels FIRST to ensure they stay visible
      this.makeLabelVisible(name);
      
      if (name === this.selectedItem) {
        // Selected: bright blue, full height, full opacity
        item.material.diffuseColor = new Color3(0.0, 0.3, 0.8);
        item.material.alpha = 1.0;
        item.mesh.scaling.y = item.originalHeight;
        console.log(`🔵 ${name} SELECTED: blue, height=${item.originalHeight}`);
      } else if (this.selectedItem) {
        // Others when selected: dim object, flattened object - BUT LABELS STAY 100%
        item.material.diffuseColor = new Color3(0.07, 0.07, 0.07);
        item.material.alpha = 0.5; // Only affects the 3D object, NOT the label
        item.mesh.scaling.y = 0.1;
        console.log(`⚫ ${name} dimmed: grey, height=0.1, LABEL SHOULD STAY VISIBLE`);
      } else {
        // Default state
        item.material.diffuseColor = new Color3(0.07, 0.07, 0.07);
        item.material.alpha = 1.0;
        item.mesh.scaling.y = item.originalHeight;
        console.log(`🔘 ${name} default: grey, height=${item.originalHeight}`);
      }
      
      // CRITICAL: Force label visibility again after any material changes
      this.makeLabelVisible(name);
    });
  }

  // Clear selection - restore all objects to original state
  clearSelection() {
    this.selectedItem = null;
    this.restoreAllToDefault();
  }

  // Restore all objects to original material, height, and opacity
  private restoreAllToDefault() {
    this.items.forEach((item, name) => {
      // FIRST: Force label visibility before changing anything
      this.makeLabelVisible(name);
      
      // Original material: medium dark grey, 100% opacity, original height
      item.material.diffuseColor = new Color3(0.07, 0.07, 0.07);
      item.material.alpha = 1.0;
      item.mesh.scaling.y = item.originalHeight;
      
      // LAST: Force label visibility again after material changes
      this.makeLabelVisible(name);
    });
  }

  // Force all labels visible with debug logging
  forceAllLabelsVisible() {
    console.log(`🚨 FORCE ALL LABELS VISIBLE - Processing ${this.items.size} items`);
    this.items.forEach((item, name) => {
      console.log(`🚨 Forcing visibility for: ${name}`);
      this.makeLabelVisible(name);
    });
    console.log(`🚨 FORCE COMPLETE`);
  }

  // Get all registered items
  getAllItems(): string[] {
    return Array.from(this.items.keys());
  }
}

// Global instance
export const cleanBMCSystem = new CleanBMCSystem();