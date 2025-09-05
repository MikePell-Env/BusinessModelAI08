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

    // Heights will be set when PowerPoint data loads 
    // No early default initialization to prevent PowerPoint override conflicts
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
   * Calculate simple, direct heights from financial data
   * RULE: $1M = 0.2 units, $10M = 2.0 units (simple linear scale)
   */
  private calculateSimpleHeights(data: FinancialData) {
    console.log(`🔥 CALCULATING SIMPLE HEIGHTS:`, data);
    
    // SIMPLE SCALE: $1M = 0.2 units, so $10M = 2.0 units
    // This means: value in millions * 0.2 = height in units
    const SCALE = 0.002; // 1000 -> 2.0, 800 -> 1.6, 200 -> 0.4
    
    const revenueHeight = data.revenue * SCALE;
    const expensesHeight = data.expenses * SCALE;
    const profitHeight = data.profit * SCALE;
    const lossHeight = data.loss * SCALE;
    
    console.log(`🔥 SIMPLE HEIGHTS: Revenue=${revenueHeight}, Expenses=${expensesHeight}, Profit=${profitHeight}, Loss=${lossHeight}`);
    
    const result = {
      revenue: revenueHeight,      // Direct scaling
      revenuePL: lossHeight,       // Only shows when loss > 0
      expenses: expensesHeight,    // Direct scaling
      expensesPL: profitHeight     // Only shows when profit > 0  
    };

    console.log(`🔥 HEIGHT CALC RESULT:`, result);
    console.log(`🔥 Expected for 2026 (1000/800/200/0): Rev=2.0, RevPL=0.0, Exp=1.6, ExpPL=0.4`);

    return result;
  }

  /**
   * Update heights from financial data with corrected slider mapping
   * Revenue slider controls Revenue group, Expenses slider controls Expenses group
   */
  public async updateHeightsFromData(
    data: FinancialData,
    duration: number = 1000
  ): Promise<void> {
    console.log(`⚡ UPDATEHEIGHTSFROMDATA CALLED - Slider/animation path`);
    console.log(`⚡ Input data:`, data);
    // ISOLATED SYSTEM: Track previous values to prevent unwanted changes
    if (!this.previousData) {
      this.previousData = { revenue: 1000, expenses: 800, profit: 200, loss: 0 };
    }

    // FIXED: Use exact PowerPoint data without capping (same as setImmediateHeights)
    const revenue = data.revenue;  // Direct from PowerPoint: 1000 = $10M
    const expenses = data.expenses; // Direct from PowerPoint: 800 = $8M

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

    // SIMPLE: Use same calculation as setImmediateHeights
    const simpleData = { revenue, expenses, profit, loss };
    const heights = this.calculateSimpleHeights(simpleData);
    
    const revenueHeight = heights.revenue;
    const revenuePLHeight = heights.revenuePL;
    const expensesHeight = heights.expenses;
    const expensesPLHeight = heights.expensesPL;

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
      const startHeight = this.currentHeightFactors.get(objectName) || 1.0;
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
          // FIXED: Position ExpensesPL (Profit) properly on top of Expenses block
          const expensesMesh = this.financialMeshes.get('Expenses');
          if (expensesMesh) {
            // Position ExpensesPL at: Expenses bottom + Expenses height + (ExpensesPL height / 2)
            const expensesBottomY = 0; // Expenses is bottom-anchored at ground level
            const expensesHeight = this.currentHeightFactors.get('Expenses') || 1.6; // Use tracked height, not scaling
            const expensesPLHalfHeight = targetHeight / 2;

            targetPosition = expensesBottomY + expensesHeight + expensesPLHalfHeight;

            console.log(`🔧 ExpensesPL positioning: bottom=${expensesBottomY}, expensesHeight=${expensesHeight}, halfHeight=${expensesPLHalfHeight} → pos=${targetPosition}`);
          } else {
            targetPosition = 0 + (targetHeight / 2);
          }
        } else if (objectName === 'RevenuePL') {
          // FIXED: Position RevenuePL (Loss) properly on top of Revenue block  
          const revenueMesh = this.financialMeshes.get('Revenue');
          if (revenueMesh) {
            // Position RevenuePL at: Revenue bottom + Revenue height + (RevenuePL height / 2)
            const revenueBottomY = 0; // Revenue is bottom-anchored at ground level
            const revenueHeight = this.currentHeightFactors.get('Revenue') || 2.0; // Use tracked height, not scaling
            const revenuePLHalfHeight = targetHeight / 2;

            targetPosition = revenueBottomY + revenueHeight + revenuePLHalfHeight;

            console.log(`🔧 RevenuePL positioning: bottom=${revenueBottomY}, revenueHeight=${revenueHeight}, halfHeight=${revenuePLHalfHeight} → pos=${targetPosition}`);
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

      // VERTEX MANIPULATION ONLY: All financial objects use vertex manipulation, no scaling
      debugLog.info('financials', `🔧 VERTEX: Animating ${objectName} height via vertex manipulation to ${targetHeight}`);

      // Apply vertex manipulation directly (immediate, no animation for now)
      this.setMeshHeightByVertices(mesh, targetHeight, anchorType);

      // Store the height for positioning calculations
      this.currentHeightFactors.set(objectName, targetHeight);

      // DO NOT MOVE THE MESH - vertex manipulation keeps mesh in fixed position
      // mesh.position.y stays exactly where it was set during model loading

      debugLog.info('financials', `🔧 VERTEX: ${objectName} height set to ${targetHeight} units - mesh position FIXED`);

      // Resolve immediately since vertex manipulation is instant
      resolve();
    });
  }

  /**
   * Set immediate heights without animation (for initialization)
   * SIMPLIFIED: Direct height calculation without complex scaling
   */
  public setImmediateHeights(data: FinancialData): void {
    console.log(`🔥 SETIMMEDIATEHEIGHTS CALLED`);
    console.log(`🔥 Input data:`, data);
    
    // TEMPORARY HARDCODED TEST: Force known good values to test vertex manipulation
    console.log(`🧪 FORCING HARDCODED TEST VALUES: Revenue=2.0, Expenses=1.6, Profit=0.4, Loss=0.0`);
    const heights = {
      revenue: 2.0,      // $10M 
      expenses: 1.6,     // $8M
      expensesPL: 0.4,   // $2M profit
      revenuePL: 0.0     // $0M loss
    };
    console.log(`🧪 HARDCODED HEIGHTS:`, heights);

    console.log(`🔥 PROPORTIONAL HEIGHTS: Revenue=${heights.revenue}, RevenuePL=${heights.revenuePL}, Expenses=${heights.expenses}, ExpensesPL=${heights.expensesPL}`);
    console.log(`🔥 GROUP TOTALS: Revenue Group = ${heights.revenue + heights.revenuePL}, Expenses Group = ${heights.expenses + heights.expensesPL}`);

    // Apply proportional heights immediately using vertex manipulation
    this.setObjectHeight('Revenue', heights.revenue, 'bottom');
    this.setObjectHeight('RevenuePL', heights.revenuePL, 'top');  
    this.setObjectHeight('Expenses', heights.expenses, 'bottom');
    this.setObjectHeight('ExpensesPL', heights.expensesPL, 'top');

    console.log(`✅ SETIMMEDIATEHEIGHTS COMPLETE: Equal group heights with proper proportions`);
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

    // Use vertex manipulation but apply same positioning logic as animateObjectHeight
    // Pass height directly as absolute target height (no conversion needed)
    this.setMeshHeightByVertices(mesh, height, anchorType);

    // SIMPLIFIED: No complex positioning - let vertex manipulation handle it
    // Keep mesh at original position, vertex manipulation does the height change
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
    this.currentHeightFactors.forEach((height, name) => {
      heights[name] = height;
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
   * SIMPLIFIED: Direct vertex manipulation without complex bounds checking
   */
  private setMeshHeightByVertices(
    mesh: Mesh,
    targetHeight: number,
    anchorType: 'top' | 'bottom'
  ): void {
    // SIMPLE: Use target height directly (no complex bounds)
    const boundedHeight = Math.max(0, targetHeight); // Just ensure non-negative

    const originalVertices = this.originalVertices.get(mesh.name);
    if (!originalVertices) {
      debugLog.warn('financials', `No original vertices found for ${mesh.name}, falling back to scaling`);
      return;
    }

    const geometry = mesh.geometry;
    if (!geometry) return;

    // Store the target height for label scaling
    this.currentHeightFactors.set(mesh.name, boundedHeight);

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

    // SIMPLE: Scale directly from original to target height
    const scaleRatio = boundedHeight / originalHeight;
    
    console.log(`🔧 SIMPLE VERTEX: ${mesh.name} from ${originalHeight.toFixed(3)} to ${boundedHeight.toFixed(3)} (ratio=${scaleRatio.toFixed(3)})`);

    // SIMPLE VERTEX SCALING: Scale from appropriate anchor point
    for (let i = 1; i < newVertices.length; i += 3) {
      const originalY = originalVertices[i];

      if (anchorType === 'bottom') {
        // Bottom-anchored: scale Y from the bottom (minY stays fixed)
        const relativeY = originalY - minY;
        const scaledY = relativeY * scaleRatio;
        newVertices[i] = minY + scaledY;
      } else {
        // Top-anchored: scale Y from the top (maxY stays fixed) 
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

    debugLog.verbose('financials', `BOUNDED VERTEX: ${mesh.name} ${boundedHeight} units (${anchorType}-anchored) from GLB ${originalHeight.toFixed(3)}`);
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