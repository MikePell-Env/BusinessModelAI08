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
  
  // Height conversion constant from documentation
  private readonly HEIGHT_SCALE = 500.0;
  
  // Maximum height limits in 3D units
  private readonly MAX_HEIGHT = 2.0;
  private readonly MIN_HEIGHT = 0.2;

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
          const originalHeight = this.calculateMeshHeight(positions);
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
    console.log('📊 Setting financial object heights:', data);
    
    // Convert financial values to 3D heights using HEIGHT_SCALE
    const revenueHeight = Math.min(data.revenue / this.HEIGHT_SCALE, this.MAX_HEIGHT);
    const expensesHeight = Math.max(this.MIN_HEIGHT, Math.min(data.expenses / this.HEIGHT_SCALE, this.MAX_HEIGHT));
    const profitHeight = Math.max(0, Math.min(data.profit / this.HEIGHT_SCALE, this.MAX_HEIGHT * 0.9));
    const lossHeight = 0; // Always 0 in current model
    
    // Apply vertex manipulation to each object
    this.applyVertexHeight('Revenue', revenueHeight, 'bottom');
    this.applyVertexHeight('Expenses', expensesHeight, 'bottom');
    this.applyVertexHeight('ExpensesPL', profitHeight, 'top');
    this.applyVertexHeight('RevenuePL', lossHeight, 'top');
    
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
   * Reset to default heights
   */
  public resetToDefaults(): void {
    const defaultData: FinancialData = {
      revenue: 1000,  // $10M
      expenses: 800,  // $8M
      profit: 200,    // $2M
      loss: 0
    };
    this.setImmediateHeights(defaultData);
  }
}