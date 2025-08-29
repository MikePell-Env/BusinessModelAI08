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
        debugLog.info('financials', `Registered ${mesh.name} at position ${mesh.position}`);
      }
    });
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
   * Update heights from financial data with balanced income statement logic
   * Implements: Revenue - Expenses = Profit/Loss with visual balance
   */
  public async updateHeightsFromData(
    data: FinancialData,
    duration: number = 1000
  ): Promise<void> {
    const heights = this.calculateProportionalHeights(data);
    
    // Ensure minimum values for calculation
    const revenue = Math.max(data.revenue, 0.1);
    const expenses = Math.max(data.expenses, 0.1);
    
    // Calculate profit/loss
    const profit = revenue - expenses;
    const loss = expenses - revenue;
    
    let revenueHeight: number, revenuePLHeight: number;
    let expensesHeight: number, expensesPLHeight: number;
    
    if (profit >= 0) {
      // PROFIT SCENARIO: Revenue - Expenses = Profit
      revenueHeight = heights.revenueTotal;        // Revenue: 100% height
      revenuePLHeight = 0;                         // RevenuePL: 0% (no loss)
      expensesHeight = (expenses / revenue) * heights.expensesTotal;     // Expenses: proportional
      expensesPLHeight = (profit / revenue) * heights.expensesTotal;     // ExpensesPL: profit portion
      
      debugLog.info('financials', `PROFIT scenario - Revenue: 100%, Expenses: ${(expenses/revenue*100).toFixed(1)}%, Profit: ${(profit/revenue*100).toFixed(1)}%`);
    } else {
      // LOSS SCENARIO: Expenses - Revenue = Loss  
      expensesHeight = heights.expensesTotal;      // Expenses: 100% height
      expensesPLHeight = 0;                        // ExpensesPL: 0% (no profit)
      revenueHeight = (revenue / expenses) * heights.revenueTotal;       // Revenue: proportional
      revenuePLHeight = (Math.abs(loss) / expenses) * heights.revenueTotal; // RevenuePL: loss portion
      
      debugLog.info('financials', `LOSS scenario - Expenses: 100%, Revenue: ${(revenue/expenses*100).toFixed(1)}%, Loss: ${(Math.abs(loss)/expenses*100).toFixed(1)}%`);
    }

    debugLog.info('financials', `Updating heights - Revenue: ${revenueHeight.toFixed(2)}, RevenuePL: ${revenuePLHeight.toFixed(2)}, Expenses: ${expensesHeight.toFixed(2)}, ExpensesPL: ${expensesPLHeight.toFixed(2)}`);

    // Animate base objects first, then stacked objects to prevent overlaps
    // Step 1: Animate bottom-anchored objects (Revenue, Expenses)
    await Promise.all([
      this.animateObjectHeight('Revenue', revenueHeight, 'bottom', duration / 2),
      this.animateObjectHeight('Expenses', expensesHeight, 'bottom', duration / 2)
    ]);

    // Step 2: Animate top-anchored objects (RevenuePL, ExpensesPL) after base is positioned
    await Promise.all([
      this.animateObjectHeight('RevenuePL', revenuePLHeight, 'top', duration / 2),
      this.animateObjectHeight('ExpensesPL', expensesPLHeight, 'top', duration / 2)
    ]);

    debugLog.info('financials', 'All height animations completed with proper stacking');
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
        // TOP-ANCHORED OBJECTS: Fixed top surface, position adjusts with height changes
        const totalGroupHeight = 2.0; // Fixed total group height
        
        if (objectName === 'ExpensesPL') {
          // ExpensesPL: Top surface stays at originalY + 2.0
          targetPosition = originalPos.y + totalGroupHeight - targetHeight;
        } else if (objectName === 'RevenuePL') {
          // RevenuePL: Top surface stays at originalY + 2.0 (same logic as ExpensesPL)
          targetPosition = originalPos.y + totalGroupHeight - targetHeight;
        } else {
          // For other top-anchored objects, use original logic
          targetPosition = originalPos.y - (targetHeight - startHeight);
        }
      } else {
        // BOTTOM-ANCHORED OBJECTS: Fixed bottom surface at ground level
        // Revenue and Expenses objects keep their bottom surface at originalY
        targetPosition = originalPos.y;
      }

      // Create height animation
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
          resolve();
        }
      );
    });
  }

  /**
   * Set immediate heights without animation (for initialization)
   * Uses balanced income statement logic
   */
  public setImmediateHeights(data: FinancialData): void {
    const heights = this.calculateProportionalHeights(data);
    
    // Ensure minimum values for calculation
    const revenue = Math.max(data.revenue, 0.1);
    const expenses = Math.max(data.expenses, 0.1);
    
    // Calculate profit/loss
    const profit = revenue - expenses;
    const loss = expenses - revenue;
    
    let revenueHeight: number, revenuePLHeight: number;
    let expensesHeight: number, expensesPLHeight: number;
    
    if (profit >= 0) {
      // PROFIT SCENARIO
      revenueHeight = heights.revenueTotal;
      revenuePLHeight = 0;
      expensesHeight = (expenses / revenue) * heights.expensesTotal;
      expensesPLHeight = (profit / revenue) * heights.expensesTotal;
    } else {
      // LOSS SCENARIO
      expensesHeight = heights.expensesTotal;
      expensesPLHeight = 0;
      revenueHeight = (revenue / expenses) * heights.revenueTotal;
      revenuePLHeight = (Math.abs(loss) / expenses) * heights.revenueTotal;
    }

    this.setObjectHeight('Revenue', revenueHeight, 'bottom');
    this.setObjectHeight('RevenuePL', revenuePLHeight, 'top');
    this.setObjectHeight('Expenses', expensesHeight, 'bottom');
    this.setObjectHeight('ExpensesPL', expensesPLHeight, 'top');
  }

  /**
   * Set object height immediately while maintaining anchor
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

    mesh.scaling.y = height;

    if (anchorType === 'top') {
      // Keep top surface fixed by adjusting position
      mesh.position.y = originalPos.y - (height - mesh.scaling.y); // Adjust position to keep top at originalPos.y
    } else {
      // Keep bottom surface fixed
      mesh.position.y = originalPos.y;
    }
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
}