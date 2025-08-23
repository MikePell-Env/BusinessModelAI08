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
  private meshToSectionName: Map<AbstractMesh, string> = new Map();
  
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
   * Register a mesh for interactions with its section name
   */
  registerMesh(mesh: AbstractMesh, sectionName?: string): void {
    mesh.isPickable = true;
    this.meshRegistry.add(mesh);
    
    // Store section name mapping
    if (sectionName) {
      this.meshToSectionName.set(mesh, sectionName);
    } else {
      // Try to get from mesh metadata or derive from mesh name
      const derivedName = this.deriveSectionName(mesh.name);
      if (derivedName) {
        this.meshToSectionName.set(mesh, derivedName);
      }
    }
    
    const mappedName = this.meshToSectionName.get(mesh) || mesh.name;
    console.log(`🎯 Registered mesh for interaction: ${mesh.name} -> ${mappedName}`);
  }

  /**
   * Derive section name from mesh name
   */
  private deriveSectionName(meshName: string): string | null {
    const nameMapping: Record<string, string> = {
      "ValueProposition": "Value Propositions",
      "KeyPartners": "Key Partners", 
      "CustomerSegments": "Customer Segments",
      "KeyResources": "Key Activities",  // Note: these are swapped in the model
      "KeyActivities": "Key Resources",  // Note: these are swapped in the model
      "CustomerChannels": "Customer Relationships",  // Note: these are swapped
      "CustomerRelationships": "CustomerChannels",  // Note: these are swapped  
      "RevenueStreams": "Revenue Streams",
      "CostStructure": "Cost Structure"
    };
    
    return nameMapping[meshName] || null;
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
    console.log(`🔍 SimpleClickHandler: PointerPick detected - hit: ${pickInfo.hit}, mesh: ${pickInfo.pickedMesh?.name || 'none'}`);
    
    if (pickInfo.hit && pickInfo.pickedMesh) {
      const mesh = pickInfo.pickedMesh;
      console.log(`🔍 SimpleClickHandler: Mesh picked: ${mesh.name}, registered: ${this.meshRegistry.has(mesh)}`);
      
      // Only handle registered meshes
      if (this.meshRegistry.has(mesh)) {
        this.handleMeshClick(mesh, pickInfo.pickedPoint);
      } else {
        console.log(`⚠️ SimpleClickHandler: Mesh ${mesh.name} not in registry`);
      }
    } else {
      // Background click
      console.log(`🔍 SimpleClickHandler: Background click detected`);
      this.handleBackgroundClick();
    }
  }

  /**
   * Handle mesh click with double-click detection
   */
  private handleMeshClick(mesh: AbstractMesh, position: Vector3): void {
    const currentTime = Date.now();
    const timeSinceLastClick = currentTime - this.lastClickTime;
    const sectionName = this.meshToSectionName.get(mesh) || mesh.name;
    
    console.log(`🖱️ Click on ${mesh.name} (${sectionName}), time since last: ${timeSinceLastClick}ms`);

    // CRITICAL DEBUG: Special handling for Cost Structure
    if (sectionName === "Cost Structure") {
      console.log(`🔍 DEBUG: Cost Structure click detected!`);
      console.log(`🔍 DEBUG: Mesh name: ${mesh.name}`);
      console.log(`🔍 DEBUG: Mesh position: (${mesh.position.x}, ${mesh.position.y}, ${mesh.position.z})`);
      console.log(`🔍 DEBUG: Mesh visible: ${mesh.isVisible}`);
      console.log(`🔍 DEBUG: Mesh enabled: ${mesh.isEnabled()}`);
    }

    // Check for double-click
    if (
      timeSinceLastClick < this.doubleClickThreshold && 
      this.lastClickedMesh === mesh &&
      timeSinceLastClick > 50 // Prevent accidental rapid clicks
    ) {
      // Double-click detected
      console.log(`🖱️🖱️ Double-click on ${mesh.name} (${sectionName})`);
      
      // Cancel any pending single-click
      if (this.singleClickTimer) {
        clearTimeout(this.singleClickTimer);
        this.singleClickTimer = null;
      }
      
      // Execute double-click callback with section name
      if (this.callbacks.onDoubleClick) {
        try {
          this.callbacks.onDoubleClick(sectionName, mesh, position);
        } catch (error) {
          console.error(`❌ Double-click callback error for ${sectionName}:`, error);
        }
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
        console.log(`🖱️ Single-click confirmed for ${mesh.name} (${sectionName})`);
        
        if (this.callbacks.onSingleClick) {
          try {
            this.callbacks.onSingleClick(sectionName, mesh);
          } catch (error) {
            console.error(`❌ Single-click callback error for ${sectionName}:`, error);
          }
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
        const exitSectionName = this.meshToSectionName.get(this.currentHoveredMesh) || this.currentHoveredMesh.name;
        console.log(`🖱️ Hover exit: ${this.currentHoveredMesh.name} (${exitSectionName})`);
        this.callbacks.onHoverExit(exitSectionName, this.currentHoveredMesh);
      }
      
      // Enter new hover
      if (hoveredMesh && this.callbacks.onHoverEnter) {
        const enterSectionName = this.meshToSectionName.get(hoveredMesh) || hoveredMesh.name;
        console.log(`🖱️ Hover enter: ${hoveredMesh.name} (${enterSectionName})`);
        this.callbacks.onHoverEnter(enterSectionName, hoveredMesh);
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
    this.meshToSectionName.clear();
    this.currentHoveredMesh = null;
    this.lastClickedMesh = null;
    
    console.log('🧹 SimpleClickHandler disposed');
  }
}