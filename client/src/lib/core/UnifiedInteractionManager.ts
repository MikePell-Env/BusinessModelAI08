import { Scene, PointerEventTypes, AbstractMesh, Vector3 } from '@babylonjs/core';

export interface InteractionCallbacks {
  onSingleClick: (sectionId: string, mesh: AbstractMesh) => void;
  onDoubleClick: (sectionId: string, mesh: AbstractMesh, position: Vector3) => void;
  onHoverEnter: (sectionId: string, mesh: AbstractMesh) => void;
  onHoverExit: (sectionId: string, mesh: AbstractMesh) => void;
  onBackgroundClick: () => void;
}

/**
 * Unified Interaction Manager following Babylon.js best practices
 * - Single pointer handler to prevent conflicts
 * - Proper double-click detection with timing
 * - Hover state management with throttling
 * - Background click detection
 */
export class UnifiedInteractionManager {
  private scene: Scene;
  private callbacks: InteractionCallbacks;
  private disposed: boolean = false;
  
  // Double-click state
  private lastClickTime: number = 0;
  private lastClickedMesh: AbstractMesh | null = null;
  private doubleClickThreshold: number = 300; // ms
  
  // Hover state
  private currentHoveredMesh: AbstractMesh | null = null;
  private hoverThrottleMs: number = 16; // ~60fps
  private lastHoverTime: number = 0;
  
  // Drag detection for camera rotation
  private isMouseDown: boolean = false;
  private mouseDownPosition: { x: number, y: number } | null = null;
  private isDragging: boolean = false;
  private dragThreshold: number = 5; // pixels
  private pendingClickMesh: { sectionId: string, mesh: AbstractMesh, position: Vector3 } | null = null;

  constructor(scene: Scene, callbacks: InteractionCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.setupInteractions();
    // console.log('🖱️ UnifiedInteractionManager initialized');
  }

  /**
   * Setup the single pointer interaction system
   */
  private setupInteractions(): void {
    this.scene.onPointerObservable.add((pointerInfo) => {
      if (this.disposed) return;

      try {
        switch (pointerInfo.type) {
          case PointerEventTypes.POINTERDOWN:
            this.handlePointerDown(pointerInfo);
            break;
          case PointerEventTypes.POINTERMOVE:
            this.handlePointerMove(pointerInfo);
            break;
          case PointerEventTypes.POINTERUP:
            this.handlePointerUp(pointerInfo);
            break;
        }
      } catch (error) {
        console.error('❌ UnifiedInteractionManager: Pointer event error:', error);
      }
    });
  }

  /**
   * Handle pointer down events - track position for drag detection
   */
  private handlePointerDown(pointerInfo: any): void {
    this.isMouseDown = true;
    this.isDragging = false;
    this.mouseDownPosition = { x: this.scene.pointerX, y: this.scene.pointerY };
    
    // Store potential click target but don't process yet
    const pickResult = pointerInfo.pickInfo;
    if (pickResult?.hit && pickResult.pickedMesh) {
      const mesh = pickResult.pickedMesh;
      const sectionId = this.getSectionId(mesh);
      
      if (sectionId) {
        this.pendingClickMesh = { sectionId, mesh, position: pickResult.pickedPoint };
      } else {
        this.pendingClickMesh = null;
      }
    } else {
      this.pendingClickMesh = null;
    }
  }

  /**
   * Handle mesh click with double-click detection
   */
  private handleMeshClick(sectionId: string, mesh: AbstractMesh, position: Vector3): void {
    const currentTime = Date.now();
    const timeSinceLastClick = currentTime - this.lastClickTime;
    
    // Check for double-click
    if (this.lastClickedMesh === mesh && timeSinceLastClick < this.doubleClickThreshold) {
      // Double-click detected
      // console.log(`🖱️🖱️ Double-click: ${sectionId}`);
      this.callbacks.onDoubleClick(sectionId, mesh, position);
      
      // Reset to prevent triple-click
      this.lastClickTime = 0;
      this.lastClickedMesh = null;
    } else {
      // Single click (might become double-click)
      // console.log(`🖱️ Single-click: ${sectionId}`);
      
      // Delay single-click callback to allow for potential double-click
      setTimeout(() => {
        const timeSinceThisClick = Date.now() - currentTime;
        if (timeSinceThisClick >= this.doubleClickThreshold) {
          // No double-click occurred, process as single-click
          this.callbacks.onSingleClick(sectionId, mesh);
        }
      }, this.doubleClickThreshold + 10);
      
      this.lastClickTime = currentTime;
      this.lastClickedMesh = mesh;
    }
  }

