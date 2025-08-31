/**
 * Template Manager
 * 
 * Manages template visibility and interaction isolation.
 * Ensures only one template is active at a time and handles proper show/hide logic.
 */

import { Scene, Mesh, AbstractMesh, ActionManager } from '@babylonjs/core';
import { debugLog } from '@/lib/debug/DebugLogger';

export interface ManagedTemplate {
  name: string;
  meshes: Set<AbstractMesh>;
  actionManagers: Map<AbstractMesh, ActionManager | null>;
  isLoaded: boolean;
  isVisible: boolean;
}

export class TemplateManager {
  private templates: Map<string, ManagedTemplate> = new Map();
  private currentTemplate: string | null = null;
  private scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Register a template and its meshes
   */
  public registerTemplate(name: string): void {
    if (!this.templates.has(name)) {
      this.templates.set(name, {
        name,
        meshes: new Set(),
        actionManagers: new Map(),
        isLoaded: false,
        isVisible: false
      });
      debugLog.info('template', `Registered template: ${name}`);
    }
  }

  /**
   * Add meshes to a template
   */
  public addMeshesToTemplate(templateName: string, meshes: AbstractMesh[]): void {
    const template = this.templates.get(templateName);
    if (!template) {
      debugLog.warn('template', `Template ${templateName} not registered`);
      return;
    }

    meshes.forEach(mesh => {
      template.meshes.add(mesh);
      // Store original action manager for restoration
      if (mesh.actionManager) {
        template.actionManagers.set(mesh, mesh.actionManager);
      }
    });

    template.isLoaded = true;
    debugLog.info('template', `Added ${meshes.length} meshes to template ${templateName}`);
  }

  /**
   * Show a template and hide all others
   * This handles visibility AND interaction isolation
   */
  public showTemplate(templateName: string): void {
    const targetTemplate = this.templates.get(templateName);
    if (!targetTemplate) {
      debugLog.warn('template', `Template ${templateName} not found`);
      return;
    }

    // Hide all other templates
    this.templates.forEach((template, name) => {
      if (name !== templateName) {
        this.hideTemplateInternal(template);
      }
    });

    // Show the target template
    this.showTemplateInternal(targetTemplate);
    this.currentTemplate = templateName;
    
    debugLog.info('template', `Switched to template: ${templateName}`);
  }

  /**
   * Internal method to show a template
   */
  private showTemplateInternal(template: ManagedTemplate): void {
    template.meshes.forEach(mesh => {
      // Make visible
      mesh.isVisible = true;
      
      // Enable picking (for interaction)
      mesh.isPickable = true;
      
      // Restore action manager for interactions
      const storedActionManager = template.actionManagers.get(mesh);
      if (storedActionManager) {
        mesh.actionManager = storedActionManager;
      }
      
      // Enable children visibility
      mesh.getChildMeshes().forEach(child => {
        child.isVisible = true;
        child.isPickable = true;
      });
    });

    template.isVisible = true;
  }

  /**
   * Internal method to hide a template
   * CRITICAL: This disables ALL interactions for hidden templates
   */
  private hideTemplateInternal(template: ManagedTemplate): void {
    template.meshes.forEach(mesh => {
      // Hide mesh
      mesh.isVisible = false;
      
      // CRITICAL: Disable picking to prevent hover/click on hidden meshes
      mesh.isPickable = false;
      
      // CRITICAL: Remove action manager to prevent any interactions
      if (mesh.actionManager) {
        template.actionManagers.set(mesh, mesh.actionManager); // Store for later
        mesh.actionManager = null; // Disable all actions
      }
      
      // Hide and disable children
      mesh.getChildMeshes().forEach(child => {
        child.isVisible = false;
        child.isPickable = false;
      });
    });

    template.isVisible = false;
  }

  /**
   * Check if a mesh belongs to the current visible template
   */
  public isMeshInCurrentTemplate(mesh: AbstractMesh): boolean {
    if (!this.currentTemplate) return false;
    
    const template = this.templates.get(this.currentTemplate);
    if (!template || !template.isVisible) return false;
    
    return template.meshes.has(mesh);
  }

  /**
   * Get all visible meshes (from current template only)
   */
  public getVisibleMeshes(): AbstractMesh[] {
    if (!this.currentTemplate) return [];
    
    const template = this.templates.get(this.currentTemplate);
    if (!template || !template.isVisible) return [];
    
    return Array.from(template.meshes);
  }

  /**
   * Remove meshes from a template (for cleanup)
   */
  public removeMeshesFromTemplate(templateName: string, meshes: AbstractMesh[]): void {
    const template = this.templates.get(templateName);
    if (!template) return;

    meshes.forEach(mesh => {
      template.meshes.delete(mesh);
      template.actionManagers.delete(mesh);
    });
  }

  /**
   * Get current template name
   */
  public getCurrentTemplate(): string | null {
    return this.currentTemplate;
  }

  /**
   * Check if a template is loaded
   */
  public isTemplateLoaded(templateName: string): boolean {
    const template = this.templates.get(templateName);
    return template ? template.isLoaded : false;
  }

  /**
   * Clear all templates (for cleanup)
   */
  public dispose(): void {
    this.templates.clear();
    this.currentTemplate = null;
  }
}