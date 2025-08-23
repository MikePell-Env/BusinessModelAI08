
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

  // REMOVED OLD updateVisuals() method - using updateAllVisuals() instead
  private updateVisuals_OLD_REMOVED() {
    const currentSelection = this.getSelectedObject();
    console.log(`🎨 UpdateVisuals START: selection="${currentSelection}", topView=${this.isTopView}, hoveredObject="${this.hoveredObject}"`);
    console.log(`🎨 BMC State Manager exists: ${!!this.bmcStateManager}`);
    console.log(`🎨 Items count: ${this.items.size}`);

    this.items.forEach((item, name) => {
      console.log(`🔧 Processing item: ${name}`);
      console.log(`🔧   - mesh exists: ${!!item.mesh}`);
      console.log(`🔧   - material exists: ${!!item.material}`);
      console.log(`🔧   - originalHeight: ${item.originalHeight}`);
      console.log(`🔧   - current mesh.scaling.y: ${item.mesh.scaling.y}`);
      console.log(`🔧   - mesh.isVisible BEFORE: ${item.mesh.isVisible}`);
      console.log(`🔧   - mesh.isEnabled BEFORE: ${item.mesh.isEnabled()}`);
      console.log(`🔧   - material.alpha BEFORE: ${item.material.alpha}`);

      // STEP 1: FORCE VISIBILITY - NEVER HIDE ANYTHING
      item.mesh.isVisible = true;
      item.mesh.setEnabled(true);
      item.mesh.visibility = 1.0;
      item.material.alpha = 1.0;
      
      console.log(`🔧   - AFTER visibility forced: isVisible=${item.mesh.isVisible}, isEnabled=${item.mesh.isEnabled()}, alpha=${item.material.alpha}`);
      
      if (this.isTopView) {
        console.log(`🔧   - TOP VIEW MODE for ${name}`);
        // ========== 3D TOP VIEW: ONLY COLORS CHANGE ==========
        const oldHeight = item.mesh.scaling.y;
        item.mesh.scaling.y = item.originalHeight; // FORCE original height
        console.log(`🔧   - Height forced from ${oldHeight} to ${item.mesh.scaling.y} (original: ${item.originalHeight})`);
        
        if (name === currentSelection) {
          console.log(`🔧   - ${name} is SELECTED - applying blue color`);
          // Selected: Bright blue
          item.material.diffuseColor = new Color3(0.0, 0.3, 0.8);
          item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);
          console.log(`🔧   - Applied selection color: diffuse=(0.0, 0.3, 0.8), emissive=(0.0, 0.0, 0.0)`);
        } else {
          console.log(`🔧   - ${name} is NOT selected - applying original color`);
          // Not selected: Original colors
          this.setOriginalColor(item, name);
          console.log(`🔧   - Applied original color for ${name}`);
        }
        
      } else {
        console.log(`🔧   - 3D VIEW MODE for ${name}`);
        // ========== 3D VIEW: FULL INTERACTION ==========
        if (name === currentSelection) {
          console.log(`🔧   - ${name} is SELECTED in 3D view - blue + full height`);
          // Selected: Blue, full height, others flatten
          item.material.diffuseColor = new Color3(0.0, 0.3, 0.8);
          item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);
          item.material.alpha = 1.0;
          this.animateHeight(item.mesh, item.originalHeight);
        } else if (currentSelection) {
          console.log(`🔧   - ${name} is NOT selected but something else is - dim + flatten`);
          // Others when something selected: dim and flatten
          item.material.diffuseColor = new Color3(0.05, 0.05, 0.05);
          item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);
          item.material.alpha = 0.5;
          this.animateHeight(item.mesh, item.originalHeight * 0.01);
        } else if (name === this.hoveredObject) {
          console.log(`🔧   - ${name} is HOVERED - bright color`);
          // Hovered: bright color
          this.setHoverColor(item, name);
          item.material.alpha = 1.0;
          this.animateHeight(item.mesh, item.originalHeight);
        } else {
          console.log(`🔧   - ${name} is NORMAL - original colors`);
          // Normal: original colors
          this.setOriginalColor(item, name);
          item.material.alpha = 1.0;
          this.animateHeight(item.mesh, item.originalHeight);
        }
      }
      
      console.log(`🔧   - FINAL STATE for ${name}:`);
      console.log(`🔧     * mesh.isVisible: ${item.mesh.isVisible}`);
      console.log(`🔧     * mesh.isEnabled: ${item.mesh.isEnabled()}`);
      console.log(`🔧     * mesh.visibility: ${item.mesh.visibility}`);
      console.log(`🔧     * material.alpha: ${item.material.alpha}`);
      console.log(`🔧     * mesh.scaling.y: ${item.mesh.scaling.y}`);
      console.log(`🔧     * diffuseColor: (${item.material.diffuseColor.r.toFixed(2)}, ${item.material.diffuseColor.g.toFixed(2)}, ${item.material.diffuseColor.b.toFixed(2)})`);
      
      // ALWAYS ensure labels are visible
      this.makeLabelVisible(name);
    });
    
    console.log(`🎨 UpdateVisuals COMPLETE`);
  }

  // Set original color for object
  private setOriginalColor(item: BMCItem, name: string) {
    console.log(`🎨 Setting original color for: ${name}`);
    if (name === "Cost Structure") {
      item.material.diffuseColor = new Color3(0.35, 0.0, 0.0);
      console.log(`🎨   - Cost Structure red: (0.35, 0.0, 0.0)`);
    } else if (name === "Revenue Streams") {
      item.material.diffuseColor = new Color3(0.0, 0.20, 0.12);
      console.log(`🎨   - Revenue Streams green: (0.0, 0.20, 0.12)`);
    } else {
      item.material.diffuseColor = new Color3(0.07, 0.07, 0.07);
      console.log(`🎨   - Default dark grey: (0.07, 0.07, 0.07)`);
    }
    item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);
    console.log(`🎨   - Emissive set to: (0.0, 0.0, 0.0)`);
  }

  // Set hover color for object
  private setHoverColor(item: BMCItem, name: string) {
    console.log(`🎨 Setting hover color for: ${name}`);
    if (name === "Cost Structure") {
      item.material.diffuseColor = new Color3(0.35, 0.0, 0.0);
      item.material.emissiveColor = new Color3(0.2, 0.0, 0.0);
      console.log(`🎨   - Cost Structure hover: diffuse=(0.35, 0.0, 0.0), emissive=(0.2, 0.0, 0.0)`);
    } else if (name === "Revenue Streams") {
      item.material.diffuseColor = new Color3(0.0, 0.20, 0.12);
      item.material.emissiveColor = new Color3(0.0, 0.1, 0.05);
      console.log(`🎨   - Revenue Streams hover: diffuse=(0.0, 0.20, 0.12), emissive=(0.0, 0.1, 0.05)`);
    } else {
      item.material.diffuseColor = new Color3(0.0, 0.3, 0.8);
      item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);
      console.log(`🎨   - Default hover blue: diffuse=(0.0, 0.3, 0.8), emissive=(0.0, 0.0, 0.0)`);
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
