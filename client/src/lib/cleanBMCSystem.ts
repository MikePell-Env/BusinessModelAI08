
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

    // Initialize with proper state
    this.applyState(name, 'normal');
  }

  // Handle selection
  onSelect(sectionName: string) {
    console.log(`🔍 CleanBMC onSelect: ${sectionName}`);

    // Toggle selection
    if (this.selectedObject === sectionName) {
      this.selectedObject = null;
    } else {
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
    this.selectedObject = null;
    if (this.bmcStateManager) {
      try {
        this.bmcStateManager.selectObject(null);
      } catch (e) {
        console.error('BMC state manager error during clear selection:', e);
      }
    }
    this.updateAllVisuals();
  }

  // Handle hover state changes
  onHover(sectionName: string, isHovering: boolean): void {
    console.log(`🖱️ onHover: ${sectionName}, hovering=${isHovering}`);

    const item = this.items.get(sectionName);
    if (!item) {
      return;
    }

    // Only apply hover effects if no object is selected
    if (this.selectedObject !== null) {
      return;
    }

    if (isHovering) {
      this.applyState(sectionName, 'hover');
    } else {
      this.applyState(sectionName, 'normal');
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

  // Main visual update method
  private updateAllVisuals(): void {
    console.log(`🎨 updateAllVisuals: mode=${this.isTopView ? '3D Top' : '3D View'}, selected=${this.selectedObject || 'none'}`);

    this.items.forEach((item, name) => {
      if (this.selectedObject === name) {
        this.applyState(name, 'selected');
      } else if (this.selectedObject !== null) {
        this.applyState(name, 'dimmed');
      } else {
        this.applyState(name, 'normal');
      }
    });
  }

  // Simplified state application
  private applyState(name: string, state: string) {
    const item = this.items.get(name);
    if (!item || !item.mesh || !item.material) return;

    const { mesh, material, originalHeight, baseColor } = item;

    // Height management
    if (state === 'selected' && !this.isTopView) {
      mesh.scaling.y = originalHeight * 1.4;
    } else if (state === 'dimmed' && !this.isTopView) {
      mesh.scaling.y = 0.01;
    } else {
      mesh.scaling.y = originalHeight;
    }

    // Color and opacity
    material.emissiveColor = Color3.Black();
    material.alpha = 1.0;

    switch (state) {
      case 'selected':
        if (this.isTopView) {
          material.diffuseColor = new Color3(0.0, 0.3, 0.8);
        } else {
          material.diffuseColor = baseColor.clone();
        }
        break;

      case 'hover':
        material.diffuseColor = new Color3(0.03, 0.18, 0.45);
        break;

      case 'dimmed':
        material.diffuseColor = baseColor.scale(0.6);
        if (!this.isTopView) {
          material.alpha = 0.3;
        }
        break;

      case 'normal':
      default:
        material.diffuseColor = baseColor.clone();
        break;
    }
  }

  // Get base color for section
  private getBaseColor(name: string): Color3 {
    if (name === "Cost Structure") {
      return new Color3(0.35, 0.0, 0.0);
    } else if (name === "Revenue Streams") {
      return new Color3(0.0, 0.20, 0.12);
    } else {
      return new Color3(0.07, 0.07, 0.07);
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

    return mapping[sectionName] || null;
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
