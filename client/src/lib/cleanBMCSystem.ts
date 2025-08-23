/**
 * CLEAN BMC SYSTEM - Fresh Start
 * Simple, reliable BMC object and label management
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
  private bmcStateManager: any = null; // Will be injected
  private viewTransitionManager: ViewTransitionManager | null = null;
  private isTopView: boolean = false; // Track if we're in top view
  private selectedObject: string | null = null; // Track selected object internally
  private hoveredObject: string | null = null; // Track hovered object internally

  // Inject dependencies
  setBMCStateManager(bmcStateManager: any) {
    console.log("🔗 CleanBMCSystem.setBMCStateManager called with:", bmcStateManager);
    this.bmcStateManager = bmcStateManager;

    // Subscribe to state changes from BMC State Manager
    if (bmcStateManager && bmcStateManager.addStateListener) {
      console.log("🔗 Adding state listener to BMC State Manager");
      bmcStateManager.addStateListener(() => {
        console.log("🔄 CleanBMCSystem received state change notification, updating visuals");
        this.updateAllVisuals();
      });
    } else {
      console.warn("⚠️ BMC State Manager missing addStateListener method:", bmcStateManager);
    }
  }

  // Set ViewTransitionManager for smooth animations
  setViewTransitionManager(viewTransitionManager: ViewTransitionManager) {
    console.log("🎬 CleanBMCSystem.setViewTransitionManager called");
    this.viewTransitionManager = viewTransitionManager;
  }

  // Set whether we're in top view mode
  setTopViewMode(isTopView: boolean) {
    console.log(`🎬 CleanBMCSystem.setTopViewMode: ${isTopView}`);
    this.isTopView = isTopView;

    // When entering top view, ensure all objects are visible and FLATTENED
    if (isTopView) {
      console.log(`📐 Entering TOP VIEW - flattening all objects and ensuring visibility`);
      this.items.forEach((item, name) => {
        // Ensure mesh visibility and material alpha are correct in top view
        item.mesh.isVisible = true;
        item.mesh.setEnabled(true);
        if (item.material) {
          item.material.alpha = 1.0;
        }

        // FORCE original height - completely flat in top view
        item.mesh.scaling.y = item.originalHeight;
        console.log(`📐 TOP VIEW: Flattened ${name} to original height ${item.originalHeight}`);

        // Force labels to be visible
        this.makeLabelVisible(name);
      });
    }

    // Update visuals for the new view mode
    this.updateAllVisuals();
  }

  // Helper method for smooth height animations - ONLY in 3D perspective view
  private animateHeight(mesh: AbstractMesh, targetHeight: number) {
    // NEVER animate heights in top view
    if (this.isTopView) {
      console.log(`⏭️ Skipping height animation in top view for ${targetHeight}`);
      return;
    }

    if (this.viewTransitionManager && mesh instanceof Mesh) {
      this.viewTransitionManager.animateMeshHeight(mesh, targetHeight, {
        duration: 2500,
        easing: true
      });
    } else {
      // Fallback to instant change - but only if not in top view
      if (!this.isTopView) {
        mesh.scaling.y = targetHeight;
      }
    }
  }

  // Register a BMC item (mesh + material + original height)
  registerItem(name: string, mesh: AbstractMesh, material: StandardMaterial, originalHeight: number) {
    console.log(`📏 Registering ${name} with height=${originalHeight}`);

    this.items.set(name, {
      mesh,
      material,
      originalHeight,
      name
    });

    // Set default appearance
    this.setDefaultAppearance(name);
    console.log(`✓ Registered BMC item: ${name} with height ${originalHeight}`);
  }

  // Add a label to an existing BMC item
  addLabel(itemName: string, labelMesh: AbstractMesh, labelMaterial: StandardMaterial) {
    const item = this.items.get(itemName);
    if (item) {
      item.label = labelMesh;
      item.labelMaterial = labelMaterial;
      this.makeLabelVisible(itemName);
      console.log(`✓ Added label to: ${itemName}`);
    } else {
      console.error(`Cannot add label - item not found: ${itemName}`);
    }
  }

  // Make a label always visible at 100% opacity - NEVER change label opacity
  private makeLabelVisible(itemName: string) {
    const item = this.items.get(itemName);
    if (!item?.label || !item?.labelMaterial) {
      return;
    }

    // FORCE label visibility - NEVER change opacity from 100%
    item.label.isVisible = true;
    item.label.setEnabled(true);
    item.label.visibility = 1.0;
    item.labelMaterial.alpha = 1.0;
    item.labelMaterial.backFaceCulling = false;
    item.labelMaterial.useAlphaFromDiffuseTexture = true;
    item.labelMaterial.disableLighting = false;

    // Use ALPHATEST mode for PNG transparency
    (item.labelMaterial as any).transparencyMode = 1;
    (item.labelMaterial as any).alphaCutOff = 0.4;

    if (item.labelMaterial.diffuseTexture) {
      (item.labelMaterial.diffuseTexture as any).level = 1.0;
      (item.labelMaterial.diffuseTexture as any).hasAlpha = true;
      item.labelMaterial.useAlphaFromDiffuseTexture = true;
      (item.labelMaterial.diffuseTexture as any).wrapU = 1;
      (item.labelMaterial.diffuseTexture as any).wrapV = 1;
    }

    item.label.renderingGroupId = 1;

    if (item.labelMaterial) {
      item.labelMaterial.needDepthPrePass = true;
      item.labelMaterial.forceDepthWrite = true;
      (item.labelMaterial as any).separateCullingPass = true;
      (item.labelMaterial as any).depthFunction = 519;
    }
  }

  // Selection methods that delegate to BMC State Manager
  selectObject(name: string | null) {
    console.log(`🎯 CleanBMCSystem.selectObject called with: ${name}`);

    if (this.bmcStateManager) {
      const componentName = this.convertNameToBMCComponent(name);
      console.log(`🎯 Converting ${name} -> ${componentName}`);
      this.bmcStateManager.selectObject(componentName);
    } else {
      console.warn("⚠️ BMC State Manager not injected into CleanBMCSystem");
    }
  }

  getSelectedObject(): string | null {
    if (this.bmcStateManager) {
      const selected = this.bmcStateManager.getSelectedObject();
      return this.convertBMCComponentToName(selected);
    }
    return null;
  }

  // Helper methods to convert between name formats
  private convertNameToBMCComponent(name: string | null): BMCComponentName | null {
    if (!name) return null;
    const nameMapping: { [key: string]: BMCComponentName } = {
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
    return nameMapping[name] || null;
  }

  private convertBMCComponentToName(componentName: BMCComponentName | null): string | null {
    if (!componentName) return null;
    const nameMapping: { [key in BMCComponentName]: string } = {
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
    return nameMapping[componentName] || null;
  }

  // Set default appearance for an item
  private setDefaultAppearance(itemName: string) {
    const item = this.items.get(itemName);
    if (!item) return;

    // Set specific colors for Cost Structure and Revenue Streams, default grey for others
    if (itemName === "Cost Structure") {
      item.material.diffuseColor = new Color3(0.35, 0.0, 0.0);
      item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);
    } else if (itemName === "Revenue Streams") {
      item.material.diffuseColor = new Color3(0.0, 0.20, 0.12);
      item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);
    } else {
      item.material.diffuseColor = new Color3(0.07, 0.07, 0.07);
      item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);
    }
    item.material.alpha = 1.0;

    // Set height to original height without animation during setup
    item.mesh.scaling.y = item.originalHeight;

    // Always ensure label visibility
    this.makeLabelVisible(itemName);
  }

  // Handle hover
  onHover(itemName: string, isHovered: boolean) {
    if (this.getSelectedObject()) return; // No hover when selected

    const item = this.items.get(itemName);
    if (!item) {
      console.error(`Hover: Item not found: ${itemName}. Available:`, Array.from(this.items.keys()));
      return;
    }

    if (isHovered) {
      this.hoveredObject = itemName;
      // Hover: brighten specific colors
      if (itemName === "Cost Structure") {
        item.material.diffuseColor = new Color3(0.35, 0.0, 0.0);
        item.material.emissiveColor = new Color3(0.2, 0.0, 0.0);
      } else if (itemName === "Revenue Streams") {
        item.material.diffuseColor = new Color3(0.0, 0.20, 0.12);
        item.material.emissiveColor = new Color3(0.0, 0.1, 0.05);
      } else {
        item.material.diffuseColor = new Color3(0.0, 0.3, 0.8);
        item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);
      }
      item.material.alpha = 1.0;
      
      // In top view, keep flat - no height changes at all
      if (this.isTopView) {
        item.mesh.scaling.y = item.originalHeight;
        console.log(`📐 HOVER in TOP VIEW: Keeping ${itemName} flat at height ${item.originalHeight}`);
      } else {
        // Only animate height in 3D perspective view
        this.animateHeight(item.mesh, item.originalHeight);
      }
    } else {
      this.hoveredObject = null;
      // Back to original colors
      if (itemName === "Cost Structure") {
        item.material.diffuseColor = new Color3(0.35, 0.0, 0.0);
        item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);
      } else if (itemName === "Revenue Streams") {
        item.material.diffuseColor = new Color3(0.0, 0.20, 0.12);
        item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);
      } else {
        item.material.diffuseColor = new Color3(0.07, 0.07, 0.07);
        item.material.emissiveColor = new Color3(0.0, 0.0, 0.0);
      }
      item.material.alpha = 1.0;
      
      // In top view, keep flat - no height changes at all
      if (this.isTopView) {
        item.mesh.scaling.y = item.originalHeight;
        console.log(`📐 HOVER EXIT in TOP VIEW: Keeping ${itemName} flat at height ${item.originalHeight}`);
      } else {
        // Only animate height in 3D perspective view
        this.animateHeight(item.mesh, item.originalHeight);
      }
    }

    // Always ensure label stays visible
    this.makeLabelVisible(itemName);
  }

  // Handle selection
  onSelect(sectionName: string) {
    console.log(`🎯 CleanBMC: Selection request for "${sectionName}"`);

    // Update BMC state manager
    if (this.bmcStateManager) {
      const bmcComponent = this.convertNameToBMCComponent(sectionName);
      if (bmcComponent) {
        this.bmcStateManager.selectObject(bmcComponent);
      }
    }

    this.selectedObject = sectionName;
    this.updateAllVisuals();
  }

  // Update all visual states
  private updateAllVisuals() {
    console.log(`🎨 CleanBMC: Updating all visuals - selected: "${this.selectedObject}", hovered: "${this.hoveredObject}", topView: ${this.isTopView}`);

    this.items.forEach((item, name) => {
      const isSelected = (name === this.selectedObject);
      const isHovered = (name === this.hoveredObject);

      // Ensure mesh is always visible and enabled
      item.mesh.isVisible = true;
      item.mesh.setEnabled(true);

      // Determine the appropriate state
      let visualState: 'normal' | 'hover' | 'selected' | 'dimmed';

      if (isSelected) {
        visualState = 'selected';
      } else if (isHovered && !this.selectedObject) {
        visualState = 'hover';
      } else if (this.selectedObject && this.selectedObject !== name) {
        // In top view, don't apply dimmed state to prevent objects from disappearing
        visualState = this.isTopView ? 'normal' : 'dimmed';
      } else {
        visualState = 'normal';
      }

      this.applyVisualState(item, name, visualState);
    });
  }

  // Clear selection
  clearSelection() {
    this.selectObject(null);
  }

  // Apply the correct visual state to an item
  private applyVisualState(item: BMCItem, name: string, state: 'normal' | 'hover' | 'selected' | 'dimmed') {
    console.log(`🎨 Applying ${state} state to ${name} (topView: ${this.isTopView})`);

    // Always ensure mesh remains visible and opaque
    item.mesh.isVisible = true;
    item.mesh.setEnabled(true);

    // In top view, FORCE original height and skip all height animations
    if (this.isTopView) {
      item.mesh.scaling.y = item.originalHeight;
      console.log(`📐 TOP VIEW: Forcing ${name} to original height ${item.originalHeight}, no animations`);
    }

    switch (state) {
      case 'selected':
        this.applySelectionEffect(item.material, name);
        // Only animate height in 3D perspective view
        if (!this.isTopView) {
          this.animateHeight(item.mesh, item.originalHeight * 1.4);
        }
        break;

      case 'hover':
        this.applyHoverEffect(item.material, true);
        // Height already handled in onHover method
        break;

      case 'dimmed':
        // In top view, treat dimmed as normal to prevent disappearing objects
        if (this.isTopView) {
          this.restoreOriginalMaterial(item.material, name);
        } else {
          this.applyDimmedEffect(item.material, name);
          this.animateHeight(item.mesh, item.originalHeight * 0.3);
        }
        break;

      case 'normal':
      default:
        this.restoreOriginalMaterial(item.material, name);
        // Only animate height in 3D perspective view
        if (!this.isTopView) {
          this.animateHeight(item.mesh, item.originalHeight);
        }
        break;
    }

    // Always ensure labels are visible
    this.ensureLabelVisibility(name);
  }

  // Helper to apply selection effect
  private applySelectionEffect(material: StandardMaterial, name: string) {
    if (name === "Cost Structure") {
      material.diffuseColor = new Color3(0.35, 0.0, 0.0);
      material.emissiveColor = new Color3(0.3, 0.0, 0.0);
    } else if (name === "Revenue Streams") {
      material.diffuseColor = new Color3(0.0, 0.20, 0.12);
      material.emissiveColor = new Color3(0.0, 0.15, 0.08);
    } else {
      material.diffuseColor = new Color3(0.0, 0.3, 0.8);
      material.emissiveColor = new Color3(0.0, 0.0, 0.0);
    }
    material.alpha = 1.0;
  }

  // Helper to apply hover effect
  private applyHoverEffect(material: StandardMaterial, isHovering: boolean) {
    if (isHovering) {
      material.emissiveColor = new Color3(0.1, 0.1, 0.1);
      material.alpha = 1.0;
    }
  }

  // Helper to apply dimmed effect
  private applyDimmedEffect(material: StandardMaterial, name: string) {
    material.alpha = 0.5;
    if (name === "Cost Structure") {
      material.diffuseColor = new Color3(0.2, 0.0, 0.0);
    } else if (name === "Revenue Streams") {
      material.diffuseColor = new Color3(0.0, 0.15, 0.10);
    } else {
      material.diffuseColor = new Color3(0.05, 0.05, 0.05);
    }
    material.emissiveColor = new Color3(0.0, 0.0, 0.0);
  }

  // Helper to restore original material properties
  private restoreOriginalMaterial(material: StandardMaterial, name: string) {
    if (name === "Cost Structure") {
      material.diffuseColor = new Color3(0.35, 0.0, 0.0);
      material.emissiveColor = new Color3(0.0, 0.0, 0.0);
    } else if (name === "Revenue Streams") {
      material.diffuseColor = new Color3(0.0, 0.20, 0.12);
      material.emissiveColor = new Color3(0.0, 0.0, 0.0);
    } else {
      material.diffuseColor = new Color3(0.07, 0.07, 0.07);
      material.emissiveColor = new Color3(0.0, 0.0, 0.0);
    }
    material.alpha = 1.0;
  }

  // Ensure label visibility is maintained
  private ensureLabelVisibility(name: string) {
    const item = this.items.get(name);
    if (item && item.label) {
      item.label.isVisible = true;
      item.label.setEnabled(true);
      item.label.visibility = 1.0;
      if (item.labelMaterial) {
        item.labelMaterial.alpha = 1.0;
      }
    }
  }

  // Get all registered items
  getAllItems(): string[] {
    return Array.from(this.items.keys());
  }

  // Check if a mesh is registered in the system
  isRegisteredMesh(mesh: AbstractMesh): boolean {
    const items = Array.from(this.items.values());
    for (const item of items) {
      if (item.mesh === mesh) {
        return true;
      }
    }
    return false;
  }

  // Get mesh for a BMC item
  getMesh(itemName: string): AbstractMesh | null {
    const item = this.items.get(itemName);
    return item?.mesh || null;
  }
}

// Global instance
export const cleanBMCSystem = new CleanBMCSystem();