/**
 * Simple, Reliable Click Handler for BMC 3D Visualization
 * Based on Babylon.js 2025 best practices using only onPointerObservable
 * Avoids ActionManager conflicts and performance issues
 */

import { 
  Scene,
  AbstractMesh,
  PointerEventTypes,
  Vector3
} from '@babylonjs/core';

interface ClickHandlerCallbacks {
  onSingleClick?: (meshName: string, mesh: AbstractMesh) => void;
  onDoubleClick?: (meshName: string, mesh: AbstractMesh, position: Vector3) => void;
  onHoverEnter?: (meshName: string, mesh: AbstractMesh) => void;
  onHoverExit?: (meshName: string, mesh: AbstractMesh) => void;
  onBackgroundClick?: () => void;
}

export class SimpleClickHandler {
  private scene: Scene;
  private callbacks: ClickHandlerCallbacks = {};
  private meshRegistry: Set<AbstractMesh> = new Set();
  
  // Click timing for double-click detection
  private lastClickTime = 0;
  private lastClickedMesh: AbstractMesh | null = null;
  private doubleClickThreshold = 300; // ms
  private singleClickTimer: number | null = null;
  
  // Hover tracking
  private currentHoveredMesh: AbstractMesh | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
    this.setupPointerEvents();
    console.log('✅ SimpleClickHandler initialized');
  }

  /**
   * Register callbacks for interactions
   */
  setCallbacks(callbacks: ClickHandlerCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Register a mesh for interactions
   */
  registerMesh(mesh: AbstractMesh): void {
    mesh.isPickable = true;
    this.meshRegistry.add(mesh);
    console.log(`🎯 Registered mesh for interaction: ${mesh.name}`);
  }

  /**
   * Unregister a mesh from interactions
   */
  unregisterMesh(mesh: AbstractMesh): void {
    this.meshRegistry.delete(mesh);
  }

  /**
   * Setup the main pointer event handler using modern best practices
   */
  private setupPointerEvents(): void {
    this.scene.onPointerObservable.add((pointerInfo) => {
      switch (pointerInfo.type) {
        case PointerEventTypes.POINTERPICK:
          this.handlePointerPick(pointerInfo);
          break;
        case PointerEventTypes.POINTERMOVE:
          this.handlePointerMove(pointerInfo);
          break;
      }
    });
  }

  /**
   * Handle pointer pick events (clicks)
   */
  private handlePointerPick(pointerInfo: any): void {
    const pickInfo = pointerInfo.pickInfo;
    
    if (pickInfo.hit && pickInfo.pickedMesh) {
      const mesh = pickInfo.pickedMesh;
      
      // Only handle registered meshes
      if (this.meshRegistry.has(mesh)) {
        this.handleMeshClick(mesh, pickInfo.pickedPoint);
      }
    } else {
      // Background click
      this.handleBackgroundClick();
    }
  }

  /**
   * Handle mesh click with double-click detection
   */
  private handleMeshClick(mesh: AbstractMesh, position: Vector3): void {
    const currentTime = Date.now();
    const timeSinceLastClick = currentTime - this.lastClickTime;
    
    console.log(`🖱️ Click on ${mesh.name}, time since last: ${timeSinceLastClick}ms`);

    // Check for double-click
    if (
      timeSinceLastClick < this.doubleClickThreshold && 
      this.lastClickedMesh === mesh &&
      timeSinceLastClick > 50 // Prevent accidental rapid clicks
    ) {
      // Double-click detected
      console.log(`🖱️🖱️ Double-click on ${mesh.name}`);
      
      // Cancel any pending single-click
      if (this.singleClickTimer) {
        clearTimeout(this.singleClickTimer);
        this.singleClickTimer = null;
      }
      
      // Execute double-click callback
      if (this.callbacks.onDoubleClick) {
        this.callbacks.onDoubleClick(mesh.name, mesh, position);
      }
      
      // Reset click tracking
      this.lastClickTime = 0;
      this.lastClickedMesh = null;
    } else {
      // Potential single-click - wait for double-click timeout
      this.lastClickTime = currentTime;
      this.lastClickedMesh = mesh;
      
      // Cancel any existing timer
      if (this.singleClickTimer) {
        clearTimeout(this.singleClickTimer);
      }
      
      // Set timer for single-click
      this.singleClickTimer = window.setTimeout(() => {
        console.log(`🖱️ Single-click confirmed for ${mesh.name}`);
        
        if (this.callbacks.onSingleClick) {
          this.callbacks.onSingleClick(mesh.name, mesh);
        }
        
        this.singleClickTimer = null;
      }, this.doubleClickThreshold);
    }
  }

  /**
   * Handle background click (empty space)
   */
  private handleBackgroundClick(): void {
    console.log('🖱️ Background click');
    
    if (this.callbacks.onBackgroundClick) {
      this.callbacks.onBackgroundClick();
    }
  }

  /**
   * Handle pointer move for hover effects
   */
  private handlePointerMove(pointerInfo: any): void {
    const pickInfo = pointerInfo.pickInfo;
    let hoveredMesh: AbstractMesh | null = null;
    
    if (pickInfo.hit && pickInfo.pickedMesh && this.meshRegistry.has(pickInfo.pickedMesh)) {
      hoveredMesh = pickInfo.pickedMesh;
    }
    
    // Check if hover state changed
    if (hoveredMesh !== this.currentHoveredMesh) {
      // Exit previous hover
      if (this.currentHoveredMesh && this.callbacks.onHoverExit) {
        console.log(`🖱️ Hover exit: ${this.currentHoveredMesh.name}`);
        this.callbacks.onHoverExit(this.currentHoveredMesh.name, this.currentHoveredMesh);
      }
      
      // Enter new hover
      if (hoveredMesh && this.callbacks.onHoverEnter) {
        console.log(`🖱️ Hover enter: ${hoveredMesh.name}`);
        this.callbacks.onHoverEnter(hoveredMesh.name, hoveredMesh);
      }
      
      this.currentHoveredMesh = hoveredMesh;
    }
  }

  /**
   * Get debug information
   */
  getDebugInfo(): any {
    return {
      registeredMeshes: this.meshRegistry.size,
      currentHoveredMesh: this.currentHoveredMesh?.name || null,
      lastClickedMesh: this.lastClickedMesh?.name || null,
      pendingSingleClick: this.singleClickTimer !== null
    };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.singleClickTimer) {
      clearTimeout(this.singleClickTimer);
    }
    
    this.meshRegistry.clear();
    this.currentHoveredMesh = null;
    this.lastClickedMesh = null;
    
    console.log('🧹 SimpleClickHandler disposed');
  }
}