  /**
   * Handle pointer move events (hover and drag detection)
   */
  private handlePointerMove(pointerInfo: any): void {
    // Check for dragging during mouse down
    if (this.isMouseDown && this.mouseDownPosition && !this.isDragging) {
      const currentX = this.scene.pointerX;
      const currentY = this.scene.pointerY;
      const deltaX = Math.abs(currentX - this.mouseDownPosition.x);
      const deltaY = Math.abs(currentY - this.mouseDownPosition.y);
      
      if (deltaX > this.dragThreshold || deltaY > this.dragThreshold) {
        this.isDragging = true;
        // console.log(`🖱️ Drag detected: movement (${deltaX}, ${deltaY}) exceeds threshold ${this.dragThreshold}px`);
      }
    }
    
    // Handle hover state only if not dragging
    if (!this.isDragging) {
      const currentTime = Date.now();
      
      // Throttle hover events for performance
      if (currentTime - this.lastHoverTime < this.hoverThrottleMs) {
        return;
      }
      this.lastHoverTime = currentTime;

      const pickResult = this.scene.pick(
        this.scene.pointerX, 
        this.scene.pointerY,
        (mesh) => this.isSelectableMesh(mesh)
      );

      const hoveredMesh = pickResult?.hit ? pickResult.pickedMesh : null;
      
      // Check if hover state changed
      if (hoveredMesh !== this.currentHoveredMesh) {
        // Exit previous hover
        if (this.currentHoveredMesh) {
          const prevSectionId = this.getSectionId(this.currentHoveredMesh);
          if (prevSectionId) {
            this.callbacks.onHoverExit(prevSectionId, this.currentHoveredMesh);
          }
        }
        
        // Enter new hover
        if (hoveredMesh) {
          const sectionId = this.getSectionId(hoveredMesh);
          if (sectionId) {
            this.callbacks.onHoverEnter(sectionId, hoveredMesh);
          }
        }
        
        this.currentHoveredMesh = hoveredMesh;
      }
    }
  }

  /**
   * Handle pointer up events - process clicks only if no dragging occurred
   */
  private handlePointerUp(pointerInfo: any): void {
    if (!this.isMouseDown) return;

    try {
      if (this.isDragging) {
        // Was a drag operation (camera rotation) - don't process as click
        // console.log(`🖱️ Drag operation completed - no click processing`);
      } else if (this.pendingClickMesh) {
        // Was a clean click without dragging - process selection
        const { sectionId, mesh, position } = this.pendingClickMesh;
        // console.log(`🖱️ Clean click detected: ${sectionId}`);
        this.handleMeshClick(sectionId, mesh, position);
      } else {
        // Background click without dragging
        // console.log(`🖱️ Background click without drag`);
        this.callbacks.onBackgroundClick();
      }
    } finally {
      // Reset drag state
      this.isMouseDown = false;
      this.isDragging = false;
      this.mouseDownPosition = null;
      this.pendingClickMesh = null;
    }
  }

  /**
   * Get section ID from mesh metadata
   */
  private getSectionId(mesh: AbstractMesh): string | null {
    // Check direct property first
    const sectionName = (mesh as any).bmcSectionName;
    if (sectionName) {
      return sectionName;
    }

    // Check metadata
    if (mesh.metadata?.sectionId) {
      return mesh.metadata.sectionId;
    }

    // Walk up parent hierarchy to find section
    let current = mesh.parent;
    while (current) {
      if ((current as any).bmcSectionName) {
        return (current as any).bmcSectionName;
      }
      if (current.metadata?.sectionId) {
        return current.metadata.sectionId;
      }
      current = current.parent;
    }

    return null;
  }

  /**
   * Check if mesh is selectable
   */
  private isSelectableMesh(mesh: AbstractMesh): boolean {
    if (!mesh || !mesh.isPickable) {
      return false;
    }

    // Must have a section ID to be selectable
    return this.getSectionId(mesh) !== null;
  }

  /**
   * Clear hover state
   */
  clearHover(): void {
    if (this.currentHoveredMesh) {
      const sectionId = this.getSectionId(this.currentHoveredMesh);
      if (sectionId) {
        this.callbacks.onHoverExit(sectionId, this.currentHoveredMesh);
      }
      this.currentHoveredMesh = null;
    }
  }

  /**
   * Get current interaction state for debugging
   */
  getState(): any {
    return {
      disposed: this.disposed,
      currentHover: this.currentHoveredMesh?.name || null,
      lastClickTime: this.lastClickTime,
      lastClickedMesh: this.lastClickedMesh?.name || null
    };
  }

  /**
   * Dispose the interaction manager
   */
  dispose(): void {
    if (this.disposed) return;

    this.clearHover();
    
    // Note: onPointerObservable.clear() would remove ALL observers
    // In a production app, you'd want to store the observer reference
    // and remove only this one with scene.onPointerObservable.remove(observer)
    
    this.disposed = true;
    // console.log('🖱️ UnifiedInteractionManager disposed');
  }
}