
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
   * Calculate proportional heights based on financial data
   */
  public calculateProportionalHeights(data: FinancialData): GroupHeights {
    const revenueTotal = data.revenue;
    const expensesTotal = data.expenses;
    const maxValue = Math.max(revenueTotal, expensesTotal);
    
    // Scale to visualization range (0.5 to maxVisualizationHeight)
    const scaleFactor = maxValue > 0 ? (this.maxVisualizationHeight - 0.5) / maxValue : 1;
    
    return {
      revenueTotal: Math.max(0.5, revenueTotal * scaleFactor),
      expensesTotal: Math.max(0.5, expensesTotal * scaleFactor),
      maxHeight: this.maxVisualizationHeight
    };
  }

  /**
   * Update heights based on financial data with smooth animation
   */
  public async updateHeightsFromData(
    data: FinancialData, 
    duration: number = 1000
  ): Promise<void> {
    const heights = this.calculateProportionalHeights(data);
    
    // Calculate individual object heights based on proportions
    const revenueHeight = heights.revenueTotal * 0.8; // 80% for Revenue
    const revenuePLHeight = heights.revenueTotal * 0.2; // 20% for RevenuePL
    const expensesHeight = heights.expensesTotal * 0.8; // 80% for Expenses  
    const expensesPLHeight = heights.expensesTotal * 0.2; // 20% for ExpensesPL

    debugLog.info('financials', `Updating heights - Revenue: ${revenueHeight}, RevenuePL: ${revenuePLHeight}, Expenses: ${expensesHeight}, ExpensesPL: ${expensesPLHeight}`);

    // Animate all heights simultaneously while maintaining anchoring
    const animations = [
      this.animateObjectHeight('Revenue', revenueHeight, 'bottom', duration),
      this.animateObjectHeight('RevenuePL', revenuePLHeight, 'top', duration),
      this.animateObjectHeight('Expenses', expensesHeight, 'bottom', duration),
      this.animateObjectHeight('ExpensesPL', expensesPLHeight, 'top', duration)
    ];

    await Promise.all(animations);
    debugLog.info('financials', 'All height animations completed');
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
      
      // Calculate anchor-preserved positioning
      let targetPosition = startPosition;
      if (anchorType === 'top') {
        // Top-anchored: adjust position to keep top surface fixed
        const heightDiff = targetHeight - startHeight;
        targetPosition = startPosition; // Top surface stays fixed
      } else {
        // Bottom-anchored: position stays the same, bottom surface fixed
        targetPosition = startPosition;
      }

      // Create height animation
      const heightAnimation = new Animation(
        `${objectName}_height`,
        'scaling.y',
        60,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );

      // Create position animation for top-anchored objects
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

      // Position animation keys (for top-anchored objects)
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
      mesh.position.y = originalPos.y;
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
