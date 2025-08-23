import { AbstractMesh, Color3, StandardMaterial, Mesh } from '@babylonjs/core';
import { BMCStateManager } from '../types/bmcState';
import { ViewTransitionManager } from '../components/Canvas3DBabylon/animations/ViewTransitionManager';

interface BMCItem {
  mesh: AbstractMesh;
  material: StandardMaterial;
  originalHeight: number;
  name: string;
  label?: AbstractMesh;
  labelMaterial?: StandardMaterial;
}

export class CleanBMCSystem {
  private items: Map<string, BMCItem> = new Map();
  private selectedObject: string | null = null;
  private hoveredObject: string | null = null;
  private isTopView: boolean = false;
  private viewTransitionManager: ViewTransitionManager | null = null;
  private bmcStateManager: BMCStateManager | null = null;

  constructor() {
    console.log("✅ CleanBMCSystem initialized");
  }

  // Convert between section names and BMC component names
  private convertNameToBMCComponent(sectionName: string): string | null {
    const mapping: Record<string, string> = {
      "Value Propositions": "valuePropositions",
      "Key Partners": "keyPartners",
      "Customer Segments": "customerSegments",
      "Key Resources": "keyResources",
      "Key Activities": "keyActivities",
      "CustomerChannels": "channels",
      "Customer Relationships": "customerRelationships",
      "Cost Structure": "costStructure",
      "Revenue Streams": "revenueStreams"
    };
    return mapping[sectionName] || null;
  }

  // Set the BMC state manager
  setBMCStateManager(bmcStateManager: BMCStateManager) {
    this.bmcStateManager = bmcStateManager;
  }

  // Set the view transition manager
  setViewTransitionManager(viewTransitionManager: ViewTransitionManager) {
    console.log("🎬 CleanBMCSystem.setViewTransitionManager called");
    this.viewTransitionManager = viewTransitionManager;
  }

  // Set whether we're in top view mode
  setTopViewMode(isTopView: boolean) {
    console.log(`🎬 CleanBMCSystem.setTopViewMode: ${isTopView}`);
    this.isTopView = isTopView;

    // Ensure all objects remain visible in both view modes
    this.items.forEach((item, name) => {
      // Keep objects at their current height (don't force restoration)
      item.mesh.isVisible = true;
      item.mesh.setEnabled(true);

      // Ensure materials are properly visible
      if (item.material.alpha !== undefined) {
        item.material.alpha = Math.max(item.material.alpha, 0.5); // Minimum 50% visibility
      }

      // Keep labels visible
      this.makeLabelVisible(name);
      console.log(`   Ensured visibility for ${name}: visible=true, enabled=true`);
    });

    // Update visuals without hiding objects
    this.updateAllVisuals();
  }

  // Register a BMC item
  registerItem(name: string, mesh: AbstractMesh, material: StandardMaterial, originalHeight: number) {
    // IMPORTANT: Use the actual current mesh height, not the passed value
    const actualHeight = mesh.scaling.y;
    console.log(`📏 Registering ${name} with ACTUAL mesh height=${actualHeight} (passed=${originalHeight})`);

    this.items.set(name, {
      mesh,
      material,
      originalHeight: actualHeight,
      name
    });

    // Set default appearance WITHOUT changing height
    this.setDefaultAppearancePreserveHeight(name);
    console.log(`✓ Registered BMC item: ${name} with preserved height ${actualHeight}`);
  }

  // Add a label to an existing BMC item
  addLabel(itemName: string, labelMesh: AbstractMesh, labelMaterial: StandardMaterial) {
    const item = this.items.get(itemName);
    if (item) {
      item.label = labelMesh;
      item.labelMaterial = labelMaterial;
      this.makeLabelVisible(itemName);
      console.log(`✓ Added label to: ${itemName}`);
    }
  }

  // Make label always visible
  private makeLabelVisible(itemName: string, alpha: number = 1.0) {
    const item = this.items.get(itemName);
    if (item?.label && item?.labelMaterial) {
      item.label.isVisible = true;
      item.label.setEnabled(true);
      item.labelMaterial.alpha = alpha;
      item.labelMaterial.emissiveColor = new Color3(0.05, 0.05, 0.05);
    }
  }

  // Ensure label visibility
  private ensureLabelVisibility(itemName: string) {
    this.makeLabelVisible(itemName);
  }

