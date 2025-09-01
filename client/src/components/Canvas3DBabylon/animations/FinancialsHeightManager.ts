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
  EasingFunction,
  StandardMaterial,
  Texture,
  Color3,
  MeshBuilder
} from '@babylonjs/core';
import { debugLog } from '@/lib/debug/DebugLogger';
import { EnvisionerPersistence } from '../core/EnvisionerPersistence';
import { enhanceLabelTexture } from '../utils/BMCUtilities';

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
  
  // Material overlay system for PNG labels
  private originalMaterials: Map<string, StandardMaterial> = new Map();
  private labelsEnabled: boolean = true;
  private testCube: Mesh | null = null;
  private labelPlanes: Map<string, Mesh> = new Map();
  private testLabelPlane: Mesh | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
    this.createGroundPlaneTestCube();
    this.createTestLabelPlane();
    
    // DEBUG: List all meshes in scene to see what's actually there
    setTimeout(() => this.debugSceneMeshes(), 2000);
    setTimeout(() => this.findAndAttachToActualMeshes(), 3000);
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
        
        
        // Create label plane attached to this financial object
        if (this.labelsEnabled) {
          this.createLabelForFinancialObject(mesh);
        }
        
      }
    });
    
    // Apply correct default heights as soon as meshes are registered
    if (this.financialMeshes.size === 4) {
      setTimeout(() => {
        this.setImmediateHeights({
          revenue: 1000,
          expenses: 800,
          profit: 200,
          loss: 0
        });
      }, 10);
    }
  }

  /**
   * Refresh all financial object labels by reapplying overlays
   */
  public refreshAllLabels(): void {
    this.financialMeshes.forEach((mesh, meshName) => {
      if (this.labelsEnabled) {
        this.applyLabelOverlay(mesh);
      }
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
        
        // Label is part of material - no separate update needed
        
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
          
          // Label is part of material - no separate update needed
          
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

    // Label is part of material - no separate update needed
    
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
    
    // Label is part of material - no separate update needed
    
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
   * Create a small test cube using ground plane reference from EnvisionerPersistence
   */
  private createGroundPlaneTestCube(): void {
    const persistence = EnvisionerPersistence.getInstance();
    const groundRef = persistence.getGroundPlaneReference();
    
    if (!groundRef) {
      debugLog.warn('financials', 'No ground plane reference available for test cube');
      return;
    }
    
    // Get master transform to parent the cube correctly
    const masterTransform = persistence.getMasterTransform();
    if (!masterTransform) {
      debugLog.warn('financials', 'No master transform available for test cube');
      return;
    }
    
    // Create small cube
    this.testCube = MeshBuilder.CreateBox("GroundPlaneTestCube", {
      width: 1,
      height: 0.5,
      depth: 1
    }, this.scene);
    
    // CRITICAL: Parent to master transform like financial objects
    this.testCube.parent = masterTransform;
    
    // Position relative to master transform coordinate system
    // Since master transform is at Y=2, and ground plane is at Y=0 relative to master transform
    // Financial objects sit at Y=0.1 relative to master transform
    this.testCube.position.x = 2; // Offset from center
    this.testCube.position.y = 0.35; // Above ground plane (0.1 base + 0.25 cube height)
    this.testCube.position.z = -6; // Move back 2 units from -8 to -6
    
    // Make it bright green so it's clearly visible
    const material = new StandardMaterial("GroundPlaneTestCubeMaterial", this.scene);
    material.diffuseColor = new Color3(0, 1, 0); // Bright green
    material.emissiveColor = new Color3(0, 0.3, 0); // Slight green glow
    this.testCube.material = material;
    
    this.testCube.isPickable = false; // Don't interfere with interactions
    
    debugLog.info('financials', `Test cube created parented to master transform at relative position (${this.testCube.position.x.toFixed(2)}, ${this.testCube.position.y.toFixed(2)}, ${this.testCube.position.z.toFixed(2)})`);
  }

  /**
   * EXPERIMENT: Create a test label plane using exact same method as successful green cube
   */
  private createTestLabelPlane(): void {
    const persistence = EnvisionerPersistence.getInstance();
    const masterTransform = persistence.getMasterTransform();
    
    if (!masterTransform) {
      debugLog.warn('financials', 'No master transform available for test label');
      return;
    }
    
    // Create plane using exact BMC method but positioned like the successful green cube
    this.testLabelPlane = MeshBuilder.CreatePlane("TestLabelPlane", {
      width: 1.0,
      height: 0.5
    }, this.scene);
    
    // CRITICAL: Parent to master transform exactly like green cube
    this.testLabelPlane.parent = masterTransform;
    
    // Position on the front face of the green cube
    this.testLabelPlane.position.x = 2; // Same X as green cube center
    this.testLabelPlane.position.y = 0.35; // Same height as green cube center
    this.testLabelPlane.position.z = -6.5; // Slightly in front of green cube front face
    
    // Create material using exact BMC method with PNG texture
    const material = new StandardMaterial("TestLabelMaterial", this.scene);
    const texture = new Texture("/textures/Label_Revenue.png", this.scene);
    texture.hasAlpha = true;
    enhanceLabelTexture(texture); // Use BMC enhancement
    
    // Apply BMC material settings exactly
    material.diffuseTexture = texture;
    material.emissiveTexture = texture;
    material.emissiveColor = new Color3(1.0, 1.0, 1.0);
    material.alpha = 0.9;
    material.useAlphaFromDiffuseTexture = true;
    material.disableLighting = true;
    material.backFaceCulling = false;
    
    this.testLabelPlane.material = material;
    this.testLabelPlane.isPickable = false;
    
    debugLog.info('financials', `Test label plane created at same position as successful green cube: (${this.testLabelPlane.position.x}, ${this.testLabelPlane.position.y}, ${this.testLabelPlane.position.z})`);
  }

  /**
   * Create PNG label planes using BMC method - positioned close to financial objects
   */
  private createFinancialLabels(): void {
    const persistence = EnvisionerPersistence.getInstance();
    const masterTransform = persistence.getMasterTransform();
    
    if (!masterTransform) {
      debugLog.warn('financials', 'No master transform available for labels');
      return;
    }

    // Label configuration using BMC positioning method
    const labelConfigs = [
      {
        name: 'Revenue',
        texturePath: '/textures/Label_Revenue.png',
        position: { x: -3, y: 1.2, z: -3.8 }, // Close to Revenue object front face
        size: { width: 1.5, height: 0.6 }
      },
      {
        name: 'Expenses', 
        texturePath: '/textures/Label_Expenses.png',
        position: { x: 3, y: 1.2, z: -3.8 }, // Close to Expenses object front face
        size: { width: 1.5, height: 0.6 }
      },
      {
        name: 'Profit',
        texturePath: '/textures/Label_Profit.png', 
        position: { x: 3, y: 2.8, z: -3.8 }, // Close to ExpensesPL object front face
        size: { width: 1.2, height: 0.4 }
      },
      {
        name: 'Loss',
        texturePath: '/textures/Label_Loss.png',
        position: { x: -3, y: 2.8, z: -3.8 }, // Close to RevenuePL object front face
        size: { width: 1.0, height: 0.4 }
      }
    ];

    labelConfigs.forEach(config => {
      try {
        // Create label plane using BMC method
        const labelPlane = MeshBuilder.CreatePlane(`${config.name}FinancialLabel`, {
          width: config.size.width,
          height: config.size.height
        }, this.scene);

        // Position close to object front face
        labelPlane.position.x = config.position.x;
        labelPlane.position.y = config.position.y;
        labelPlane.position.z = config.position.z;

        // Create material using exact BMC method
        const material = new StandardMaterial(`${config.name}FinancialLabelMaterial`, this.scene);
        const texture = new Texture(config.texturePath, this.scene);
        texture.hasAlpha = true;
        enhanceLabelTexture(texture); // Use BMC enhancement function
        
        // Apply BMC material settings
        material.diffuseTexture = texture;
        material.emissiveTexture = texture;
        material.emissiveColor = new Color3(1.0, 1.0, 1.0);
        material.alpha = 0.9; // More opaque than BMC ground labels
        material.useAlphaFromDiffuseTexture = true;
        material.disableLighting = true;
        material.backFaceCulling = false;
        
        labelPlane.material = material;
        labelPlane.isPickable = false;
        labelPlane.parent = masterTransform; // Parent to master transform like BMC
        
        this.labelPlanes.set(config.name, labelPlane);
        
        debugLog.info('financials', `${config.name} label created using BMC method at (${config.position.x}, ${config.position.y}, ${config.position.z})`);
      } catch (error) {
        debugLog.warn('financials', `Failed to create ${config.name} label:`, error);
      }
    });
  }


  /**
   * DEBUG: Examine actual financial object transforms and bounds
   */
  private debugFinancialObjectTransforms(mesh: Mesh): void {
    const meshName = mesh.name;
    
    // Get absolute position in world space
    const worldMatrix = mesh.getWorldMatrix();
    const worldPosition = Vector3.TransformCoordinates(Vector3.Zero(), worldMatrix);
    
    // Get bounding box
    const boundingInfo = mesh.getBoundingInfo();
    const boundingBox = boundingInfo.boundingBox;
    
    // Get mesh transforms
    const position = mesh.position;
    const scaling = mesh.scaling;
    const rotation = mesh.rotation;
    
    console.log(`🔍 ${meshName} TRANSFORMS:
      - Local Position: (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})
      - World Position: (${worldPosition.x.toFixed(2)}, ${worldPosition.y.toFixed(2)}, ${worldPosition.z.toFixed(2)})
      - Scaling: (${scaling.x.toFixed(2)}, ${scaling.y.toFixed(2)}, ${scaling.z.toFixed(2)})
      - Rotation: (${rotation.x.toFixed(2)}, ${rotation.y.toFixed(2)}, ${rotation.z.toFixed(2)})
      - Bounding Min: (${boundingBox.minimumWorld.x.toFixed(2)}, ${boundingBox.minimumWorld.y.toFixed(2)}, ${boundingBox.minimumWorld.z.toFixed(2)})
      - Bounding Max: (${boundingBox.maximumWorld.x.toFixed(2)}, ${boundingBox.maximumWorld.y.toFixed(2)}, ${boundingBox.maximumWorld.z.toFixed(2)})`);
  }

  /**
   * Create label plane attached to financial object using ACTUAL object bounds
   */
  private createLabelForFinancialObject(mesh: Mesh): void {
    const meshName = mesh.name;
    const texturePath = this.getLabelTexturePath(meshName);
    if (!texturePath) return;
    
    // DEBUG: Examine actual transforms first
    this.debugFinancialObjectTransforms(mesh);
    
    try {
      // Get actual bounding box for precise positioning
      const boundingInfo = mesh.getBoundingInfo();
      const boundingBox = boundingInfo.boundingBox;
      const center = boundingBox.centerWorld;
      const size = boundingBox.maximumWorld.subtract(boundingBox.minimumWorld);
      
      // Create label plane
      const labelPlane = MeshBuilder.CreatePlane(`${meshName}Label`, {
        width: Math.min(size.x * 0.8, 1.5), // Scale with object width but cap at 1.5
        height: 0.4
      }, this.scene);
      
      // CRITICAL: Parent to the financial object itself so it tracks with height changes
      labelPlane.parent = mesh;
      
      // Position directly on the front face using bounding box maximums
      // The front face is at the maximum Z coordinate of the bounding box
      const frontZ = boundingBox.maximumWorld.z - boundingBox.minimumWorld.z; // Front face depth
      
      labelPlane.position.x = 0; // Center horizontally on mesh
      labelPlane.position.y = 0; // Center vertically on mesh 
      labelPlane.position.z = frontZ / 2 + 0.01; // Position at front face + tiny offset
      
      // Create material using proven BMC method
      const material = new StandardMaterial(`${meshName}LabelMaterial`, this.scene);
      const texture = new Texture(texturePath, this.scene);
      texture.hasAlpha = true;
      enhanceLabelTexture(texture);
      
      // Apply BMC material settings exactly like test label
      material.diffuseTexture = texture;
      material.emissiveTexture = texture;
      material.emissiveColor = new Color3(1.0, 1.0, 1.0);
      material.alpha = 0.9;
      material.useAlphaFromDiffuseTexture = true;
      material.disableLighting = true;
      material.backFaceCulling = false;
      
      labelPlane.material = material;
      labelPlane.isPickable = false;
      
      this.labelPlanes.set(meshName, labelPlane);
      
      console.log(`📍 Label plane created for ${meshName} using actual bounds - positioned at local (${labelPlane.position.x.toFixed(2)}, ${labelPlane.position.y.toFixed(2)}, ${labelPlane.position.z.toFixed(2)})`);
    } catch (error) {
      debugLog.warn('financials', `Failed to create label for ${meshName}:`, error);
    }
  }
  
  /**
   * DEBUG: List all meshes in the scene to see what financial objects actually exist
   */
  private debugSceneMeshes(): void {
    console.log('🔍 ALL MESHES IN SCENE:');
    this.scene.meshes.forEach(mesh => {
      console.log(`  - ${mesh.name} (${mesh.constructor.name}) at position (${mesh.position.x.toFixed(2)}, ${mesh.position.y.toFixed(2)}, ${mesh.position.z.toFixed(2)})`);
    });
    
    console.log('🔍 REGISTERED FINANCIAL MESHES:');
    this.financialMeshes.forEach((mesh, name) => {
      console.log(`  - ${name}: ${mesh.name} at (${mesh.position.x.toFixed(2)}, ${mesh.position.y.toFixed(2)}, ${mesh.position.z.toFixed(2)})`);
    });
  }
  
  /**
   * Find the actual financial meshes in the scene and attach labels directly to them
   */
  private findAndAttachToActualMeshes(): void {
    console.log('🎯 SEARCHING FOR ACTUAL FINANCIAL MESHES...');
    
    // Look for meshes with financial names
    const financialNames = ['Revenue', 'Expenses', 'RevenuePL', 'ExpensesPL'];
    const foundMeshes: Mesh[] = [];
    
    this.scene.meshes.forEach(mesh => {
      if (mesh instanceof Mesh && financialNames.includes(mesh.name)) {
        foundMeshes.push(mesh);
        console.log(`✅ FOUND: ${mesh.name} at (${mesh.position.x.toFixed(2)}, ${mesh.position.y.toFixed(2)}, ${mesh.position.z.toFixed(2)})`);
        
        // Create label directly on this found mesh
        this.createLabelDirectlyOnMesh(mesh);
      }
    });
    
    if (foundMeshes.length === 0) {
      console.log('❌ NO FINANCIAL MESHES FOUND IN SCENE');
    } else {
      console.log(`✅ Found ${foundMeshes.length} financial meshes`);
    }
  }
  
  /**
   * Create label directly on a found mesh, bypassing the registration system
   */
  private createLabelDirectlyOnMesh(mesh: Mesh): void {
    const meshName = mesh.name;
    const texturePath = this.getLabelTexturePath(meshName);
    if (!texturePath) return;
    
    try {
      // Create label plane with specific size for each object type
      const labelPlane = MeshBuilder.CreatePlane(`${meshName}DirectLabel`, {
        width: 1.0,
        height: 0.3
      }, this.scene);
      
      // Parent directly to the found mesh
      labelPlane.parent = mesh;
      
      // Position on front face - use simple fixed coordinates that should work
      labelPlane.position.x = 0;
      labelPlane.position.y = 0.5; 
      labelPlane.position.z = 0.51; // Just in front
      
      // Create material with PNG texture
      const material = new StandardMaterial(`${meshName}DirectLabelMaterial`, this.scene);
      const texture = new Texture(texturePath, this.scene);
      texture.hasAlpha = true;
      
      material.diffuseTexture = texture;
      material.emissiveTexture = texture;
      material.emissiveColor = new Color3(1.0, 1.0, 1.0);
      material.alpha = 0.9;
      material.useAlphaFromDiffuseTexture = true;
      material.disableLighting = true;
      material.backFaceCulling = false;
      
      labelPlane.material = material;
      labelPlane.isPickable = false;
      
      console.log(`🏷️ DIRECT LABEL created for ${meshName} at position (${labelPlane.position.x}, ${labelPlane.position.y}, ${labelPlane.position.z})`);
      
    } catch (error) {
      console.warn(`❌ Failed to create direct label for ${meshName}:`, error);
    }
  }

  /**
   * Get PNG texture path for financial mesh labels
   */
  private getLabelTexturePath(meshName: string): string | null {
    const labelMap: Record<string, string> = {
      'Revenue': '/textures/Label_Revenue.png',
      'Expenses': '/textures/Label_Expenses.png', 
      'ExpensesPL': '/textures/Label_Profit.png',
      'RevenuePL': '/textures/Label_Loss.png'
    };
    return labelMap[meshName] || null;
  }

  
  /**
   * Enable or disable labels by restoring/applying overlays
   */
  public setLabelsEnabled(enabled: boolean): void {
    this.labelsEnabled = enabled;
    
    if (enabled) {
      // Reapply all label overlays
      this.refreshAllLabels();
    } else {
      // Restore original materials
      this.originalMaterials.forEach((originalMaterial, meshName) => {
        const mesh = this.financialMeshes.get(meshName);
        if (mesh) {
          mesh.material = originalMaterial;
        }
      });
    }
  }

  /**
   * Clean up resources and animations
   */
  public dispose(): void {
    // Stop any ongoing animations
    this.scene.stopAllAnimations();
    
    // Dispose test cube
    if (this.testCube) {
      if (this.testCube.material) {
        this.testCube.material.dispose();
      }
      this.testCube.dispose();
      this.testCube = null;
    }
    
    // Dispose test label plane
    if (this.testLabelPlane) {
      if (this.testLabelPlane.material) {
        this.testLabelPlane.material.dispose();
      }
      this.testLabelPlane.dispose();
      this.testLabelPlane = null;
    }
    
    // Label planes disposed in separate method - they're not needed for direct geometry application
    
    // Restore original materials
    this.originalMaterials.forEach((originalMaterial, meshName) => {
      const mesh = this.financialMeshes.get(meshName);
      if (mesh) {
        mesh.material = originalMaterial;
      }
      originalMaterial.dispose();
    });
    this.originalMaterials.clear();
    
    // Clear maps but keep references intact for safety
    this.financialMeshes.clear();
    this.originalPositions.clear();
    this.originalVertices.clear();
    this.currentHeightFactors.clear();
    
    this.previousData = null;
    
    debugLog.info('financials', 'FinancialsHeightManager disposed');
  }
}