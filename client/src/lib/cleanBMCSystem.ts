import { AbstractMesh, Color3, StandardMaterial } from '@babylonjs/core';
import { BMCStateManagerImpl } from './bmcStateManager';

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
  private bmcStateManager: BMCStateManagerImpl | null = null;

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
  setBMCStateManager(bmcStateManager: BMCStateManagerImpl) {
    this.bmcStateManager = bmcStateManager;
  }

  // Set whether we're in top view mode
  setTopViewMode(isTopView: boolean) {
    console.log(`🎬 Setting view mode: ${isTopView ? '3D Top' : '3D'}`);
    this.isTopView = isTopView;
    this.updateAllVisuals();
  }

  // Register a BMC item
  registerItem(name: string, mesh: AbstractMesh, material: StandardMaterial, originalHeight: number) {
    const actualHeight = mesh.scaling.y;
    console.log(`📏 Registering ${name} with height=${actualHeight}`);

    // Ensure material is assigned
    if (!mesh.material) {
      mesh.material = material;
    }

    this.items.set(name, {
      mesh,
      material,
      originalHeight: actualHeight,
      name
    });

    // Set initial state
    this.applyNormalState(name);
  }

  // Add label to existing item
  addLabel(itemName: string, labelMesh: AbstractMesh, labelMaterial: StandardMaterial) {
    const item = this.items.get(itemName);
    if (item) {
      item.label = labelMesh;
      item.labelMaterial = labelMaterial;
      // Ensure label is visible
      if (labelMesh) {
        labelMesh.isVisible = true;
        labelMesh.setEnabled(true);
      }
    }
  }

  // Get selected object
  getSelectedObject(): string | null {
    return this.selectedObject;
  }

  // Handle hover state
  onHover(itemName: string | null, isHovering: boolean) {
    console.log(`🖱️ Hover ${isHovering ? 'ON' : 'OFF'} for "${itemName}"`);
    
    if (isHovering && itemName) {
      this.hoveredObject = itemName;
    } else {
      this.hoveredObject = null;
    }
    
    this.updateAllVisuals();
  }

  // Handle selection
  onSelect(sectionName: string) {
    console.log(`🎯 Selection request for "${sectionName}"`);
    
    // Toggle selection
    if (this.selectedObject === sectionName) {
      console.log(`Deselecting ${sectionName}`);
      this.selectedObject = null;
    } else {
      console.log(`Selecting ${sectionName}`);
      this.selectedObject = sectionName;
    }

    // Update BMC state manager
    if (this.bmcStateManager) {
      const bmcComponent = this.convertNameToBMCComponent(sectionName);
      if (bmcComponent) {
        try {
          this.bmcStateManager.selectObject(this.selectedObject ? bmcComponent as any : null);
        } catch (e) {
          console.error('BMC state manager error:', e);
        }
      }
    }

    this.updateAllVisuals();
  }

  // Clear selection
  clearSelection() {
    console.log(`Clearing selection`);
    this.selectedObject = null;
    
    if (this.bmcStateManager) {
      try {
        this.bmcStateManager.selectObject(null);
      } catch (e) {
        console.error('BMC state manager error:', e);
      }
    }
    
    this.updateAllVisuals();
  }

  // SIMPLIFIED: Update all visuals
  private updateAllVisuals(): void {
    console.log(`🎨 Updating visuals: selected="${this.selectedObject}", hovered="${this.hoveredObject}", view="${this.isTopView ? '3D Top' : '3D'}"`);

    this.items.forEach((item, name) => {
      // ALWAYS ensure mesh is visible
      item.mesh.isVisible = true;
      item.mesh.setEnabled(true);

      // ALWAYS ensure material exists
      if (!item.material) {
        console.error(`No material for ${name}`);
        return;
      }

      // SIMPLE state logic
      if (name === this.selectedObject) {
        // SELECTED STATE
        this.applySelectedState(name);
      } else if (name === this.hoveredObject && !this.isTopView) {
        // HOVER STATE (only in 3D view)
        this.applyHoverState(name);
      } else if (this.selectedObject && !this.isTopView) {
        // DIMMED STATE (only in 3D view when something else is selected)
        this.applyDimmedState(name);
      } else {
        // NORMAL STATE
        this.applyNormalState(name);
      }

      // Ensure labels are always visible
      if (item.label) {
        item.label.isVisible = true;
        item.label.setEnabled(true);
        if (item.labelMaterial) {
          item.labelMaterial.alpha = 1.0;
        }
      }
    });
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

  // SELECTED STATE - Bright blue
  private applySelectedState(name: string) {
    const item = this.items.get(name);
    if (!item) return;

    item.material.diffuseColor = new Color3(0.0, 0.3, 0.8);  // Bright blue
    item.material.emissiveColor = new Color3(0.0, 0.1, 0.2);
    item.material.alpha = 1.0;
    
    // Simple height change in 3D view only
    if (!this.isTopView) {
      item.mesh.scaling.y = item.originalHeight * 1.4;
    } else {
      item.mesh.scaling.y = item.originalHeight;
    }
  }

  // HOVER STATE - Light blue
  private applyHoverState(name: string) {
    const item = this.items.get(name);
    if (!item) return;

    item.material.diffuseColor = new Color3(0.1, 0.4, 0.9);  // Light blue
    item.material.emissiveColor = new Color3(0.05, 0.05, 0.05);
    item.material.alpha = 1.0;
    item.mesh.scaling.y = item.originalHeight;
  }

  // DIMMED STATE - Darker but visible
  private applyDimmedState(name: string) {
    const item = this.items.get(name);
    if (!item) return;

    const baseColor = this.getBaseColor(name);
    item.material.diffuseColor = baseColor.scale(0.5);  // 50% darker
    item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);
    item.material.alpha = 0.7;  // Still mostly visible
    
    // Slightly reduce height in 3D view
    item.mesh.scaling.y = item.originalHeight * 0.3;
  }

  // NORMAL STATE - Default appearance
  private applyNormalState(name: string) {
    const item = this.items.get(name);
    if (!item) return;

    item.material.diffuseColor = this.getBaseColor(name);
    item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);
    item.material.alpha = 1.0;
    item.mesh.scaling.y = item.originalHeight;
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

  // Get whether we're in top view - for compatibility
  getIsTopView(): boolean {
    return this.isTopView;
  }

  // Get all items - for compatibility
  getAllItems(): Map<string, BMCItem> {
    return this.items;
  }

  // Debug methods for compatibility
  showCheckpoints(): void {
    console.log('Checkpoints disabled');
  }

  showErrors(): void {
    console.log('Errors disabled');
  }

  // Debug method to ensure all items are visible
  ensureAllVisible() {
    console.log('🔧 Forcing all items visible');
    this.items.forEach((item, name) => {
      item.mesh.isVisible = true;
      item.mesh.setEnabled(true);
      if (item.material) {
        item.material.alpha = 1.0;
      }
      item.mesh.scaling.y = item.originalHeight;
      console.log(`  ${name}: visible=true, alpha=1.0`);
    });
  }
}