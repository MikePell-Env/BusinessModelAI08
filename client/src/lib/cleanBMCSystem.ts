import { AbstractMesh, Color3, StandardMaterial } from '@babylonjs/core';
import { BMCStateManagerImpl } from './bmcStateManager';

interface BMCItem {
  mesh: AbstractMesh;
  material: StandardMaterial;
  originalHeight: number;
  baseColor: Color3;
  label?: AbstractMesh;
  labelMaterial?: StandardMaterial;
}

export class CleanBMCSystem {
  private items: Map<string, BMCItem> = new Map();
  private selectedObject: string | null = null;
  private hoveredObject: string | null = null;
  private isTopView: boolean = false;
  private bmcStateManager: BMCStateManagerImpl | null = null;

  constructor() {
    // Initialize silently
  }

  // Set the BMC state manager
  setBMCStateManager(bmcStateManager: BMCStateManagerImpl) {
    this.bmcStateManager = bmcStateManager;
  }

  // Set whether we're in top view mode
  setTopViewMode(isTopView: boolean) {
    this.isTopView = isTopView;

    // CRITICAL FIX: When switching to 3D Top view, immediately flatten ALL objects
    if (isTopView) {
      this.items.forEach((item) => {
        if (item.mesh) {
          item.mesh.scaling.y = 0.01;
        }
      });
    }

    this.updateAllVisuals();
  }

  // Register a BMC item
  registerItem(name: string, mesh: AbstractMesh, material: StandardMaterial, originalHeight: number) {
    const baseColor = this.getBaseColor(name);

    // Ensure material is assigned
    if (!mesh.material) {
      mesh.material = material;
    }

    this.items.set(name, {
      mesh,
      material,
      originalHeight: mesh.scaling.y,
      baseColor: baseColor.clone()
    });

    // CRITICAL FIX: In 3D Top view, immediately flatten the object regardless of state
    if (this.isTopView) {
      mesh.scaling.y = 0.01;
    }

    // Initialize with proper state
    this.applyState(name, 'normal');
  }

  // Handle selection
  onSelect(sectionName: string) {
    try {
      console.log(`🔍 DEBUG: CleanBMC onSelect ENTRY - sectionName: "${sectionName}"`);

      // Special debugging for Cost Structure
      if (sectionName === "Cost Structure") {
        console.log(`🔍 DEBUG: Cost Structure selection process starting...`);
        console.log(`🔍 DEBUG: Current selectedObject: ${this.selectedObject}`);
        console.log(`🔍 DEBUG: Items in cleanBMCSystem:`, Array.from(this.items.keys()));
        console.log(`🔍 DEBUG: bmcStateManager exists:`, !!this.bmcStateManager);
      }

    // Toggle selection
    console.log(`🔍 DEBUG: Before toggle - this.selectedObject: "${this.selectedObject}", sectionName: "${sectionName}"`);
    console.log(`🔍 DEBUG: Equality check: ${this.selectedObject === sectionName}`);

    if (this.selectedObject === sectionName) {
      console.log(`🔍 DEBUG: DESELECTING - same object clicked`);
      this.selectedObject = null;
    } else {
      console.log(`🔍 DEBUG: SELECTING - new object`);
      this.selectedObject = sectionName;
    }

    console.log(`🔍 DEBUG: After toggle - selectedObject: ${this.selectedObject}`);

    // Update BMC state manager
    if (this.bmcStateManager) {
      const bmcComponent = this.convertNameToBMCComponent(sectionName);
      console.log(`🔍 DEBUG: BMC component conversion result: ${sectionName} -> ${bmcComponent}`);

      if (bmcComponent) {
        try {
          this.bmcStateManager.selectObject(this.selectedObject ? bmcComponent as any : null);
          console.log(`🔍 DEBUG: BMC state manager selectObject called successfully`);
        } catch (e) {
          console.error('❌ BMC state manager error during selection:', e);
          console.error('❌ Section name:', sectionName);
          console.error('❌ BMC component:', bmcComponent);
          console.error('❌ Selected object:', this.selectedObject);
        }
      } else {
        console.warn(`⚠️ Skipping BMC state manager update for unmapped section: ${sectionName}`);
      }
    }

    console.log(`🔍 DEBUG: About to call updateAllVisuals()`);
    this.updateAllVisuals();
    console.log(`🔍 DEBUG: updateAllVisuals() completed successfully`);
    } catch (error) {
      console.error(`❌ CRITICAL ERROR in onSelect("${sectionName}"):`, error);
      console.error(`❌ Stack:`, error.stack);
      throw error; // Re-throw to see what's calling this
    }
  }

