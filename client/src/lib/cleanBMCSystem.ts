
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
  // REMOVED: MaterialManager - using direct property modification instead

  constructor() {
    // Initialize silently
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
    console.log(`🔍 DEBUG CleanBMC: applyState called - name: ${name}, state: ${state}`);
    
    try {
      const item = this.items.get(name);
      if (!item || !item.mesh || !item.material) {
        console.warn(`⚠️ CleanBMC: Cannot apply state ${state} to ${name} - missing item, mesh, or material`);
        return;
      }

      console.log(`🔍 DEBUG CleanBMC: Found item for ${name}, mesh: ${!!item.mesh}, material: ${!!item.material}`);
      const { mesh, material, originalHeight, baseColor } = item;

    // FIXED: Height management - NO changes in 3D Top view (avoid scaling crashes)
    // CRITICAL: NEVER change height on hover!
    if (!this.isTopView && state !== 'hover') {
      // Only do height changes in 3D View (not 3D Top) and NEVER on hover
      if (state === 'selected') {
        mesh.scaling.y = originalHeight * 1.4; // Elevated
      } else if (state === 'dimmed') {
        mesh.scaling.y = 0.01; // Flattened
      } else {
        mesh.scaling.y = originalHeight; // Normal height
      }
    }
    // In 3D Top view OR hover state: skip ALL height changes

    // Base visibility settings - always ensure visibility
    mesh.setEnabled(true);
    mesh.isVisible = true;

    // FIXED: Direct material property modification (much simpler than swapping materials)
    // Ensure material is assigned once
    if (mesh.material !== material) {
      mesh.material = material;
    }
    
    // ULTRA-SAFE: No new Color3 creation, just direct property modification
    material.alpha = 1.0; // Always solid - no transparency crashes
    
    // SAFE: Ensure diffuseColor exists with minimal object creation
    if (!material.diffuseColor) {
      material.diffuseColor = Color3.Gray(); // Use static method, no new creation
    }
    
    // SAFE: Set emissiveColor without new object creation
    if (!material.emissiveColor) {
      material.emissiveColor = Color3.Black();
    }
    
    // Check if this is Cost Structure or Revenue Streams (special handling)
    const isSpecialSection = name === 'Cost Structure' || name === 'Revenue Streams';
    
    // Apply visual states based on view mode and interaction rules
    if (this.isTopView) {
      // 3D TOP VIEW: Simple color changes only, no transparency or height changes
      if (state === 'selected' || state === 'hover') {
        // Blue for all sections in Top view
        material.diffuseColor.r = 0.0;
        material.diffuseColor.g = 0.3; 
        material.diffuseColor.b = 0.8;
        console.log(`🎨 3D Top - Applied ${state.toUpperCase()}: ${name} -> blue`);
      } else {
        // Normal state - restore original color
        if (baseColor) {
          material.diffuseColor.r = baseColor.r;
          material.diffuseColor.g = baseColor.g;
          material.diffuseColor.b = baseColor.b;
        } else {
          material.diffuseColor.r = 0.5;
          material.diffuseColor.g = 0.5;
          material.diffuseColor.b = 0.5;
        }
        console.log(`🎨 3D Top - Applied NORMAL: ${name} -> original color`);
      }
    } else {
      // 3D VIEW: Follow specific interaction rules
      if (state === 'hover') {
        // Rule 2: Hover behavior - NEVER change height, just color and ensure 100% opaque
        material.alpha = 1.0; // 100% opaque
        // IMPORTANT: Don't modify mesh.scaling.y - keep current height!
        if (isSpecialSection && baseColor) {
          // Cost/Revenue: Brighter shade of original color
          material.diffuseColor.r = Math.min(baseColor.r * 1.5, 1.0);
          material.diffuseColor.g = Math.min(baseColor.g * 1.5, 1.0);
          material.diffuseColor.b = Math.min(baseColor.b * 1.5, 1.0);
          console.log(`🎨 3D View - Applied HOVER: ${name} -> brighter original (height unchanged)`);
        } else {
          // Main sections: Very subtle blue for better shading
          material.diffuseColor.r = 0.15;
          material.diffuseColor.g = 0.25; 
          material.diffuseColor.b = 0.6;
          // Reset emissive for clean hover look
          material.emissiveColor.r = 0.0;
          material.emissiveColor.g = 0.0;
          material.emissiveColor.b = 0.0;
          console.log(`🎨 3D View - Applied HOVER: ${name} -> soft blue (height unchanged)`);
        }
      } else if (state === 'selected') {
        // Rule 3: Selected object
        material.alpha = 1.0; // 100% opaque
        
        // Special handling for Cost Structure and Revenue Streams - preserve heights matching Customer Segments
        if (name === 'Cost Structure') {
          mesh.scaling.y = 8.0; // Height to match Customer Segments
        } else if (name === 'Revenue Streams') {
          mesh.scaling.y = 7.7; // Height to match Customer Segments  
        } else {
          mesh.scaling.y = mesh.scaling.x; // Full height for main BMC objects
        }
        if (isSpecialSection && baseColor) {
          // Cost/Revenue: Bright version of original
          material.diffuseColor.r = Math.min(baseColor.r * 1.5, 1.0);
          material.diffuseColor.g = Math.min(baseColor.g * 1.5, 1.0);
          material.diffuseColor.b = Math.min(baseColor.b * 1.5, 1.0);
          console.log(`🎨 3D View - Applied SELECTED: ${name} -> bright original`);
        } else {
          // Main sections: Darker blue with better shading
          material.diffuseColor.r = 0.0;
          material.diffuseColor.g = 0.2; 
          material.diffuseColor.b = 0.7;
          // Add subtle emissive for better depth perception
          material.emissiveColor.r = 0.0;
          material.emissiveColor.g = 0.05;
          material.emissiveColor.b = 0.15;
          console.log(`🎨 3D View - Applied SELECTED: ${name} -> darker blue with depth`);
        }
      } else if (state === 'dimmed') {
        // Rule 3: Other objects when something is selected
        material.alpha = 0.3; // 30% opacity
        mesh.scaling.y = 0.01; // Flattened
        
        if (isSpecialSection) {
          // Cost Structure and Revenue Streams: Use grey color when flattened
          material.diffuseColor.r = 0.5;
          material.diffuseColor.g = 0.5;
          material.diffuseColor.b = 0.5;
          console.log(`🎨 3D View - Applied DIMMED: ${name} -> flattened & grey color`);
        } else {
          // Main BMC sections: Keep original color but dimmed
          if (baseColor) {
            material.diffuseColor.r = baseColor.r * 0.5;
            material.diffuseColor.g = baseColor.g * 0.5;
            material.diffuseColor.b = baseColor.b * 0.5;
          } else {
            material.diffuseColor.r = 0.25;
            material.diffuseColor.g = 0.25;
            material.diffuseColor.b = 0.25;
          }
          console.log(`🎨 3D View - Applied DIMMED: ${name} -> flattened & 30% opacity`);
        }
      } else {
        // Rule 1: Normal state - full height, original color, 100% opaque
        material.alpha = 1.0;
        
        // Special handling for Cost Structure and Revenue Streams - preserve heights matching Customer Segments
        if (name === 'Cost Structure') {
          mesh.scaling.y = 8.0; // Height to match Customer Segments
        } else if (name === 'Revenue Streams') {
          mesh.scaling.y = 7.7; // Height to match Customer Segments  
        } else {
          mesh.scaling.y = mesh.scaling.x; // Full height for main BMC objects
        }
        if (baseColor) {
          material.diffuseColor.r = baseColor.r;
          material.diffuseColor.g = baseColor.g;
          material.diffuseColor.b = baseColor.b;
        } else {
          material.diffuseColor.r = 0.5;
          material.diffuseColor.g = 0.5;
          material.diffuseColor.b = 0.5;
        }
        // Reset emissive color for clean normal state
        material.emissiveColor.r = 0.0;
        material.emissiveColor.g = 0.0;
        material.emissiveColor.b = 0.0;
        console.log(`🎨 3D View - Applied NORMAL: ${name} -> full height & original color`);
      }
    }
    
    } catch (error) {
      console.error(`❌ CRASH in applyState(${name}, ${state}):`, error);
      console.error(`❌ Error details:`, (error as Error).message);
      console.error(`❌ Stack:`, (error as Error).stack);
      throw error;
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
