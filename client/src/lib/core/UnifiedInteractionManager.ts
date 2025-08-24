
import { Scene, AbstractMesh, ActionManager, ExecuteCodeAction } from '@babylonjs/core';
import { MaterialManager } from './MaterialManager';

export class UnifiedInteractionManager {
  private scene: Scene;
  private materialManager: MaterialManager;
  private isOrthographicView: boolean;
  private selectedMesh: AbstractMesh | null = null;
  private hoveredMesh: AbstractMesh | null = null;
  private meshSectionMap: Map<string, string> = new Map();

  constructor(scene: Scene, materialManager: MaterialManager, isOrthographic: boolean = false) {
    this.scene = scene;
    this.materialManager = materialManager;
    this.isOrthographicView = isOrthographic;
    
    console.log('🎮 UnifiedInteractionManager initialized');
  }

  /**
   * Setup interactions for a BMC mesh
   */
  setupMeshInteractions(mesh: AbstractMesh, sectionName: string): void {
    // Store section mapping
    this.meshSectionMap.set(mesh.id, sectionName);
    
    // Create action manager if not exists
    if (!mesh.actionManager) {
      mesh.actionManager = new ActionManager(this.scene);
    }

    // Enable picking
    mesh.isPickable = true;

    // Click handler
    mesh.actionManager.registerAction(new ExecuteCodeAction(
      ActionManager.OnPickTrigger,
      () => this.handleMeshClick(mesh, sectionName)
    ));

    // Hover handlers
    mesh.actionManager.registerAction(new ExecuteCodeAction(
      ActionManager.OnPointerOverTrigger,
      () => this.handleMeshHover(mesh, sectionName)
    ));

    mesh.actionManager.registerAction(new ExecuteCodeAction(
      ActionManager.OnPointerOutTrigger,
      () => this.handleMeshUnhover(mesh, sectionName)
    ));

    console.log(`🎮 Setup interactions for ${sectionName}`);
  }

  /**
   * Handle mesh click
   */
  private handleMeshClick(mesh: AbstractMesh, sectionName: string): void {
    console.log(`🖱️ Clicked on ${sectionName}`);

    // If clicking same mesh, deselect
    if (this.selectedMesh === mesh) {
      this.deselectMesh();
      return;
    }

    // Deselect previous
    if (this.selectedMesh) {
      this.deselectMesh();
    }

    // Select new mesh
    this.selectedMesh = mesh;
    this.materialManager.applyMaterialState(mesh, sectionName, 'selected');

    // Dim other meshes if in orthographic view
    if (this.isOrthographicView) {
      this.applySelectionDimming(mesh);
    }

    console.log(`✅ Selected ${sectionName}`);
  }

  /**
   * Handle mesh hover
   */
  private handleMeshHover(mesh: AbstractMesh, sectionName: string): void {
    if (this.selectedMesh === mesh || this.hoveredMesh === mesh) return;

    this.hoveredMesh = mesh;
    
    // Only show hover if not selected
    if (this.selectedMesh !== mesh) {
      this.materialManager.applyMaterialState(mesh, sectionName, 'hover');
    }

    console.log(`👆 Hovering ${sectionName}`);
  }

  /**
   * Handle mesh unhover
   */
  private handleMeshUnhover(mesh: AbstractMesh, sectionName: string): void {
    if (this.hoveredMesh !== mesh) return;

    this.hoveredMesh = null;

    // Restore state if not selected
    if (this.selectedMesh !== mesh) {
      const state = this.selectedMesh && this.isOrthographicView ? 'dimmed' : 'normal';
      this.materialManager.applyMaterialState(mesh, sectionName, state);
    }

    console.log(`👋 Unhovered ${sectionName}`);
  }

  /**
   * Deselect current mesh
   */
  private deselectMesh(): void {
    if (!this.selectedMesh) return;

    const sectionName = this.meshSectionMap.get(this.selectedMesh.id);
    if (sectionName) {
      this.materialManager.applyMaterialState(this.selectedMesh, sectionName, 'normal');
    }

    // Restore all other meshes to normal
    this.restoreAllMeshes();

    this.selectedMesh = null;
    console.log('🔄 Deselected mesh');
  }

  /**
   * Apply selection dimming to non-selected meshes
   */
  private applySelectionDimming(selectedMesh: AbstractMesh): void {
    this.scene.meshes.forEach(mesh => {
      if (mesh === selectedMesh || mesh.name === "__root__" || mesh.name === "ground") return;

      const sectionName = this.meshSectionMap.get(mesh.id);
      if (sectionName) {
        this.materialManager.applyMaterialState(mesh, sectionName, 'dimmed');
      }
    });
  }

  /**
   * Restore all meshes to normal state
   */
  private restoreAllMeshes(): void {
    this.scene.meshes.forEach(mesh => {
      if (mesh.name === "__root__" || mesh.name === "ground") return;

      const sectionName = this.meshSectionMap.get(mesh.id);
      if (sectionName) {
        this.materialManager.applyMaterialState(mesh, sectionName, 'normal');
      }
    });
  }

  /**
   * Update view mode (orthographic vs perspective)
   */
  updateViewMode(isOrthographic: boolean): void {
    this.isOrthographicView = isOrthographic;
    console.log(`🔄 Updated view mode: ${isOrthographic ? '3D Top' : '3D View'}`);

    // If we have a selection and switching to perspective, restore all meshes
    if (!isOrthographic && this.selectedMesh) {
      this.restoreAllMeshes();
      
      // Keep selection but remove dimming
      const sectionName = this.meshSectionMap.get(this.selectedMesh.id);
      if (sectionName) {
        this.materialManager.applyMaterialState(this.selectedMesh, sectionName, 'selected');
      }
    }
    
    // If switching to orthographic and we have selection, reapply dimming
    if (isOrthographic && this.selectedMesh) {
      this.applySelectionDimming(this.selectedMesh);
    }
  }

  /**
   * Get current selection info
   */
  getSelectionInfo(): { meshId: string; sectionName: string } | null {
    if (!this.selectedMesh) return null;

    return {
      meshId: this.selectedMesh.id,
      sectionName: this.meshSectionMap.get(this.selectedMesh.id) || 'Unknown'
    };
  }

  /**
   * Dispose interaction manager
   */
  dispose(): void {
    this.selectedMesh = null;
    this.hoveredMesh = null;
    this.meshSectionMap.clear();
    console.log('🎮 UnifiedInteractionManager disposed');
  }
}
