/**
 * CLEAN BMC SYSTEM - SIMPLE 3D Top Selection
 * RULE: In 3D Top, ONLY colors change. No animations, no timings, just instant changes.
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
    console.log(`🎬 Setting view mode: topView=${isTopView}`);
    this.isTopView = isTopView;
    
    // When entering 3D Top, ensure everything is at full height
    if (isTopView) {
      this.items.forEach((item) => {
        item.mesh.isVisible = true;
        item.mesh.setEnabled(true);
        item.mesh.scaling.y = item.originalHeight;
        item.material.alpha = 1.0;
        if (item.mesh.visibility !== undefined) {
          item.mesh.visibility = 1.0;
        }
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
    if (item.label.visibility !== undefined) {
      item.label.visibility = 1.0;
    }
    item.labelMaterial.alpha = 1.0;
    item.label.renderingGroupId = 1;
  }

  // Set default appearance
  private setDefaultAppearance(name: string) {
    const item = this.items.get(name);
    if (!item) return;

    item.mesh.isVisible = true;
    item.mesh.setEnabled(true);
    
    if (name === "Cost Structure") {
      item.material.diffuseColor = new Color3(0.35, 0.0, 0.0);
    } else if (name === "Revenue Streams") {
      item.material.diffuseColor = new Color3(0.0, 0.20, 0.12);
    } else {
      item.material.diffuseColor = new Color3(0.07, 0.07, 0.07);
    }
    item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);
    item.material.alpha = 1.0;
    
    this.makeLabelVisible(name);
  }

  // Get selected object from state manager
  private getSelectedObject(): string | null {
    if (!this.bmcStateManager) return null;
    
    const selectedComponent = this.bmcStateManager.getSelectedObject();
    if (!selectedComponent) return null;
    
    // Convert BMC component name to mesh name
    return this.convertBMCComponentToName(selectedComponent);
  }

  // Convert BMC component to mesh name
  private convertBMCComponentToName(component: BMCComponentName): string {
    const mapping: Record<BMCComponentName, string> = {
      'keyPartners': 'Key Partners',
      'keyActivities': 'Key Activities',
      'keyResources': 'Key Resources',
      'valuePropositions': 'Value Propositions',
      'customerRelationships': 'Customer Relationships',
      'channels': 'Channels',
      'customerSegments': 'Customer Segments',
      'costStructure': 'Cost Structure',
      'revenueStreams': 'Revenue Streams'
    };
    return mapping[component] || '';
  }

  // Convert mesh name to BMC component
  private convertNameToBMCComponent(name: string): BMCComponentName | null {
    const mapping: Record<string, BMCComponentName> = {
      'Key Partners': 'keyPartners',
      'Key Activities': 'keyActivities',
      'Key Resources': 'keyResources',
      'Value Propositions': 'valuePropositions',
      'Customer Relationships': 'customerRelationships',
      'Channels': 'channels',
      'Customer Segments': 'customerSegments',
      'Cost Structure': 'costStructure',
      'Revenue Streams': 'revenueStreams'
    };
    return mapping[name] || null;
  }

  // Public selection method
  selectObject(name: string | null) {
    console.log(`🎯 Selecting: ${name}`);
    
    if (name && this.bmcStateManager) {
      const componentName = this.convertNameToBMCComponent(name);
      if (componentName) {
        this.bmcStateManager.selectObject(componentName);
      }
    } else if (!name && this.bmcStateManager) {
      this.bmcStateManager.selectObject(null);
    }
    
    this.updateVisuals();
  }

  // Handle hover
  onHover(itemName: string, isHovered: boolean) {
    const item = this.items.get(itemName);
    if (!item) return;

    this.hoveredObject = isHovered ? itemName : null;
    this.updateVisuals();
  }

  // Handle selection
  onSelect(sectionName: string) {
    console.log(`🎯 Section clicked: ${sectionName}`);
    this.selectObject(sectionName);
  }

  // Clear selection
  clearSelection() {
    console.log(`🎯 Clearing selection`);
    this.selectObject(null);
  }

  // SIMPLE UPDATE METHOD - NO ANIMATIONS OR COMPLEX LOGIC
  private updateVisuals() {
    const currentSelection = this.getSelectedObject();
    console.log(`🎨 Updating visuals - selection: "${currentSelection}", topView: ${this.isTopView}`);

    if (this.isTopView) {
      // 3D TOP VIEW: EXTREMELY SIMPLE - ONLY COLOR CHANGES
      this.items.forEach((item, name) => {
        // Everything is always visible at full height
        item.mesh.isVisible = true;
        item.mesh.setEnabled(true);
        item.mesh.scaling.y = item.originalHeight;
        item.material.alpha = 1.0;
        if (item.mesh.visibility !== undefined) {
          item.mesh.visibility = 1.0;
        }
        
        // Only change color based on selection
        if (name === currentSelection) {
          // Selected = blue
          item.material.diffuseColor = new Color3(0.0, 0.3, 0.8);
          item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);
        } else {
          // Not selected = original color
          if (name === "Cost Structure") {
            item.material.diffuseColor = new Color3(0.35, 0.0, 0.0);
          } else if (name === "Revenue Streams") {
            item.material.diffuseColor = new Color3(0.0, 0.20, 0.12);
          } else {
            item.material.diffuseColor = new Color3(0.07, 0.07, 0.07);
          }
          item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);
        }
        
        // Ensure label is visible
        this.makeLabelVisible(name);
      });
      
    } else {
      // 3D VIEW: Normal behavior with animations
      this.items.forEach((item, name) => {
        const isSelected = (name === currentSelection);
        const isHovered = (name === this.hoveredObject);
        
        item.mesh.isVisible = true;
        item.mesh.setEnabled(true);
        
        if (isSelected) {
          // Selected: blue, full height
          item.material.diffuseColor = new Color3(0.0, 0.3, 0.8);
          item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);
          item.material.alpha = 1.0;
          this.animateHeight(item.mesh, item.originalHeight);
          
        } else if (currentSelection && currentSelection !== name) {
          // Something else selected: dim and flatten
          item.material.diffuseColor = new Color3(0.05, 0.05, 0.05);
          item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);
          item.material.alpha = 0.5;
          this.animateHeight(item.mesh, item.originalHeight * 0.01);
          
        } else if (isHovered && !currentSelection) {
          // Hovered: highlight
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
          item.material.alpha = 1.0;
          this.animateHeight(item.mesh, item.originalHeight);
          
        } else {
          // Normal: original color
          if (name === "Cost Structure") {
            item.material.diffuseColor = new Color3(0.35, 0.0, 0.0);
          } else if (name === "Revenue Streams") {
            item.material.diffuseColor = new Color3(0.0, 0.20, 0.12);
          } else {
            item.material.diffuseColor = new Color3(0.07, 0.07, 0.07);
          }
          item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);
          item.material.alpha = 1.0;
          this.animateHeight(item.mesh, item.originalHeight);
        }
        
        // Ensure label is visible
        this.makeLabelVisible(name);
      });
    }
  }

  // Height animation helper - ONLY for 3D view, NOT for 3D Top
  private animateHeight(mesh: AbstractMesh, targetHeight: number) {
    // NEVER animate in top view
    if (this.isTopView) {
      mesh.scaling.y = mesh.scaling.y; // Keep current height
      return;
    }
    
    // Only animate in 3D view
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