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
  private previousData: FinancialData | null = null;

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
        
        console.log(`🔧 Registered financial mesh: ${mesh.name}`);
      }
    });
    
    console.log(`🔧 Total financial meshes registered: ${this.financialMeshes.size}`);
    
    // IMMEDIATE: Apply correct default heights as soon as meshes are registered
    if (this.financialMeshes.size === 4) {
      console.log('🔧 All 4 meshes registered, applying default heights immediately...');
      setTimeout(() => {
        this.setImmediateHeights({
          revenue: 1000,   // $10M
          expenses: 800,   // $8M
          profit: 200,     // $2M profit
          loss: 0          // No loss
        });
        console.log('🔧 Default heights applied immediately after mesh registration');
      }, 10); // Very short delay to ensure mesh setup is complete
    }
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
      // Store a DEEP copy of the original vertex positions to prevent reference corruption
      const originalCopy = new Float32Array(vertexData.length);
      for (let i = 0; i < vertexData.length; i++) {
        originalCopy[i] = vertexData[i];
      }
      this.originalVertices.set(mesh.name, originalCopy);
      console.log(`🔧 Captured ${vertexData.length} original vertices for ${mesh.name}`);
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
    // ISOLATED SYSTEM: Track previous values to prevent unwanted changes
    if (!this.previousData) {
      this.previousData = { revenue: 1000, expenses: 800, profit: 200, loss: 0 };
    }
    
    const revenue = Math.max(Math.min(data.revenue, 1000), 100);
    const expenses = Math.max(Math.min(data.expenses, 1000), 100);
    
    // Calculate profit/loss based on actual slider values
    const profit = Math.max(0, revenue - expenses);
    const loss = Math.max(0, expenses - revenue);
    
    const HEIGHT_SCALE = 500.0;
    
    // Calculate heights EXACTLY like Expenses Group logic
    // Revenue Group: Revenue object = slider value, RevenuePL object = loss amount
    // SAME PATTERN as Expenses Group: Expenses object = slider value, ExpensesPL object = profit amount
    const revenueHeight = revenue / HEIGHT_SCALE;  // Revenue object: direct slider value
    const revenuePLHeight = loss / HEIGHT_SCALE;   // RevenuePL object: loss amount (when expenses > revenue)
    
    // Expenses Group: Expenses = actual value, ExpensesPL = profit
    const expensesHeight = expenses / HEIGHT_SCALE;
    const expensesPLHeight = profit / HEIGHT_SCALE;
    
    // SELECTIVE UPDATES: Only animate objects whose values actually changed
    const animations: Promise<void>[] = [];
    
    // TRACK INDIVIDUAL CHANGES: Each object updates based on its specific value changes
    const revenueChanged = this.previousData.revenue !== revenue;
    const expensesChanged = this.previousData.expenses !== expenses;
    const profitChanged = this.previousData.profit !== profit;
    const lossChanged = this.previousData.loss !== loss;
    
    // Revenue object updates (when Revenue slider moves)
    if (revenueChanged) {
      console.log('🟢 REVENUE UPDATE: Revenue changed:', this.previousData.revenue, '→', revenue);
      animations.push(this.animateObjectHeight('Revenue', revenueHeight, 'bottom', duration));
    }
    
    // RevenuePL (Loss) object updates (when loss amount changes due to revenue OR expenses)
    if (lossChanged) {
      console.log('🟡 LOSS UPDATE: Loss changed:', this.previousData.loss, '→', loss);
      animations.push(this.animateObjectHeight('RevenuePL', revenuePLHeight, 'top', duration));
    }
    
    // Expenses object updates (when Expenses slider moves)
    if (expensesChanged) {
      console.log('🔴 EXPENSES UPDATE: Expenses changed:', this.previousData.expenses, '→', expenses);
      animations.push(this.animateObjectHeight('Expenses', expensesHeight, 'bottom', duration));
    }
    
    // ExpensesPL (Profit) object updates (when profit amount changes due to revenue OR expenses)
    if (profitChanged) {
      console.log('⚫ PROFIT UPDATE: Profit changed:', this.previousData.profit, '→', profit);
      animations.push(this.animateObjectHeight('ExpensesPL', expensesPLHeight, 'top', duration));
    }
    
    // Update previous data for next comparison
    this.previousData = { revenue, expenses, profit, loss };
    
    debugLog.info('financials', `💰 INDIVIDUAL UPDATES - Revenue: $${(revenue/100).toFixed(1)}M, Expenses: $${(expenses/100).toFixed(1)}M`);
    debugLog.info('financials', `📊 P&L Results - Profit: $${(profit/100).toFixed(1)}M, Loss: $${(loss/100).toFixed(1)}M`);
    debugLog.info('financials', `📏 Heights - Revenue: ${revenueHeight.toFixed(3)}, RevenuePL: ${revenuePLHeight.toFixed(3)}, Expenses: ${expensesHeight.toFixed(3)}, ExpensesPL: ${expensesPLHeight.toFixed(3)}`);
    debugLog.info('financials', `🎯 Animations queued: ${animations.length}`);

    // Only animate objects that actually changed
    if (animations.length > 0) {
      await Promise.all(animations);
      debugLog.info('financials', 'Selective animation updates completed');
    } else {
      debugLog.info('financials', 'No changes detected, no animations needed');
    }
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

      // STEP 3: Use vertex manipulation for Expenses and ExpensesPL, scaling for others
      if (objectName === 'Expenses' || objectName === 'ExpensesPL') {
        // Use vertex manipulation instead of scaling for Expenses group
        debugLog.info('financials', `🔧 VERTEX: Animating ${objectName} height via vertex manipulation to ${targetHeight}`);
        
        // Convert target height to height factor (relative to base height)
        const heightFactor = targetHeight / this.baseHeight;
        
        // Apply vertex manipulation directly (immediate, no animation for now)
        this.setMeshHeightByVertices(mesh, heightFactor, anchorType);
        
        // Update label position after vertex changes
        this.updateLabelPosition(mesh);
        
        // DO NOT MOVE THE MESH - vertex manipulation keeps mesh in fixed position
        // mesh.position.y stays exactly where it was set during model loading
        
        debugLog.info('financials', `🔧 VERTEX: ${objectName} height set to factor ${heightFactor} (target: ${targetHeight}) - mesh position FIXED`);
        
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
    // ISOLATED SYSTEM: Track previous values to prevent unwanted changes
    if (!this.previousData) {
      this.previousData = { revenue: 1000, expenses: 800, profit: 200, loss: 0 };
    }
    
    const revenue = Math.max(data.revenue, 0.1);
    const expenses = Math.max(data.expenses, 0.1);
    
    // Calculate profit/loss for display
    const profit = Math.max(0, revenue - expenses);
    const loss = Math.max(0, expenses - revenue);
    
    const HEIGHT_SCALE = 500.0;
    
    // Calculate heights EXACTLY like Expenses Group logic
    // Revenue Group: Revenue object = slider value, RevenuePL object = loss amount
    // SAME PATTERN as Expenses Group: Expenses object = slider value, ExpensesPL object = profit amount
    const revenueHeight = revenue / HEIGHT_SCALE;  // Revenue object: direct slider value
    const revenuePLHeight = loss / HEIGHT_SCALE;   // RevenuePL object: loss amount (when expenses > revenue)
    
    // Expenses Group: Expenses = actual value, ExpensesPL = profit
    const expensesHeight = expenses / HEIGHT_SCALE;
    const expensesPLHeight = profit / HEIGHT_SCALE;
    
    console.log('💰 IMMEDIATE HEIGHT CALCULATIONS:', {
      revenue: revenue, expenses: expenses, profit: profit, loss: loss,
      revenueHeight: revenueHeight.toFixed(3), revenuePLHeight: revenuePLHeight.toFixed(3),
      expensesHeight: expensesHeight.toFixed(3), expensesPLHeight: expensesPLHeight.toFixed(3)
    });

    // FORCE INITIAL SETUP: Always set heights on first call (initialization)
    const isInitialization = this.previousData.revenue === 1000 && this.previousData.expenses === 800;
    
    if (this.previousData.revenue !== revenue || isInitialization) {
      console.log('🟢 IMMEDIATE: Revenue changed:', this.previousData.revenue, '→', revenue, 'Height:', revenueHeight.toFixed(3));
      this.setObjectHeight('Revenue', revenueHeight, 'bottom');
    }
    
    if (this.previousData.loss !== loss || isInitialization) {
      console.log('🟡 IMMEDIATE: Loss changed:', this.previousData.loss, '→', loss, 'Height:', revenuePLHeight.toFixed(3));
      this.setObjectHeight('RevenuePL', revenuePLHeight, 'top');
    }
    
    if (this.previousData.expenses !== expenses || isInitialization) {
      console.log('🔴 IMMEDIATE: Expenses changed:', this.previousData.expenses, '→', expenses, 'Height:', expensesHeight.toFixed(3));
      this.setObjectHeight('Expenses', expensesHeight, 'bottom');
    }
    
    if (this.previousData.profit !== profit || isInitialization) {
      console.log('⚫ IMMEDIATE: Profit changed:', this.previousData.profit, '→', profit, 'Height:', expensesPLHeight.toFixed(3));
      this.setObjectHeight('ExpensesPL', expensesPLHeight, 'top');
    }
    
    // Update previous data for next comparison
    this.previousData = { revenue, expenses, profit, loss };
  }

  /**
   * Set object height immediately while maintaining anchor
   * Using vertex manipulation constrained to original geometry bounds
   */
  public setObjectHeight(
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
    
    console.log(`🔧 Setting height for ${mesh.name}: factor=${heightFactor}, anchor=${anchorType}`);

    const geometry = mesh.geometry;
    if (!geometry) return;

    // Calculate the VISUAL scaling factor for labels (inverse of compression)
    // If heightFactor = 0.5 (half height), visual stretch = 2.0 (double stretch)
    const visualStretchFactor = 1.0 / heightFactor;
    
    // Store the VISUAL stretch factor for label correction (not the heightFactor)
    this.currentHeightFactors.set(mesh.name, visualStretchFactor);

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

    console.log(`🔧 Vertex manipulation completed: ${mesh.name} height ${heightFactor}x (${anchorType}-anchored)`);
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