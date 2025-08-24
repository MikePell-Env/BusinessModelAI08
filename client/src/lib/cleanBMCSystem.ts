
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
  private emergencyShutdown: boolean = false;
  // REMOVED: MaterialManager - using direct property modification instead

  constructor() {
    // Initialize silently
  }
  
  // Emergency shutdown mode to prevent all operations
  setEmergencyShutdown(shutdown: boolean) {
    this.emergencyShutdown = shutdown;
    if (shutdown) {
      console.log('🚫 EMERGENCY SHUTDOWN: CleanBMCSystem disabled to prevent crashes');
    }
  }

  // Set the BMC state manager
  setBMCStateManager(bmcStateManager: BMCStateManagerImpl) {
    this.bmcStateManager = bmcStateManager;
  }

  // Set the material manager (CRITICAL: prevents material conflicts)
  // REMOVED: MaterialManager - using direct property modification instead

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
    if (this.emergencyShutdown) {
      console.log(`🚫 EMERGENCY: onSelect blocked for ${sectionName} - shutdown mode active`);
      return;
    }
    
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

  // Handle hover state changes - simplified direct approach
  onHover(sectionName: string, isHovering: boolean): void {
    if (this.emergencyShutdown) {
      console.log(`🚫 EMERGENCY: hover blocked for ${sectionName} - shutdown mode active`);
      return;
    }
    
    console.log(`🖱️ Simple hover: ${sectionName}, hovering=${isHovering}`);

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
      // In 3D View: When hover ends, check if there's a selection
      // If no selection, everything stays at full height (normal)
      // If there is a selection, only non-selected objects are dimmed
      if (this.selectedObject === null) {
        // No selection - keep everything at full height
        this.applyState(sectionName, 'normal');
      } else if (this.isTopView) {
        // 3D Top view - no dimming, just normal colors
        this.applyState(sectionName, 'normal');
      } else {
        // 3D View with selection - non-selected objects stay dimmed
        // But we'll keep them at better visibility
        this.applyState(sectionName, 'dimmed');
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
    console.log(`🚫 CRITICAL OVERRIDE: applyState COMPLETELY DISABLED for ${name} -> ${state}`);
    
    // CRITICAL: NO OPERATIONS AT ALL to prevent WebGL crashes
    return;
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
