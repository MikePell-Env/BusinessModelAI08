import { AbstractMesh, Color3, StandardMaterial, Mesh } from '@babylonjs/core';
import { ViewTransitionManager } from '../components/Canvas3DBabylon/animations/ViewTransitionManager';

interface BMCItem {
  mesh: AbstractMesh;
  material: StandardMaterial;
  originalHeight: number;
  name: string;
  label?: AbstractMesh;
  labelMaterial?: StandardMaterial;
}

export class CleanBMCSystem {
  private items: Map<string, BMCItem> = new Map();
  private selectedObject: string | null = null;
  private hoveredObject: string | null = null;
  private isTopView: boolean = false;
  private viewTransitionManager: ViewTransitionManager | null = null;

  constructor() {
    console.log("✅ CleanBMCSystem initialized");
  }

  // Set the view transition manager
  setViewTransitionManager(viewTransitionManager: ViewTransitionManager) {
    this.viewTransitionManager = viewTransitionManager;
  }

  // Set whether we're in top view mode
  setTopViewMode(isTopView: boolean) {
    console.log(`🎬 CleanBMCSystem.setTopViewMode: ${isTopView}`);
    this.isTopView = isTopView;
    
    // Reset everything to visible state when switching views
    this.items.forEach((item) => {
      item.mesh.isVisible = true;
      item.mesh.setEnabled(true);
      item.material.alpha = 1.0;
      // Reset to original height
      item.mesh.scaling.y = item.originalHeight;
      if (item.label) {
        item.label.isVisible = true;
        item.label.setEnabled(true);
      }
    });
    
    this.updateVisuals();
  }

  // Register a BMC item
  registerItem(name: string, mesh: AbstractMesh, material: StandardMaterial, originalHeight: number) {
    // Capture the actual current height of the mesh
    const actualHeight = mesh.scaling.y;
    console.log(`📏 Registering ${name} with actual height=${actualHeight}`);

    this.items.set(name, {
      mesh,
      material,
      originalHeight: actualHeight,
      name
    });

    // Set initial appearance
    this.applyNormalColors(material, name);
    material.alpha = 1.0;
  }

  // Add a label
  addLabel(itemName: string, labelMesh: AbstractMesh, labelMaterial: StandardMaterial) {
    const item = this.items.get(itemName);
    if (item) {
      item.label = labelMesh;
      item.labelMaterial = labelMaterial;
      // Ensure label is always visible
      labelMesh.isVisible = true;
      labelMesh.setEnabled(true);
      labelMaterial.alpha = 1.0;
    }
  }

  // Handle hover
  onHover(itemName: string | null, isHovering: boolean) {
    console.log(`🖱️ Hover ${isHovering ? 'ON' : 'OFF'} for "${itemName}"`);
    
    if (isHovering && itemName) {
      this.hoveredObject = itemName;
    } else {
      this.hoveredObject = null;
    }
    
    this.updateVisuals();
  }

  // Handle selection
  onSelect(sectionName: string) {
    console.log(`🎯 Selection: "${sectionName}"`);
    this.selectedObject = sectionName;
    this.updateVisuals();
  }

  // Clear selection
  clearSelection() {
    this.selectedObject = null;
    this.updateVisuals();
  }

