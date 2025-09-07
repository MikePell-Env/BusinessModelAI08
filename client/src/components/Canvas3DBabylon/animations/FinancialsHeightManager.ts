/**
 * Financials Height Manager - PURE VERTEX MANIPULATION VERSION
 * Uses DIRECT vertex buffer modifications ONLY - no Transform scaling
 * Simplified and reliable system as requested
 */

import {
  Scene,
  AbstractMesh,
  Mesh,
  Vector3,
  VertexBuffer
} from '@babylonjs/core';

export interface FinancialData {
  revenue: number;    // Value in units (1000 = $10M)
  expenses: number;   // Value in units (100-1000 = $1M-$10M)
  profit: number;     // Calculated: revenue - expenses
  loss: number;       // Always 0 in current model
}

export class FinancialsHeightManager {
  private scene: Scene;
  private financialMeshes: Map<string, Mesh> = new Map();
  private originalVertices: Map<string, Float32Array> = new Map();
  private currentHeights: Map<string, number> = new Map();
  private labelPlanes: Map<string, any> = new Map(); // Store label planes for repositioning
  
  // LABEL VISIBILITY FEATURE - REVERTABLE: Store current financial data for visibility logic
  private currentFinancialData: FinancialData | null = null;
  
  // Much smaller height mapping for proper visualization scale
  private readonly MILLION_TO_HEIGHT = 0.06; // $1M = 0.06 units, $10M = 0.6 units, $50M = 3.0 units (2x taller than before)
  
  // Maximum height limits in 3D units  
  private readonly MAX_HEIGHT = 2.0; // Increased to accommodate 2x taller blocks
  private readonly MIN_HEIGHT = 0.005; // Minimum visible height

  constructor(scene: Scene) {
    this.scene = scene;
    console.log('✅ FinancialsHeightManager initialized - PURE VERTEX MANIPULATION VERSION');
  }

  /**
   * Register financial meshes and capture their original vertex data
   */
  public registerFinancialMeshes(meshes: AbstractMesh[]): void {
    console.log('📊 Registering financial meshes for vertex manipulation');
    
    meshes.forEach(mesh => {
      if (mesh instanceof Mesh && this.isFinancialMesh(mesh.name)) {
        this.financialMeshes.set(mesh.name, mesh);
        
        // Capture original vertex positions for manipulation
        const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
        if (positions) {
          // Store a copy of original positions
          const posArray = positions instanceof Float32Array ? positions : new Float32Array(positions);
          this.originalVertices.set(mesh.name, posArray);
          
          // Calculate and store original height
          const originalHeight = this.calculateMeshHeight(posArray);
          this.currentHeights.set(mesh.name, originalHeight);
          
          // Make mesh updatable for vertex manipulation
          mesh.setVerticesData(VertexBuffer.PositionKind, Array.from(positions), true);
          
          console.log(`✅ Registered ${mesh.name}: height=${originalHeight.toFixed(3)} units, vertices=${positions.length/3}`);
        }
      }
    });
  }

  /**
   * Update heights using DIRECT vertex manipulation
   * This is the MAIN method that applies financial data to 3D visualization
   */
  public setImmediateHeights(data: FinancialData): void {
    console.log('📊 Setting financial object heights (raw values):', data);
    
    // Simple direct conversion: value in units / 100 = millions, then * 0.1 = height
    // Example: 1000 units = $10M = 1.0 height units
    const revenueHeight = Math.min((data.revenue / 100) * this.MILLION_TO_HEIGHT, this.MAX_HEIGHT);
    const expensesHeight = Math.max(this.MIN_HEIGHT, Math.min((data.expenses / 100) * this.MILLION_TO_HEIGHT, this.MAX_HEIGHT));
    const profitHeight = Math.max(0, Math.min((data.profit / 100) * this.MILLION_TO_HEIGHT, this.MAX_HEIGHT));
    const lossHeight = Math.max(0, Math.min((data.loss / 100) * this.MILLION_TO_HEIGHT, this.MAX_HEIGHT));
    
    console.log('📊 Calculated heights:', {
      revenue: `${revenueHeight.toFixed(3)} units ($${(data.revenue/100).toFixed(0)}M)`,
      expenses: `${expensesHeight.toFixed(3)} units ($${(data.expenses/100).toFixed(0)}M)`,
      profit: `${profitHeight.toFixed(3)} units ($${(data.profit/100).toFixed(0)}M)`,
      loss: `${lossHeight.toFixed(3)} units ($${(data.loss/100).toFixed(0)}M)`
    });
    
    // Apply vertex manipulation to each object
    // First, update bottom-anchored objects
    this.applyVertexHeight('Revenue', revenueHeight, 'bottom');
    this.applyVertexHeight('Expenses', expensesHeight, 'bottom');
    
    // Then, position top-anchored objects to stack on their base objects
    this.applyStackedHeight('ExpensesPL', profitHeight, 'Expenses');
    this.applyStackedHeight('RevenuePL', lossHeight, 'Revenue');
    
    // LABEL VISIBILITY FEATURE - REVERTABLE: Store data and update visibility
    this.currentFinancialData = data;
    
    // Update label positions to stay centered on front faces
    // Add small delay to ensure vertex buffer updates are complete
    setTimeout(() => {
      this.updateLabelPositions();
      // LABEL VISIBILITY FEATURE - REVERTABLE: Update label visibility based on $1M threshold
      this.updateLabelVisibility();
    }, 50);
    
    console.log('✅ Financial heights applied via vertex manipulation');
  }