  // Clear selection
  clearSelection() {
    this.selectedObject = null;
    if (this.bmcStateManager) {
      try {
        this.bmcStateManager.selectObject(null);
      } catch (e) {
        console.error('❌ BMC state manager error during clear selection:', e);
      }
    }
    this.updateAllVisuals();
  }

  // Handle hover state changes
  onHover(sectionName: string, isHovering: boolean): void {
    console.log(`🖱️ onHover: ${sectionName}, hovering=${isHovering}, topView=${this.isTopView}, selected=${this.selectedObject}`);

    const item = this.items.get(sectionName);
    if (!item) {
      console.warn(`⚠️ Item not found for hover: ${sectionName}`);
      return;
    }

    // Validate mesh and material before proceeding
    if (!item.mesh || item.mesh.isDisposed() || !item.material || item.material.isDisposed()) {
      console.warn(`⚠️ Invalid mesh/material for hover on ${sectionName}`);
      return;
    }

    // Only apply hover effects if no object is selected
    if (this.selectedObject !== null) {
      console.log(`🚫 Hover ignored - object selected: ${this.selectedObject}`);
      return;
    }

    try {
      if (isHovering) {
        this.applyHoverState(item);
      } else {
        this.removeHoverState(item);
      }
    } catch (error) {
      console.error(`❌ Error handling hover for ${sectionName}:`, error);
    }
  }

  // Get selected object
  getSelectedObject(): string | null {
    return this.selectedObject;
  }

  // Add label to an item
  addLabel(name: string, labelMesh: AbstractMesh, labelMaterial: StandardMaterial) {
    const item = this.items.get(name);
    if (item) {
      item.label = labelMesh;
      item.labelMaterial = labelMaterial;
    }
  }

  // Set labels visible
  setLabelsVisible(visible: boolean) {
    this.items.forEach((item) => {
      if (item.label) {
        item.label.setEnabled(visible);
      }
    });
  }

  // Main visual update method - simplified
  private updateAllVisuals(): void {
    console.log(`🎨 updateAllVisuals: mode=${this.isTopView ? '3D Top' : '3D View'}, selected=${this.selectedObject || 'none'}`);

    // Ensure scene and materials are valid before applying changes
    if (!this.validateScene()) {
      console.warn('⚠️ Scene validation failed, skipping visual updates');
      return;
    }

    this.items.forEach((item, name) => {
      try {
        if (this.selectedObject === name) {
          // Selected object
          if (this.isTopView) {
            this.apply3DTopSelectedState(item);
          } else {
            this.apply3DViewSelectedState(item);
          }
        } else if (this.selectedObject !== null) {
          // Non-selected objects when something is selected
          if (this.isTopView) {
            this.apply3DTopNonSelectedState(item);
          } else {
            this.apply3DViewNonSelectedState(item);
          }
        } else {
          // No selection - normal state
          if (this.isTopView) {
            this.apply3DTopNormalState(item);
          } else {
            this.apply3DViewNormalState(item);
          }
        }
      } catch (error) {
        console.error(`❌ Error updating visuals for ${name}:`, error);
      }
    });
  }

