
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
      // Clear all internal state to prevent stale references
      this.items.clear();
      this.selectedObject = null;
      this.hoveredObject = null;
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
      // Silently handle the selection without any operations
      return;
    }
    
    console.log(`🔍 CleanBMC onSelect: ${sectionName}`);

    try {
      // Just track selection state, no visual operations
      if (this.selectedObject === sectionName) {
        this.selectedObject = null;
      } else {
        this.selectedObject = sectionName;
      }
      
      console.log(`✅ Selection state updated: ${this.selectedObject || 'none'}`);
      
    } catch (error) {
      console.error(`❌ Safe error in onSelect(${sectionName}):`, error);
      // Don't re-throw, just log and continue
    }
  }

  // Clear selection
  clearSelection() {
    this.selectedObject = null;
    this.hoveredObject = null;
    
    if (this.emergencyShutdown) {
      console.log(`🚫 EMERGENCY: clearSelection - no visual operations during shutdown`);
      return;
    }
    
    console.log(`✅ Selection cleared safely`);
  }

  // Handle hover state changes - simplified direct approach
  onHover(sectionName: string, isHovering: boolean): void {
    if (this.emergencyShutdown) {
      console.log(`🚫 EMERGENCY: hover blocked for ${sectionName} - shutdown mode active`);
      return;
    }
    
    // Just track hover state without any visual operations
    if (isHovering) {
      this.hoveredObject = sectionName;
    } else {
      this.hoveredObject = null;
    }
    
    console.log(`🖱️ Hover state tracked: ${this.hoveredObject || 'none'}`);
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
    if (this.emergencyShutdown) {
      console.log(`🚫 EMERGENCY: updateAllVisuals blocked - shutdown mode active`);
      return;
    }
    
    console.log(`🎨 updateAllVisuals: mode=${this.isTopView ? '3D Top' : '3D View'}, selected=${this.selectedObject || 'none'}`);
    // All visual operations disabled for safety
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
