import { AbstractMesh, Color3, StandardMaterial } from '@babylonjs/core';
import { BMCStateManagerImpl } from './bmcStateManager';

interface BMCItem {
  mesh: AbstractMesh;
  material: StandardMaterial;
  originalHeight: number;
  name: string;
  label?: AbstractMesh;
  labelMaterial?: StandardMaterial;
  originalColor?: Color3; // Added for storing original color
}

export class CleanBMCSystem {
  private items: Map<string, BMCItem> = new Map();
  private selectedObject: string | null = null;
  private hoveredObject: string | null = null;
  private isTopView: boolean = false;
  private bmcStateManager: BMCStateManagerImpl | null = null;

  constructor() {
    console.log("✅ CleanBMCSystem initialized");
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

  // Set the BMC state manager
  setBMCStateManager(bmcStateManager: BMCStateManagerImpl) {
    this.bmcStateManager = bmcStateManager;
  }

  // Set whether we're in top view mode
  setTopViewMode(isTopView: boolean) {
    console.log(`🎬 Setting view mode: ${isTopView ? '3D Top' : '3D'}`);
    this.isTopView = isTopView;
    this.updateAllVisuals();
  }

  // Register a BMC item
  registerItem(name: string, mesh: AbstractMesh, material: StandardMaterial, originalHeight: number) {
    const actualHeight = mesh.scaling.y;
    console.log(`📏 Registering ${name} with height=${actualHeight}`);

    // Store original color
    const originalColor = material.diffuseColor ? material.diffuseColor.clone() : new Color3(0.5, 0.5, 0.5); // Default to grey if no diffuseColor

    // Ensure material is assigned
    if (!mesh.material) {
      mesh.material = material;
    }

    this.items.set(name, {
      mesh,
      material,
      originalHeight: actualHeight,
      name,
      originalColor: originalColor // Store original color
    });

    // Set initial state
    this.applyNormalState(name);
  }

  // Add label to existing item
  addLabel(itemName: string, labelMesh: AbstractMesh, labelMaterial: StandardMaterial) {
    const item = this.items.get(itemName);
    if (item) {
      item.label = labelMesh;
      item.labelMaterial = labelMaterial;
      // Ensure label is visible
      if (labelMesh) {
        labelMesh.isVisible = true;
        labelMesh.setEnabled(true);
      }
    }
  }

  // Get selected object
  getSelectedObject(): string | null {
    return this.selectedObject;
  }

  // Handle hover state
  onHover(itemName: string | null, isHovering: boolean) {
    console.log(`🖱️ Hover ${isHovering ? 'ON' : 'OFF'} for "${itemName}"`);

    if (isHovering && itemName) {
      this.hoveredObject = itemName;
    } else {
      this.hoveredObject = null;
    }

    this.updateAllVisuals();
  }

  // Handle selection
  onSelect(sectionName: string) {
    console.log(`🎯 Selection request for "${sectionName}"`);

    // Toggle selection
    if (this.selectedObject === sectionName) {
      console.log(`Deselecting ${sectionName}`);
      this.selectedObject = null;
    } else {
      console.log(`Selecting ${sectionName}`);
      this.selectedObject = sectionName;
    }

    // Update BMC state manager
    if (this.bmcStateManager) {
      const bmcComponent = this.convertNameToBMCComponent(sectionName);
      if (bmcComponent) {
        try {
          this.bmcStateManager.selectObject(this.selectedObject ? bmcComponent as any : null);
        } catch (e) {
          console.error('BMC state manager error:', e);
        }
      }
    }

    this.updateAllVisuals();
  }

  // Clear selection
  clearSelection() {
    console.log(`Clearing selection`);
    this.selectedObject = null;

    if (this.bmcStateManager) {
      try {
        this.bmcStateManager.selectObject(null);
      } catch (e) {
        console.error('BMC state manager error:', e);
      }
    }

    this.updateAllVisuals();
  }

  // Update all visual states based on current selection and view mode
  public updateAllVisuals(): void {
    console.log(`🎨 UpdateAllVisuals: selectedObject="${this.selectedObject}", isTopView=${this.isTopView}`);

    try {
      this.items.forEach((item, name) => {
        try {
          // Ensure item, mesh, and material are valid before proceeding
          if (!item || !item.mesh || !item.material) {
            console.warn(`Skipping visual update for invalid item: ${name}`);
            return;
          }

          if (this.isTopView) {
            // 3D Top View behavior
            if (this.selectedObject === name) {
              this.apply3DTopSelectedState(item);
            } else {
              this.apply3DTopNormalState(item);
            }
          } else {
            // 3D View behavior
            if (this.selectedObject === name) {
              this.apply3DSelectedState(item);
            } else if (this.selectedObject) {
              this.apply3DNonSelectedState(item);
            } else {
              this.apply3DNormalState(item);
            }
          }
        } catch (itemError) {
          console.error(`Error updating visuals for ${name}:`, itemError);
          // Continue processing other items even if one fails
        }
      });

      console.log(`🎨 Selection changed to: ${this.selectedObject || 'none'} in ${this.isTopView ? '3D Top' : '3D'} view`);

    } catch (error) {
      console.error('Critical error in updateAllVisuals:', error);

      // Emergency recovery: ensure all meshes remain visible
      this.items.forEach((item, name) => {
        try {
          if (item.mesh && !item.mesh.isDisposed?.()) {
            item.mesh.isVisible = true;
            item.mesh.setEnabled(true);
            if (item.material && !item.material.isDisposed?.()) {
              item.material.alpha = 1.0;
            }
          }
        } catch (recoveryError) {
          console.error(`Failed to recover ${name}:`, recoveryError);
        }
      });
    }
  }

  // Get base color for section
  private getBaseColor(name: string): Color3 {
    if (name === "Cost Structure") {
      return new Color3(0.35, 0.0, 0.0);  // Red
    } else if (name === "Revenue Streams") {
      return new Color3(0.0, 0.20, 0.12);  // Green
    } else {
      return new Color3(0.07, 0.07, 0.07);  // Grey
    }
  }

  // SELECTED STATE - Bright blue or original colors for Cost/Revenue
  private applySelectedState(item: BMCItem): void {
    if (!item.material || !item.mesh) return;

    // Color behavior: Cost Structure and Revenue Streams keep their original colors when selected
    if (item.name === "Cost Structure") {
      item.material.diffuseColor = new Color3(0.35, 0.0, 0.0);  // Keep original red
      item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);  // No glow
    } else if (item.name === "Revenue Streams") {
      item.material.diffuseColor = new Color3(0.0, 0.20, 0.12);  // Keep original green
      item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);  // No glow
    } else {
      item.material.diffuseColor = new Color3(0.0, 0.2, 0.5);  // Slightly brighter blue for others
      item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);  // No glow
    }

    item.material.alpha = 1.0;

    // Height behavior: 3D Top = 0.01 (flattened), 3D View = original with animation
    if (this.isTopView) {
      item.mesh.scaling.y = 0.01;  // Always flattened in 3D Top view
    } else {
      item.mesh.scaling.y = item.originalHeight * 1.4;  // Elevated when selected in 3D view
    }
  }

  // HOVER STATE - Light blue or brightened original color
  private applyHoverState(item: BMCItem): void {
    if (!item.material || !item.mesh) return;

    // Color behavior: Cost Structure and Revenue Streams brighten their original colors
    if (item.name === "Cost Structure") {
      item.material.diffuseColor = new Color3(0.45, 0.05, 0.05);  // Subtle red brightening
      item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);  // No glow
    } else if (item.name === "Revenue Streams") {
      item.material.diffuseColor = new Color3(0.0, 0.25, 0.15);  // Subtle green brightening
      item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);  // No glow
    } else {
      item.material.diffuseColor = new Color3(0.03, 0.18, 0.45);  // Slightly brighter blue
      item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);  // No glow
    }

    item.material.alpha = 1.0;

    // Height behavior: Only change height in 3D Top view (to flatten), NEVER in 3D view
    if (this.isTopView) {
      item.mesh.scaling.y = 0.01;  // Always flattened in 3D Top view
    }
    // 3D view: NO height changes on hover - completely leave height untouched
  }

  // DIMMED STATE - Darker but visible
  private applyDimmedState(item: BMCItem): void {
    if (!item.material || !item.mesh) return;

    // Color behavior: Different for 3D Top vs 3D view
    if (this.isTopView) {
      // 3D Top view: Use lighter dimmed colors so objects remain visible
      const baseColor = item.originalColor || this.getBaseColor(item.name);
      item.material.diffuseColor = baseColor.scale(0.7);  // 70% of base color - still visible
    } else {
      // 3D view: Cost Structure and Revenue Streams use dark grey when flattened
      if (item.name === "Cost Structure" || item.name === "Revenue Streams") {
        item.material.diffuseColor = new Color3(0.07, 0.07, 0.07);  // Dark grey when flattened
      } else {
        const baseColor = item.originalColor || this.getBaseColor(item.name);
        item.material.diffuseColor = baseColor.scale(0.5);  // 50% darker for others
      }
    }

    item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);

    // Height and opacity behavior: 3D Top = 0.01 + 100%, 3D View = 0.01 + 30%
    if (this.isTopView) {
      item.mesh.scaling.y = 0.01;  // Always flattened in 3D Top view
      item.material.alpha = 1.0;   // 100% opacity in 3D Top view
    } else {
      item.mesh.scaling.y = 0.01;  // Flattened when other object selected in 3D view
      item.material.alpha = 0.3;   // 30% opacity in 3D view (original height preserved for restoration)
    }
  }

  // NORMAL STATE - Default appearance
  private applyNormalState(item: BMCItem): void {
    if (!item.material || !item.mesh) return;

    item.material.diffuseColor = item.originalColor || this.getBaseColor(item.name);
    item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);
    item.material.alpha = 1.0;

    // Height behavior: 3D Top = 0.01 (flattened), 3D View = original full height
    if (this.isTopView) {
      item.mesh.scaling.y = 0.01;  // Always flattened in 3D Top view
    } else {
      item.mesh.scaling.y = item.originalHeight;  // Original full height in 3D view
    }
  }

  /**
   * Apply visual state for 3D Top view - selected object
   */
  private apply3DTopSelectedState(item: BMCItem): void {
    console.log(`🎨 Applying 3D Top selected state to: ${item.name}`);

    // Validate material before applying changes
    if (!item.material || !item.mesh) {
      console.warn(`⚠️ Missing material or mesh for ${item.name}, skipping visual update`);
      return;
    }

    // Set bright blue color for selection
    const selectedColor = new Color3(0.0, 0.3, 0.8);
    const selectedEmissive = new Color3(0.0, 0.1, 0.2);

    this.setMeshColor(item.mesh, selectedColor, item.material);
    this.setMeshEmissive(item.mesh, selectedEmissive, item.material);
    this.setMeshHeight(item.mesh, 0.01); // Keep flattened in 3D Top view even when selected
    this.setMeshOpacity(item.mesh, 1.0, item.material);

    console.log(`✅ Applied 3D Top selected state to: ${item.name}`);
  }

  /**
   * Apply visual state for 3D Top view - normal/unselected state
   */
  private apply3DTopNormalState(item: BMCItem): void {
    console.log(`🎨 Applying 3D Top normal state to: ${item.name}`);

    // Validate material before applying changes
    if (!item.material || !item.mesh) {
      console.warn(`⚠️ Missing material or mesh for ${item.name}, skipping visual update`);
      return;
    }

    this.setMeshColor(item.mesh, item.originalColor || this.getBaseColor(item.name), item.material);
    this.setMeshEmissive(item.mesh, new Color3(0, 0, 0), item.material);
    this.setMeshHeight(item.mesh, 0.01); // Keep flattened in 3D Top view
    this.setMeshOpacity(item.mesh, 1.0, item.material);

    console.log(`✅ Applied 3D Top normal state to: ${item.name}`);
  }

  // Placeholder for 3D View selected state (if needed separately)
  private apply3DSelectedState(item: BMCItem): void {
    // This might be identical to applySelectedState or have specific 3D view logic
    this.applySelectedState(item);
  }

  // Placeholder for 3D View non-selected state (when another object is selected)
  private apply3DNonSelectedState(item: BMCItem): void {
    // This might be identical to applyDimmedState or have specific 3D view logic
    this.applyDimmedState(item);
  }

  // Placeholder for 3D View normal state
  private apply3DNormalState(item: BMCItem): void {
    // This might be identical to applyNormalState or have specific 3D view logic
    this.applyNormalState(item);
  }


  /**
   * Safely set mesh color with proper material handling
   */
  private setMeshColor(mesh: AbstractMesh, color: Color3, material: any): void {
    try {
      // Validate material exists and is not disposed
      if (!material || material.isDisposed?.()) {
        console.warn(`Material is missing or disposed for ${(mesh as any).bmcSectionName || 'unknown'}`);
        return;
      }

      // Validate mesh exists and is not disposed
      if (!mesh || mesh.isDisposed?.()) {
        console.warn(`Mesh is missing or disposed for ${(mesh as any).bmcSectionName || 'unknown'}`);
        return;
      }

      // Handle both StandardMaterial and PBRMaterial
      if (material.baseColor) {
        material.baseColor = color;
      }
      if (material.diffuseColor) {
        material.diffuseColor = color;
      }

      // Update original color references for consistency
      if ((material as any).originalBaseColor) {
        (material as any).originalBaseColor = color.clone();
      }
      if ((material as any).originalDiffuseColor) {
        (material as any).originalDiffuseColor = color.clone();
      }

      // Ensure mesh remains visible and enabled
      mesh.isVisible = true;
      mesh.setEnabled(true);
      material.alpha = Math.max(0.1, material.alpha); // Prevent complete transparency

    } catch (error) {
      console.error(`Error setting mesh color for ${(mesh as any).bmcSectionName}:`, error);
    }
  }

  /**
   * Safely set mesh emissive color
   */
  private setMeshEmissive(mesh: AbstractMesh, color: Color3, material: any): void {
    try {
      if (!material || material.isDisposed?.() || !mesh || mesh.isDisposed?.()) {
        console.warn(`Material or mesh is invalid, cannot set emissive color for ${(mesh as any).bmcSectionName || 'unknown'}`);
        return;
      }
      material.emissiveColor = color;
    } catch (error) {
      console.error(`Error setting mesh emissive color for ${(mesh as any).bmcSectionName}:`, error);
    }
  }

  /**
   * Safely set mesh height (scaling.y)
   */
  private setMeshHeight(mesh: AbstractMesh, height: number): void {
    try {
      if (!mesh || mesh.isDisposed?.()) {
        console.warn(`Mesh is missing or disposed, cannot set height for ${(mesh as any).bmcSectionName || 'unknown'}`);
        return;
      }
      mesh.scaling.y = height;
    } catch (error) {
      console.error(`Error setting mesh height for ${(mesh as any).bmcSectionName}:`, error);
    }
  }

  /**
   * Safely set mesh opacity with proper material handling
   */
  private setMeshOpacity(mesh: AbstractMesh, opacity: number, material: any): void {
    try {
      // Validate material and mesh
      if (!material || material.isDisposed?.()) {
        console.warn(`Material is missing or disposed, cannot set opacity for ${(mesh as any).bmcSectionName || 'unknown'}`);
        return;
      }

      if (!mesh || mesh.isDisposed?.()) {
        console.warn(`Mesh is missing or disposed, cannot set opacity for ${(mesh as any).bmcSectionName || 'unknown'}`);
        return;
      }

      // Clamp opacity to safe range (never fully transparent in 3D Top)
      const safeOpacity = this.isTopView ? Math.max(0.1, Math.min(1.0, opacity)) : Math.min(1.0, opacity);

      material.alpha = safeOpacity;
      // mesh.visibility = safeOpacity; // Visibility is usually controlled by isVisible property, not directly tied to alpha for rendering

      // Ensure mesh stays visible and enabled if opacity is greater than 0
      mesh.isVisible = safeOpacity > 0;
      mesh.setEnabled(safeOpacity > 0);

      // console.log(`🔧 Set opacity to ${safeOpacity} for ${(mesh as any).bmcSectionName || 'unknown'}`);

    } catch (error) {
      console.error(`Error setting mesh opacity for ${(mesh as any).bmcSectionName}:`, error);
    }
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

  // Get whether we're in top view - for compatibility
  getIsTopView(): boolean {
    return this.isTopView;
  }

  // Get all items - for compatibility
  getAllItems(): Map<string, BMCItem> {
    return this.items;
  }

  // Debug methods for compatibility
  showCheckpoints(): void {
    console.log('Checkpoints disabled');
  }

  showErrors(): void {
    console.log('Errors disabled');
  }

  // Debug method to ensure all items are visible
  ensureAllVisible() {
    console.log('🔧 Forcing all items visible');
    this.items.forEach((item, name) => {
      item.mesh.isVisible = true;
      item.mesh.setEnabled(true);
      if (item.material) {
        item.material.alpha = 1.0;
      }
      item.mesh.scaling.y = item.originalHeight;
      console.log(`  ${name}: visible=true, alpha=1.0`);
    });
  }
}