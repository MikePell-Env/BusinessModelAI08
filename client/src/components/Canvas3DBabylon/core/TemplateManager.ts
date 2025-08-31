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
      'Divider',
      'keyPartners',
      'keyActivities',
      'keyResources',
      'valuePropositions',
      'customerRelationships',
      'customerChannels',
      'customerSegments',
      'costStructure',
      'revenueStreams'
    ]);

    // Financials template patterns - be more specific with exact matches
    this.templatePatterns.set('financials', [
      'Revenue',    // Exact match for "Revenue" 
      'Expenses',   // Exact match for "Expenses"
      'RevenuePL',  // Exact match for "RevenuePL"
      'ExpensesPL', // Exact match for "ExpensesPL"
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

    const meshName = mesh.name;
    
    // For Financials, use exact matches to avoid conflicts
    if (templateName.toLowerCase() === 'financials') {
      return patterns.some(pattern => {
        // Exact match for core financial objects
        if (['Revenue', 'Expenses', 'RevenuePL', 'ExpensesPL'].includes(pattern)) {
          return meshName === pattern;
        }
        // Contains match for others
        return meshName.includes(pattern);
      });
    }
    
    // For Business Model, exclude exact Financials matches first
    if (templateName.toLowerCase() === 'business-model') {
      const financialExactMatches = ['Revenue', 'Expenses', 'RevenuePL', 'ExpensesPL'];
      if (financialExactMatches.includes(meshName)) {
        return false; // This is a Financials mesh
      }
    }

    // Check if mesh name matches any pattern for this template
    return patterns.some(pattern => meshName.includes(pattern));
  }

  /**
   * Get all meshes for a template - DYNAMIC, no pre-registration needed
   */
  private getTemplateMeshes(templateName: string): AbstractMesh[] {
    const normalizedTemplateName = templateName.toLowerCase();
    return this.scene.meshes.filter(mesh => {
      // Skip infrastructure meshes
      if (mesh.name === '__root__' || 
          mesh.name.includes('ground') || 
          mesh.name.includes('rail') ||
          mesh.name === 'masterTransform') {
        return false;
      }
      
      // Foundation labels should be template-specific
      if (mesh.name.includes('label') || mesh.name.includes('Label')) {
        // BMC foundation labels belong to business-model template
        if (mesh.name.includes('Internal') || 
            mesh.name.includes('External') || 
            mesh.name.includes('Divider')) {
          return normalizedTemplateName === 'business-model';
        }
        // Other labels are infrastructure (skip)
        return false;
      }
      
      return this.meshBelongsToTemplate(mesh, normalizedTemplateName);
    });
  }

  /**
   * Show a template and hide all others - NO TIMING DEPENDENCIES
   * Works with whatever meshes exist at the time of call
   */
  public showTemplate(templateName: string): void {
    debugLog.info('template', `Showing template: ${templateName}`);
    
    // DEBUG: Check what meshes exist
    console.log(`🔍 TEMPLATE DEBUG: All scene meshes:`);
    this.scene.meshes.forEach(mesh => {
      console.log(`  - ${mesh.name} (visible: ${mesh.isVisible})`);
    });
    
    // Hide all template meshes first
    this.hideAllTemplates();
    
    // Show meshes for the requested template
    const templateMeshes = this.getTemplateMeshes(templateName);
    
    console.log(`🔍 TEMPLATE DEBUG: Found ${templateMeshes.length} meshes for '${templateName}':`);
    templateMeshes.forEach(mesh => {
      console.log(`  - ${mesh.name}`);
    });
    
    // FINANCIALS DEBUG: Special handling for Financials template
    if (templateName.toLowerCase() === 'financials') {
      console.log(`💰 FINANCIALS DEBUG: Checking for exact Financial mesh names...`);
      const financialMeshNames = ['Revenue', 'Expenses', 'RevenuePL', 'ExpensesPL'];
      
      financialMeshNames.forEach(name => {
        const mesh = this.scene.meshes.find(m => m.name === name);
        if (mesh) {
          console.log(`💰 FOUND: ${name} - forcing visible`);
          mesh.isVisible = true;
          mesh.isPickable = true;
          
          // Also ensure it's not in the action manager cache incorrectly
          const cachedActionManager = this.actionManagerCache.get(mesh);
          if (cachedActionManager) {
            mesh.actionManager = cachedActionManager as ActionManager;
          }
        } else {
          console.log(`💰 MISSING: ${name} - mesh not found in scene`);
        }
      });
    }
    
    templateMeshes.forEach(mesh => {
      // Make visible
      mesh.isVisible = true;
      mesh.isPickable = true;
      
      // Restore action manager from cache if exists
      const cachedActionManager = this.actionManagerCache.get(mesh);
      if (cachedActionManager) {
        mesh.actionManager = cachedActionManager as ActionManager;
      }
      
      console.log(`✅ MADE VISIBLE: ${mesh.name}`);
    });
    
    this.currentTemplate = templateName;
    debugLog.info('template', `Showed ${templateMeshes.length} meshes for ${templateName}`);
    
    // FINAL DEBUG: Verify what's actually visible now
    console.log(`🔍 FINAL CHECK: Visible meshes after template switch:`);
    this.scene.meshes.forEach(mesh => {
      if (mesh.isVisible) {
        console.log(`  ✅ VISIBLE: ${mesh.name}`);
      }
    });
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