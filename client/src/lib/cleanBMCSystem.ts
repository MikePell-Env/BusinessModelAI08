/**
 * CLEAN BMC SYSTEM - Fresh Start
 * Simple, reliable BMC object and label management
 */

import { AbstractMesh, StandardMaterial, Color3 } from '@babylonjs/core';
import { BMCComponentName } from '@/types/bmcState';

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
  // REMOVED: private selectedItem - BMC State Manager is the single source of truth
  private bmcStateManager: any = null; // Will be injected
  
  // Inject BMC State Manager dependency
  setBMCStateManager(bmcStateManager: any) {
    console.log("🔗 CleanBMCSystem.setBMCStateManager called with:", bmcStateManager);
    this.bmcStateManager = bmcStateManager;
    
    // Subscribe to state changes from BMC State Manager
    if (bmcStateManager && bmcStateManager.addStateListener) {
      console.log("🔗 Adding state listener to BMC State Manager");
      bmcStateManager.addStateListener(() => {
        console.log("🔄 CleanBMCSystem received state change notification, updating visuals");
        this.updateAllVisuals();
      });
    } else {
      console.warn("⚠️ BMC State Manager missing addStateListener method:", bmcStateManager);
    }
  }

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

  // Selection methods that delegate to BMC State Manager
  selectObject(name: string | null) {
    console.log(`🎯 CleanBMCSystem.selectObject called with: ${name}`);
    console.log(`🎯 BMC State Manager available: ${!!this.bmcStateManager}`);
    
    if (this.bmcStateManager) {
      // Convert name to BMCComponentName format if needed
      const componentName = this.convertNameToBMCComponent(name);
      console.log(`🎯 Converting ${name} -> ${componentName}`);
      this.bmcStateManager.selectObject(componentName);
      console.log(`🎯 CleanBMCSystem: Delegated selection to BMC State Manager: ${name} -> ${componentName}`);
    } else {
      console.warn("⚠️ BMC State Manager not injected into CleanBMCSystem");
    }
  }

  getSelectedObject(): string | null {
    if (this.bmcStateManager) {
      const selected = this.bmcStateManager.getSelectedObject();
      return this.convertBMCComponentToName(selected);
    }
    return null;
  }

  // Helper methods to convert between name formats
  private convertNameToBMCComponent(name: string | null): BMCComponentName | null {
    if (!name) return null;
    const nameMapping: { [key: string]: BMCComponentName } = {
      'Key Partners': 'KeyPartners',
      'Key Activities': 'KeyActivities', 
      'Key Resources': 'KeyResources',
      'Value Propositions': 'ValueProposition',
      'Customer Relationships': 'CustomerRelationships',
      'CustomerChannels': 'CustomerChannels',
      'Customer Segments': 'CustomerSegments',
      'Cost Structure': 'CostStructure',
      'Revenue Streams': 'RevenueStreams'
    };
    return nameMapping[name] || null;
  }

  private convertBMCComponentToName(componentName: BMCComponentName | null): string | null {
    if (!componentName) return null;
    const nameMapping: { [key in BMCComponentName]: string } = {
      'KeyPartners': 'Key Partners',
      'KeyActivities': 'Key Activities', 
      'KeyResources': 'Key Resources',
      'ValueProposition': 'Value Propositions',
      'CustomerRelationships': 'Customer Relationships',
      'CustomerChannels': 'CustomerChannels',
      'CustomerSegments': 'Customer Segments',
      'CostStructure': 'Cost Structure',
      'RevenueStreams': 'Revenue Streams'
    };
    return nameMapping[componentName] || null;
  }

  // Set default appearance for an item
  private setDefaultAppearance(itemName: string) {
    const item = this.items.get(itemName);
    if (!item) return;

    // Set specific colors for Cost Structure and Revenue Streams, default grey for others
    if (itemName === "Cost Structure") {
      item.material.diffuseColor = new Color3(0.35, 0.0, 0.0); // Deeper red
      item.material.emissiveColor = new Color3(0.0, 0.0, 0.0); // Remove emissive
    } else if (itemName === "Revenue Streams") {
      item.material.diffuseColor = new Color3(0.0, 0.20, 0.12); // Darker British racing green
      item.material.emissiveColor = new Color3(0.0, 0.0, 0.0); // Remove emissive
    } else {
      item.material.diffuseColor = new Color3(0.07, 0.07, 0.07); // Default grey
      item.material.emissiveColor = new Color3(0.0, 0.0, 0.0); // No emissive
    }
    item.material.alpha = 1.0;
    item.mesh.scaling.y = item.originalHeight;

    // Always ensure label visibility
    this.makeLabelVisible(itemName);
  }

  // Handle hover
  onHover(itemName: string, isHovered: boolean) {
    if (this.getSelectedObject()) return; // No hover when selected

    const item = this.items.get(itemName);
    if (!item) {
      console.error(`Hover: Item not found: ${itemName}. Available:`, Array.from(this.items.keys()));
      return;
    }

    if (isHovered) {
      // Hover: brighten specific colors using emissive color for brightness without reflectivity
      if (itemName === "Cost Structure") {
        item.material.diffuseColor = new Color3(0.35, 0.0, 0.0); // Keep deeper red base
        item.material.emissiveColor = new Color3(0.2, 0.0, 0.0); // Add red glow for brightness
      } else if (itemName === "Revenue Streams") {
        item.material.diffuseColor = new Color3(0.0, 0.20, 0.12); // Keep darker British racing green base
        item.material.emissiveColor = new Color3(0.0, 0.1, 0.05); // Add green glow for brightness
      } else {
        // Default bright blue for other objects
        item.material.diffuseColor = new Color3(0.0, 0.3, 0.8);
        item.material.emissiveColor = new Color3(0.0, 0.0, 0.0); // No emissive for default
      }
      item.material.alpha = 1.0;
      item.mesh.scaling.y = item.originalHeight;
    } else {
      // Back to original colors
      if (itemName === "Cost Structure") {
        // Restore deeper red
        item.material.diffuseColor = new Color3(0.35, 0.0, 0.0);
        item.material.emissiveColor = new Color3(0.0, 0.0, 0.0); // Remove emissive
      } else if (itemName === "Revenue Streams") {
        // Restore darker British racing green
        item.material.diffuseColor = new Color3(0.0, 0.20, 0.12);
        item.material.emissiveColor = new Color3(0.0, 0.0, 0.0); // Remove emissive
      } else {
        // Default medium dark grey for other objects
        item.material.diffuseColor = new Color3(0.07, 0.07, 0.07);
        item.material.emissiveColor = new Color3(0.0, 0.0, 0.0); // No emissive
      }
      item.material.alpha = 1.0;
      item.mesh.scaling.y = item.originalHeight;
    }
    
    // Always ensure label stays visible
    this.makeLabelVisible(itemName);
  }

  // Handle selection - delegate to BMC State Manager
  onSelect(itemName: string) {
    const currentSelection = this.getSelectedObject();
    
    if (currentSelection === itemName) {
      // Deselect - delegate to BMC State Manager
      this.selectObject(null);
      console.log(`Deselected: ${itemName}`);
    } else {
      // Select new - delegate to BMC State Manager
      this.selectObject(itemName);
      console.log(`Selected: ${itemName}`);
    }
  }

  // Update all visual states based on current selection from BMC State Manager
  updateAllVisuals() {
    const selectedItem = this.getSelectedObject();
    console.log(`🎨 Updating all visuals, selected: ${selectedItem}`);
    
    this.items.forEach((item, name) => {
      console.log(`🎨 Processing ${name}:`, {
        isSelected: name === selectedItem,
        hasLabel: !!item.label,
        hasMaterial: !!item.labelMaterial,
        currentAlpha: item.labelMaterial?.alpha
      });
      
      // ALWAYS update labels FIRST to ensure they stay visible
      this.makeLabelVisible(name);
      
      if (name === selectedItem) {
        // Selected: brighten specific colors using emissive color for brightness without reflectivity
        if (name === "Cost Structure") {
          item.material.diffuseColor = new Color3(0.35, 0.0, 0.0); // Keep deeper red base
          item.material.emissiveColor = new Color3(0.3, 0.0, 0.0); // Add red glow for brightness
        } else if (name === "Revenue Streams") {
          item.material.diffuseColor = new Color3(0.0, 0.20, 0.12); // Keep darker British racing green base
          item.material.emissiveColor = new Color3(0.0, 0.15, 0.08); // Add green glow for brightness
        } else {
          item.material.diffuseColor = new Color3(0.0, 0.3, 0.8); // Default bright blue
          item.material.emissiveColor = new Color3(0.0, 0.0, 0.0); // No emissive for default
        }
        item.material.alpha = 1.0;
        item.mesh.scaling.y = item.originalHeight;
        console.log(`🔵 ${name} SELECTED: brightened color, height=${item.originalHeight}`);
      } else if (selectedItem) {
        // Others when selected: dim object, flattened object - BUT LABELS STAY 100%
        item.material.diffuseColor = new Color3(0.07, 0.07, 0.07);
        item.material.alpha = 0.5; // Only affects the 3D object, NOT the label
        item.mesh.scaling.y = 0.1;
        console.log(`⚫ ${name} dimmed: grey, height=0.1, LABEL SHOULD STAY VISIBLE`);
      } else {
        // Default state - restore original colors
        if (name === "Cost Structure") {
          item.material.diffuseColor = new Color3(0.35, 0.0, 0.0); // Deeper red
          item.material.emissiveColor = new Color3(0.0, 0.0, 0.0); // Remove emissive
        } else if (name === "Revenue Streams") {
          item.material.diffuseColor = new Color3(0.0, 0.20, 0.12); // Darker British racing green
          item.material.emissiveColor = new Color3(0.0, 0.0, 0.0); // Remove emissive
        } else {
          item.material.diffuseColor = new Color3(0.07, 0.07, 0.07); // Default grey
          item.material.emissiveColor = new Color3(0.0, 0.0, 0.0); // No emissive
        }
        item.material.alpha = 1.0;
        item.mesh.scaling.y = item.originalHeight;
        console.log(`🔘 ${name} default: original color, height=${item.originalHeight}`);
      }
      
      // CRITICAL: Force label visibility again after any material changes
      this.makeLabelVisible(name);
    });
  }

  // Clear selection - restore all objects to original state
  clearSelection() {
    this.selectObject(null);
  }

  // Restore all objects to original material, height, and opacity
  private restoreAllToDefault() {
    this.items.forEach((item, name) => {
      // FIRST: Force label visibility before changing anything
      this.makeLabelVisible(name);
      
      // Set specific colors for Cost Structure and Revenue Streams, default grey for others
      if (name === "Cost Structure") {
        item.material.diffuseColor = new Color3(0.35, 0.0, 0.0); // Deeper red
        item.material.emissiveColor = new Color3(0.0, 0.0, 0.0); // Remove emissive
      } else if (name === "Revenue Streams") {
        item.material.diffuseColor = new Color3(0.0, 0.20, 0.12); // Darker British racing green
        item.material.emissiveColor = new Color3(0.0, 0.0, 0.0); // Remove emissive
      } else {
        item.material.diffuseColor = new Color3(0.07, 0.07, 0.07); // Default grey
        item.material.emissiveColor = new Color3(0.0, 0.0, 0.0); // No emissive
      }
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

  // Check if a mesh is registered in the system
  isRegisteredMesh(mesh: AbstractMesh): boolean {
    const items = Array.from(this.items.values());
    for (const item of items) {
      if (item.mesh === mesh) {
        return true;
      }
    }
    return false;
  }
}

// Global instance
export const cleanBMCSystem = new CleanBMCSystem();