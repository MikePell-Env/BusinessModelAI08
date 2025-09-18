/**
 * BMC Vertex Manager - Robust vertex manipulation for Business Model Canvas sections
 * Handles complex GLB meshes with proper fallback mechanisms
 * Main goal: Make Key Resources section 2x taller on click with proper error handling
 */

import {
  Scene,
  AbstractMesh,
  Mesh,
  Vector3,
  VertexBuffer,
  TransformNode,
  InstancedMesh,
  BoundingBox
} from '@babylonjs/core';

export class BMCVertexManager {
  private scene: Scene;
  private bmcMeshes: Map<string, AbstractMesh> = new Map();
  private originalVertices: Map<string, Float32Array> = new Map();
  private currentHeights: Map<string, number> = new Map();
  private selectedSection: string | null = null;
  private fallbackTransforms: Map<string, { position: Vector3, scaling: Vector3 }> = new Map();
  private meshTypes: Map<string, 'direct_vertex' | 'transform_scaling' | 'bounding_box'> = new Map();
  
  constructor(scene: Scene) {
    this.scene = scene;
    console.log('✅ 🧪 BMCVertexManager initialized for robust vertex manipulation');
    console.log('✅ 🧪 Scene object:', scene ? 'VALID' : 'NULL');
  }

  /**
   * Register BMC meshes for vertex manipulation with robust handling
   */
  public registerBMCMesh(sectionName: string, mesh: AbstractMesh): void {
    if (this.isBMCSection(sectionName)) {
      this.bmcMeshes.set(sectionName, mesh);
      
      // Store original transform state as fallback
      this.fallbackTransforms.set(sectionName, {
        position: mesh.position.clone(),
        scaling: mesh.scaling.clone()
      });
      
      // Try different vertex access methods
      const manipulationType = this.determineManipulationType(mesh, sectionName);
      this.meshTypes.set(sectionName, manipulationType);
      
      this.currentHeights.set(sectionName, 1.0); // Normal height = 1.0
      console.log(`🔧 Registered BMC section: ${sectionName} using ${manipulationType} manipulation`);
    }
  }

  /**
   * Handle BMC section selection - make Key Resources 2x taller with robust methods
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
      console.log(`📈 SELECTED: Made ${sectionName} 2x taller using robust vertex manipulation`);
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
   * Determine the best manipulation method for this mesh
   */
  private determineManipulationType(mesh: AbstractMesh, sectionName: string): 'direct_vertex' | 'transform_scaling' | 'bounding_box' {
    // Try direct vertex access first (best for precise control)
    if (mesh instanceof Mesh) {
      try {
        const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
        if (positions && positions.length > 0) {
          // Store original vertices for direct manipulation
          this.originalVertices.set(sectionName, new Float32Array(positions));
          console.log(`✅ ${sectionName}: Direct vertex access available (${positions.length} vertices)`);
          return 'direct_vertex';
        }
      } catch (error) {
        console.log(`⚠️ ${sectionName}: Direct vertex access failed:`, error);
      }
    }
    
    // Check if mesh has parent TransformNode (common in GLB files)
    if (mesh.parent instanceof TransformNode) {
      console.log(`✅ ${sectionName}: Using TransformNode scaling (GLB structure)`);
      return 'transform_scaling';
    }
    
    // Fallback to bounding box scaling
    console.log(`✅ ${sectionName}: Using bounding box scaling (fallback)`);
    return 'bounding_box';
  }