  // Validate scene and materials to prevent canvas going blank
  private validateScene(): boolean {
    let allValid = true;

    this.items.forEach((item, name) => {
      if (!item.mesh || item.mesh.isDisposed()) {
        console.error(`❌ Mesh disposed for ${name}`);
        allValid = false;
      }

      if (!item.material || item.material.isDisposed()) {
        console.error(`❌ Material disposed for ${name}`);
        allValid = false;
      }

      // Check if mesh is visible and enabled
      if (!item.mesh.isVisible || !item.mesh.isEnabled()) {
        console.warn(`⚠️ Mesh ${name} is not visible/enabled`);
        item.mesh.isVisible = true;
        item.mesh.setEnabled(true);
      }
    });

    return allValid;
  }

  // Simplified state application
  private applyState(name: string, state: string) {
    const item = this.items.get(name);
    if (!item) return;

    const { mesh, material, originalHeight, baseColor } = item;

    // Always flatten in 3D Top view
    if (this.isTopView) {
      mesh.scaling.y = 0.01;
    } else {
      // 3D view behavior
      if (state === 'selected') {
        mesh.scaling.y = originalHeight * 1.4; // Elevated
      } else if (state === 'dimmed') {
        mesh.scaling.y = 0.01; // Flattened
      } else {
        mesh.scaling.y = originalHeight; // Normal height
      }
    }

    // Set colors and opacity
    material.emissiveColor = Color3.Black();
    material.alpha = 1.0;

    switch (state) {
      case 'selected':
        material.diffuseColor = baseColor.clone();
        break;

      case 'hover':
        if (name === "Cost Structure") {
          material.diffuseColor = new Color3(0.45, 0.05, 0.05);
        } else if (name === "Revenue Streams") {
          material.diffuseColor = new Color3(0.0, 0.25, 0.15);
        } else {
          material.diffuseColor = new Color3(0.03, 0.18, 0.45);
        }
        break;

      case 'dimmed':
        if (this.isTopView) {
          // 3D Top: lighter dimmed colors so objects remain visible
          material.diffuseColor = baseColor.scale(0.7);
        } else {
          // 3D view: darker colors and lower opacity
          if (name === "Cost Structure" || name === "Revenue Streams") {
            material.diffuseColor = new Color3(0.07, 0.07, 0.07);
          } else {
            material.diffuseColor = baseColor.scale(0.5);
          }
          material.alpha = 0.3;
        }
        break;

      case 'normal':
      default:
        material.diffuseColor = baseColor.clone();
        break;
    }
  }

  // Restore original material properties
  private restoreOriginalMaterial(item: BMCItem): void {
    this.ensureMaterialValid(item); // Ensure material is valid before restoring
    item.material.diffuseColor = item.baseColor.clone();
    item.material.alpha = 1.0;
    item.material.emissiveColor = Color3.Black();
  }

  // Apply state for selected object in 3D Top view
  private apply3DTopSelectedState(item: BMCItem): void {
    // Selected object: bright blue, flattened, full opacity
    this.ensureMaterialValid(item);
    item.material.diffuseColor = new Color3(0.0, 0.3, 0.8); // Bright blue
    item.material.emissiveColor = new Color3(0.0, 0.1, 0.2); // Slight blue glow
    item.mesh.scaling.y = item.originalHeight; // Flattened
    item.material.alpha = 1.0;
    item.material.needDepthPrePass = false; // Prevent depth issues
  }

  // Apply state for non-selected objects in 3D Top view
  private apply3DTopNonSelectedState(item: BMCItem): void {
    // Non-selected objects: original colors, flattened, full opacity
    this.ensureMaterialValid(item);
    this.restoreOriginalMaterial(item);
    item.mesh.scaling.y = item.originalHeight; // Flattened  
    item.material.alpha = 1.0;
    item.material.needDepthPrePass = false; // Prevent depth issues
  }

