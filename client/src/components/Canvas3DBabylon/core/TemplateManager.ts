/**
 * Template Manager - Dynamic mesh filtering without timing dependencies
 * 
 * Instead of pre-registering meshes, this manager dynamically filters
 * meshes based on naming patterns when showing/hiding templates.
 */

import { Scene, Mesh, AbstractMesh, ActionManager, AbstractActionManager } from '@babylonjs/core';
import { debugLog } from '@/lib/debug/DebugLogger';

export interface TemplatePattern {
  name: string;
  patterns: string[]; // Mesh name patterns for this template
}

export class TemplateManager {
  private scene: Scene;
  private currentTemplate: string | null = null;
  private templatePatterns: Map<string, string[]> = new Map();
  
  // Cache for action managers when hiding meshes
  private actionManagerCache: Map<AbstractMesh, AbstractActionManager | null> = new Map();

  constructor(scene: Scene) {
    this.scene = scene;
    this.initializeTemplatePatterns();
  }

  /**
   * Initialize patterns for identifying meshes belonging to each template
   * NO TIMING DEPENDENCIES - just pattern definitions
   */
  private initializeTemplatePatterns(): void {
    // Business Model template patterns
    this.templatePatterns.set('business-model', [
      'BMC_',
      'KeyPartners',
      'KeyActivities', 
      'KeyResources',
      'ValuePropositions',
      'CustomerRelationships',
      'CustomerChannels',
      'CustomerSegments',
      'CostStructure',
      'RevenueStreams',
      'Section_',
      'Internal',   // Foundation labels
      'External',
      'Divider'
    ]);

    // Financials template patterns
    this.templatePatterns.set('financials', [
      'Revenue',    // Matches "Revenue" 
      'Expenses',   // Matches "Expenses"
      'RevenuePL',  // Matches "RevenuePL"
      'ExpensesPL', // Matches "ExpensesPL"
      'Profit',
      'Loss', 
      'Financial_',
      '_fallback'
    ]);

    // SWOT template patterns (future)
    this.templatePatterns.set('swot', [
      'Strengths',
      'Weaknesses',
      'Opportunities',
      'Threats',
      'SWOT_'
    ]);

    // What-If template patterns (future)
    this.templatePatterns.set('what-if', [
      'Scenario',
      'WhatIf_',
      'Simulation_'
    ]);
  }

  /**
   * Check if a mesh belongs to a template based on naming patterns
   */
  private meshBelongsToTemplate(mesh: AbstractMesh, templateName: string): boolean {
    const patterns = this.templatePatterns.get(templateName.toLowerCase());
    if (!patterns) return false;

    // Check if mesh name matches any pattern for this template
    return patterns.some(pattern => mesh.name.includes(pattern));
  }

  /**
   * Get all meshes for a template - EXPLICIT NAMING, no patterns
   */
  private getTemplateMeshes(templateName: string): AbstractMesh[] {
    const normalizedTemplateName = templateName.toLowerCase();
    
    // EXPLICIT FINANCIALS MESH NAMES - hardcoded for reliability
    if (normalizedTemplateName === 'financials') {
      return this.scene.meshes.filter(mesh => {
        return mesh.name === 'Revenue' || 
               mesh.name === 'Expenses' || 
               mesh.name === 'RevenuePL' || 
               mesh.name === 'ExpensesPL';
      });
    }
    
    // EXPLICIT BUSINESS MODEL MESH NAMES
    if (normalizedTemplateName === 'business model' || normalizedTemplateName === 'business-model') {
      return this.scene.meshes.filter(mesh => {
        // Skip infrastructure
        if (mesh.name === '__root__' || 
            mesh.name.includes('ground') || 
            mesh.name.includes('rail') ||
            mesh.name === 'masterTransform') {
          return false;
        }
        
        // Foundation labels for BMC
        if (mesh.name.includes('Internal') || 
            mesh.name.includes('External') || 
            mesh.name.includes('Divider')) {
          return true;
        }
        
        // BMC section meshes
        return mesh.name.includes('BMC_') ||
               mesh.name === 'KeyPartners' ||
               mesh.name === 'KeyActivities' ||
               mesh.name === 'KeyResources' ||
               mesh.name === 'ValuePropositions' ||
               mesh.name === 'CustomerRelationships' ||
               mesh.name === 'CustomerChannels' ||
               mesh.name === 'CustomerSegments' ||
               mesh.name === 'CostStructure' ||
               mesh.name === 'RevenueStreams';
      });
    }
    
    return [];
  }

  /**
   * Show a template and hide all others - NO TIMING DEPENDENCIES
   * Works with whatever meshes exist at the time of call
   */
  public showTemplate(templateName: string): void {
    debugLog.info('template', `Showing template: ${templateName}`);
    
    // Hide all template meshes first
    this.hideAllTemplates();
    
    // Show meshes for the requested template
    const templateMeshes = this.getTemplateMeshes(templateName);
    
    templateMeshes.forEach(mesh => {
      // Make visible
      mesh.isVisible = true;
      mesh.isPickable = true;
      
      // Restore action manager from cache if exists
      const cachedActionManager = this.actionManagerCache.get(mesh);
      if (cachedActionManager) {
        mesh.actionManager = cachedActionManager as ActionManager;
      }
    });
    
    this.currentTemplate = templateName;
    debugLog.info('template', `Showed ${templateMeshes.length} meshes for ${templateName}`);
  }

  /**
   * Hide all template meshes - keeps infrastructure visible
   */
  private hideAllTemplates(): void {
    // Get all template names
    const allTemplates = Array.from(this.templatePatterns.keys());
    
    allTemplates.forEach(templateName => {
      const meshes = this.getTemplateMeshes(templateName);
      
      meshes.forEach(mesh => {
        // Cache action manager before clearing
        if (mesh.actionManager && !this.actionManagerCache.has(mesh)) {
          this.actionManagerCache.set(mesh, mesh.actionManager);
        }
        
        // Hide and disable interactions
        mesh.isVisible = false;
        mesh.isPickable = false;
        mesh.actionManager = null;
      });
    });
  }

  /**
   * Get current template name
   */
  public getCurrentTemplate(): string | null {
    return this.currentTemplate;
  }

  /**
   * Refresh visibility for current template
   * Useful after new meshes are added to the scene
   */
  public refreshCurrentTemplate(): void {
    if (this.currentTemplate) {
      this.showTemplate(this.currentTemplate);
    }
  }

  /**
   * Clear all cached data
   */
  public dispose(): void {
    this.actionManagerCache.clear();
    this.currentTemplate = null;
  }
}