  // Get selected object
  getSelectedObject(): string | null {
    return this.selectedObject;
  }

  // Select an object
  selectObject(objectName: string | null) {
    console.log(`🎯 CleanBMC: Selecting object: "${objectName}"`);

    if (objectName === this.selectedObject) {
      console.log("  Already selected, no change needed");
      return;
    }

    this.selectedObject = objectName;
    this.updateAllVisuals();
  }

  // Handle hover state
  onHover(itemName: string | null, isHovering: boolean) {
    console.log(`🖱️ CleanBMC: Hover ${isHovering ? 'ON' : 'OFF'} for "${itemName}"`);

    if (isHovering && itemName) {
      this.hoveredObject = itemName;
    } else {
      this.hoveredObject = null;
    }

    this.updateAllVisuals();
  }

  // Handle selection
  onSelect(sectionName: string) {
    console.log(`🎯 CleanBMC: Selection request for "${sectionName}"`);

    // Update BMC state manager
    if (this.bmcStateManager) {
      const bmcComponent = this.convertNameToBMCComponent(sectionName);
      if (bmcComponent) {
        this.bmcStateManager.selectObject(bmcComponent);
      }
    }

    this.selectedObject = sectionName;
    this.updateAllVisuals();
  }

  // Clear selection
  clearSelection() {
    this.selectObject(null);
  }

  // SIMPLIFIED: Update all visual states
  private updateAllVisuals(): void {
    console.log(`🎨 updateAllVisuals: updating visuals for ${this.isTopView ? '3D Top' : '3D'} view`);

    this.items.forEach((item, name) => {
      // CRITICAL: Always ensure basic visibility first
      item.mesh.isVisible = true;
      item.mesh.setEnabled(true);
      
      if (name === this.selectedObject) {
        // Apply selected state
        this.applySelectedState(name, item);
      } else if (name === this.hoveredObject) {
        // Apply hover state
        this.applyHoverState(item, name);
      } else if (this.selectedObject) {
        // Apply dimmed state for non-selected objects when something is selected
        this.applyDimmedState(item, name);
      } else {
        // Apply normal state when nothing is selected
        this.applyNormalState(name, item);
      }
      
      // CRITICAL: Final safety check - never let objects become invisible
      if (item.material.alpha < 0.3) {
        item.material.alpha = 0.3; // Minimum 30% opacity
        console.log(`⚠️ Fixed low opacity for ${name}: set to 0.3`);
      }
    });

    console.log(`✅ Visual update complete - all objects guaranteed visible`);
  }

  // SIMPLIFIED: Apply selected state
  private applySelectedState(name: string, item: BMCItem) {
    console.log(`✅ Applying SELECTED state to ${name}`);

    // Colors for selection
    if (name === "Cost Structure") {
      item.material.diffuseColor = new Color3(0.35, 0.0, 0.0);
      item.material.emissiveColor = new Color3(0.3, 0.0, 0.0);
    } else if (name === "Revenue Streams") {
      item.material.diffuseColor = new Color3(0.0, 0.20, 0.12);
      item.material.emissiveColor = new Color3(0.0, 0.15, 0.08);
    } else {
      item.material.diffuseColor = new Color3(0.0, 0.3, 0.8);
      item.material.emissiveColor = new Color3(0.0, 0.1, 0.2);
    }

    // Always full opacity
    item.material.alpha = 1.0;

    // Height animation only in 3D view
    if (this.isTopView) {
      item.mesh.scaling.y = item.originalHeight;
    } else {
      this.animateHeight(item.mesh, item.originalHeight * 1.4);
    }
  }

  // SIMPLIFIED: Apply hover state
  private applyHoverState(item: BMCItem, name: string) {
    console.log(`🖱️ Applying HOVER state to ${name}`);

    // Hover uses bright blue for all
    item.material.diffuseColor = new Color3(0.0, 0.3, 0.8);
    item.material.emissiveColor = new Color3(0.1, 0.1, 0.1);
    item.material.alpha = 1.0;

    // No height change for hover in top view
    if (this.isTopView) {
      item.mesh.scaling.y = item.originalHeight;
    }
  }