  /**
   * Apply height scaling to a section using the appropriate method
   */
  private applySectionHeight(sectionName: string, heightMultiplier: number): void {
    const mesh = this.bmcMeshes.get(sectionName);
    const manipulationType = this.meshTypes.get(sectionName);
    
    if (!mesh || !manipulationType) {
      console.warn(`⚠️ Cannot manipulate ${sectionName}: mesh or manipulation type not found`);
      return;
    }

    try {
      switch (manipulationType) {
        case 'direct_vertex':
          this.applyDirectVertexScaling(mesh, sectionName, heightMultiplier);
          break;
        case 'transform_scaling':
          this.applyTransformNodeScaling(mesh, sectionName, heightMultiplier);
          break;
        case 'bounding_box':
          this.applyBoundingBoxScaling(mesh, sectionName, heightMultiplier);
          break;
      }
      
      this.currentHeights.set(sectionName, heightMultiplier);
      console.log(`🚀 HEIGHT MANIPULATION: ${sectionName} = ${heightMultiplier.toFixed(1)}x using ${manipulationType}`);
      
    } catch (error) {
      console.error(`❌ Failed to apply height to ${sectionName}:`, error);
      // Try fallback method
      this.applyFallbackScaling(mesh, sectionName, heightMultiplier);
    }
  }

