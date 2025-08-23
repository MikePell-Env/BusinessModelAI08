/**
 * Interaction Handler for BMC 3D visualization
 * Follows Babylon.js best practices for ActionManager and material handling
 */

import { 
  Scene,
  AbstractMesh,
  ActionManager,
  ExecuteCodeAction,
  Vector3,
  StandardMaterial,
  Engine
} from '@babylonjs/core';
import { debugLog } from '@/lib/debug/DebugLogger';
import { CleanBMCSystem } from '@/lib/cleanBMCSystem';

interface ClickTimer {
  lastClickTime: number;
  sectionName: string;
}

export type InteractionCallback = {
  onSingleClick?: (sectionName: string) => void;
  onDoubleClick?: (sectionName: string, position: Vector3) => void;
  onHoverEnter?: (sectionName: string) => void;
  onHoverExit?: (sectionName: string) => void;
};

export class InteractionHandler {
  private scene: Scene;
  private cleanBMC: CleanBMCSystem | null = null;
  private clickTimers: Map<string, number> = new Map();
  private doubleClickThreshold: number = 300; // milliseconds
  private callbacks: InteractionCallback = {};
  private sharedActionManager: ActionManager;
  private meshToSection: Map<AbstractMesh, string> = new Map();

  constructor(scene: Scene) {
    this.scene = scene;
    
    // BEST PRACTICE: Use single shared ActionManager for all meshes
    this.sharedActionManager = new ActionManager(scene);
    this.sharedActionManager.isRecursive = true;
    this.sharedActionManager.hoverCursor = 'pointer';
    
    this.setupGlobalActions();
    
    console.log('✅ InteractionHandler initialized with shared ActionManager');
  }

