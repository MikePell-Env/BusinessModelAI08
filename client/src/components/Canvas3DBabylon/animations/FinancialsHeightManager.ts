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
   * Calculate proportional heights based on data while maintaining group totals
   */
  private calculateProportionalHeights(data: FinancialData): GroupHeights {
    // Both groups start with combined height of 2.0 (original GLB models stacked)
    const baseGroupHeight = 2.0;

    // Normalize data for visualization (minimum 0.5 to ensure visibility)
    const normalizedRevenue = Math.max(data.revenue, 0.5);
    const normalizedExpenses = Math.max(data.expenses, 0.5);
    const maxValue = Math.max(normalizedRevenue, normalizedExpenses);

    // Scale groups proportionally while maintaining minimum base height
    const scaleFactor = Math.min(maxValue / Math.max(normalizedRevenue, normalizedExpenses), this.maxVisualizationHeight / baseGroupHeight);

    const revenueTotal = normalizedRevenue * scaleFactor;
    const expensesTotal = normalizedExpenses * scaleFactor;

    return {
      revenueTotal,
      expensesTotal,
      maxHeight: Math.max(revenueTotal, expensesTotal)
    };
  }

  /**
   * Update heights from financial data with smooth animations
   * Maintains proper stacking order: Revenue + RevenuePL, Expenses + ExpensesPL
   */
  public async updateHeightsFromData(
    data: FinancialData,
    duration: number = 1000
  ): Promise<void> {
    const heights = this.calculateProportionalHeights(data);

    // Calculate 80/20 split for each group with proper stacking
    const revenueHeight = heights.revenueTotal * 0.8;
    const revenuePLHeight = heights.revenueTotal * 0.2;
    const expensesHeight = heights.expensesTotal * 0.8;
    const expensesPLHeight = heights.expensesTotal * 0.2;

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

      // Calculate target position based on anchor and height change
      let targetPosition = startPosition;
      if (anchorType === 'top') {
        // For top-anchored objects, adjust position so the top surface stays in place
        // The amount to move up is the difference in height if the new height is greater,
        // or down if the new height is smaller.
        targetPosition = originalPos.y - (targetHeight - startHeight);
      } else {
        // For bottom-anchored objects, the bottom surface stays fixed at its original position.
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
   */
  public setImmediateHeights(data: FinancialData): void {
    const heights = this.calculateProportionalHeights(data);

    const revenueHeight = heights.revenueTotal * 0.8;
    const revenuePLHeight = heights.revenueTotal * 0.2;
    const expensesHeight = heights.expensesTotal * 0.8;
    const expensesPLHeight = heights.expensesTotal * 0.2;

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