  // Apply state for normal objects in 3D Top view
  private apply3DTopNormalState(item: BMCItem): void {
    // Normal state: original colors, flattened, full opacity
    this.ensureMaterialValid(item);
    this.restoreOriginalMaterial(item);
    item.mesh.scaling.y = item.originalHeight; // Flattened
    item.material.alpha = 1.0;
    item.material.needDepthPrePass = false; // Prevent depth issues
  }

  // Apply state for selected object in regular 3D view
  private apply3DViewSelectedState(item: BMCItem): void {
    // Selected object: original height, original color, full opacity
    this.ensureMaterialValid(item);
    item.mesh.scaling.y = item.originalHeight * 1.4; // Elevated
    item.material.diffuseColor = item.baseColor.clone();
    item.material.alpha = 1.0;
  }

  // Apply state for non-selected objects in regular 3D view
  private apply3DViewNonSelectedState(item: BMCItem): void {
    // Non-selected objects: dimmed, flattened, lower opacity
    this.ensureMaterialValid(item);
    item.mesh.scaling.y = 0.01; // Flattened
    if (item.name === "Cost Structure" || item.name === "Revenue Streams") {
      item.material.diffuseColor = new Color3(0.07, 0.07, 0.07);
    } else {
      item.material.diffuseColor = item.baseColor.scale(0.5);
    }
    item.material.alpha = 0.3;
  }

  // Apply state for normal objects in regular 3D view
  private apply3DViewNormalState(item: BMCItem): void {
    // Normal state: original height, original color, full opacity
    this.ensureMaterialValid(item);
    item.mesh.scaling.y = item.originalHeight;
    item.material.diffuseColor = item.baseColor.clone();
    item.material.alpha = 1.0;
  }

  // Apply hover state to an item
  private applyHoverState(item: BMCItem): void {
    this.ensureMaterialValid(item);
    if (this.isTopView) {
      item.material.diffuseColor = new Color3(0.03, 0.18, 0.45); // Hover blue for top view
    } else {
      item.material.diffuseColor = new Color3(0.07, 0.07, 0.07); // Dimmed grey for 3D view hover
    }
    item.material.alpha = 1.0;
  }

  // Remove hover state from an item
  private removeHoverState(item: BMCItem): void {
    this.ensureMaterialValid(item);
    // Restore to its current state (normal, dimmed, etc.)
    this.updateAllVisuals(); // Re-apply visual states to reset hover
  }

  // Ensure material is valid and recreate if necessary
  private ensureMaterialValid(item: BMCItem): void {
    if (!item.material || item.material.isDisposed()) {
      console.warn(`⚠️ Material disposed for ${item.mesh.name}, recreating...`);

      // Recreate material with same properties
      const newMaterial = new StandardMaterial(`${item.mesh.name}_material`, item.mesh.getScene());
      newMaterial.diffuseColor = new Color3(0.07, 0.07, 0.07); // Default grey
      newMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
      newMaterial.alpha = 1.0;
      newMaterial.backFaceCulling = true;

      item.material = newMaterial;
      item.mesh.material = newMaterial;
    }
  }

  // Get base color for section
  private getBaseColor(name: string): Color3 {
    if (name === "Cost Structure") {
      return new Color3(0.35, 0.0, 0.0);  // Red
    } else if (name === "Revenue Streams") {
      return new Color3(0.0, 0.20, 0.12);  // Green
    } else {
      return new Color3(0.07, 0.07, 0.07);  // Grey
    }
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

    // Handle exact matches first
    if (mapping[sectionName]) {
      return mapping[sectionName];
    }

    // Log unmapped section names for debugging
    console.warn(`⚠️ No mapping found for section: "${sectionName}"`);
    console.warn('Available mappings:', Object.keys(mapping));

    return null;
  }

  // Get current state for debugging
  getCurrentState(): any {
    return {
      selectedObject: this.selectedObject,
      hoveredObject: this.hoveredObject,
      isTopView: this.isTopView,
      itemCount: this.items.size
    };
  }
}