  /**
   * Setup global actions that work for all meshes
   */
  private setupGlobalActions(): void {
    // Single click handler for all meshes
    this.sharedActionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPickTrigger, (evt) => {
        const mesh = evt.meshUnderPointer;
        if (!mesh) return;
        
        const sectionName = this.meshToSection.get(mesh);
        if (!sectionName) return;
        
        this.handleClick(mesh, sectionName);
      })
    );

    // Hover enter for all meshes
    this.sharedActionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, (evt) => {
        const mesh = evt.meshUnderPointer;
        if (!mesh) return;
        
        const sectionName = this.meshToSection.get(mesh);
        if (!sectionName) return;
        
        this.handleHoverEnter(sectionName);
      })
    );

    // Hover exit for all meshes
    this.sharedActionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, (evt) => {
        const mesh = evt.meshUnderPointer;
        if (!mesh) return;
        
        const sectionName = this.meshToSection.get(mesh);
        if (!sectionName) return;
        
        this.handleHoverExit(sectionName);
      })
    );
  }

  /**
   * Set the CleanBMCSystem reference
   */
  public setCleanBMC(cleanBMC: CleanBMCSystem): void {
    this.cleanBMC = cleanBMC;
    console.log('🔗 CleanBMC reference set');
  }

  /**
   * Register interaction callbacks
   */
  public registerCallbacks(callbacks: InteractionCallback): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
    console.log('📋 Interaction callbacks registered');
  }

  /**
   * Setup interactions for a BMC mesh using shared ActionManager
   */
  public setupMeshInteractions(mesh: AbstractMesh, sectionName: string): void {
    // BEST PRACTICE: Use shared ActionManager instead of individual ones
    mesh.actionManager = this.sharedActionManager;
    mesh.isPickable = true;
    
    // Store mesh-to-section mapping for event handlers
    this.meshToSection.set(mesh, sectionName);
    
    // BEST PRACTICE: Set proper material transparency mode
    this.setupMaterialProperties(mesh);
    
    console.log(`✅ Interactions setup for ${sectionName} using shared ActionManager`);
  }

  /**
   * Setup proper material properties to prevent crashes
   */
  private setupMaterialProperties(mesh: AbstractMesh): void {
    if (mesh.material && mesh.material instanceof StandardMaterial) {
      const material = mesh.material as StandardMaterial;
      
      // BEST PRACTICE: Prevent depth buffer conflicts
      material.needDepthPrePass = true;
      material.backFaceCulling = true;
      
      // BEST PRACTICE: Use premultiplied alpha for stable transparency
      material.alphaMode = Engine.ALPHA_PREMULTIPLIED;
      
      // Ensure material starts in proper state
      material.alpha = 1.0;
      mesh.visibility = 1.0;
      mesh.isVisible = true;
      mesh.setEnabled(true);
    }
  }

  /**
   * Handle click with proper double-click detection
   */
  private handleClick(mesh: AbstractMesh, sectionName: string): void {
    const currentTime = Date.now();
    const lastClickTime = this.clickTimers.get(sectionName) || 0;
    const timeDifference = currentTime - lastClickTime;

    console.log(`🖱️ Click on ${sectionName}, time diff: ${timeDifference}ms`);

    if (timeDifference < this.doubleClickThreshold && timeDifference > 50) {
      // Double-click detected
      console.log(`🖱️🖱️ Double-click on ${sectionName}`);
      
      if (this.callbacks.onDoubleClick) {
        const position = mesh.getAbsolutePosition();
        this.callbacks.onDoubleClick(sectionName, position);
      }
      
      // Reset timer to prevent triple-clicks
      this.clickTimers.set(sectionName, 0);
    } else {
      // Single click - schedule action after double-click timeout
      this.clickTimers.set(sectionName, currentTime);
      
      setTimeout(() => {
        const latestClickTime = this.clickTimers.get(sectionName) || 0;
        
        // Only process if this was the last click
        if (latestClickTime === currentTime) {
          console.log(`🖱️ Single click processed for ${sectionName}`);
          
          if (this.cleanBMC) {
            this.cleanBMC.onSelect(sectionName);
          }
          
          if (this.callbacks.onSingleClick) {
            this.callbacks.onSingleClick(sectionName);
          }
        }
      }, this.doubleClickThreshold);
    }
  }

  /**
   * Handle hover enter
   */
  private handleHoverEnter(sectionName: string): void {
    console.log(`🖱️ Hover enter: ${sectionName}`);
    
    if (this.cleanBMC) {
      this.cleanBMC.onHover(sectionName, true);
    }
    
    if (this.callbacks.onHoverEnter) {
      this.callbacks.onHoverEnter(sectionName);
    }
  }

  /**
   * Handle hover exit
   */
  private handleHoverExit(sectionName: string): void {
    console.log(`🖱️ Hover exit: ${sectionName}`);
    
    if (this.cleanBMC) {
      this.cleanBMC.onHover(sectionName, false);
    }
    
    if (this.callbacks.onHoverExit) {
      this.callbacks.onHoverExit(sectionName);
    }
  }

  /**
   * Setup background click handling for deselection
   * DISABLED: Conflicts with SimpleClickHandler's onPointerObservable
   */
  public setupBackgroundClick(): void {
    // DISABLED: This conflicts with SimpleClickHandler's pointer event handling
    // SimpleClickHandler now handles background clicks via onBackgroundClick callback
    console.log('🚫 InteractionHandler background click handling disabled to avoid conflicts with SimpleClickHandler');
    /*
    // Use scene-level pointer observable for background clicks
    this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === 1 && !pointerInfo.pickInfo?.hit) { // BABYLON.PointerEventTypes.POINTERDOWN
        console.log('🖱️ Background click - clearing selection');
        
        if (this.cleanBMC) {
          this.cleanBMC.clearSelection();
        }
      }
    });
    */
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    this.meshToSection.clear();
    this.clickTimers.clear();
    
    if (this.sharedActionManager) {
      this.sharedActionManager.dispose();
    }
    
    console.log('🧹 InteractionHandler disposed');
  }

  /**
   * Get debug info
   */
  public getDebugInfo(): any {
    return {
      registeredMeshes: this.meshToSection.size,
      clickTimers: this.clickTimers.size,
      hasSharedActionManager: !!this.sharedActionManager
    };
  }
}