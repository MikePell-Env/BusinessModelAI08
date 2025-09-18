/**
 * BMC Vertex Manager - Direct vertex manipulation for Business Model Canvas sections
 * Quick experiment: Make Key Resources 2x taller on selection using vertex manipulation
 */

import {
  Scene,
  AbstractMesh,
  Mesh,
  Vector3,
  VertexBuffer
} from '@babylonjs/core';

export class BMCVertexManager {
  private scene: Scene;
  private bmcMeshes: Map<string, Mesh> = new Map();
  private originalVertices: Map<string, Float32Array> = new Map();
  private currentHeights: Map<string, number> = new Map();
  private selectedSection: string | null = null;
  
  constructor(scene: Scene) {
    this.scene = scene;
    console.log('✅ BMCVertexManager initialized for vertex manipulation experiments');
  }

  /**
   * Register BMC meshes for vertex manipulation
   */
  public registerBMCMesh(sectionName: string, mesh: AbstractMesh): void {
    if (mesh instanceof Mesh && this.isBMCSection(sectionName)) {
      this.bmcMeshes.set(sectionName, mesh);
      
      // Capture original vertex positions
      const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
      if (positions) {
        this.originalVertices.set(sectionName, new Float32Array(positions));
        this.currentHeights.set(sectionName, 1.0); // Normal height = 1.0
        console.log(`🔧 Registered BMC section: ${sectionName} for vertex manipulation`);
      }
    }
  }

  /**
   * Handle BMC section selection - make Key Resources 2x taller
   */
  public onSectionSelected(sectionName: string): void {
    // If already selected, deselect and reset
    if (this.selectedSection === sectionName) {
      this.resetSectionHeight(sectionName);
      this.selectedSection = null;
      console.log(`📉 DESELECTED: Reset ${sectionName} to normal height`);
      return;
    }

    // Reset previous selection
    if (this.selectedSection) {
      this.resetSectionHeight(this.selectedSection);
    }

    // Apply 2x height to Key Resources only
    if (sectionName === 'Key Resources') {
      this.selectedSection = sectionName;
      this.applySectionHeight(sectionName, 2.0);
      console.log(`📈 SELECTED: Made ${sectionName} 2x taller using vertex manipulation`);
    } else {
      this.selectedSection = null;
      console.log(`⏺️ SELECTED: ${sectionName} (no vertex manipulation applied)`);
    }
  }

  /**
   * Reset section to normal height
   */
  public onSectionDeselected(): void {
    if (this.selectedSection) {
      this.resetSectionHeight(this.selectedSection);
      this.selectedSection = null;
      console.log(`📉 DESELECTED: Reset all sections to normal height`);
    }
  }

  /**
   * Apply height scaling to a section using vertex manipulation
   */
  private applySectionHeight(sectionName: string, heightMultiplier: number): void {
    const mesh = this.bmcMeshes.get(sectionName);
    const originalPositions = this.originalVertices.get(sectionName);
    
    if (!mesh || !originalPositions) {
      console.warn(`⚠️ Cannot manipulate ${sectionName}: mesh or vertices not found`);
      return;
    }

    // Create working copy of vertices
    const workingPositions = new Float32Array(originalPositions);
    
    // Find Y bounds in original vertices
    let minY = Number.MAX_VALUE;
    let maxY = Number.MIN_VALUE;
    
    for (let i = 1; i < originalPositions.length; i += 3) {
      const y = originalPositions[i];
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    
    const originalHeight = maxY - minY;
    
    // Apply vertex manipulation - stretch upward from base
    for (let i = 1; i < workingPositions.length; i += 3) {
      const originalY = originalPositions[i];
      const normalizedY = (originalY - minY) / originalHeight; // 0 to 1 from bottom
      
      // Bottom stays fixed, top vertices move up by heightMultiplier
      workingPositions[i] = minY + (normalizedY * originalHeight * heightMultiplier);
    }

    // Update mesh with modified vertices
    mesh.updateVerticesData(VertexBuffer.PositionKind, workingPositions);
    this.currentHeights.set(sectionName, heightMultiplier);
    
    console.log(`🚀 VERTEX MANIPULATION: ${sectionName} height = ${heightMultiplier.toFixed(1)}x`);
  }

  /**
   * Reset section to normal height (1.0x)
   */
  private resetSectionHeight(sectionName: string): void {
    const mesh = this.bmcMeshes.get(sectionName);
    const originalPositions = this.originalVertices.get(sectionName);
    
    if (!mesh || !originalPositions) {
      return;
    }

    // Restore original vertex positions
    mesh.updateVerticesData(VertexBuffer.PositionKind, originalPositions);
    this.currentHeights.set(sectionName, 1.0);
    
    console.log(`🔄 RESET: ${sectionName} back to normal height`);
  }

  /**
   * Check if this is a BMC section we handle
   */
  private isBMCSection(sectionName: string): boolean {
    const bmcSections = [
      'Value Propositions', 'Key Partners', 'Key Activities', 'Key Resources',
      'Customer Relationships', 'CustomerChannels', 'Customer Segments'
    ];
    return bmcSections.includes(sectionName);
  }

  /**
   * Get current section heights for debugging
   */
  public getCurrentHeights(): Map<string, number> {
    return new Map(this.currentHeights);
  }

  /**
   * Dispose of the manager
   */
  public dispose(): void {
    this.bmcMeshes.clear();
    this.originalVertices.clear();
    this.currentHeights.clear();
    this.selectedSection = null;
  }
}