  /**
   * Apply height to a mesh using DIRECT vertex buffer manipulation
   */
  private applyVertexHeight(meshName: string, targetHeight: number, anchorType: 'top' | 'bottom'): void {
    const mesh = this.financialMeshes.get(meshName);
    const originalPositions = this.originalVertices.get(meshName);
    
    if (!mesh || !originalPositions) {
      console.warn(`⚠️ Cannot apply height to ${meshName}: mesh or vertices not found`);
      return;
    }
    
    // Get current vertex positions
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
    if (!positions) return;
    
    // Calculate original bounds
    let minY = Number.MAX_VALUE;
    let maxY = Number.MIN_VALUE;
    for (let i = 1; i < originalPositions.length; i += 3) {
      minY = Math.min(minY, originalPositions[i]);
      maxY = Math.max(maxY, originalPositions[i]);
    }
    const originalHeight = maxY - minY;
    
    // Calculate scale factor for height
    const scaleFactor = originalHeight > 0 ? targetHeight / originalHeight : 1;
    
    // Apply vertex manipulation based on anchor type
    if (anchorType === 'bottom') {
      // Bottom-anchored: Keep bottom vertices fixed, scale top vertices
      for (let i = 1; i < positions.length; i += 3) {
        const originalY = originalPositions[i];
        const normalizedY = (originalY - minY) / originalHeight; // 0 to 1
        positions[i] = minY + (normalizedY * targetHeight);
      }
    } else {
      // Top-anchored: Keep top vertices fixed, scale bottom vertices
      for (let i = 1; i < positions.length; i += 3) {
        const originalY = originalPositions[i];
        const normalizedY = (maxY - originalY) / originalHeight; // 0 to 1 from top
        positions[i] = maxY - (normalizedY * targetHeight);
      }
    }
    
    // Update the vertex buffer with new positions
    mesh.updateVerticesData(VertexBuffer.PositionKind, positions);
    
    // Store current height for reference
    this.currentHeights.set(meshName, targetHeight);
    
    console.log(`✅ ${meshName} height set to ${targetHeight.toFixed(3)} via vertex manipulation`);
  }

  /**
   * Apply height to a top-anchored mesh that stacks on top of a base mesh
   */
  private applyStackedHeight(meshName: string, targetHeight: number, baseMeshName: string): void {
    const mesh = this.financialMeshes.get(meshName);
    const baseMesh = this.financialMeshes.get(baseMeshName);
    const originalPositions = this.originalVertices.get(meshName);
    
    if (!mesh || !baseMesh || !originalPositions) {
      console.warn(`⚠️ Cannot apply stacked height to ${meshName}: mesh or base mesh not found`);
      return;
    }
    
    // Get the current top of the base mesh
    const basePositions = baseMesh.getVerticesData(VertexBuffer.PositionKind);
    if (!basePositions) return;
    
    let baseMaxY = Number.MIN_VALUE;
    for (let i = 1; i < basePositions.length; i += 3) {
      baseMaxY = Math.max(baseMaxY, basePositions[i]);
    }
    
    // Get current vertex positions
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
    if (!positions) return;
    
    // Calculate original bounds
    let minY = Number.MAX_VALUE;
    let maxY = Number.MIN_VALUE;
    for (let i = 1; i < originalPositions.length; i += 3) {
      minY = Math.min(minY, originalPositions[i]);
      maxY = Math.max(maxY, originalPositions[i]);
    }
    const originalHeight = maxY - minY;
    
    // Position the mesh to start above the base mesh (0.03 gap for optimal visual separation)
    const newMinY = baseMaxY + 0.03;
    
    // Apply vertex manipulation - scale and position to stack on base
    for (let i = 1; i < positions.length; i += 3) {
      const originalY = originalPositions[i];
      const normalizedY = (originalY - minY) / originalHeight; // 0 to 1 from bottom
      positions[i] = newMinY + (normalizedY * targetHeight);
    }
    
    // Update the vertex buffer with new positions
    mesh.updateVerticesData(VertexBuffer.PositionKind, positions);
    
    // Store current height for reference
    this.currentHeights.set(meshName, targetHeight);
    
    console.log(`✅ ${meshName} stacked on ${baseMeshName} with height ${targetHeight.toFixed(3)}`);
  }

