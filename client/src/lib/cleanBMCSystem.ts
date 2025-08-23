
import { AbstractMesh, Color3, StandardMaterial } from '@babylonjs/core';
import { BMCStateManagerImpl } from './bmcStateManager';
import { MaterialManager } from './core/MaterialManager';

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
  private materialManager: MaterialManager | null = null;

  constructor() {
    // Initialize silently
  }

  // Set the BMC state manager
  setBMCStateManager(bmcStateManager: BMCStateManagerImpl) {
    this.bmcStateManager = bmcStateManager;
  }

  // Set the material manager (CRITICAL: prevents material conflicts)
  setMaterialManager(materialManager: MaterialManager) {
    this.materialManager = materialManager;
    console.log('🔧 CleanBMC: MaterialManager integration enabled - preventing material wars');
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

    try {
      console.log(`🔍 DEBUG: Current selectedObject: ${this.selectedObject}`);
      console.log(`🔍 DEBUG: Incoming sectionName: ${sectionName}`);

      // Toggle selection
      if (this.selectedObject === sectionName) {
        console.log(`🔍 DEBUG: Deselecting same object`);
        this.selectedObject = null;
      } else {
        console.log(`🔍 DEBUG: Selecting new object: ${sectionName}`);
        this.selectedObject = sectionName;
      }

      console.log(`🔍 DEBUG: About to call updateAllVisuals()`);
      this.updateAllVisuals();
      console.log(`🔍 DEBUG: onSelect completed successfully`);
      
    } catch (error) {
      console.error(`❌ CRASH in onSelect(${sectionName}):`, error);
      console.error(`❌ Error name: ${error.name}`);
      console.error(`❌ Error message: ${error.message}`);
      console.error(`❌ Stack trace:`, error.stack);
      throw error; // Re-throw to see where it came from
    }
  }

  // Clear selection
  clearSelection() {
    this.selectedObject = null;
    // REMOVED: BMC state manager calls to prevent dual state management conflicts
    // Only CleanBMCSystem manages visual state now
    this.updateAllVisuals();
  }

  // Handle hover state changes
  onHover(sectionName: string, isHovering: boolean): void {
    console.log(`🖱️ onHover: ${sectionName}, hovering=${isHovering}`);

    const item = this.items.get(sectionName);
    if (!item) {
      return;
    }

    // Don't apply hover to already selected objects
    if (this.selectedObject === sectionName) {
      return;
    }

    if (isHovering) {
      this.applyState(sectionName, 'hover');
    } else {
      // Return to proper state: normal if nothing selected, dimmed if something else is selected
      if (this.selectedObject !== null && !this.isTopView) {
        this.applyState(sectionName, 'dimmed');
      } else {
        this.applyState(sectionName, 'normal');
      }
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

    try {
      this.items.forEach((item, name) => {
        try {
          if (this.selectedObject === name) {
            this.applyState(name, 'selected');
          } else if (this.selectedObject !== null && !this.isTopView) {
            // 3D View: Non-selected objects are dimmed
            this.applyState(name, 'dimmed');
          } else {
            // 3D Top View: Non-selected objects stay normal (no dimming)
            // 3D View with no selection: All objects normal
            this.applyState(name, 'normal');
          }
        } catch (error) {
          console.error(`❌ Error applying visual state to ${name}:`, error);
          // Continue with other objects even if one fails
        }
      });
    } catch (error) {
      console.error(`❌ Critical error in updateAllVisuals:`, error);
      // Attempt recovery by ensuring all objects are visible
      this.items.forEach((item, name) => {
        try {
          if (item.mesh) {
            item.mesh.setEnabled(true);
            item.mesh.isVisible = true;
            if (item.material) {
              item.material.alpha = 1.0;
            }
          }
        } catch (recoveryError) {
          console.error(`❌ Recovery failed for ${name}:`, recoveryError);
        }
      });
    }
  }

  // State application following documentation rules
  private applyState(name: string, state: string) {
    console.log(`🔍 DEBUG CleanBMC: applyState called - name: ${name}, state: ${state}`);
    
    try {
      const item = this.items.get(name);
      if (!item || !item.mesh || !item.material) {
        console.warn(`⚠️ CleanBMC: Cannot apply state ${state} to ${name} - missing item, mesh, or material`);
        return;
      }

      console.log(`🔍 DEBUG CleanBMC: Found item for ${name}, mesh: ${!!item.mesh}, material: ${!!item.material}`);
      const { mesh, material, originalHeight, baseColor } = item;

    // Height management - Keep objects at normal heights in both views (do this FIRST)
    if (state === 'selected' && !this.isTopView) {
      // Only elevate selected objects in 3D View
      mesh.scaling.y = originalHeight * 1.4; // Elevated
    } else if (state === 'dimmed' && !this.isTopView) {
      // Only flatten dimmed objects in 3D View
      mesh.scaling.y = 0.01; // Flattened
    } else {
      // All other cases: keep normal height (including all 3D Top view states)
      mesh.scaling.y = originalHeight; // Normal height
    }

    // Base visibility settings - always ensure visibility
    mesh.setEnabled(true);
    mesh.isVisible = true;

    // FIXED: Use MaterialManager's proper state system (single operation, no conflicts)
    if (this.materialManager) {
      // Let MaterialManager handle everything with proper state management
      const materialState = this.getMaterialStateFromString(state);
      this.materialManager.applyMaterialState(mesh, name, materialState);
      console.log(`🎨 MaterialManager: Applied ${materialState} state to ${name}`);
      return; // Exit early - MaterialManager handled everything
    } else {
      // Fallback: ensure material is assigned (only if MaterialManager not available)
      if (mesh.material !== material) {
        console.log(`🔧 CleanBMC: Fallback material assignment for ${name}`);
        mesh.material = material;
      }
      // Fallback material settings
      material.alpha = 1.0;
    }

    // MaterialManager already handled everything above - skip redundant material operations
    if (this.materialManager) {
      // MaterialManager already applied the state - no additional work needed
      if (this.isTopView) {
        console.log(`🎨 Applied 3D Top ${state.toUpperCase()}: ${name} -> MaterialManager handled`);
      } else {
        console.log(`🎨 Applied 3D ${state.toUpperCase()}: ${name} -> MaterialManager handled`);
      }
      return;
    }

    // Fallback: Direct material manipulation (old system) - only if MaterialManager not available
    console.warn(`⚠️ CleanBMC: Using fallback material manipulation for ${name} - MaterialManager not available`);
    switch (state) {
      case 'selected':
        material.diffuseColor = new Color3(0.0, 0.3, 0.8);
        material.emissiveColor = new Color3(0.0, 0.1, 0.2);
        if (this.isTopView) {
          console.log(`🎨 Applied 3D Top SELECTED: ${name} -> bright blue + glow`);
        } else {
          console.log(`🎨 Applied 3D SELECTED: ${name} -> bright blue + glow + elevated`);
        }
        break;
      case 'hover':
        material.diffuseColor = new Color3(0.0, 0.3, 0.8);
        material.emissiveColor = Color3.Black();
        console.log(`🎨 Applied HOVER: ${name} -> bright blue`);
        break;
      case 'dimmed':
        if (name === "Revenue Streams" || name === "Cost Structure") {
          material.diffuseColor = new Color3(0.07, 0.07, 0.07);
        } else {
          material.diffuseColor = baseColor.scale(0.6);
        }
        material.emissiveColor = Color3.Black();
        material.alpha = 0.7;
        console.log(`🎨 Applied DIMMED: ${name} -> ${(name === "Revenue Streams" || name === "Cost Structure") ? "dark grey" : "darkened"} + transparent`);
        break;
      case 'normal':
      default:
        material.diffuseColor = baseColor.clone();
        material.emissiveColor = Color3.Black();
        console.log(`🎨 Applied NORMAL: ${name} -> original color`);
        break;
    }
  }

  // Convert string state to MaterialManager state type
  private getMaterialStateFromString(state: string): 'normal' | 'selected' | 'hover' | 'dimmed' {
    switch (state) {
      case 'selected':
        return 'selected';
      case 'hover':
        return 'hover';
      case 'dimmed':
        return 'dimmed';
      case 'normal':
      default:
        return 'normal';
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
