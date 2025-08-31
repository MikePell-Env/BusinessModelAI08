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
  
  // PURE VERTEX SYSTEM: Track actual vertex-based heights instead of scaling
  private currentVertexHeights: Map<string, number> = new Map();
  private originalMeshBounds: Map<string, {minY: number, maxY: number, height: number}> = new Map();
  
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
        
        // Initialize vertex-based height tracking
        this.currentHeightFactors.set(mesh.name, 1.0);
        this.currentVertexHeights.set(mesh.name, 1.0); // Default height
        
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
   * Capture original vertex positions and bounds for pure vertex manipulation
   */
  private captureOriginalVertices(mesh: Mesh): void {
    const geometry = mesh.geometry;
    if (!geometry) return;

    const vertexData = geometry.getVerticesData('position');
    if (vertexData) {
      // Store a copy of the original vertex positions
      this.originalVertices.set(mesh.name, new Float32Array(vertexData));
      
      // Calculate original mesh bounds for vertex manipulation
      let minY = Number.MAX_VALUE;
      let maxY = Number.MIN_VALUE;
      
      for (let i = 1; i < vertexData.length; i += 3) {
        const y = vertexData[i];
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
      
      this.originalMeshBounds.set(mesh.name, {
        minY: minY,
        maxY: maxY,
        height: maxY - minY
      });
      
      console.log(`🔧 Captured vertex bounds for ${mesh.name}: minY=${minY.toFixed(3)}, maxY=${maxY.toFixed(3)}, height=${(maxY - minY).toFixed(3)}`);
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
    
    // EQUAL GROUP HEIGHT RULE: Revenue Group total height = Expenses Group total height
    // Both groups grow/shrink together but have different internal ratios
    
    // Calculate total group height based on maximum of (revenue total, expenses total)
    const revenueTotal = revenue;  // Revenue amount
    const expensesTotal = expenses;  // Expenses amount
    const maxGroupValue = Math.max(revenueTotal, expensesTotal);
    const groupHeight = maxGroupValue / HEIGHT_SCALE;  // Equal height for both groups
    
    // Revenue Group ratios (within equal group height)
    const revenueRatio = revenueTotal / maxGroupValue;  // Revenue portion of group
    const lossRatio = Math.max(0, (expensesTotal - revenueTotal)) / maxGroupValue;  // Loss portion
    
    // Expenses Group ratios (within equal group height)  
    const expensesRatio = expensesTotal / maxGroupValue;  // Expenses portion of group
    const profitRatio = Math.max(0, (revenueTotal - expensesTotal)) / maxGroupValue;  // Profit portion
    
    // Apply equal group height with internal ratios
    const revenueHeight = groupHeight * revenueRatio;
    const revenuePLHeight = groupHeight * lossRatio;
    const expensesHeight = groupHeight * expensesRatio;  
    const expensesPLHeight = groupHeight * profitRatio;
    
    // SELECTIVE UPDATES: Only animate objects whose values actually changed
    const animations: Promise<void>[] = [];
    
    // TRACK INDIVIDUAL CHANGES: Each object updates based on its specific value changes
    const revenueChanged = this.previousData.revenue !== revenue;
    const expensesChanged = this.previousData.expenses !== expenses;
    const profitChanged = this.previousData.profit !== profit;
    const lossChanged = this.previousData.loss !== loss;
    
    // Revenue object updates (when group height changes due to revenue or expenses)
    if (revenueChanged || expensesChanged) {
      console.log('🟢 REVENUE UPDATE: Group height changed, new Revenue height:', revenueHeight.toFixed(3));
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

      // STEP 3: Use vertex manipulation for Expenses only, scaling for others (including ExpensesPL)
      if (objectName === 'Expenses') {
        // Use vertex manipulation instead of scaling for Expenses group
        console.log(`🎯 VERTEX PATH: ${objectName} targetHeight=${targetHeight.toFixed(3)}, baseHeight=${this.baseHeight}`);
        debugLog.info('financials', `🔧 VERTEX: Animating ${objectName} height via vertex manipulation to ${targetHeight}`);
        
        // Convert target height to height factor (relative to base height)
        const heightFactor = targetHeight / this.baseHeight;
        console.log(`🎯 VERTEX PATH: ${objectName} heightFactor=${heightFactor.toFixed(3)} (${targetHeight.toFixed(3)} / ${this.baseHeight})`);
        
        // Apply vertex manipulation directly (immediate, no animation for now)
        this.setMeshHeightByVertices(mesh, heightFactor, anchorType);
        
        // Update label position after vertex changes
        this.updateLabelPosition(mesh);
        
        // DO NOT MOVE THE MESH - vertex manipulation keeps mesh in fixed position
        // mesh.position.y stays exactly where it was set during model loading
        
        console.log(`✅ VERTEX PATH: ${objectName} vertex manipulation completed - mesh position FIXED`);
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
  /**
   * Set heights directly from FinancialsController (bypasses old calculation logic)
   * ENFORCES: All three financial system rules on every call
   */
  public setHeightsFromController(heights: {
    revenueHeight: number;
    revenuePLHeight: number;
    expensesHeight: number;
    expensesPLHeight: number;
  }): void {
    console.log('🎯 HeightManager: REAL-TIME UPDATE - All four objects being recalculated:', {
      revenueHeight: heights.revenueHeight.toFixed(3),
      revenuePLHeight: heights.revenuePLHeight.toFixed(3),
      expensesHeight: heights.expensesHeight.toFixed(3),
      expensesPLHeight: heights.expensesPLHeight.toFixed(3)
    });
    
    // RULE VALIDATION: Verify equal group heights
    const revenueGroupTotal = heights.revenueHeight + heights.revenuePLHeight;
    const expensesGroupTotal = heights.expensesHeight + heights.expensesPLHeight;
    
    console.log('📏 RULE CHECK - Group Heights:', {
      revenueGroup: revenueGroupTotal.toFixed(3),
      expensesGroup: expensesGroupTotal.toFixed(3),
      equal: Math.abs(revenueGroupTotal - expensesGroupTotal) < 0.001 ? '✅' : '❌'
    });
    
    // Apply heights immediately using direct vertex manipulation
    // ALL FOUR objects updated on every slider interaction
    console.log('🔧 Setting Revenue height:', heights.revenueHeight.toFixed(3));
    this.setObjectHeight('Revenue', heights.revenueHeight, 'bottom');
    
    console.log('🔧 Setting RevenuePL height:', heights.revenuePLHeight.toFixed(3));
    this.setObjectHeight('RevenuePL', heights.revenuePLHeight, 'top');
    
    console.log('🔧 Setting Expenses height:', heights.expensesHeight.toFixed(3));
    this.setObjectHeight('Expenses', heights.expensesHeight, 'bottom');
    
    console.log('🔧 Setting ExpensesPL height:', heights.expensesPLHeight.toFixed(3), '(PROFIT - should grow when Expenses decreases)');
    console.log('🎯 EXPENSEPL DEBUG: About to call setObjectHeight for ExpensesPL');
    this.setObjectHeight('ExpensesPL', heights.expensesPLHeight, 'top');
    console.log('✅ EXPENSEPL DEBUG: setObjectHeight completed for ExpensesPL');
    
    console.log('✅ HeightManager: All four objects updated in real-time following documented rules');
  }

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
    
    // EQUAL GROUP HEIGHT RULE: Revenue Group total height = Expenses Group total height
    // Both groups grow/shrink together but have different internal ratios
    
    // Calculate total group height based on maximum of (revenue total, expenses total)
    const revenueTotal = revenue;  // Revenue amount
    const expensesTotal = expenses;  // Expenses amount
    const maxGroupValue = Math.max(revenueTotal, expensesTotal);
    const groupHeight = maxGroupValue / HEIGHT_SCALE;  // Equal height for both groups
    
    // Revenue Group ratios (within equal group height)
    const revenueRatio = revenueTotal / maxGroupValue;  // Revenue portion of group
    const lossRatio = Math.max(0, (expensesTotal - revenueTotal)) / maxGroupValue;  // Loss portion
    
    // Expenses Group ratios (within equal group height)  
    const expensesRatio = expensesTotal / maxGroupValue;  // Expenses portion of group
    const profitRatio = Math.max(0, (revenueTotal - expensesTotal)) / maxGroupValue;  // Profit portion
    
    // Apply equal group height with internal ratios
    const revenueHeight = groupHeight * revenueRatio;
    const revenuePLHeight = groupHeight * lossRatio;
    const expensesHeight = groupHeight * expensesRatio;  
    const expensesPLHeight = groupHeight * profitRatio;
    
    console.log('💰 IMMEDIATE HEIGHT CALCULATIONS:', {
      revenue: revenue, expenses: expenses, profit: profit, loss: loss,
      revenueHeight: revenueHeight.toFixed(3), revenuePLHeight: revenuePLHeight.toFixed(3),
      expensesHeight: expensesHeight.toFixed(3), expensesPLHeight: expensesPLHeight.toFixed(3)
    });

    // FORCE INITIAL SETUP: Always set heights on first call (initialization)
    const isInitialization = this.previousData.revenue === 1000 && this.previousData.expenses === 800;
    
    // Revenue object updates when group height changes
    if (this.previousData.revenue !== revenue || this.previousData.expenses !== expenses || isInitialization) {
      console.log('🟢 IMMEDIATE: Revenue height changed due to group height:', revenueHeight.toFixed(3));
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
   * PURE VERTEX MANIPULATION: Set object height using only vertex data
   * Implements all Financial System Rules via direct vertex modification
   * 
   * FINANCIAL SYSTEM RULES IMPLEMENTED:
   * 1. Equal Group Heights: Revenue Group = Expenses Group at ALL times
   * 2. 100% Group Composition: Each group totals exactly 100%
   * 3. Profit/Loss Interrelationship: ExpensesPL OR RevenuePL, never both
   * 
   * ANCHORING SYSTEM:
   * - Revenue, Expenses: Bottom-anchored (grow upward from base)
   * - RevenuePL, ExpensesPL: Top-anchored (grow downward from top)
   * - EXCEPTION: RevenuePL in loss scenarios grows upward from Revenue top
   */
  public setObjectHeight(
    objectName: string,
    height: number,
    anchorType: 'top' | 'bottom'
  ): void {
    console.log(`🎯 PURE VERTEX setObjectHeight: ${objectName}, height=${height.toFixed(3)}, anchor=${anchorType}`);
    
    const mesh = this.financialMeshes.get(objectName);
    if (!mesh) {
      console.error(`❌ Mesh not found: ${objectName}. Available:`, Array.from(this.financialMeshes.keys()));
      return;
    }

    const originalPos = this.originalPositions.get(objectName);
    if (!originalPos) {
      console.error(`❌ Original position not found for: ${objectName}`);
      return;
    }

    // Store the vertex-based height for tracking
    this.currentVertexHeights.set(objectName, height);
    
    console.log(`✅ Pure vertex manipulation for: ${objectName}`);

    // SPECIAL ANCHORING EXCEPTION: RevenuePL (Loss) in loss scenarios
    if (objectName === 'RevenuePL' && height > 0) {
      // When there's a loss, RevenuePL grows UPWARD from the top of Revenue
      // Bottom vertices stay at Revenue top, top vertices extend upward
      const revenueMesh = this.financialMeshes.get('Revenue');
      const expensesMesh = this.financialMeshes.get('Expenses');
      
      if (revenueMesh && expensesMesh) {
        // Get vertex-based heights instead of scaling-based
        const revenueVertexHeight = this.currentVertexHeights.get('Revenue') || 0;
        const expensesVertexHeight = this.currentVertexHeights.get('Expenses') || 0;
        
        // CROSSOVER THRESHOLD SAFETY: Check if vertex heights are too similar
        const heightDifference = Math.abs(expensesVertexHeight - revenueVertexHeight);
        
        if (heightDifference < 0.001) {
          // At breakeven threshold - use standard vertex manipulation
          console.log('🟡 BREAKEVEN: Using standard vertex manipulation');
          this.applyPureVertexHeight(mesh, height, anchorType);
        } else {
          // Safe to use custom vertex manipulation for loss scenario
          console.log('🟡 LOSS SCENARIO: RevenuePL grows upward from Revenue top');
          this.applyRevenuePLLossVertices(mesh, revenueMesh, expensesMesh);
        }
      } else {
        // Fallback to standard vertex manipulation
        this.applyPureVertexHeight(mesh, height, anchorType);
      }
    } else {
      // Standard anchoring behavior: pure vertex manipulation
      this.applyPureVertexHeight(mesh, height, anchorType);
      
      // Keep mesh at original position - only vertices move
      mesh.position.x = originalPos.x;
      mesh.position.y = originalPos.y;
      mesh.position.z = originalPos.z;
    }

    // Update label position
    this.updateLabelPosition(mesh);
    
    debugLog.verbose('financials', `Pure vertex manipulation complete for ${objectName}: ${height} (${anchorType}-anchored)`);
  }

  /**
   * Custom vertex manipulation for RevenuePL in loss scenarios
   * Bottom vertices stay at Revenue top, top vertices extend to match Expenses height
   */
  private setRevenuePLLossVertices(revenuePLMesh: Mesh, revenueMesh: Mesh, expensesMesh: Mesh): void {
    const geometry = revenuePLMesh.geometry;
    if (!geometry) {
      console.warn('🟡 RevenuePL geometry not found, skipping vertex manipulation');
      return;
    }

    const originalVertices = this.originalVertices.get(revenuePLMesh.name);
    if (!originalVertices) {
      console.warn('🟡 RevenuePL original vertices not found, skipping vertex manipulation');
      return;
    }

    const vertexData = geometry.getVerticesData('position');
    if (!vertexData) {
      console.warn('🟡 RevenuePL vertex data not found, skipping vertex manipulation');
      return;
    }

    // Calculate target positions
    const revenueTopY = revenueMesh.position.y + (revenueMesh.scaling.y / 2);
    const expensesTopY = expensesMesh.position.y + (expensesMesh.scaling.y / 2);
    
    console.log('🟡 RevenuePL Loss Vertex Calculation:', {
      revenueTopY: revenueTopY.toFixed(3),
      expensesTopY: expensesTopY.toFixed(3),
      heightDifference: (expensesTopY - revenueTopY).toFixed(3)
    });

    // Create new vertex array based on original
    const newVertices = new Float32Array(vertexData);

    // Find min and max Y values in original vertices to identify top and bottom
    let minY = Infinity, maxY = -Infinity;
    for (let i = 1; i < originalVertices.length; i += 3) {
      minY = Math.min(minY, originalVertices[i]);
      maxY = Math.max(maxY, originalVertices[i]);
    }

    const yRange = maxY - minY;
    const yMidpoint = (minY + maxY) / 2;

    // Transform vertices: bottom vertices to Revenue top, top vertices to Expenses top
    for (let i = 1; i < newVertices.length; i += 3) {
      const originalY = originalVertices[i];
      
      if (originalY < yMidpoint) {
        // Bottom vertices: anchor to Revenue top position
        newVertices[i] = revenueTopY - revenuePLMesh.position.y;
      } else {
        // Top vertices: extend to Expenses top position
        newVertices[i] = expensesTopY - revenuePLMesh.position.y;
      }
    }

    // Apply the new vertex positions
    geometry.setVerticesData('position', newVertices);
    
    // Update normals using correct Babylon.js API
    try {
      if (typeof (geometry as any).createNormals === 'function') {
        (geometry as any).createNormals(true);
      }
    } catch (error) {
      console.warn('🟡 Could not update normals, continuing without normal recalculation');
    }

    console.log('🟡 RevenuePL vertices updated: bottom anchored to Revenue top, top extended to Expenses height');
  }

  /**
   * PURE VERTEX MANIPULATION: Core method for height changes via vertex modification
   * Implements proper anchoring without any scaling dependencies
   * 
   * ANCHORING RULES:
   * - Bottom-anchored: Bottom vertices stay fixed, top vertices move up/down
   * - Top-anchored: Top vertices stay fixed, bottom vertices move up/down
   */
  private applyPureVertexHeight(
    mesh: Mesh,
    targetHeight: number,
    anchorType: 'top' | 'bottom'
  ): void {
    const geometry = mesh.geometry;
    if (!geometry) {
      console.warn(`🟡 ${mesh.name} geometry not found, skipping vertex manipulation`);
      return;
    }

    const originalVertices = this.originalVertices.get(mesh.name);
    const originalBounds = this.originalMeshBounds.get(mesh.name);
    
    if (!originalVertices || !originalBounds) {
      console.warn(`🟡 ${mesh.name} original data not found, skipping vertex manipulation`);
      return;
    }

    const vertexData = geometry.getVerticesData('position');
    if (!vertexData) {
      console.warn(`🟡 ${mesh.name} vertex data not found, skipping vertex manipulation`);
      return;
    }

    // Create new vertex array from original data
    const newVertices = new Float32Array(originalVertices);
    
    // Calculate height scaling factor based on target height
    const heightScale = targetHeight / originalBounds.height;
    
    console.log(`🎯 Pure vertex manipulation for ${mesh.name}: targetHeight=${targetHeight.toFixed(3)}, originalHeight=${originalBounds.height.toFixed(3)}, scale=${heightScale.toFixed(3)}, anchor=${anchorType}`);

    // Apply anchoring-based vertex transformation
    for (let i = 1; i < newVertices.length; i += 3) {
      const originalY = originalVertices[i];
      
      if (anchorType === 'bottom') {
        // Bottom-anchored: Scale from minimum Y position
        const relativeY = originalY - originalBounds.minY;
        newVertices[i] = originalBounds.minY + (relativeY * heightScale);
      } else {
        // Top-anchored: Scale from maximum Y position
        const relativeY = originalBounds.maxY - originalY;
        newVertices[i] = originalBounds.maxY - (relativeY * heightScale);
      }
    }

    // Apply the new vertex positions
    geometry.setVerticesData('position', newVertices);
    
    // Update normals using correct Babylon.js API
    try {
      if (typeof (geometry as any).createNormals === 'function') {
        (geometry as any).createNormals(true);
      }
    } catch (error) {
      console.warn(`🟡 Could not update normals for ${mesh.name}, continuing without normal recalculation`);
    }

    console.log(`✅ Pure vertex manipulation complete for ${mesh.name}: ${anchorType}-anchored to height ${targetHeight.toFixed(3)}`);
  }

  /**
   * SPECIAL CASE: Pure vertex manipulation for RevenuePL in loss scenarios
   * RevenuePL grows UPWARD from Revenue top, overriding normal top-anchored behavior
   */
  private applyRevenuePLLossVertices(
    revenuePLMesh: Mesh, 
    revenueMesh: Mesh, 
    expensesMesh: Mesh
  ): void {
    const geometry = revenuePLMesh.geometry;
    if (!geometry) {
      console.warn('🟡 RevenuePL geometry not found, skipping loss vertex manipulation');
      return;
    }

    const originalVertices = this.originalVertices.get(revenuePLMesh.name);
    const originalBounds = this.originalMeshBounds.get(revenuePLMesh.name);
    
    if (!originalVertices || !originalBounds) {
      console.warn('🟡 RevenuePL original data not found, skipping loss vertex manipulation');
      return;
    }

    // Get vertex-based heights for proper positioning
    const revenueHeight = this.currentVertexHeights.get('Revenue') || 0;
    const expensesHeight = this.currentVertexHeights.get('Expenses') || 0;
    const lossHeight = this.currentVertexHeights.get('RevenuePL') || 0;
    
    console.log(`🟡 Loss vertex calculation: Revenue=${revenueHeight.toFixed(3)}, Expenses=${expensesHeight.toFixed(3)}, Loss=${lossHeight.toFixed(3)}`);

    // Create new vertex array from original data
    const newVertices = new Float32Array(originalVertices);
    
    // Calculate loss object positioning: grows upward from Revenue top
    const revenueBounds = this.originalMeshBounds.get('Revenue');
    if (!revenueBounds) {
      console.warn('🟡 Revenue bounds not found, using fallback positioning');
      return;
    }
    
    // RevenuePL bottom should align with Revenue top
    const revenueTopY = revenueBounds.minY + revenueHeight;
    // RevenuePL top should extend upward by loss amount
    const lossTopY = revenueTopY + lossHeight;
    
    console.log(`🟡 Loss positioning: Revenue top at ${revenueTopY.toFixed(3)}, Loss extends to ${lossTopY.toFixed(3)}`);

    // Transform vertices: bottom vertices to Revenue top, top vertices extend upward
    for (let i = 1; i < newVertices.length; i += 3) {
      const originalY = originalVertices[i];
      const relativePosition = (originalY - originalBounds.minY) / originalBounds.height;
      
      // Linear interpolation from Revenue top to Loss top
      newVertices[i] = revenueTopY + (relativePosition * lossHeight);
    }

    // Apply the new vertex positions
    geometry.setVerticesData('position', newVertices);
    
    // Update normals using correct Babylon.js API
    try {
      if (typeof (geometry as any).createNormals === 'function') {
        (geometry as any).createNormals(true);
      }
    } catch (error) {
      console.warn('🟡 Could not update normals for RevenuePL loss vertices, continuing without normal recalculation');
    }

    console.log('🟡 RevenuePL loss vertices: bottom anchored to Revenue top, top extended upward for loss amount');
  }

  /**
   * Get current vertex-based height data for debugging
   */
  public getCurrentHeights(): Record<string, number> {
    const heights: Record<string, number> = {};
    this.financialMeshes.forEach((mesh, name) => {
      // Use vertex-based height instead of scaling
      heights[name] = this.currentVertexHeights.get(name) || 0;
    });
    return heights;
  }

  /**
   * Reset all objects to base height
   */
  public resetToBaseHeight(): void {
    // Reset to default financial state: Revenue $10M (100%), Expenses $8M (80%)
    // This results in: RevenuePL 0%, Revenue 100%, ExpensesPL 20% profit, Expenses 80%
    const baseData: FinancialData = {
      revenue: 1000,  // $10M (Revenue slider at 100%)
      expenses: 800,  // $8M (Expenses slider at 80%)
      profit: 200,    // $2M profit (20% margin - goes to ExpensesPL)
      loss: 0         // No loss (0% - RevenuePL stays at 0%)
    };
    
    console.log('🔄 Resetting to default financial state:', {
      revenue: '$10M (100%)',
      expenses: '$8M (80%)', 
      profit: '$2M (20% margin)',
      loss: '$0M (0%)'
    });
    
    this.setImmediateHeights(baseData);
    
    // Also update the slider positions and display values to match
    this.updateUIToMatchData(baseData);
  }

  /**
   * Update UI elements (sliders and displays) to match the given financial data
   */
  private updateUIToMatchData(data: FinancialData): void {
    // Update slider values
    const revenueSlider = document.getElementById('revenue-slider') as HTMLInputElement;
    const expensesSlider = document.getElementById('expenses-slider') as HTMLInputElement;
    
    if (revenueSlider) {
      revenueSlider.value = data.revenue.toString();
    }
    
    if (expensesSlider) {
      expensesSlider.value = data.expenses.toString();
    }
    
    // Update display values
    const revenueDisplay = document.querySelector('.revenue-display');
    const expensesDisplay = document.querySelector('.expenses-display');
    
    if (revenueDisplay) {
      revenueDisplay.textContent = `$${(data.revenue * 10 / 1000).toFixed(0)}M`;
    }
    
    if (expensesDisplay) {
      expensesDisplay.textContent = `$${(data.expenses * 10 / 1000).toFixed(0)}M`;
    }
    
    // Update global state for consistency
    if ((window as any).financialSliderState) {
      (window as any).financialSliderState.revenue = data.revenue;
      (window as any).financialSliderState.expenses = data.expenses;
    }
    
    console.log('🎚️ Reset UI elements to default values');
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
    console.log(`🔧 VERTEX MANIPULATION: ${mesh.name} - heightFactor=${heightFactor.toFixed(3)}, anchor=${anchorType}, baseHeight=${this.baseHeight}`);
    
    const originalVertices = this.originalVertices.get(mesh.name);
    if (!originalVertices) {
      console.error(`❌ No original vertices found for ${mesh.name}, falling back to scaling`);
      debugLog.warn('financials', `No original vertices found for ${mesh.name}, falling back to scaling`);
      return;
    }
    
    console.log(`🔧 VERTEX MANIPULATION: ${mesh.name} - Original vertices count: ${originalVertices.length / 3} vertices`);

    const geometry = mesh.geometry;
    if (!geometry) {
      console.error(`❌ No geometry found for ${mesh.name}`);
      return;
    }

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
    
    console.log(`🔧 VERTEX BOUNDS: ${mesh.name} - minY=${minY.toFixed(3)}, maxY=${maxY.toFixed(3)}, originalHeight=${originalHeight.toFixed(3)}`);
    
    // Modify vertices based on anchor type - CONSTRAINED to original bounds
    let modifiedVertices = 0;
    for (let i = 1; i < newVertices.length; i += 3) {
      const originalY = originalVertices[i];
      
      if (anchorType === 'bottom') {
        // Bottom-anchored: scale Y from the bottom (minY stays fixed)
        // Only show heightFactor percentage of the original height
        const relativeY = originalY - minY;
        const normalizedPosition = relativeY / originalHeight; // 0.0 to 1.0
        const scaledPosition = normalizedPosition * heightFactor; // Scale by factor
        newVertices[i] = minY + (scaledPosition * originalHeight);
        modifiedVertices++;
      } else {
        // Top-anchored: scale Y from the top (maxY stays fixed, minY moves up)
        // Simple approach: just like bottom-anchored but in reverse
        const relativeY = maxY - originalY;  // Distance from top
        const normalizedPosition = relativeY / originalHeight; // 0.0 (top) to 1.0 (bottom)
        const scaledPosition = normalizedPosition * heightFactor; // Scale by factor
        newVertices[i] = maxY - (scaledPosition * originalHeight);
        
        // Debug specific vertices for ExpensesPL
        if (mesh.name === 'ExpensesPL' && modifiedVertices < 5) {
          console.log(`🔧 ExpensesPL VERTEX ${modifiedVertices}: originalY=${originalY.toFixed(3)} → newY=${newVertices[i].toFixed(3)}, relativeY=${relativeY.toFixed(3)}, normalized=${normalizedPosition.toFixed(3)}, heightFactor=${heightFactor.toFixed(3)}`);
        }
        
        modifiedVertices++;
      }
    }
    
    console.log(`🔧 VERTEX MANIPULATION: ${mesh.name} - Modified ${modifiedVertices} vertices (${anchorType}-anchored)`);

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