/**
 * Financials Height Manager
 * Handles proportional height manipulation for Revenue/Expenses groups
 * while maintaining proper anchoring and label positioning
 */

import {
  Scene,
  AbstractMesh,
  Mesh,
  Vector3,
  Animation,
  CubicEase,
  EasingFunction
} from '@babylonjs/core';
import { debugLog } from '@/lib/debug/DebugLogger';

export interface FinancialData {
  revenue: number;
  expenses: number;
  profit: number;
  loss: number;
}

export interface GroupHeights {
  revenueTotal: number;
  expensesTotal: number;
  maxHeight: number;
}

export class FinancialsHeightManager {
  private scene: Scene;
  private financialMeshes: Map<string, Mesh> = new Map();
  private originalPositions: Map<string, Vector3> = new Map();
  private originalVertices: Map<string, Float32Array> = new Map();
  private currentHeightFactors: Map<string, number> = new Map();
  private baseHeight: number = 1.0;
  private maxVisualizationHeight: number = 5.0;

  constructor(scene: Scene) {
    this.scene = scene;
  }



  /**
   * Register financial meshes for height manipulation
   */
  public registerFinancialMeshes(meshes: AbstractMesh[]): void {
    meshes.forEach(mesh => {
      if (mesh instanceof Mesh && this.isFinancialMesh(mesh.name)) {
        this.financialMeshes.set(mesh.name, mesh);
        this.originalPositions.set(mesh.name, mesh.position.clone());
        
        // Store original vertex positions for direct manipulation
        this.captureOriginalVertices(mesh);
        
        // Initialize height factor to 1.0 for proper label scaling
        this.currentHeightFactors.set(mesh.name, 1.0);
        
      }
    });
    
    // Labels will be updated synchronously - no delay needed
  }

  /**
   * Refresh all financial object labels with correct aspect ratios
   */
  public refreshAllLabels(): void {
    this.financialMeshes.forEach((mesh, name) => {
      this.updateLabelPosition(mesh);
    });
  }

  /**
   * Capture original vertex positions for later manipulation
   */
  private captureOriginalVertices(mesh: Mesh): void {
    const geometry = mesh.geometry;
    if (!geometry) return;

    const vertexData = geometry.getVerticesData('position');
    if (vertexData) {
      // Store a copy of the original vertex positions
      this.originalVertices.set(mesh.name, new Float32Array(vertexData));
    }
  }

  /**
   * Calculate balanced heights based on income statement logic
   * Maintains visual balance: both sides always have equal total height
   */
  private calculateProportionalHeights(data: FinancialData): GroupHeights {
    const baseHeight = 2.0; // Base visualization height
    
    // Ensure minimum values for visualization
    const revenue = Math.max(data.revenue, 0.1);
    const expenses = Math.max(data.expenses, 0.1);
    
    // Calculate profit/loss
    const profit = revenue - expenses;
    const loss = expenses - revenue;
    
    let revenueTotal: number, expensesTotal: number;
    
    if (profit >= 0) {
      // PROFIT SCENARIO: Revenue side is 100%, Expenses side scales to match
      revenueTotal = baseHeight;
      expensesTotal = baseHeight; // Both sides equal height for balance
    } else {
      // LOSS SCENARIO: Expenses side is 100%, Revenue side scales to match  
      expensesTotal = baseHeight;
      revenueTotal = baseHeight; // Both sides equal height for balance
    }
    
    return {
      revenueTotal,
      expensesTotal,
      maxHeight: baseHeight
    };
  }

