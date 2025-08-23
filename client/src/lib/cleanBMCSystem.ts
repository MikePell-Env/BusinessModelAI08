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
  // REMOVED: private selectedItem - BMC State Manager is the single source of truth
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

    // When entering top view, ensure all objects are at proper height and visibility
    if (isTopView) {
      console.log(`📐 Entering TOP VIEW - ensuring all heights are correct`);
      this.items.forEach((item, name) => {
        // Skip Revenue Streams and Cost Structure - they're separate GLB models
        // that shouldn't have their scaling modified
        if (name === "Revenue Streams" || name === "Cost Structure") {
          console.log(`⏭️ Skipping height check for separate GLB: ${name}`);
          return;
        }

        // For main BMC items, ensure they're not flattened
        if (item.mesh.scaling.y < 0.5) {
          const oldHeight = item.mesh.scaling.y;
          item.mesh.scaling.y = item.originalHeight;
          console.log(`✅ Fixed ${name} height from ${oldHeight} to ${item.originalHeight}`);
        }

        // Ensure mesh visibility and material alpha are correct in top view
        item.mesh.isVisible = true;
        item.mesh.setEnabled(true);
        if (item.material) {
          item.material.alpha = 1.0;
        }
      });
    }

    // Update visuals for the new view mode
    this.updateAllVisuals();
  }

  // Helper method for smooth height animations
  private animateHeight(mesh: AbstractMesh, targetHeight: number) {
    // NEVER animate heights in top view
    if (this.isTopView) {
      return;
    }

    if (this.viewTransitionManager && mesh instanceof Mesh) {
      this.viewTransitionManager.animateMeshHeight(mesh, targetHeight, {
        duration: 2500,  // Much slower animation for very pronounced effect
        easing: true
      });
    } else {
      // Fallback to instant change
      mesh.scaling.y = targetHeight;
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
      console.warn(`⚠️ Cannot make label visible - missing label or material for: ${itemName}`);
      return;
    }

    console.log(`🔧 Making label visible for: ${itemName}, current alpha: ${item.labelMaterial.alpha}`);

    // FORCE label visibility - NEVER change opacity from 100%
    item.label.isVisible = true;
    item.label.setEnabled(true);

    // CRITICAL: Override parent visibility inheritance using Babylon.js proper method
    item.label.visibility = 1.0; // Force full visibility regardless of parent

    // CRITICAL: Always keep label material at 100% opacity
    item.labelMaterial.alpha = 1.0;
    item.labelMaterial.backFaceCulling = false;
    item.labelMaterial.useAlphaFromDiffuseTexture = true;
    item.labelMaterial.disableLighting = false;

    // CRITICAL: Use ALPHATEST mode to enable PNG transparency while staying opaque
    (item.labelMaterial as any).transparencyMode = 1; // Material.MATERIAL_ALPHATEST = 1

    // Fix banding artifacts in top view by adjusting alpha test threshold
    (item.labelMaterial as any).alphaCutOff = 0.4; // Threshold for alpha testing

    // REMOVE emissive override that may interfere with PNG texture rendering
    // Keep original emissive settings to avoid texture corruption

    // Keep original diffuse color - don't override to white (breaks PNG transparency)
    // item.labelMaterial.diffuseColor should remain as originally set

    // Ensure PNG texture renders correctly without interference
    if (item.labelMaterial.diffuseTexture) {
      (item.labelMaterial.diffuseTexture as any).level = 1.0;
      (item.labelMaterial.diffuseTexture as any).hasAlpha = true;
      // Critical: Enable alpha from diffuse texture for PNG transparency
      item.labelMaterial.useAlphaFromDiffuseTexture = true;

      // Ensure texture filtering doesn't corrupt pixels
      (item.labelMaterial.diffuseTexture as any).wrapU = 1; // CLAMP
      (item.labelMaterial.diffuseTexture as any).wrapV = 1; // CLAMP
    }

    // Fix depth fighting and banding in top view
    item.label.renderingGroupId = 1; // Render labels after 3D objects to prevent z-fighting

    // Adjust depth settings to prevent banding artifacts
    if (item.labelMaterial) {
      item.labelMaterial.needDepthPrePass = true; // Enable depth pre-pass to fix banding
      item.labelMaterial.forceDepthWrite = true; // Force depth writing
      (item.labelMaterial as any).separateCullingPass = true; // Separate culling for labels
      (item.labelMaterial as any).depthFunction = 519; // Engine.ALWAYS for labels to prevent banding
    }

    console.log(`✅ Label ${itemName} visibility enforced: visibility=${item.label.visibility}, alpha=${item.labelMaterial.alpha}, renderingGroup=${item.label.renderingGroupId}`);
  }

  // Selection methods that delegate to BMC State Manager
  selectObject(name: string | null) {
    console.log(`🎯 CleanBMCSystem.selectObject called with: ${name}`);
    console.log(`🎯 BMC State Manager available: ${!!this.bmcStateManager}`);

    if (this.bmcStateManager) {
      // Convert name to BMCComponentName format if needed
      const componentName = this.convertNameToBMCComponent(name);
      console.log(`🎯 Converting ${name} -> ${componentName}`);
      this.bmcStateManager.selectObject(componentName);
      console.log(`🎯 CleanBMCSystem: Delegated selection to BMC State Manager: ${name} -> ${componentName}`);
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
      item.material.diffuseColor = new Color3(0.35, 0.0, 0.0); // Deeper red
      item.material.emissiveColor = new Color3(0.0, 0.0, 0.0); // Remove emissive
    } else if (itemName === "Revenue Streams") {
      item.material.diffuseColor = new Color3(0.0, 0.20, 0.12); // Darker British racing green
      item.material.emissiveColor = new Color3(0.0, 0.0, 0.0); // Remove emissive
    } else {
      item.material.diffuseColor = new Color3(0.07, 0.07, 0.07); // Default grey
      item.material.emissiveColor = new Color3(0.0, 0.0, 0.0); // No emissive
    }
    item.material.alpha = 1.0;
    // Animate height (will be skipped in top view)
    this.animateHeight(item.mesh, item.originalHeight);

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
      // Hover: brighten specific colors using emissive color for brightness without reflectivity
      if (itemName === "Cost Structure") {
        item.material.diffuseColor = new Color3(0.35, 0.0, 0.0); // Keep deeper red base
        item.material.emissiveColor = new Color3(0.2, 0.0, 0.0); // Add red glow for brightness
      } else if (itemName === "Revenue Streams") {
        item.material.diffuseColor = new Color3(0.0, 0.20, 0.12); // Keep darker British racing green base
        item.material.emissiveColor = new Color3(0.0, 0.1, 0.05); // Add green glow for brightness
      } else {
        // Default bright blue for other objects
        item.material.diffuseColor = new Color3(0.0, 0.3, 0.8);
        item.material.emissiveColor = new Color3(0.0, 0.0, 0.0); // No emissive for default
      }
      item.material.alpha = 1.0;
      // Animate height (will be skipped in top view)
      this.animateHeight(item.mesh, item.originalHeight);
    } else {
      this.hoveredObject = null;
      // Back to original colors
      if (itemName === "Cost Structure") {
        // Restore deeper red
        item.material.diffuseColor = new Color3(0.35, 0.0, 0.0);
        item.material.emissiveColor = new Color3(0.0, 0.0, 0.0); // Remove emissive
      } else if (itemName === "Revenue Streams") {
        // Restore darker British racing green
        item.material.diffuseColor = new Color3(0.0, 0.20, 0.12);
        item.material.emissiveColor = new Color3(0.0, 0.0, 0.0); // Remove emissive
      } else {
        // Default medium dark grey for other objects
        item.material.diffuseColor = new Color3(0.07, 0.07, 0.07);
        item.material.emissiveColor = new Color3(0.0, 0.0, 0.0); // No emissive
      }
      item.material.alpha = 1.0;
      // Animate height (will be skipped in top view)
      this.animateHeight(item.mesh, item.originalHeight);
    }

    // Always ensure label stays visible
    this.makeLabelVisible(itemName);
  }

  // Handle selection - delegate to BMC State Manager
  onSelect(sectionName: string) {
    console.log(`🎯 CleanBMC: Selection request for "${sectionName}"`);

    // In top view mode, don't apply selection effects that could hide objects
    if (this.isTopView) {
      console.log(`📐 Top view mode - limiting selection effects to prevent disappearing objects`);
      this.selectedObject = sectionName;

      // Only apply basic highlighting in top view
      this.items.forEach((item, name) => {
        if (name === sectionName) {
          // Selected object gets slight color boost
          this.applyHoverEffect(item.material, true);
          console.log(`✨ Applied minimal selection highlight to ${name} in top view`);
        } else {
          // Other objects keep normal appearance
          this.restoreOriginalMaterial(item.material, name);
        }

        // Ensure all objects remain visible and at full opacity
        item.mesh.isVisible = true;
        item.mesh.setEnabled(true);
        if (item.material) {
          item.material.alpha = 1.0;
        }
      });

      return;
    }

    // Update BMC state manager
    if (this.bmcStateManager) {
      const bmcComponent = this.convertNameToBMCComponent(sectionName);
      if (bmcComponent) {
        this.bmcStateManager.selectObject(bmcComponent);
        console.log(`🔗 BMC State Manager: Selected "${bmcComponent}"`);
      } else {
        console.warn(`⚠️ Could not map section "${sectionName}" to BMC component`);
      }
    }

    this.selectedObject = sectionName;
    this.updateAllVisuals();
  }

  // Update all visual states based on current selection from BMC State Manager
  private updateAllVisuals() {
    console.log(`🎨 CleanBMC: Updating all visuals - selected: "${this.selectedObject}", hovered: "${this.hoveredObject}"`);

    this.items.forEach((item, name) => {
      const isSelected = (name === this.selectedObject);
      const isHovered = (name === this.hoveredObject);

      // Determine the appropriate state
      let visualState: 'normal' | 'hover' | 'selected' | 'dimmed';

      if (isSelected) {
        visualState = 'selected';
      } else if (isHovered) {
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

  // Clear selection - restore all objects to original state
  clearSelection() {
    this.selectObject(null);
  }

  // Restore all objects to original material, height, and opacity
  private restoreAllToDefault() {
    this.items.forEach((item, name) => {
      // FIRST: Force label visibility before changing anything
      this.makeLabelVisible(name);

      // Set specific colors for Cost Structure and Revenue Streams, default grey for others
      if (name === "Cost Structure") {
        item.material.diffuseColor = new Color3(0.35, 0.0, 0.0); // Deeper red
        item.material.emissiveColor = new Color3(0.0, 0.0, 0.0); // Remove emissive
      } else if (name === "Revenue Streams") {
        item.material.diffuseColor = new Color3(0.0, 0.20, 0.12); // Darker British racing green
        item.material.emissiveColor = new Color3(0.0, 0.0, 0.0); // Remove emissive
      } else {
        item.material.diffuseColor = new Color3(0.07, 0.07, 0.07); // Default grey
        item.material.emissiveColor = new Color3(0.0, 0.0, 0.0); // No emissive
      }
      item.material.alpha = 1.0;
      // Animate height (will be skipped in top view)
      this.animateHeight(item.mesh, item.originalHeight);

      // LAST: Force label visibility again after material changes
      this.makeLabelVisible(name);
    });
  }

  // Apply the correct visual state to an item
  private applyVisualState(item: BMCItem, name: string, state: 'normal' | 'hover' | 'selected' | 'dimmed') {
    console.log(`🎨 Applying ${state} state to ${name} (topView: ${this.isTopView})`);

    // In top view, skip most visual effects that could cause disappearing
    if (this.isTopView) {
      switch (state) {
        case 'selected':
        case 'hover':
          this.applyHoverEffect(item.material, true);
          break;
        case 'dimmed':
        case 'normal':
        default:
          this.restoreOriginalMaterial(item.material, name);
          break;
      }

      // Ensure mesh remains visible and opaque in top view
      item.mesh.isVisible = true;
      item.mesh.setEnabled(true);
      if (item.material) {
        item.material.alpha = 1.0;
      }

      this.ensureLabelVisibility(name);
      return;
    }

    // Normal 3D view - apply full visual effects
    switch (state) {
      case 'selected':
        this.applySelectionEffect(item.material, name);
        this.animateHeight(item.mesh, item.originalHeight * 1.4);
        break;

      case 'hover':
        this.applyHoverEffect(item.material, true);
        break;

      case 'dimmed':
        this.applyDimmedEffect(item.material, name);
        this.animateHeight(item.mesh, item.originalHeight * 0.3);
        break;

      case 'normal':
      default:
        this.restoreOriginalMaterial(item.material, name);
        this.animateHeight(item.mesh, item.originalHeight);
        break;
    }

    // Always ensure labels are visible
    this.ensureLabelVisibility(name);
  }

  // Helper to apply selection effect (brighter emissive)
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

  // Helper to apply hover effect (brighter diffuse/emissive)
  private applyHoverEffect(material: StandardMaterial, isHovering: boolean) {
    if (isHovering) {
      // Use emissive for hover brightness without changing the base diffuse color too much
      // For simplicity, we'll apply a slight emissive boost here.
      // In a real scenario, you might want to check the item name to apply specific hover effects.
      material.emissiveColor = new Color3(0.1, 0.1, 0.1); // Subtle glow
      material.alpha = 1.0;
    } else {
      // If not hovering, restore to a neutral state (handled by restoreOriginalMaterial)
    }
  }

  // Helper to apply dimmed effect (lower alpha and subtle color change)
  private applyDimmedEffect(material: StandardMaterial, name: string) {
    material.alpha = 0.5;
    // Optionally slightly desaturate or change color for dimmed effect
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
      // Forcing visibility and opacity again for safety
      item.label.visibility = 1.0;
      if (item.labelMaterial) {
        item.labelMaterial.alpha = 1.0;
      }
    }
  }

  // Force all labels visible with debug logging
  forceAllLabelsVisible() {
    console.log(`🚨 FORCE ALL LABELS VISIBLE - Processing ${this.items.size} items`);
    this.items.forEach((item, name) => {
      console.log(`🚨 Forcing visibility for: ${name}`);
      this.makeLabelVisible(name);
    });
    console.log(`🚨 FORCE COMPLETE`);
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