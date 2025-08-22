import { useCanvas } from '@/lib/stores/useCanvas';
import { Vector3 } from '@babylonjs/core';
import { 
  BMCStateManager, 
  BMCStateOperations, 
  BMCViewState, 
  BMCObjectState,
  BMCComponentName,
  BMCVisualState,
  BMCTransformState,
  BMCUIState,
  BMCCameraState,
  ViewMode,
  DEFAULT_CAMERA_STATE
} from '@/types/bmcState';

/**
 * Simplified BMC State Manager that delegates to the unified Zustand store
 * 
 * This class provides a familiar interface while using the unified state system
 * underneath. It acts as a bridge between the old BMC state manager API
 * and the new unified store.
 */
export class UnifiedBMCStateManager implements BMCStateManager, BMCStateOperations {
  private stateListeners: Set<(state: BMCStateManager) => void> = new Set();
  private debugMode = false;

  constructor(enableDebug = false) {
    this.debugMode = enableDebug;
    this.log('Unified BMC State Manager initialized');
  }

  // Delegate to unified store
  private getStore() {
    return useCanvas.getState();
  }

  // ============================================================================
  // BMC STATE MANAGER INTERFACE IMPLEMENTATION
  // ============================================================================

  get currentView(): ViewMode {
    return this.getStore().currentView;
  }

  get activeSelection(): BMCComponentName | null {
    return this.getStore().selectedObject;
  }

  get viewStates(): Map<ViewMode, BMCViewState> {
    // This is now managed internally by the unified store
    // Return a simplified representation for compatibility
    const store = this.getStore();
    const viewStates = new Map<ViewMode, BMCViewState>();

    // Create a mock view state for the current view
    const currentViewState: BMCViewState = {
      viewMode: store.currentView,
      selectedObject: store.selectedObject,
      cameraState: store.camera3DState ? {
        alpha: store.camera3DState.alpha,
        beta: store.camera3DState.beta,
        radius: store.camera3DState.radius,
        target: Vector3.Zero()
      } : DEFAULT_CAMERA_STATE,
      objectStates: store.objectStates,
      viewSettings: {
        showLabels: true,
        showContentPanels: false,
        enableInteractions: true
      },
      lastSaved: store.lastStateUpdate
    };

    viewStates.set(store.currentView, currentViewState);
    return viewStates;
  }

  get globalSettings() {
    return {
      transitionDuration: 300,
      preserveSelectionOnViewChange: true,
      autoSaveInterval: 5000
    };
  }

  // ============================================================================
  // VIEW MANAGEMENT
  // ============================================================================

  switchView(newView: ViewMode): void {
    this.log(`Switching view to: ${newView}`);
    this.getStore().switchView(newView);
    this.notifyStateChange();
  }

  saveCurrentViewState(): void {
    // The unified store handles persistence automatically
    this.log('Current view state saved automatically by unified store');
  }

  restoreViewState(view: ViewMode): void {
    // The unified store handles this automatically when switching views
    this.log(`View state for ${view} restored automatically`);
  }

  // ============================================================================
  // OBJECT SELECTION
  // ============================================================================

  selectObject(sectionName: BMCComponentName | null): void {
    this.log(`Selecting object: ${sectionName}`);
    this.getStore().selectObject(sectionName);
    this.notifyStateChange();
  }

  getSelectedObject(): BMCComponentName | null {
    return this.getStore().selectedObject;
  }

  clearSelection(): void {
    this.getStore().clearSelection();
    this.notifyStateChange();
  }

  // ============================================================================
  // STATE UPDATES
  // ============================================================================

  updateVisualState(sectionName: BMCComponentName, updates: Partial<BMCVisualState>): void {
    this.log(`Updating visual state for ${sectionName}`);
    const store = this.getStore();
    const objectState = store.getObjectState(sectionName);

    if (objectState) {
      const updatedState = {
        ...objectState,
        visual: { ...objectState.visual, ...updates },
        lastUpdated: Date.now(),
        isDirty: true
      };
      store.updateObjectState(sectionName, updatedState);
      this.notifyStateChange();
    }
  }

  updateTransformState(sectionName: BMCComponentName, updates: Partial<BMCTransformState>): void {
    this.log(`Updating transform state for ${sectionName}`);
    const store = this.getStore();
    const objectState = store.getObjectState(sectionName);

    if (objectState) {
      const updatedState = {
        ...objectState,
        transform: { ...objectState.transform, ...updates },
        lastUpdated: Date.now(),
        isDirty: true
      };
      store.updateObjectState(sectionName, updatedState);
      this.notifyStateChange();
    }
  }