  /**
   * Update heights from financial data with corrected slider mapping
   * Revenue slider controls Revenue group, Expenses slider controls Expenses group
   */
  public async updateHeightsFromData(
    data: FinancialData,
    duration: number = 1000
  ): Promise<void> {
    // Fixed Revenue value (like $10M example)
    const revenue = Math.max(data.revenue, 0.1);
    
    // Expenses slider controls the percentage split within the Expenses group
    const expensesSliderValue = Math.max(data.expenses, 0.1);
    
    // Calculate core financial relationship: Profit = Revenue - Expenses
    // Use a fixed base expenses amount for the calculation, then use slider for split
    const baseExpensesAmount = revenue * 0.8; // Start with $8M if revenue is $10M (80%)
    const profit = Math.max(0, revenue - baseExpensesAmount);
    const loss = Math.max(0, baseExpensesAmount - revenue);
    
    // Total height for the Expenses group (fixed based on financial logic)
    const totalExpensesGroupHeight = baseExpensesAmount / 500.0;
    
    // Expenses slider (100-1600) controls percentage split within Expenses group
    // Convert slider value to percentage (0% to 100%)
    const expensesPercentage = ((expensesSliderValue - 100) / (1600 - 100)) * 100;
    const expensesPLPercentage = 100 - expensesPercentage;
    
    // Apply percentage split to total group height
    const expensesHeight = totalExpensesGroupHeight * (expensesPercentage / 100);
    const expensesPLHeight = totalExpensesGroupHeight * (expensesPLPercentage / 100);
    
    // Revenue side calculations remain the same
    const revenueHeight = revenue / 500.0;
    const revenuePLHeight = loss / 500.0;
    
    debugLog.info('financials', `📊 PERCENTAGE SPLIT - Revenue: $${revenue}, Base Expenses: $${baseExpensesAmount}, Profit: $${profit}`);
    debugLog.info('financials', `📊 Expenses slider: ${expensesSliderValue} → ${expensesPercentage.toFixed(1)}% Expenses, ${expensesPLPercentage.toFixed(1)}% ExpensesPL`);
    debugLog.info('financials', `📊 Heights - Expenses: ${expensesHeight.toFixed(3)}, ExpensesPL: ${expensesPLHeight.toFixed(3)}, Total: ${(expensesHeight + expensesPLHeight).toFixed(3)}`);

    // Animate all objects simultaneously with percentage-based heights
    await Promise.all([
      this.animateObjectHeight('Revenue', revenueHeight, 'bottom', duration),
      this.animateObjectHeight('Expenses', expensesHeight, 'bottom', duration),
      this.animateObjectHeight('RevenuePL', revenuePLHeight, 'top', duration),
      this.animateObjectHeight('ExpensesPL', expensesPLHeight, 'top', duration)
    ]);

    debugLog.info('financials', 'Percentage-based height animations completed');
  }

