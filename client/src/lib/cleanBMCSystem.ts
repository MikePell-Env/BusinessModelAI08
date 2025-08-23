
/**
 * CLEAN BMC SYSTEM - Ultra-Simple 3D Top Selection
 * RULE: In 3D Top, ONLY colors change. Height and opacity NEVER change.
 */

import { AbstractMesh, StandardMaterial, Color3, Mesh } from '@babylonjs/core';
import { BMCComponentName } from '@/types/bmcState';
import { ViewTransitionManager } from '@/components/Canvas3DBabylon/animations/ViewTransitionManager';

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
  private bmcStateManager: any = null;
  private viewTransitionManager: ViewTransitionManager | null = null;
  private isTopView: boolean = false;
  private selectedObject: string | null = null;
  private hoveredObject: string | null = null;

  // Inject dependencies
  setBMCStateManager(bmcStateManager: any) {
    console.log("🔗 CleanBMCSystem.setBMCStateManager called");
    this.bmcStateManager = bmcStateManager;

    if (bmcStateManager && bmcStateManager.addStateListener) {
      bmcStateManager.addStateListener(() => {
        this.updateAllVisuals();
      });
    }
  }

  setViewTransitionManager(viewTransitionManager: ViewTransitionManager) {
    this.viewTransitionManager = viewTransitionManager;
  }

  // Set view mode
  setTopViewMode(isTopView: boolean) {
    console.log(`🎬 ======= VIEW MODE CHANGE START =======`);
    console.log(`🎬 CleanBMCSystem.setTopViewMode: ${this.isTopView} → ${isTopView}`);
    console.log(`🎬 Current selection: ${this.getSelectedObject()}`);
    console.log(`🎬 Items count: ${this.items.size}`);
    
    this.isTopView = isTopView;
    
    // FORCE all objects to be visible at full height when entering top view
    if (isTopView) {
      console.log(`🎬 ENTERING TOP VIEW - forcing all objects visible`);
      this.items.forEach((item, name) => {
        console.log(`🎬   - Processing ${name}: visible=${item.mesh.isVisible}, enabled=${item.mesh.isEnabled()}, height=${item.mesh.scaling.y}`);
        item.mesh.isVisible = true;
        item.mesh.setEnabled(true);
        item.mesh.scaling.y = item.originalHeight;
        item.material.alpha = 1.0;
        this.makeLabelVisible(item.name);
        console.log(`🎬   - After force: visible=${item.mesh.isVisible}, enabled=${item.mesh.isEnabled()}, height=${item.mesh.scaling.y}`);
      });
    } else {
      console.log(`🎬 ENTERING 3D VIEW - normal behavior`);
    }
    
    console.log(`🎬 About to call updateAllVisuals()`);
    this.updateAllVisuals();
    console.log(`🎬 ======= VIEW MODE CHANGE END =======`);
  }

  // Register BMC item
  registerItem(name: string, mesh: AbstractMesh, material: StandardMaterial, originalHeight: number) {
    const actualHeight = mesh.scaling.y;
    console.log(`📏 Registering ${name} with height=${actualHeight}`);

    this.items.set(name, {
      mesh,
      material,
      originalHeight: actualHeight,
      name
    });

    this.setDefaultAppearance(name);
  }

  // Add label
  addLabel(itemName: string, labelMesh: AbstractMesh, labelMaterial: StandardMaterial) {
    const item = this.items.get(itemName);
    if (item) {
      item.label = labelMesh;
      item.labelMaterial = labelMaterial;
      this.makeLabelVisible(itemName);
    }
  }

  // Make label visible
  private makeLabelVisible(itemName: string) {
    const item = this.items.get(itemName);
    if (!item?.label || !item?.labelMaterial) return;

    item.label.isVisible = true;
    item.label.setEnabled(true);
    item.label.visibility = 1.0;
    item.labelMaterial.alpha = 1.0;
    item.label.renderingGroupId = 1;
  }

  // Selection methods
  selectObject(name: string | null) {
    console.log(`🎯 CleanBMCSystem.selectObject: ${name}`);
    
    // Ensure all objects are visible and reset their height
    this.items.forEach((item) => {
      item.mesh.isVisible = true; // Set all objects visible
      item.mesh.setEnabled(true); // Enable all meshes
      item.mesh.scaling.y = item.originalHeight; // Restore original height
    });

    // Set the currently selected object
    this.selectedObject = name;
    
    if (this.bmcStateManager) {
      const componentName = this.convertNameToBMCComponent(name);
      this.bmcStateManager.selectObject(componentName);
    }
  }

  getSelectedObject(): string | null {
    if (this.bmcStateManager) {
      const selected = this.bmcStateManager.getSelectedObject();
      return this.convertBMCComponentToName(selected);
    }
    return null;
  }

  // Conversion helpers
  private convertNameToBMCComponent(name: string | null): BMCComponentName | null {
    if (!name) return null;
    const mapping: { [key: string]: BMCComponentName } = {
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
    return mapping[name] || null;
  }

  private convertBMCComponentToName(componentName: BMCComponentName | null): string | null {
    if (!componentName) return null;
    const mapping: { [key in BMCComponentName]: string } = {
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
    return mapping[componentName] || null;
  }

  // Set default appearance
  private setDefaultAppearance(itemName: string) {
    const item = this.items.get(itemName);
    if (!item) return;

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

  // Handle hover
  onHover(itemName: string, isHovered: boolean) {
    const item = this.items.get(itemName);
    if (!item) return;

    if (isHovered) {
      this.hoveredObject = itemName;
    } else {
      this.hoveredObject = null;
    }
    
    this.updateAllVisuals();
  }

  // Handle selection
  onSelect(sectionName: string) {
    console.log(`🎯 ======= SELECTION START =======`);
    console.log(`🎯 onSelect called with: ${sectionName}`);
    console.log(`🎯 Current view mode: topView=${this.isTopView}`);
    console.log(`🎯 Current selected before: ${this.getSelectedObject()}`);
    console.log(`🎯 BMC State Manager exists: ${!!this.bmcStateManager}`);
    
    if (this.bmcStateManager) {
      const bmcComponent = this.convertNameToBMCComponent(sectionName);
      console.log(`🎯 Converted "${sectionName}" to BMC component: ${bmcComponent}`);
      if (bmcComponent) {
        console.log(`🎯 Calling bmcStateManager.selectObject(${bmcComponent})`);
        this.bmcStateManager.selectObject(bmcComponent);
        console.log(`🎯 BMC State Manager selection complete`);
      } else {
        console.log(`🎯 ERROR: Could not convert section name to BMC component`);
      }
    } else {
      console.log(`🎯 ERROR: No BMC State Manager available`);
    }
    
    console.log(`🎯 Current selected after: ${this.getSelectedObject()}`);
    console.log(`🎯 About to call updateAllVisuals()`);
    this.updateAllVisuals();
    console.log(`🎯 ======= SELECTION END =======`);
  }

  // Clear selection
  clearSelection() {
    console.log(`🎯 ======= CLEAR SELECTION START =======`);
    console.log(`🎯 Current selected before clear: ${this.getSelectedObject()}`);
    this.selectObject(null);
    console.log(`🎯 Current selected after clear: ${this.getSelectedObject()}`);
    console.log(`🎯 ======= CLEAR SELECTION END =======`);
  }

  // Update all visual states - STRICT 3D TOP RULES
  updateAllVisuals() {
    const currentSelection = this.getSelectedObject();
    console.log(`🎨 CleanBMC: Updating visuals - selection: "${currentSelection}", topView: ${this.isTopView}`);

    // STRICT 3D TOP IMPLEMENTATION
    if (this.isTopView) {
      // 3D TOP RULES: Only selected object changes color, NOTHING ELSE CHANGES
      this.items.forEach((item, name) => {
        // ALWAYS ensure visibility first
        item.mesh.isVisible = true;
        item.mesh.setEnabled(true);
        item.mesh.visibility = 1.0;
        item.mesh.scaling.y = item.originalHeight;
        item.material.alpha = 1.0;
        
        if (name === currentSelection) {
          // ONLY change color for selected object
          this.applySelectionEffect(item.material, name);
        } else {
          // ALL non-selected objects stay EXACTLY as they were
          this.restoreOriginalMaterial(item.material, name);
        }
        
        // Always ensure labels are visible
        this.ensureLabelVisibility(name);
      });
    } else {
      // 3D VIEW: Normal implementation with dimming
      this.items.forEach((item, name) => {
        const isSelected = (name === currentSelection);
        const isHovered = (name === this.hoveredObject);
        
        item.mesh.isVisible = true;
        item.mesh.setEnabled(true);

        let visualState: 'normal' | 'hover' | 'selected' | 'dimmed';
        
        if (isSelected) {
          visualState = 'selected';
        } else if (isHovered && !currentSelection) {
          visualState = 'hover';
        } else if (currentSelection && currentSelection !== name) {
          visualState = 'dimmed';
        } else {
          visualState = 'normal';
        }
        
        this.applyVisualState(item, name, visualState);
      });
    }
  }


  // Apply the correct visual state to an item - ONLY USED FOR 3D VIEW NOW
  private applyVisualState(item: BMCItem, name: string, state: 'normal' | 'hover' | 'selected' | 'dimmed') {
    // This method should ONLY be called for 3D View
    if (this.isTopView) {
      console.error(`⚠️ ERROR: applyVisualState called in 3D Top view - this should not happen!`);
      return;
    }
    
    console.log(`🎨 3D View: Applying ${state} state to ${name}`);
    
    item.mesh.isVisible = true;
    item.mesh.setEnabled(true);

    switch (state) {
      case 'selected':
        // SELECTED: Bright blue, full height, 100% opacity (rules 2,6)
        this.applySelectionEffect(item.material, name);
        item.material.alpha = 1.0;
        if (!this.isTopView) {
          // 3D View: selected stays at full height
          this.animateHeight(item.mesh, item.originalHeight);
        } else {
          // 3D Top: selected stays at full height
          item.mesh.scaling.y = item.originalHeight;
          item.mesh.visibility = 1.0; // Ensure full visibility
        }
        break;

      case 'hover':
        this.applyHoverEffect(item.material, true);
        break;

      case 'dimmed':
        // DIMMED: Only applies to 3D View (rule 6)
        // 3D Top NEVER uses dimmed state - handled by updateAllVisuals logic
        if (!this.isTopView) {
          // Only apply dimming in 3D View
          this.applyDimmedEffect(item.material, name);
          item.material.alpha = 0.5; // 50% opacity
          this.animateHeight(item.mesh, item.originalHeight * 0.01); // flatten to almost nothing
        } else {
          // This should NEVER happen in 3D Top - force to normal state immediately
          console.error(`⚠️ CRITICAL BUG: Dimmed state in 3D Top for ${name} - forcing normal state`);
          // Immediately apply normal state
          this.restoreOriginalMaterial(item.material, name);
          item.material.alpha = 1.0;
          item.mesh.scaling.y = item.originalHeight;
          item.mesh.isVisible = true;
          item.mesh.setEnabled(true);
          // Ensure labels stay visible
          this.ensureLabelVisibility(name);
        }
        break;

      case 'normal':
      default:
        // NORMAL: Original material, full height, 100% opacity (rules 1,4,5,8)
        this.restoreOriginalMaterial(item.material, name);
        // FORCE 100% opacity - NEVER change this
        item.material.alpha = 1.0;
        // CRITICAL: Ensure mesh is visible
        item.mesh.isVisible = true;
        item.mesh.setEnabled(true);
        if (!this.isTopView) {
          // 3D View: return to full height
          this.animateHeight(item.mesh, item.originalHeight);
        } else {
          // 3D Top: maintain full height - NEVER hide or reduce
          item.mesh.scaling.y = item.originalHeight;
          // Double-check visibility in 3D Top
          item.mesh.visibility = 1.0;
        }
        break;
    }

    // Always ensure labels are visible
    this.ensureLabelVisibility(name);
  }

  // Helper methods for material effects
  private applySelectionEffect(material: StandardMaterial, name: string) {
    material.diffuseColor = new Color3(0.0, 0.3, 0.8);
    material.emissiveColor = new Color3(0.0, 0.0, 0.0);
  }

  private applyHoverEffect(material: StandardMaterial, isHovered: boolean) {
    if (isHovered) {
      material.emissiveColor = new Color3(0.1, 0.1, 0.1);
    } else {
      material.emissiveColor = new Color3(0.0, 0.0, 0.0);
    }
  }

  private applyDimmedEffect(material: StandardMaterial, name: string) {
    material.diffuseColor = new Color3(0.05, 0.05, 0.05);
    material.emissiveColor = new Color3(0.0, 0.0, 0.0);
  }

  private restoreOriginalMaterial(material: StandardMaterial, name: string) {
    if (name === "Cost Structure") {
      material.diffuseColor = new Color3(0.35, 0.0, 0.0);
    } else if (name === "Revenue Streams") {
      material.diffuseColor = new Color3(0.0, 0.20, 0.12);
    } else {
      material.diffuseColor = new Color3(0.07, 0.07, 0.07);
    }
    material.emissiveColor = new Color3(0.0, 0.0, 0.0);
    material.alpha = 1.0;
  }

  private ensureLabelVisibility(name: string) {
    const item = this.items.get(name);
    if (item?.label) {
      item.label.isVisible = true;
      item.label.setEnabled(true);
      if (item.labelMaterial) {
        item.labelMaterial.alpha = 1.0;
      }
    }
  }

  // Utility methods
  getAllItems(): string[] {
    return Array.from(this.items.keys());
  }

  isRegisteredMesh(mesh: AbstractMesh): boolean {
    return Array.from(this.items.values()).some(item => item.mesh === mesh);
  }

  getMesh(itemName: string): AbstractMesh | null {
    return this.items.get(itemName)?.mesh || null;
  }
}

export const cleanBMCSystem = new CleanBMCSystem();
