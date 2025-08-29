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
   * Update heights from financial data with corrected slider mapping
   * Revenue slider controls Revenue group, Expenses slider controls Expenses group
   */
  public async updateHeightsFromData(
    data: FinancialData,
    duration: number = 1000
  ): Promise<void> {
    // Direct mapping: slider values directly control their respective groups
    const revenue = Math.max(data.revenue, 0.1);
    const expenses = Math.max(data.expenses, 0.1);
    
    // Calculate profit/loss for display in PL objects
    const profit = Math.max(0, revenue - expenses);
    const loss = Math.max(0, expenses - revenue);
    
    // CORRECTED: Direct height mapping based on slider values
    // Revenue slider (data.revenue) → Revenue object height
    // Expenses slider (data.expenses) → Expenses object height
    const revenueHeight = revenue / 500.0; // Scale down from slider range (100-2000) to visual range
    const expensesHeight = expenses / 500.0; // Scale down from slider range (100-1600) to visual range
    
    // PL objects show profit/loss proportionally
    const revenuePLHeight = loss / 500.0; // Loss shown on Revenue side (gold)
    const expensesPLHeight = profit / 500.0; // Profit shown on Expenses side (black)
    
    debugLog.info('financials', `CORRECTED mapping - Revenue slider: ${revenue} → Revenue height: ${revenueHeight.toFixed(2)}`);
    debugLog.info('financials', `CORRECTED mapping - Expenses slider: ${expenses} → Expenses height: ${expensesHeight.toFixed(2)}`);
    debugLog.info('financials', `P&L display - Profit: ${profit} → ExpensesPL: ${expensesPLHeight.toFixed(2)}, Loss: ${loss} → RevenuePL: ${revenuePLHeight.toFixed(2)}`);

    // Animate all objects simultaneously with corrected heights
    await Promise.all([
      this.animateObjectHeight('Revenue', revenueHeight, 'bottom', duration),
      this.animateObjectHeight('Expenses', expensesHeight, 'bottom', duration),
      this.animateObjectHeight('RevenuePL', revenuePLHeight, 'top', duration),
      this.animateObjectHeight('ExpensesPL', expensesPLHeight, 'top', duration)
    ]);

    debugLog.info('financials', 'Corrected height animations completed');
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
      // Use calibrated positioning for ExpensesPL
      if (objectName === 'ExpensesPL') {
        const expensesMesh = this.financialMeshes.get('Expenses');
        if (expensesMesh) {
          // Use the calibrated 0.3 positioning factor that was working
          const positioningFactor = 0.3;
          mesh.position.y = 0 + (expensesMesh.scaling.y * positioningFactor);
        } else {
          mesh.position.y = 0 + (height / 2);
        }
      } else if (objectName === 'RevenuePL') {
        const revenueMesh = this.financialMeshes.get('Revenue');
        if (revenueMesh) {
          const revenueHeight = revenueMesh.scaling.y;
          const revenuePosition = revenueMesh.position.y;
          mesh.position.y = revenuePosition + (revenueHeight / 2) + (height / 2);
        } else {
          mesh.position.y = 0 + (height / 2);
        }
      } else {
        mesh.position.y = 0 + (height / 2);
      }
    } else {
      // Bottom-anchored: keep bottom surface on ground plane
      mesh.position.y = 0;
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