  /**
   * Direct vertex manipulation for meshes that expose vertex data
   */
  private applyDirectVertexScaling(mesh: AbstractMesh, sectionName: string, heightMultiplier: number): void {
    const originalPositions = this.originalVertices.get(sectionName);
    if (!originalPositions || !(mesh instanceof Mesh)) {
      throw new Error(`No original vertices for ${sectionName}`);
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
    
    // Apply vertex manipulation - stretch upward from base (bottom-anchored)
    for (let i = 1; i < workingPositions.length; i += 3) {
      const originalY = originalPositions[i];
      const normalizedY = (originalY - minY) / originalHeight; // 0 to 1 from bottom
      
      // Bottom stays fixed, top vertices move up by heightMultiplier
      workingPositions[i] = minY + (normalizedY * originalHeight * heightMultiplier);
    }

    // Update mesh with modified vertices
    mesh.updateVerticesData(VertexBuffer.PositionKind, workingPositions);
    console.log(`🔧 Direct vertex manipulation applied to ${sectionName}`);
  }

  /**
   * TransformNode scaling for GLB meshes with parent nodes
   */
  private applyTransformNodeScaling(mesh: AbstractMesh, sectionName: string, heightMultiplier: number): void {
    if (mesh.parent instanceof TransformNode) {
      const originalTransform = this.fallbackTransforms.get(sectionName);
      if (originalTransform) {
        // Apply scaling to the parent TransformNode (common GLB pattern)
        mesh.parent.scaling.y = originalTransform.scaling.y * heightMultiplier;
        console.log(`🔧 TransformNode scaling applied to ${sectionName}`);
      }
    } else {
      // Apply scaling directly to mesh
      const originalTransform = this.fallbackTransforms.get(sectionName);
      if (originalTransform) {
        mesh.scaling.y = originalTransform.scaling.y * heightMultiplier;
        console.log(`🔧 Direct mesh scaling applied to ${sectionName}`);
      }
    }
  }

  /**
   * Bounding box scaling for complex meshes
   */
  private applyBoundingBoxScaling(mesh: AbstractMesh, sectionName: string, heightMultiplier: number): void {
    const originalTransform = this.fallbackTransforms.get(sectionName);
    if (!originalTransform) {
      throw new Error(`No original transform for ${sectionName}`);
    }
    
    // Get bounding box for bottom-anchored scaling
    const boundingBox = mesh.getBoundingInfo().boundingBox;
    const meshBottom = boundingBox.minimum.y;
    
    // Scale height and adjust position to maintain bottom position
    mesh.scaling.y = originalTransform.scaling.y * heightMultiplier;
    
    // Adjust Y position to keep bottom fixed (bottom-anchored)
    const newBoundingBox = mesh.getBoundingInfo().boundingBox;
    const newBottom = newBoundingBox.minimum.y;
    const yOffset = meshBottom - newBottom;
    mesh.position.y = originalTransform.position.y + yOffset;
    
    console.log(`🔧 Bottom-anchored bounding box scaling applied to ${sectionName}`);
  }

  /**
   * Fallback scaling method when all else fails
   */
  private applyFallbackScaling(mesh: AbstractMesh, sectionName: string, heightMultiplier: number): void {
    console.log(`🔄 Applying fallback scaling to ${sectionName}`);
    
    const originalTransform = this.fallbackTransforms.get(sectionName);
    if (originalTransform) {
      // Simple Y-axis scaling as last resort
      mesh.scaling.y = originalTransform.scaling.y * heightMultiplier;
      this.currentHeights.set(sectionName, heightMultiplier);
      console.log(`⚠️ Fallback scaling applied to ${sectionName}`);
    }
  }

  /**
   * Reset section to normal height (1.0x) using appropriate method
   */
  private resetSectionHeight(sectionName: string): void {
    const mesh = this.bmcMeshes.get(sectionName);
    const manipulationType = this.meshTypes.get(sectionName);
    
    if (!mesh || !manipulationType) {
      console.warn(`⚠️ Cannot reset ${sectionName}: mesh or manipulation type not found`);
      return;
    }

    try {
      switch (manipulationType) {
        case 'direct_vertex':
          this.resetDirectVertexScaling(mesh, sectionName);
          break;
        case 'transform_scaling':
        case 'bounding_box':
          this.resetTransformScaling(mesh, sectionName);
          break;
      }
      
      this.currentHeights.set(sectionName, 1.0);
      console.log(`🔄 RESET: ${sectionName} back to normal height using ${manipulationType}`);
      
    } catch (error) {
      console.error(`❌ Failed to reset ${sectionName}:`, error);
      // Try fallback reset
      this.resetFallback(mesh, sectionName);
    }
  }

  /**
   * Reset direct vertex manipulation
   */
  private resetDirectVertexScaling(mesh: AbstractMesh, sectionName: string): void {
    const originalPositions = this.originalVertices.get(sectionName);
    if (!originalPositions || !(mesh instanceof Mesh)) {
      throw new Error(`No original vertices for ${sectionName}`);
    }

    // Restore original vertex positions
    mesh.updateVerticesData(VertexBuffer.PositionKind, originalPositions);
    console.log(`🔧 Direct vertex reset applied to ${sectionName}`);
  }

  /**
   * Reset transform-based scaling
   */
  private resetTransformScaling(mesh: AbstractMesh, sectionName: string): void {
    const originalTransform = this.fallbackTransforms.get(sectionName);
    if (!originalTransform) {
      throw new Error(`No original transform for ${sectionName}`);
    }
    
    // Reset both position and scaling to original values
    mesh.position.copyFrom(originalTransform.position);
    mesh.scaling.copyFrom(originalTransform.scaling);
    
    // Also reset parent TransformNode if it exists
    if (mesh.parent instanceof TransformNode) {
      mesh.parent.scaling.y = originalTransform.scaling.y;
    }
    
    console.log(`🔧 Transform reset applied to ${sectionName}`);
  }

  /**
   * Fallback reset method
   */
  private resetFallback(mesh: AbstractMesh, sectionName: string): void {
    const originalTransform = this.fallbackTransforms.get(sectionName);
    if (originalTransform) {
      mesh.position.copyFrom(originalTransform.position);
      mesh.scaling.copyFrom(originalTransform.scaling);
      this.currentHeights.set(sectionName, 1.0);
      console.log(`⚠️ Fallback reset applied to ${sectionName}`);
    }
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
   * Get manipulation types for debugging
   */
  public getManipulationTypes(): Map<string, string> {
    return new Map(this.meshTypes);
  }

  /**
   * Dispose of the manager
   */
  public dispose(): void {
    this.bmcMeshes.clear();
    this.originalVertices.clear();
    this.currentHeights.clear();
    this.fallbackTransforms.clear();
    this.meshTypes.clear();
    this.selectedSection = null;
  }
}