  /**
   * Update from business data with optional animation (simplified)
   */
  public async updateHeightsFromData(data: FinancialData, animate: boolean = true): Promise<void> {
    // For now, just apply immediately - animation can be added later if needed
    this.setImmediateHeights(data);
  }

  /**
   * Calculate mesh height from vertex positions
   */
  private calculateMeshHeight(positions: Float32Array): number {
    let minY = Number.MAX_VALUE;
    let maxY = Number.MIN_VALUE;
    
    for (let i = 1; i < positions.length; i += 3) {
      minY = Math.min(minY, positions[i]);
      maxY = Math.max(maxY, positions[i]);
    }
    
    return maxY - minY;
  }

  /**
   * Check if mesh is a financial object
   */
  private isFinancialMesh(name: string): boolean {
    return ['Revenue', 'RevenuePL', 'Expenses', 'ExpensesPL'].includes(name);
  }

  /**
   * Register label planes for dynamic positioning
   */
  public registerLabelPlane(meshName: string, labelPlane: any): void {
    this.labelPlanes.set(meshName, labelPlane);
    console.log(`🏷️ Registered label plane for ${meshName}`);
  }

  /**
   * Update label positions to center on front faces of blocks
   */
  private updateLabelPositions(): void {
    this.labelPlanes.forEach((labelPlane, meshName) => {
      const mesh = this.financialMeshes.get(meshName);
      if (!mesh || !labelPlane) return;

      // Force bounding box recalculation after vertex manipulation
      mesh.refreshBoundingInfo();
      const boundingInfo = mesh.getBoundingInfo();
      const center = boundingInfo.boundingBox.center;
      const size = boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum);

      // Position label in center of front face (FIXED: was back edge, now front)
      labelPlane.position.x = center.x;
      labelPlane.position.y = center.y; // Center vertically on the block
      labelPlane.position.z = center.z - size.z * 0.5 - 0.01; // FRONT face + slight offset forward

      console.log(`🏷️ Updated label position for ${meshName}: y=${center.y.toFixed(3)}, z=${labelPlane.position.z.toFixed(3)} (front face)`);
    });
  }

  /**
   * LABEL VISIBILITY FEATURE - REVERTABLE: Update label visibility based on $1M threshold
   * Hide labels when values ≤ $1M (≤ 100 raw units), show when > $1M (> 100 raw units)
   */
  private updateLabelVisibility(): void {
    if (!this.currentFinancialData) return;
    
    const data = this.currentFinancialData;
    const THRESHOLD = 100; // $1M threshold in raw units
    
    // Map mesh names to their corresponding data values
    const valueMap: Record<string, number> = {
      'Revenue': data.revenue,
      'Expenses': data.expenses,
      'ExpensesPL': data.profit,  // ExpensesPL shows profit
      'RevenuePL': data.loss      // RevenuePL shows loss
    };
    
    this.labelPlanes.forEach((labelPlane, meshName) => {
      if (!labelPlane) return;
      
      const value = valueMap[meshName];
      if (value === undefined) return;
      
      // Hide if value < $1M, show if >= $1M
      const shouldShow = value >= THRESHOLD;
      labelPlane.setEnabled(shouldShow);
      
      // Log visibility changes for debugging
      const millionValue = (value / 100).toFixed(0);
      console.log(`🏷️ VISIBILITY: ${meshName} ($${millionValue}M) - ${shouldShow ? 'SHOWN' : 'HIDDEN'}`);
    });
  }

  /**
   * Get current heights for debugging
   */
  public getCurrentHeights(): Record<string, number> {
    const heights: Record<string, number> = {};
    this.currentHeights.forEach((height, name) => {
      heights[name] = height;
    });
    return heights;
  }

  /**
   * Reset to 2026 data (PRESENT year)
   */
  public resetToDefaults(): void {
    const defaultData: FinancialData = {
      revenue: 1000,  // $10M for 2026
      expenses: 800,  // $8M for 2026
      profit: 200,    // $2M profit for 2026
      loss: 0         // No loss in 2026
    };
    console.log('🔄 Resetting to 2026 (PRESENT) defaults');
    this.setImmediateHeights(defaultData);
  }
}