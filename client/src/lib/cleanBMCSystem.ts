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
    if (this.selectedObject === sectionName) {
      this.selectedObject = null;
    } else {
      this.selectedObject = sectionName;
    }

    console.log(`🔍 DEBUG: New selectedObject: ${this.selectedObject}`);

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

  // Handle hover state
  onHover(itemName: string | null, isHovering: boolean) {
    console.log(`🖱️ Hover: ${itemName}, isHovering: ${isHovering}`);
    this.hoveredObject = isHovering ? itemName : null;
    this.updateAllVisuals();
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
  public updateAllVisuals(): void {
    console.log(`🎨 UpdateAllVisuals: selectedObject=${this.selectedObject}, hoveredObject=${this.hoveredObject}`);
    console.log(`🎨 UpdateAllVisuals: items count=${this.items.size}, registered items:`, Array.from(this.items.keys()));
    
    this.items.forEach((item, name) => {
      if (!item?.mesh || !item?.material) {
        console.warn(`⚠️ Missing mesh or material for ${name}`);
        return;
      }

      // Determine state
      let state = 'normal';
      if (this.selectedObject === name) {
        state = 'selected';
        console.log(`🎨 ${name}: SELECTED`);
      } else if (this.selectedObject && this.selectedObject !== name) {
        state = 'dimmed';
        console.log(`🎨 ${name}: DIMMED (selected=${this.selectedObject})`);
      } else if (this.hoveredObject === name) {
        state = 'hover';
        console.log(`🎨 ${name}: HOVER`);
      } else {
        console.log(`🎨 ${name}: NORMAL`);
      }

      this.applyState(name, state);
    });
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