  // SIMPLIFIED: Apply dimmed state
  private applyDimmedState(item: BMCItem, name: string) {
    console.log(`🔅 Applying DIMMED state to ${name}`);

    // CRITICAL: Always ensure visibility first
    item.mesh.isVisible = true;
    item.mesh.setEnabled(true);

    // Darker colors for dimmed
    if (name === "Cost Structure") {
      item.material.diffuseColor = new Color3(0.2, 0.0, 0.0);
    } else if (name === "Revenue Streams") {
      item.material.diffuseColor = new Color3(0.0, 0.15, 0.10);
    } else {
      item.material.diffuseColor = new Color3(0.05, 0.05, 0.05);
    }
    item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);

    // CRITICAL FIX: NEVER make objects invisible in ANY view mode
    if (this.isTopView) {
      item.material.alpha = 0.6;  // Dimmed but visible in top view
      item.mesh.scaling.y = item.originalHeight;  // Always original height
    } else {
      item.material.alpha = 0.4;  // Dimmed but visible in 3D view
      this.animateHeight(item.mesh, 0.01);  // Flatten to 0.01
    }

    // Keep labels visible
    this.makeLabelVisible(name, 0.7);
  }

  // SIMPLIFIED: Apply normal state
  private applyNormalState(name: string, item: BMCItem) {
    console.log(`🔵 Applied normal state to ${name}: visible=true, alpha=1.0`);

    // CRITICAL: Ensure mesh is visible and enabled
    item.mesh.isVisible = true;
    item.mesh.setEnabled(true);

    // Set default colors based on section
    if (name === "Cost Structure") {
      item.material.diffuseColor = new Color3(0.35, 0.0, 0.0);
    } else if (name === "Revenue Streams") {
      item.material.diffuseColor = new Color3(0.0, 0.20, 0.12);
    } else {
      item.material.diffuseColor = new Color3(0.07, 0.07, 0.07);
    }
    item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);

    // Full visibility and maintain original height
    item.material.alpha = 1.0;
    item.mesh.scaling.y = item.originalHeight;

    // Labels fully visible
    this.makeLabelVisible(name, 1.0);
  }

  // Helper for height animation
  private animateHeight(mesh: AbstractMesh, targetHeight: number) {
    // Never animate in top view
    if (this.isTopView) {
      return;
    }

    if (this.viewTransitionManager && mesh instanceof Mesh) {
      this.viewTransitionManager.animateMeshHeight(mesh, targetHeight, {
        duration: 2500,
        easing: true
      });
    } else {
      mesh.scaling.y = targetHeight;
    }
  }

  // Set default appearance for an item WITHOUT changing height
  private setDefaultAppearancePreserveHeight(itemName: string) {
    const item = this.items.get(itemName);
    if (!item) return;

    console.log(`🎨 Setting default appearance for ${itemName} (preserving height)`);

    // Set default colors based on section
    if (itemName === "Cost Structure") {
      item.material.diffuseColor = new Color3(0.35, 0.0, 0.0);
    } else if (itemName === "Revenue Streams") {
      item.material.diffuseColor = new Color3(0.0, 0.20, 0.12);
    } else {
      item.material.diffuseColor = new Color3(0.07, 0.07, 0.07);
    }

    item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);
    item.material.alpha = 1.0;
    // DO NOT change mesh.scaling.y - preserve original height

    this.makeLabelVisible(itemName);
  }

  // Set default appearance for an item
  private setDefaultAppearance(itemName: string) {
    const item = this.items.get(itemName);
    if (!item) return;

    console.log(`🎨 Setting default appearance for ${itemName}`);

    // Set default colors based on section
    if (itemName === "Cost Structure") {
      item.material.diffuseColor = new Color3(0.35, 0.0, 0.0);
    } else if (itemName === "Revenue Streams") {
      item.material.diffuseColor = new Color3(0.0, 0.20, 0.12);
    } else {
      item.material.diffuseColor = new Color3(0.07, 0.07, 0.07);
    }

    item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);
    item.material.alpha = 1.0;
    item.mesh.scaling.y = item.originalHeight;

    this.makeLabelVisible(itemName);
  }

  // Check if an item exists
  hasItem(name: string): boolean {
    return this.items.has(name);
  }

  // Get all items
  getAllItems(): Map<string, BMCItem> {
    return this.items;
  }

  // Check if in top view
  getIsTopView(): boolean {
    return this.isTopView;
  }

  
}

// Create singleton instance for backward compatibility
export const cleanBMCSystem = new CleanBMCSystem();