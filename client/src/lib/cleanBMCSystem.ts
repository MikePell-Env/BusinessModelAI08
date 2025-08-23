
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
        this.updateVisuals();
      });
    }
  }

  setViewTransitionManager(viewTransitionManager: ViewTransitionManager) {
    this.viewTransitionManager = viewTransitionManager;
  }

  // Set view mode
  setTopViewMode(isTopView: boolean) {
    console.log(`🎬 CleanBMCSystem.setTopViewMode: ${isTopView}`);
    this.isTopView = isTopView;
    
    // FORCE all objects to be visible at full height when entering top view
    if (isTopView) {
      this.items.forEach((item) => {
        item.mesh.isVisible = true;
        item.mesh.setEnabled(true);
        item.mesh.scaling.y = item.originalHeight;
        item.material.alpha = 1.0;
        this.makeLabelVisible(item.name);
      });
    }
    
    this.updateVisuals();
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
    
    this.updateVisuals();
  }

  // Handle selection
  onSelect(sectionName: string) {
    console.log(`🎯 Selection: ${sectionName}`);
    
    if (this.bmcStateManager) {
      const bmcComponent = this.convertNameToBMCComponent(sectionName);
      if (bmcComponent) {
        this.bmcStateManager.selectObject(bmcComponent);
      }
    }
    
    this.updateVisuals();
  }

  // Clear selection
  clearSelection() {
    this.selectObject(null);
  }

  // THE CORE VISUAL UPDATE - BULLETPROOF SIMPLE
  private updateVisuals() {
    const currentSelection = this.getSelectedObject();
    console.log(`🎨 UpdateVisuals: selection="${currentSelection}", topView=${this.isTopView}`);

    this.items.forEach((item, name) => {
      // STEP 1: FORCE VISIBILITY - NEVER HIDE ANYTHING
      item.mesh.isVisible = true;
      item.mesh.setEnabled(true);
      item.mesh.visibility = 1.0;
      item.material.alpha = 1.0;
      
      if (this.isTopView) {
        // ========== 3D TOP VIEW: ONLY COLORS CHANGE ==========
        item.mesh.scaling.y = item.originalHeight; // FORCE original height
        
        if (name === currentSelection) {
          // Selected: Bright blue
          item.material.diffuseColor = new Color3(0.0, 0.3, 0.8);
          item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);
        } else {
          // Not selected: Original colors
          this.setOriginalColor(item, name);
        }
        
      } else {
        // ========== 3D VIEW: FULL INTERACTION ==========
        if (name === currentSelection) {
          // Selected: Blue, full height, others flatten
          item.material.diffuseColor = new Color3(0.0, 0.3, 0.8);
          item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);
          item.material.alpha = 1.0;
          this.animateHeight(item.mesh, item.originalHeight);
        } else if (currentSelection) {
          // Others when something selected: dim and flatten
          item.material.diffuseColor = new Color3(0.05, 0.05, 0.05);
          item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);
          item.material.alpha = 0.5;
          this.animateHeight(item.mesh, item.originalHeight * 0.01);
        } else if (name === this.hoveredObject) {
          // Hovered: bright color
          this.setHoverColor(item, name);
          item.material.alpha = 1.0;
          this.animateHeight(item.mesh, item.originalHeight);
        } else {
          // Normal: original colors
          this.setOriginalColor(item, name);
          item.material.alpha = 1.0;
          this.animateHeight(item.mesh, item.originalHeight);
        }
      }
      
      // ALWAYS ensure labels are visible
      this.makeLabelVisible(name);
    });
  }

  // Set original color for object
  private setOriginalColor(item: BMCItem, name: string) {
    if (name === "Cost Structure") {
      item.material.diffuseColor = new Color3(0.35, 0.0, 0.0);
    } else if (name === "Revenue Streams") {
      item.material.diffuseColor = new Color3(0.0, 0.20, 0.12);
    } else {
      item.material.diffuseColor = new Color3(0.07, 0.07, 0.07);
    }
    item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);
  }

  // Set hover color for object
  private setHoverColor(item: BMCItem, name: string) {
    if (name === "Cost Structure") {
      item.material.diffuseColor = new Color3(0.35, 0.0, 0.0);
      item.material.emissiveColor = new Color3(0.2, 0.0, 0.0);
    } else if (name === "Revenue Streams") {
      item.material.diffuseColor = new Color3(0.0, 0.20, 0.12);
      item.material.emissiveColor = new Color3(0.0, 0.1, 0.05);
    } else {
      item.material.diffuseColor = new Color3(0.0, 0.3, 0.8);
      item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);
    }
  }

  // Height animation helper - ONLY for 3D view
  private animateHeight(mesh: AbstractMesh, targetHeight: number) {
    if (this.isTopView) return; // NEVER animate in top view
    
    if (this.viewTransitionManager && mesh instanceof Mesh) {
      this.viewTransitionManager.animateMeshHeight(mesh, targetHeight, {
        duration: 1000,
        easing: true
      });
    } else {
      mesh.scaling.y = targetHeight;
    }
  }

  // Public method for external calls to update visuals
  updateAllVisuals() {
    this.updateVisuals();
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