  /**
   * Animate individual object height while maintaining anchor point
   */
  private async animateObjectHeight(
    objectName: string,
    targetHeight: number,
    anchorType: 'top' | 'bottom',
    duration: number
  ): Promise<void> {
    const mesh = this.financialMeshes.get(objectName);
    if (!mesh) {
      debugLog.warn('financials', `Mesh ${objectName} not found for animation`);
      return;
    }

    return new Promise((resolve) => {
      const startHeight = mesh.scaling.y;
      const startPosition = mesh.position.y;
      const originalPos = this.originalPositions.get(objectName);

      if (!originalPos) {
        debugLog.error('financials', `Original position not found for ${objectName}`);
        resolve();
        return;
      }

      // ========================================================================
      // FINANCIAL OBJECT ANCHORING SYSTEM (January 29, 2025)
      // ========================================================================
      // CORE PRINCIPLE: Each financial group (Revenue + RevenuePL, Expenses + ExpensesPL) 
      //                 grows/shrinks in unison with FIXED top and bottom surfaces
      //
      // ANCHORING LOGIC:
      // - Bottom objects (Revenue, Expenses): Bottom surface FIXED at ground level
      // - Top objects (RevenuePL, ExpensesPL): Top surface FIXED at group top
      // - Total group height: 2.0 units (constant)
      //
      // POSITIONING FORMULA:
      // - Bottom-anchored: position = originalY (stays at ground)
      // - Top-anchored: position = originalY + totalGroupHeight - targetHeight
      // ========================================================================
      
      // Calculate target position based on anchor and height change
      let targetPosition = startPosition;
      if (anchorType === 'top') {
        // TOP-ANCHORED OBJECTS: Stack on top of their base objects
        if (objectName === 'ExpensesPL') {
          // CALIBRATED POSITIONING: Use the 0.3 factor that was working well
          const expensesMesh = this.financialMeshes.get('Expenses');
          if (expensesMesh) {
            const expensesOriginalPos = this.originalPositions.get('Expenses');
            if (expensesOriginalPos) {
              // Use the calibrated 0.3 positioning factor
              const positioningFactor = 0.3;
              targetPosition = 0 + (expensesMesh.scaling.y * positioningFactor);
            } else {
              targetPosition = 0 + (targetHeight / 2);
            }
          } else {
            targetPosition = 0 + (targetHeight / 2);
          }
        } else if (objectName === 'RevenuePL') {
          // RevenuePL stacks on top of Revenue
          const revenueMesh = this.financialMeshes.get('Revenue');
          if (revenueMesh) {
            const revenueHeight = revenueMesh.scaling.y;
            const revenuePosition = revenueMesh.position.y;
            // Position RevenuePL on top of Revenue with proper offset
            targetPosition = revenuePosition + (revenueHeight / 2) + (targetHeight / 2);
          } else {
            targetPosition = 0 + (targetHeight / 2);
          }
        } else {
          // For other top-anchored objects, use center positioning
          targetPosition = 0 + (targetHeight / 2);
        }
      } else {
        // BOTTOM-ANCHORED OBJECTS: Fixed bottom surface at ground level
        // Revenue and Expenses objects keep their bottom surface at Y=0 (ground plane)
        targetPosition = 0;
      }

      // STEP 3: Use vertex manipulation for Expenses, scaling for others
      if (objectName === 'Expenses') {
        // Use vertex manipulation instead of scaling for Expenses
        debugLog.info('financials', `🔧 VERTEX: Animating ${objectName} height via vertex manipulation to ${targetHeight}`);
        
        // Convert target height to height factor (relative to base height)
        const heightFactor = targetHeight / this.baseHeight;
        
        // Apply vertex manipulation directly (immediate, no animation for now)
        this.setMeshHeightByVertices(mesh, heightFactor, anchorType);
        
        // Update label position after vertex changes
        this.updateLabelPosition(mesh);
        
        // Position the mesh properly (bottom-anchored)
        mesh.position.y = targetPosition;
        
        debugLog.info('financials', `🔧 VERTEX: ${objectName} height set to factor ${heightFactor} (target: ${targetHeight})`);
        
        // Resolve immediately since vertex manipulation is instant
        resolve();
        return;
      }

      // Use traditional scaling animation for non-Expenses objects
      const heightAnimation = new Animation(
        `${objectName}_height`,
        'scaling.y',
        60,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );

      // Create position animation
      const positionAnimation = new Animation(
        `${objectName}_position`,
        'position.y',
        60,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );

      // Set up easing
      const easingFunction = new CubicEase();
      easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);

      // Height animation keys
      const heightKeys = [
        { frame: 0, value: startHeight },
        { frame: 60, value: targetHeight }
      ];
      heightAnimation.setKeys(heightKeys);
      heightAnimation.setEasingFunction(easingFunction);

      // Position animation keys
      const positionKeys = [
        { frame: 0, value: startPosition },
        { frame: 60, value: targetPosition }
      ];
      positionAnimation.setKeys(positionKeys);
      positionAnimation.setEasingFunction(easingFunction);

      // Apply animations
      mesh.animations = [heightAnimation, positionAnimation];

      this.scene.beginAnimation(
        mesh,
        0,
        60,
        false,
        60 / (duration / 1000),
        () => {
          debugLog.verbose('financials', `${objectName} height animation completed`);
          
          // Update label position at end of animation
          this.updateLabelPosition(mesh);
          
          resolve();
        }
      );
    });
  }

  /**
   * Set immediate heights without animation (for initialization)
   * Uses corrected direct mapping logic
   */
  public setImmediateHeights(data: FinancialData): void {
    // Direct mapping: slider values directly control their respective groups
    const revenue = Math.max(data.revenue, 0.1);
    const expenses = Math.max(data.expenses, 0.1);
    
    // Calculate profit/loss for display
    const profit = Math.max(0, revenue - expenses);
    const loss = Math.max(0, expenses - revenue);
    
    // Direct height mapping
    const revenueHeight = revenue / 500.0;
    const expensesHeight = expenses / 500.0;
    const revenuePLHeight = loss / 500.0;
    const expensesPLHeight = profit / 500.0;

    this.setObjectHeight('Revenue', revenueHeight, 'bottom');
    this.setObjectHeight('RevenuePL', revenuePLHeight, 'top');
    this.setObjectHeight('Expenses', expensesHeight, 'bottom');
    this.setObjectHeight('ExpensesPL', expensesPLHeight, 'top');
  }

  /**
   * Set object height immediately while maintaining anchor
   * Using vertex manipulation constrained to original geometry bounds
   */
  private setObjectHeight(
    objectName: string,
    height: number,
    anchorType: 'top' | 'bottom'
  ): void {
    const mesh = this.financialMeshes.get(objectName);
    if (!mesh) return;

    const originalPos = this.originalPositions.get(objectName);
    if (!originalPos) return;

    // Use vertex manipulation but keep mesh position FIXED at original position
    this.setMeshHeightByVertices(mesh, height, anchorType);

    // CRITICAL: Keep mesh position at original loaded position - no movement
    mesh.position.x = originalPos.x;
    mesh.position.y = originalPos.y; 
    mesh.position.z = originalPos.z;

    // Update label position
    this.updateLabelPosition(mesh);
    
    debugLog.verbose('financials', `Set height for ${objectName}: ${height} (${anchorType}-anchored) using constrained vertex manipulation`);
  }

  /**
   * Get current height data for debugging
   */
  public getCurrentHeights(): Record<string, number> {
    const heights: Record<string, number> = {};
    this.financialMeshes.forEach((mesh, name) => {
      heights[name] = mesh.scaling.y;
    });
    return heights;
  }

  /**
   * Reset all objects to base height
   */
  public resetToBaseHeight(): void {
    const baseData: FinancialData = {
      revenue: 1,
      expenses: 1,
      profit: 0,
      loss: 0
    };
    this.setImmediateHeights(baseData);
  }

  private isFinancialMesh(name: string): boolean {
    return ['Revenue', 'RevenuePL', 'Expenses', 'ExpensesPL'].includes(name);
  }

  /**
   * Manipulate mesh height using direct vertex modification instead of scaling
   */
  private setMeshHeightByVertices(
    mesh: Mesh,
    heightFactor: number,
    anchorType: 'top' | 'bottom'
  ): void {
    const originalVertices = this.originalVertices.get(mesh.name);
    if (!originalVertices) {
      debugLog.warn('financials', `No original vertices found for ${mesh.name}, falling back to scaling`);
      return;
    }

    const geometry = mesh.geometry;
    if (!geometry) return;

    // Store the height factor for label scaling
    this.currentHeightFactors.set(mesh.name, heightFactor);

    // Create a copy of original vertices to modify
    const newVertices = new Float32Array(originalVertices);

    // Find the Y bounds of the original mesh
    let minY = Number.MAX_VALUE;
    let maxY = Number.MIN_VALUE;
    
    for (let i = 1; i < originalVertices.length; i += 3) {
      const y = originalVertices[i];
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }

    const originalHeight = maxY - minY;
    
    // CONSTRAIN SCALING: heightFactor represents percentage of original height to show
    // heightFactor 1.0 = full original height, 0.5 = half height, etc.
    // This keeps all scaling WITHIN the original geometry bounds
    
    // Calculate the VISUAL scaling factor for labels (inverse of compression)
    // If heightFactor = 0.5 (half height), visual stretch = 2.0 (double stretch)
    const visualStretchFactor = 1.0 / heightFactor;
    
    // Store the VISUAL stretch factor for label correction (not the heightFactor)
    this.currentHeightFactors.set(mesh.name, visualStretchFactor);
    
    // Modify vertices based on anchor type - CONSTRAINED to original bounds
    for (let i = 1; i < newVertices.length; i += 3) {
      const originalY = originalVertices[i];
      
      if (anchorType === 'bottom') {
        // Bottom-anchored: scale Y from the bottom (minY stays fixed)
        // Only show heightFactor percentage of the original height
        const relativeY = originalY - minY;
        const normalizedPosition = relativeY / originalHeight; // 0.0 to 1.0
        const scaledPosition = normalizedPosition * heightFactor; // Scale by factor
        newVertices[i] = minY + (scaledPosition * originalHeight);
      } else {
        // Top-anchored: scale Y from the top (maxY stays fixed) 
        // Only show heightFactor percentage of the original height
        const relativeY = maxY - originalY;
        const normalizedPosition = relativeY / originalHeight; // 0.0 to 1.0
        const scaledPosition = normalizedPosition * heightFactor; // Scale by factor
        newVertices[i] = maxY - (scaledPosition * originalHeight);
      }
    }

    // Update the mesh geometry
    geometry.setVerticesData('position', newVertices);
    mesh.computeWorldMatrix(true);
    mesh.refreshBoundingInfo();

    debugLog.verbose('financials', `Vertex manipulation: ${mesh.name} height ${heightFactor}x (${anchorType}-anchored)`);
  }

  /**
   * Update label position to track mesh center after vertex manipulation
   */
  private updateLabelPosition(mesh: Mesh): void {
    // Update label positioning after vertex changes
    const scene = this.scene;
    const financialsLabelManager = (scene as any).financialsLabelManager;
    
    if (financialsLabelManager) {
      // Update the label position using the dedicated label manager
      financialsLabelManager.updateLabelPosition(mesh.name);
      debugLog.verbose('financials', `Label position updated for ${mesh.name}`);
    }
  }
}