  // SUPER SIMPLIFIED: Update all visuals
  private updateVisuals() {
    console.log(`🎨 Updating - selected: "${this.selectedObject}", hovered: "${this.hoveredObject}", topView: ${this.isTopView}`);
    
    this.items.forEach((item, name) => {
      // CRITICAL: Always keep objects visible
      item.mesh.isVisible = true;
      item.mesh.setEnabled(true);
      
      // CRITICAL: Always keep labels visible
      if (item.label) {
        item.label.isVisible = true;
        item.label.setEnabled(true);
      }
      if (item.labelMaterial) {
        item.labelMaterial.alpha = 1.0;
      }
      
      const isSelected = (name === this.selectedObject);
      const isHovered = (name === this.hoveredObject);
      const hasSelection = (this.selectedObject !== null);
      
      // SIMPLIFIED STATE LOGIC
      if (isSelected) {
        // SELECTED: Blue color, raised height (3D only)
        this.applySelectedColors(item.material, name);
        item.material.alpha = 1.0;
        
        if (this.isTopView) {
          item.mesh.scaling.y = item.originalHeight; // Keep original in top view
        } else {
          this.setHeight(item.mesh, item.originalHeight * 1.4); // Raise in 3D
        }
        
      } else if (isHovered && !hasSelection) {
        // HOVER: Bright blue (only when nothing selected)
        item.material.diffuseColor = new Color3(0.0, 0.3, 0.8);
        item.material.emissiveColor = new Color3(0.1, 0.1, 0.1);
        item.material.alpha = 1.0;
        item.mesh.scaling.y = item.originalHeight;
        
      } else if (hasSelection && !isSelected) {
        // DIMMED: Darker colors, flattened (3D only)
        this.applyDimmedColors(item.material, name);
        
        // CRITICAL: In top view, NEVER change alpha or height
        if (this.isTopView) {
          item.material.alpha = 1.0;
          item.mesh.scaling.y = item.originalHeight;
        } else {
          item.material.alpha = 0.5;
          this.setHeight(item.mesh, 0.01); // Flatten in 3D only
        }
        
      } else {
        // NORMAL: Default appearance
        this.applyNormalColors(item.material, name);
        item.material.alpha = 1.0;
        
        if (this.isTopView) {
          item.mesh.scaling.y = item.originalHeight;
        } else {
          this.setHeight(item.mesh, item.originalHeight);
        }
      }
    });
  }

  // Helper: Set height (with animation in 3D view)
  private setHeight(mesh: AbstractMesh, targetHeight: number) {
    if (this.isTopView) {
      // Never animate in top view, just set directly
      return;
    }
    
    if (this.viewTransitionManager && mesh instanceof Mesh) {
      this.viewTransitionManager.animateMeshHeight(mesh, targetHeight, {
        duration: 2500,
        easing: true
      });
    } else {
      mesh.scaling.y = targetHeight;
    }
  }

  // Helper: Apply selected colors
  private applySelectedColors(material: StandardMaterial, name: string) {
    if (name === "Cost Structure") {
      material.diffuseColor = new Color3(0.35, 0.0, 0.0);
      material.emissiveColor = new Color3(0.3, 0.0, 0.0);
    } else if (name === "Revenue Streams") {
      material.diffuseColor = new Color3(0.0, 0.20, 0.12);
      material.emissiveColor = new Color3(0.0, 0.15, 0.08);
    } else {
      material.diffuseColor = new Color3(0.0, 0.3, 0.8);
      material.emissiveColor = new Color3(0.0, 0.1, 0.2);
    }
  }

  // Helper: Apply dimmed colors
  private applyDimmedColors(material: StandardMaterial, name: string) {
    if (name === "Cost Structure") {
      material.diffuseColor = new Color3(0.2, 0.0, 0.0);
    } else if (name === "Revenue Streams") {
      material.diffuseColor = new Color3(0.0, 0.15, 0.10);
    } else {
      material.diffuseColor = new Color3(0.05, 0.05, 0.05);
    }
    material.emissiveColor = new Color3(0.0, 0.0, 0.0);
  }

  // Helper: Apply normal colors
  private applyNormalColors(material: StandardMaterial, name: string) {
    if (name === "Cost Structure") {
      material.diffuseColor = new Color3(0.35, 0.0, 0.0);
    } else if (name === "Revenue Streams") {
      material.diffuseColor = new Color3(0.0, 0.20, 0.12);
    } else {
      material.diffuseColor = new Color3(0.07, 0.07, 0.07);
    }
    material.emissiveColor = new Color3(0.0, 0.0, 0.0);
  }

  // Get selected object
  getSelectedObject(): string | null {
    return this.selectedObject;
  }

  // Select an object
  selectObject(objectName: string | null) {
    this.selectedObject = objectName;
    this.updateVisuals();
  }

  // Check if an item exists
  hasItem(name: string): boolean {
    return this.items.has(name);
  }

  // Get all items
  getAllItems(): Map<string, BMCItem> {
    return this.items;
  }

  // Check if in top view
  getIsTopView(): boolean {
    return this.isTopView;
  }

  // No longer needed - removed BMC state manager integration
  setBMCStateManager(bmcStateManager: any) {
    // Removed - was causing errors
  }
}

// Create singleton instance for backward compatibility
export const cleanBMCSystem = new CleanBMCSystem();