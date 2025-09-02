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
  private baseHeight: number = 2.0;
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
    
    // this.createGroundPlaneTestCube(); // Hidden but code preserved
    // this.createTestLabelPlane(); // Hidden but code preserved
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
    
    // Heights will be set when PowerPoint data loads or sliders are used
    // No early default initialization to prevent incorrect tall geometry
    
    // Apply correct PowerPoint-based defaults after short delay for mesh stability
    if (this.financialMeshes.size === 4) {
      setTimeout(() => {
        // Use PowerPoint 2026 values: Revenue $10M, Expenses $8M 
        this.setImmediateHeights({
          revenue: 1000,  // $10M → 2.0 units height 
          expenses: 800,  // $8M → 1.6 units height
          profit: 200,    // $2M → 0.4 units height
          loss: 0         // $0M → 0.0 units height
        });
        console.log(`🚀 INITIALIZED: Applied PowerPoint-based heights after mesh registration`);
      }, 100);
    }
  }

  /**
   * Refresh all financial object labels 
   */
  public refreshAllLabels(): void {
    // Labels are now created independently via scene mesh detection
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
      
      // DEBUG: Check original vertex Y bounds from GLB
      let minY = Number.MAX_VALUE;
      let maxY = Number.MIN_VALUE;
      for (let i = 1; i < vertexData.length; i += 3) {
        const y = vertexData[i];
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
      const originalHeight = maxY - minY;
      console.log(`🔧 GLB VERTEX DEBUG: ${mesh.name} original height = ${originalHeight.toFixed(3)} units (minY: ${minY.toFixed(3)}, maxY: ${maxY.toFixed(3)})`);
    }
  }

  /**
   * Calculate balanced heights based on income statement logic
   * Maintains visual balance: both sides always have equal total height
   */
  private calculateProportionalHeights(data: FinancialData): GroupHeights {
    const baseHeight = 2.0; // Base visualization height (matches this.baseHeight)
    
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
    
    // BUSINESS LOGIC: Profit/Loss = Revenue - Expenses with mutual exclusivity
    // When Profit exists, Loss = 0. When Loss exists, Profit = 0.
    const difference = revenue - expenses;
    const profit = difference > 0 ? difference : 0;  // Positive difference = Profit
    const loss = difference < 0 ? Math.abs(difference) : 0;  // Negative difference = Loss
    
    // DEBUG: Log business calculations
    debugLog.info('financials', `Business Logic: Revenue=${revenue}, Expenses=${expenses}, Difference=${difference}`);
    debugLog.info('financials', `Calculated: Profit=${profit}, Loss=${loss} (mutual exclusivity enforced)`);
    
    // VERIFICATION: Ensure mutual exclusivity
    if (profit > 0 && loss > 0) {
      debugLog.warn('financials', 'ERROR: Both profit and loss are > 0, mutual exclusivity violated!');
    }
    
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
      animations.push(this.animateObjectHeight('Revenue', revenueHeight, 'bottom', duration));
    }
    
    // RevenuePL (Loss) object updates (when loss amount changes due to revenue OR expenses)
    if (lossChanged) {
      animations.push(this.animateObjectHeight('RevenuePL', revenuePLHeight, 'top', duration));
    }
    
    // Expenses object updates (when Expenses slider moves)
    if (expensesChanged) {
      animations.push(this.animateObjectHeight('Expenses', expensesHeight, 'bottom', duration));
    }
    
    // ExpensesPL (Profit) object updates (when profit amount changes due to revenue OR expenses)
    if (profitChanged) {
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
        
        // Pass target height directly (absolute units, not relative factor)
        const targetHeightAbsolute = targetHeight;
        
        // Apply vertex manipulation directly (immediate, no animation for now)
        this.setMeshHeightByVertices(mesh, targetHeightAbsolute, anchorType);
        
        // Label is part of material - no separate update needed
        
        // DO NOT MOVE THE MESH - vertex manipulation keeps mesh in fixed position
        // mesh.position.y stays exactly where it was set during model loading
        
        debugLog.info('financials', `🔧 VERTEX: ${objectName} height set to ${targetHeightAbsolute} units (target: ${targetHeight}) - mesh position FIXED`);
        
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
    
    console.log(`🔧 INITIALIZATION HEIGHT DEBUG:`);
    console.log(`🔧 Input: Revenue=${revenue}, Expenses=${expenses}, Profit=${profit}, Loss=${loss}`);
    console.log(`🔧 Heights: Revenue=${revenueHeight} units, Expenses=${expensesHeight} units`);
    console.log(`🔧 Heights: ExpensesPL=${expensesPLHeight} units, RevenuePL=${revenuePLHeight} units`);
    

    // FORCE INITIAL SETUP: Always set heights on first call (initialization)
    const isInitialization = this.previousData.revenue === 1000 && this.previousData.expenses === 800;
    
    if (this.previousData.revenue !== revenue || isInitialization) {
      this.setObjectHeight('Revenue', revenueHeight, 'bottom');
    }
    
    if (this.previousData.loss !== loss || isInitialization) {
      this.setObjectHeight('RevenuePL', revenuePLHeight, 'top');
    }
    
    if (this.previousData.expenses !== expenses || isInitialization) {
      this.setObjectHeight('Expenses', expensesHeight, 'bottom');
    }
    
    if (this.previousData.profit !== profit || isInitialization) {
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
    // Pass height directly as absolute target height (no conversion needed)
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

  /**
   * Update label position after vertex manipulation changes bounding box
   */
  private updateLabelPosition(mesh: Mesh): void {
    // Find the label plane for this mesh
    const labelPlane = this.scene.meshes.find(m => 
      m.name === `${mesh.name}Label` && m.parent === mesh
    ) as Mesh;
    
    if (!labelPlane) return;

    // Recalculate position based on NEW bounding box after vertex manipulation
    const boundingInfo = mesh.getBoundingInfo();
    const center = boundingInfo.boundingBox.center;
    const size = boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum);

    // Calculate new local position relative to mesh position
    const localX = center.x - mesh.position.x;
    const localY = center.y - mesh.position.y;
    const localZ = (center.z - size.z * 0.5) - mesh.position.z;

    // Apply fine-tuning adjustments
    let adjustedLocalY = localY;
    if (mesh.name === "Revenue" || mesh.name === "Expenses") {
      adjustedLocalY = localY + 0.05;
    } else if (mesh.name === "ExpensesPL" || mesh.name === "RevenuePL") {
      adjustedLocalY = localY - 0.05;
    }

    // Additional positioning adjustment for small objects (< 20% height)
    const meshHeight = boundingInfo.boundingBox.maximum.y - boundingInfo.boundingBox.minimum.y;
    const heightPercentage = (meshHeight / 2.0) * 100; // 2.0 is max height
    
    if (heightPercentage < 20) {
      if (mesh.name === "ExpensesPL" || mesh.name === "RevenuePL") {
        // Profit or Loss: move UP slightly
        adjustedLocalY += 0.03;
      } else if (mesh.name === "Revenue" || mesh.name === "Expenses") {
        // Revenue or Expenses: move DOWN slightly  
        adjustedLocalY -= 0.03;
      }
    }

    // Update label position
    labelPlane.position.x = localX;
    labelPlane.position.y = adjustedLocalY;
    labelPlane.position.z = localZ - 0.01;

    // Simple 1% visibility threshold - hide labels when objects get too small
    const shouldBeVisible = meshHeight > 0.02; // 1% threshold (2.0 * 0.01 = 0.02)
    labelPlane.setEnabled(shouldBeVisible);

    debugLog.verbose('financials', `Updated ${mesh.name} label position after vertex manipulation`);
  }


  private isFinancialMesh(name: string): boolean {
    return ['Revenue', 'RevenuePL', 'Expenses', 'ExpensesPL'].includes(name);
  }


  /**
   * Manipulate mesh height using direct vertex modification instead of scaling
   */
  private setMeshHeightByVertices(
    mesh: Mesh,
    targetHeight: number,
    anchorType: 'top' | 'bottom'
  ): void {
    const originalVertices = this.originalVertices.get(mesh.name);
    if (!originalVertices) {
      debugLog.warn('financials', `No original vertices found for ${mesh.name}, falling back to scaling`);
      return;
    }

    const geometry = mesh.geometry;
    if (!geometry) return;

    // Store the target height for label scaling
    this.currentHeightFactors.set(mesh.name, targetHeight);

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
    
    // ABSOLUTE HEIGHT SCALING: Scale to exact target height regardless of original mesh size
    // targetHeight is the ABSOLUTE target height (e.g., 2.0 units for $10M revenue)
    // We need to scale the original mesh to fit this exact height
    
    const targetAbsoluteHeight = targetHeight; // Direct target height in units
    const scaleRatio = targetAbsoluteHeight / originalHeight; // Scale to exact target height
    
    // Calculate the VISUAL scaling factor for labels 
    const visualStretchFactor = originalHeight / targetAbsoluteHeight;
    
    // Store the VISUAL stretch factor for label correction
    this.currentHeightFactors.set(mesh.name, visualStretchFactor);
    
    // Label is part of material - no separate update needed
    
    // Modify vertices based on anchor type - ABSOLUTE height scaling
    for (let i = 1; i < newVertices.length; i += 3) {
      const originalY = originalVertices[i];
      
      if (anchorType === 'bottom') {
        // Bottom-anchored: scale Y from the bottom (minY stays fixed)
        // Scale to exact target height
        const relativeY = originalY - minY;
        const scaledY = relativeY * scaleRatio;
        newVertices[i] = minY + scaledY;
      } else {
        // Top-anchored: scale Y from the top (maxY stays fixed) 
        // Scale to exact target height  
        const relativeY = maxY - originalY;
        const scaledY = relativeY * scaleRatio;
        newVertices[i] = maxY - scaledY;
      }
    }

    // Update the mesh geometry
    geometry.setVerticesData('position', newVertices);
    mesh.computeWorldMatrix(true);
    mesh.refreshBoundingInfo();

    // Update label position after vertex manipulation
    this.updateLabelPosition(mesh);

    debugLog.verbose('financials', `Vertex manipulation: ${mesh.name} height ${targetHeight} units (${anchorType}-anchored)`);
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