  updateUIState(sectionName: BMCComponentName, updates: Partial<BMCUIState>): void {
    this.log(`Updating UI state for ${sectionName}`);
    const store = this.getStore();
    const objectState = store.getObjectState(sectionName);

    if (objectState) {
      const updatedState = {
        ...objectState,
        ui: { ...objectState.ui, ...updates },
        lastUpdated: Date.now(),
        isDirty: true
      };
      store.updateObjectState(sectionName, updatedState);
      this.notifyStateChange();
    }
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  resetAllObjects(): void {
    this.log('Resetting all objects');
    this.getStore().resetAllObjects();
    this.notifyStateChange();
  }

  setAllOpacity(opacity: number, except?: BMCComponentName): void {
    this.log(`Setting opacity ${opacity} for all objects except ${except}`);
    const store = this.getStore();
    const objectStates = store.getAllObjectStates();

    objectStates.forEach((objectState, componentName) => {
      if (componentName !== except) {
        this.updateVisualState(componentName, { opacity });
      }
    });
  }

  restoreAllOriginalHeights(): void {
    this.log('Restoring all original heights');
    const store = this.getStore();
    const objectStates = store.getAllObjectStates();

    objectStates.forEach((objectState, componentName) => {
      this.updateTransformState(componentName, {
        currentHeight: objectState.transform.originalHeight
      });
    });
  }

  // ============================================================================
  // STATE QUERIES
  // ============================================================================

  getObjectState(sectionName: BMCComponentName): BMCObjectState | null {
    return this.getStore().getObjectState(sectionName);
  }

  getAllObjectStates(): Map<BMCComponentName, BMCObjectState> {
    return this.getStore().getAllObjectStates();
  }

  isObjectSelected(sectionName: BMCComponentName): boolean {
    return this.getStore().selectedObject === sectionName;
  }

  // ============================================================================
  // CAMERA MANAGEMENT
  // ============================================================================

  saveCameraState(state: BMCCameraState): void {
    this.log('Saving camera state');
    this.getStore().saveCamera3DState(state.alpha, state.beta, state.radius);
  }

  getCameraState(): BMCCameraState | null {
    const cameraState = this.getStore().camera3DState;
    if (!cameraState) return null;

    return {
      alpha: cameraState.alpha,
      beta: cameraState.beta,
      radius: cameraState.radius,
      target: Vector3.Zero()
    };
  }

  // ============================================================================
  // STATE CHANGE NOTIFICATIONS
  // ============================================================================

  addStateListener(listener: (state: BMCStateManager) => void): void {
    this.stateListeners.add(listener);
  }

  removeStateListener(listener: (state: BMCStateManager) => void): void {
    this.stateListeners.delete(listener);
  }

  private notifyStateChange(): void {
    this.stateListeners.forEach(listener => {
      try {
        listener(this);
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    });
  }

  // ============================================================================
  // DEBUGGING
  // ============================================================================

  private log(message: string): void {
    if (this.debugMode) {
      console.log(`[Unified BMC State Manager] ${message}`);
    }
  }

  public enableDebug(enabled = true): void {
    this.debugMode = enabled;
    this.getStore().enableDebugMode(enabled);
  }

  public getDebugInfo(): any {
    const store = this.getStore();
    return {
      currentView: this.currentView,
      activeSelection: this.activeSelection,
      stateMetrics: store.getStateMetrics(),
      objectStatesCount: store.getAllObjectStates().size,
      canUndo: store.canUndo(),
      canRedo: store.canRedo(),
      debugMode: this.debugMode
    };
  }
}

// Export singleton instance that uses the unified store
export const bmcStateManager = new UnifiedBMCStateManager(true);

// Export hooks for React components
export const useBMCState = () => {
  const store = useCanvas();

  return {
    // Direct access to unified store methods
    selectObject: store.selectObject,
    getSelectedObject: store.getSelectedObject,
    switchView: store.switchView,
    currentView: store.currentView,
    objectStates: store.objectStates,
    resetAllObjects: store.resetAllObjects,

    // Transform state management
    updateTransformState: (objectName: BMCComponentName, updates: Partial<BMCTransformState>) => {
      const objectState = store.getObjectState(objectName);
      if (objectState) {
        store.updateObjectState(objectName, {
          transform: { ...objectState.transform, ...updates }
        });
      }
    },

    // Undo/Redo functionality
    undo: store.undo,
    redo: store.redo,
    canUndo: store.canUndo,
    canRedo: store.canRedo,

    // Debugging
    getStateMetrics: store.getStateMetrics,
    enableDebugMode: store.enableDebugMode
  };
};