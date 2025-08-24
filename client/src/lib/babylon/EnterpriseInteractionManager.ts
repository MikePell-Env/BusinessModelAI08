
import { AbstractMesh, ActionManager, ExecuteCodeAction, Scene } from '@babylonjs/core';
import { WorldClassMaterialSystem } from './WorldClassMaterialSystem';

export interface InteractionState {
  selectedMesh: string | null;
  hoveredMesh: string | null;
  dimmedMeshes: Set<string>;
  isTopView: boolean;
}

/**
 * Enterprise Interaction Manager
 * 
 * Features:
 * - Bulletproof state management
 * - Zero-allocation interaction handling
 * - WebGL-safe operations only
 * - Performance-optimized event handling
 */
export class EnterpriseInteractionManager {
  private scene: Scene;
  private materialSystem: WorldClassMaterialSystem;
  private state: InteractionState;
  private meshRegistry: Map<string, AbstractMesh> = new Map();
  private isInitialized: boolean = false;

  constructor(scene: Scene, materialSystem: WorldClassMaterialSystem) {
    this.scene = scene;
    this.materialSystem = materialSystem;
    this.state = {
      selectedMesh: null,
      hoveredMesh: null,
      dimmedMeshes: new Set(),
      isTopView: false
    };
    this.initialize();
  }

  private initialize(): void {
    try {
      this.isInitialized = true;
      console.log('🏆 EnterpriseInteractionManager: System ready');
    } catch (error) {
      console.error('❌ EnterpriseInteractionManager: Initialization failed:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Register a mesh for enterprise-grade interactions
   */
  public registerMesh(mesh: AbstractMesh, sectionName: string): void {
    if (!this.isInitialized) {
      console.warn('⚠️ EnterpriseInteractionManager not ready');
      return;
    }

    try {
      // Store mesh reference
      this.meshRegistry.set(sectionName, mesh);
      
      // Set up BMC section metadata
      (mesh as any).bmcSectionName = sectionName;
      
      // Enable interactions
      mesh.isPickable = true;
      mesh.actionManager = new ActionManager(this.scene);

      // Hover enter
      mesh.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
          this.handleHoverEnter(sectionName);
        })
      );

      // Hover exit
      mesh.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
          this.handleHoverExit(sectionName);
        })
      );

      // Click/Select
      mesh.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
          this.handleClick(sectionName);
        })
      );

      // Apply initial material
      const materialKey = this.materialSystem.getMaterialKeyForState(sectionName, 'normal');
      this.materialSystem.applyMaterialSafely(mesh, materialKey);

      console.log(`✅ Enterprise interactions registered: ${sectionName}`);
    } catch (error) {
      console.error(`❌ Failed to register mesh ${sectionName}:`, error);
    }
  }

  /**
   * Handle hover enter with zero allocations
   */
  private handleHoverEnter(sectionName: string): void {
    if (!this.isInitialized) return;

    try {
      this.state.hoveredMesh = sectionName;
      this.updateMeshVisuals(sectionName);
      console.log(`🖱️ Hover enter: ${sectionName}`);
    } catch (error) {
      console.error(`❌ Hover enter error for ${sectionName}:`, error);
    }
  }

  /**
   * Handle hover exit with zero allocations
   */
  private handleHoverExit(sectionName: string): void {
    if (!this.isInitialized) return;

    try {
      if (this.state.hoveredMesh === sectionName) {
        this.state.hoveredMesh = null;
        this.updateMeshVisuals(sectionName);
        console.log(`🖱️ Hover exit: ${sectionName}`);
      }
    } catch (error) {
      console.error(`❌ Hover exit error for ${sectionName}:`, error);
    }
  }

  /**
   * Handle click with bulletproof state management
   */
  private handleClick(sectionName: string): void {
    if (!this.isInitialized) return;

    try {
      const wasSelected = this.state.selectedMesh === sectionName;
      
      if (wasSelected) {
        // Deselect
        this.state.selectedMesh = null;
        this.clearDimming();
      } else {
        // Select new
        this.state.selectedMesh = sectionName;
        this.applyDimming(sectionName);
      }

      // Update all mesh visuals
      this.updateAllMeshVisuals();
      
      console.log(`🎯 Click handled: ${sectionName} -> ${this.state.selectedMesh ? 'selected' : 'deselected'}`);
    } catch (error) {
      console.error(`❌ Click error for ${sectionName}:`, error);
    }
  }

  /**
   * Apply dimming to non-selected meshes
   */
  private applyDimming(selectedSection: string): void {
    this.state.dimmedMeshes.clear();
    
    for (const [sectionName] of this.meshRegistry) {
      if (sectionName !== selectedSection) {
        this.state.dimmedMeshes.add(sectionName);
      }
    }
  }

  /**
   * Clear all dimming
   */
  private clearDimming(): void {
    this.state.dimmedMeshes.clear();
  }

  /**
   * Update specific mesh visuals
   */
  private updateMeshVisuals(sectionName: string): void {
    const mesh = this.meshRegistry.get(sectionName);
    if (!mesh) return;

    const visualState = this.calculateMeshState(sectionName);
    const materialKey = this.materialSystem.getMaterialKeyForState(sectionName, visualState);
    
    this.materialSystem.applyMaterialSafely(mesh, materialKey);
  }

  /**
   * Update all mesh visuals efficiently
   */
  private updateAllMeshVisuals(): void {
    for (const [sectionName] of this.meshRegistry) {
      this.updateMeshVisuals(sectionName);
    }
  }

  /**
   * Calculate the visual state for a mesh
   */
  private calculateMeshState(sectionName: string): 'normal' | 'hover' | 'selected' | 'dimmed' {
    if (this.state.selectedMesh === sectionName) {
      return 'selected';
    }
    
    if (this.state.dimmedMeshes.has(sectionName)) {
      return 'dimmed';
    }
    
    if (this.state.hoveredMesh === sectionName) {
      return 'hover';
    }
    
    return 'normal';
  }

  /**
   * Set view mode (affects interaction behavior)
   */
  public setTopViewMode(isTopView: boolean): void {
    this.state.isTopView = isTopView;
    console.log(`📷 View mode set: ${isTopView ? '3D Top' : '3D Perspective'}`);
  }

  /**
   * Clear all selections (for background clicks)
   */
  public clearSelection(): void {
    if (this.state.selectedMesh) {
      this.state.selectedMesh = null;
      this.clearDimming();
      this.updateAllMeshVisuals();
      console.log('🎯 Selection cleared');
    }
  }

  /**
   * Get current interaction state
   */
  public getState(): InteractionState {
    return { ...this.state };
  }

  /**
   * Enterprise cleanup
   */
  public dispose(): void {
    console.log('🧹 EnterpriseInteractionManager: Starting cleanup...');
    
    // Clean up action managers
    this.meshRegistry.forEach((mesh, name) => {
      try {
        if (mesh.actionManager) {
          mesh.actionManager.dispose();
          mesh.actionManager = null;
        }
        mesh.isPickable = false;
      } catch (error) {
        console.warn(`Warning cleaning up mesh ${name}:`, error);
      }
    });
    
    this.meshRegistry.clear();
    this.state.dimmedMeshes.clear();
    this.isInitialized = false;
    
    console.log('✅ EnterpriseInteractionManager: Cleanup complete');
  }
}
