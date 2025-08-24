
import { AbstractMesh, Color3, StandardMaterial, Scene } from '@babylonjs/core';
import { BMCStateManagerImpl } from './bmcStateManager';
import { SafeMaterialManager } from '@/lib/babylon/SafeMaterialManager';

interface BMCItem {
  mesh: AbstractMesh;
  material: StandardMaterial;
  originalHeight: number;
  baseColor: Color3;
  label?: AbstractMesh;
  labelMaterial?: StandardMaterial;
}

export class CleanBMCSystem {
  private scene: Scene | null = null;
  private items: Map<string, BMCItem> = new Map();
  private selectedObject: string | null = null;
  private hoveredObject: string | null = null;
  private isTopView: boolean = false;
  private bmcStateManager: BMCStateManagerImpl | null = null;
  private safeMaterialManager: SafeMaterialManager | null = null;

  constructor() {
    console.log('🎯 CleanBMCSystem initialized');
  }

  // Initialize the system with a Babylon.js scene
  public initialize(scene: Scene): void {
    this.scene = scene;

    try {
      this.safeMaterialManager = new SafeMaterialManager(scene);
      console.log('✅ CleanBMCSystem initialized with SafeMaterialManager');
    } catch (error) {
      console.error('❌ Failed to initialize SafeMaterialManager:', error);
    }
  }

  // Set the BMC state manager
  setBMCStateManager(bmcStateManager: BMCStateManagerImpl) {
    this.bmcStateManager = bmcStateManager;
  }

  // Set whether we're in top view mode
  setTopViewMode(isTopView: boolean) {
    this.isTopView = isTopView;
    this.updateAllVisuals();
  }

  // Register a mesh with the system
  registerMesh(mesh: AbstractMesh, sectionName: string) {
    console.log(`📝 Registering mesh: ${sectionName}`);
    
    // Store mesh reference with section name
    (mesh as any).bmcSectionName = sectionName;
    
    // Apply default material if SafeMaterialManager is available
    if (this.safeMaterialManager) {
      const success = this.safeMaterialManager.applyMaterialSafely(mesh, 'default_grey');
      if (success) {
        console.log(`✅ Default material applied to ${sectionName}`);
      }
    }
  }

  // Register a BMC item with full configuration
  registerItem(name: string, mesh: AbstractMesh, material: StandardMaterial, originalHeight: number) {
    const baseColor = this.getBaseColor(name);

    if (!mesh.material) {
      mesh.material = material;
    }

    this.items.set(name, {
      mesh,
      material,
      originalHeight: mesh.scaling.y,
      baseColor: baseColor.clone()
    });

    this.applyState(name, 'normal');
    console.log(`✅ Registered item: ${name}`);
  }

  // Handle selection
  onSelect(sectionName: string) {
    console.log(`🔍 CleanBMC onSelect: ${sectionName}`);

    if (this.selectedObject === sectionName) {
      this.selectedObject = null;
      console.log('🔄 Deselected');
    } else {
      this.selectedObject = sectionName;
      console.log(`🎯 Selected: ${sectionName}`);
    }

    this.updateAllVisuals();
  }

  // Clear selection
  clearSelection() {
    this.selectedObject = null;
    this.hoveredObject = null;
    this.updateAllVisuals();
    console.log('✅ Selection cleared');
  }

  // Handle hover state changes
  onHover(sectionName: string, isHovering: boolean): void {
    if (isHovering) {
      this.hoveredObject = sectionName;
      console.log(`🖱️ Hovering: ${sectionName}`);
    } else {
      this.hoveredObject = null;
      console.log('🖱️ Hover cleared');
    }

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

  // Main visual update method
  private updateAllVisuals(): void {
    console.log(`🎨 Updating visuals - mode: ${this.isTopView ? '3D Top' : '3D View'}, selected: ${this.selectedObject || 'none'}, hovered: ${this.hoveredObject || 'none'}`);

    this.items.forEach((item, name) => {
      let state = 'normal';

      if (name === this.selectedObject) {
        state = 'selected';
      } else if (name === this.hoveredObject) {
        state = 'hover';
      } else if (this.selectedObject && name !== this.selectedObject) {
        state = 'dimmed';
      }

      this.applyState(name, state);
    });
  }

  // Apply visual state to an item
  private applyState(name: string, state: string) {
    const item = this.items.get(name);
    if (!item || !this.safeMaterialManager) return;

    console.log(`🎨 Applying state: ${name} -> ${state}`);

    let materialName: string;
    let heightScale = 1.0;

    switch (state) {
      case 'selected':
        materialName = 'selected_blue';
        heightScale = this.isTopView ? 1.0 : 1.3;
        break;
      case 'hover':
        materialName = 'hover_blue';
        heightScale = this.isTopView ? 1.0 : 1.1;
        break;
      case 'dimmed':
        materialName = 'default_grey';
        heightScale = this.isTopView ? 1.0 : 0.8;
        break;
      case 'normal':
      default:
        if (name === "Cost Structure") {
          materialName = 'cost_red';
        } else if (name === "Revenue Streams") {
          materialName = 'revenue_green';
        } else {
          materialName = 'default_grey';
        }
        heightScale = 1.0;
        break;
    }

    // Apply material
    this.safeMaterialManager.applyMaterialSafely(item.mesh, materialName);

    // Apply height scaling (only in 3D perspective view)
    if (!this.isTopView) {
      item.mesh.scaling.y = item.originalHeight * heightScale;
    } else {
      item.mesh.scaling.y = item.originalHeight;
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

  // Get current state for debugging
  getCurrentState(): any {
    return {
      selectedObject: this.selectedObject,
      hoveredObject: this.hoveredObject,
      isTopView: this.isTopView,
      itemCount: this.items.size,
      safeMaterialManagerStats: this.safeMaterialManager?.getStats()
    };
  }

  // Dispose of resources
  dispose(): void {
    this.items.clear();
    this.selectedObject = null;
    this.hoveredObject = null;

    if (this.safeMaterialManager) {
      this.safeMaterialManager.dispose();
    }

    console.log('🧹 CleanBMCSystem disposed');
  }
}
