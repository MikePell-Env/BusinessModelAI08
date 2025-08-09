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
  BMC_COMPONENTS,
  createBMCObjectState,
  createBMCViewState,
  DEFAULT_CAMERA_STATE
} from '@/types/bmcState';

/**
 * Centralized BMC State Manager Implementation
 * 
 * This class provides a unified interface for managing all BMC object states
 * across different view modes. It ensures consistency and proper state preservation
 * when switching between 2D, 3D Perspective, and 3D Orthographic views.
 */
export class BMCStateManagerImpl implements BMCStateManager, BMCStateOperations {
  public currentView: ViewMode = 'view2D';
  public activeSelection: BMCComponentName | null = null;
  public viewStates: Map<ViewMode, BMCViewState> = new Map();
  
  public globalSettings = {
    transitionDuration: 300,
    preserveSelectionOnViewChange: true,
    autoSaveInterval: 5000
  };

  private stateListeners: Set<(state: BMCStateManager) => void> = new Set();
  private debugMode = false;

  constructor(enableDebug = false) {
    this.debugMode = enableDebug;
    this.initializeViews();
    this.log('BMC State Manager initialized');
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  private initializeViews(): void {
    // Initialize all three view states
    const viewModes: ViewMode[] = ['view2D', 'view3DPerspective', 'view3DOrthographic'];
    
    viewModes.forEach(viewMode => {
      const viewState = createBMCViewState(viewMode);
      
      // Initialize all BMC components for this view
      BMC_COMPONENTS.forEach(componentName => {
        const objectType = this.getObjectType(componentName);
        const objectState = createBMCObjectState(componentName, objectType);
        viewState.objectStates.set(componentName, objectState);
      });
      
      this.viewStates.set(viewMode, viewState);
    });

    this.log('All view states initialized');
  }

  private getObjectType(componentName: BMCComponentName): 'main_bmc' | 'separate_glb' {
    // Revenue Streams and Cost Structure are separate GLB files
    if (componentName === 'RevenueStreams' || componentName === 'CostStructure') {
      return 'separate_glb';
    }
    return 'main_bmc';
  }

  // ============================================================================
  // VIEW MANAGEMENT
  // ============================================================================

  switchView(newView: ViewMode): void {
    this.log(`Switching from ${this.currentView} to ${newView}`);
    
    // Save current view state before switching
    this.saveCurrentViewState();
    
    // Update current view
    this.currentView = newView;
    
    // Restore state for new view
    this.restoreViewState(newView);
    
    this.notifyStateChange();
  }

  saveCurrentViewState(): void {
    const currentViewState = this.viewStates.get(this.currentView);
    if (!currentViewState) {
      this.log(`Warning: No state found for view ${this.currentView}`);
      return;
    }

    // Update selection in current view state
    currentViewState.selectedObject = this.activeSelection;
    currentViewState.lastSaved = Date.now();
    
    this.log(`Saved state for ${this.currentView}, selection: ${this.activeSelection}`);
  }

  restoreViewState(view: ViewMode): void {
    const viewState = this.viewStates.get(view);
    if (!viewState) {
      this.log(`Warning: No state found for view ${view}`);
      return;
    }

    // Restore selection if preservation is enabled
    if (this.globalSettings.preserveSelectionOnViewChange) {
      this.activeSelection = viewState.selectedObject;
    } else {
      this.activeSelection = null;
    }
    
    this.log(`Restored state for ${view}, selection: ${this.activeSelection}`);
  }

  // ============================================================================
  // OBJECT SELECTION
  // ============================================================================

  selectObject(sectionName: BMCComponentName | null): void {
    this.log(`Selecting object: ${sectionName}`);
    
    // Clear previous selection
    if (this.activeSelection) {
      this.updateObjectSelection(this.activeSelection, false);
    }
    
    // Set new selection
    this.activeSelection = sectionName;
    
    if (sectionName) {
      this.updateObjectSelection(sectionName, true);
      
      // Update other objects to show selection state (dimmed, etc.)
      this.updateNonSelectedObjects(sectionName);
    } else {
      // No selection - restore all objects to normal state
      this.resetAllObjects();
    }
    
    this.notifyStateChange();
  }

  private updateObjectSelection(sectionName: BMCComponentName, isSelected: boolean): void {
    const currentViewState = this.viewStates.get(this.currentView);
    if (!currentViewState) return;

    const objectState = currentViewState.objectStates.get(sectionName);
    if (!objectState) return;

    // Update visual state for selection
    objectState.visual.isSelected = isSelected;
    objectState.visual.opacity = isSelected ? 1.0 : 1.0;
    objectState.lastUpdated = Date.now();
    objectState.isDirty = true;

    this.log(`Updated selection state for ${sectionName}: ${isSelected}`);
  }

  private updateNonSelectedObjects(selectedObject: BMCComponentName): void {
    const currentViewState = this.viewStates.get(this.currentView);
    if (!currentViewState) return;

    // Dim all other objects when one is selected
    BMC_COMPONENTS.forEach(componentName => {
      if (componentName !== selectedObject) {
        const objectState = currentViewState.objectStates.get(componentName);
        if (objectState) {
          objectState.visual.isSelected = false;
          objectState.visual.opacity = 0.5; // Dimmed
          objectState.transform.currentHeight = objectState.transform.originalHeight * 0.5; // Flattened
          objectState.lastUpdated = Date.now();
          objectState.isDirty = true;
        }
      }
    });
  }

  getSelectedObject(): BMCComponentName | null {
    return this.activeSelection;
  }

  clearSelection(): void {
    this.selectObject(null);
  }

  // ============================================================================
  // STATE UPDATES
  // ============================================================================

  updateVisualState(sectionName: BMCComponentName, updates: Partial<BMCVisualState>): void {
    const currentViewState = this.viewStates.get(this.currentView);
    if (!currentViewState) return;

    const objectState = currentViewState.objectStates.get(sectionName);
    if (!objectState) return;

    Object.assign(objectState.visual, updates);
    objectState.lastUpdated = Date.now();
    objectState.isDirty = true;

    this.log(`Updated visual state for ${sectionName}`);
    this.notifyStateChange();
  }

  updateTransformState(sectionName: BMCComponentName, updates: Partial<BMCTransformState>): void {
    const currentViewState = this.viewStates.get(this.currentView);
    if (!currentViewState) return;

    const objectState = currentViewState.objectStates.get(sectionName);
    if (!objectState) return;

    Object.assign(objectState.transform, updates);
    objectState.lastUpdated = Date.now();
    objectState.isDirty = true;

    this.log(`Updated transform state for ${sectionName}`);
    this.notifyStateChange();
  }

  updateUIState(sectionName: BMCComponentName, updates: Partial<BMCUIState>): void {
    const currentViewState = this.viewStates.get(this.currentView);
    if (!currentViewState) return;

    const objectState = currentViewState.objectStates.get(sectionName);
    if (!objectState) return;

    Object.assign(objectState.ui, updates);
    objectState.lastUpdated = Date.now();
    objectState.isDirty = true;

    this.log(`Updated UI state for ${sectionName}`);
    this.notifyStateChange();
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  resetAllObjects(): void {
    const currentViewState = this.viewStates.get(this.currentView);
    if (!currentViewState) return;

    BMC_COMPONENTS.forEach(componentName => {
      const objectState = currentViewState.objectStates.get(componentName);
      if (objectState) {
        // Reset to normal state
        objectState.visual.isSelected = false;
        objectState.visual.isHovered = false;
        objectState.visual.opacity = 1.0;
        objectState.transform.currentHeight = objectState.transform.originalHeight;
        objectState.ui.contentPanelVisible = false;
        objectState.lastUpdated = Date.now();
        objectState.isDirty = true;
      }
    });

    this.log('Reset all objects to normal state');
    this.notifyStateChange();
  }

  setAllOpacity(opacity: number, except?: BMCComponentName): void {
    const currentViewState = this.viewStates.get(this.currentView);
    if (!currentViewState) return;

    BMC_COMPONENTS.forEach(componentName => {
      if (componentName !== except) {
        const objectState = currentViewState.objectStates.get(componentName);
        if (objectState) {
          objectState.visual.opacity = opacity;
          objectState.lastUpdated = Date.now();
          objectState.isDirty = true;
        }
      }
    });

    this.log(`Set opacity ${opacity} for all objects except ${except}`);
    this.notifyStateChange();
  }

  restoreAllOriginalHeights(): void {
    const currentViewState = this.viewStates.get(this.currentView);
    if (!currentViewState) return;

    BMC_COMPONENTS.forEach(componentName => {
      const objectState = currentViewState.objectStates.get(componentName);
      if (objectState) {
        objectState.transform.currentHeight = objectState.transform.originalHeight;
        objectState.lastUpdated = Date.now();
        objectState.isDirty = true;
      }
    });

    this.log('Restored all original heights');
    this.notifyStateChange();
  }

  // ============================================================================
  // STATE QUERIES
  // ============================================================================

  getObjectState(sectionName: BMCComponentName): BMCObjectState | null {
    const currentViewState = this.viewStates.get(this.currentView);
    if (!currentViewState) return null;

    return currentViewState.objectStates.get(sectionName) || null;
  }

  getAllObjectStates(): Map<BMCComponentName, BMCObjectState> {
    const currentViewState = this.viewStates.get(this.currentView);
    return currentViewState?.objectStates || new Map();
  }

  isObjectSelected(sectionName: BMCComponentName): boolean {
    return this.activeSelection === sectionName;
  }

  // ============================================================================
  // CAMERA MANAGEMENT
  // ============================================================================

  saveCameraState(state: BMCCameraState): void {
    const currentViewState = this.viewStates.get(this.currentView);
    if (!currentViewState) return;

    currentViewState.cameraState = { ...state };
    this.log(`Saved camera state for ${this.currentView}`);
  }

  getCameraState(): BMCCameraState | null {
    const currentViewState = this.viewStates.get(this.currentView);
    return currentViewState?.cameraState || null;
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
      console.log(`[BMC State Manager] ${message}`);
    }
  }

  public enableDebug(enabled = true): void {
    this.debugMode = enabled;
  }

  public getDebugInfo(): any {
    return {
      currentView: this.currentView,
      activeSelection: this.activeSelection,
      viewStates: Array.from(this.viewStates.entries()).map(([view, state]) => ({
        view,
        selectedObject: state.selectedObject,
        objectCount: state.objectStates.size,
        lastSaved: state.lastSaved
      })),
      globalSettings: this.globalSettings
    };
  }
}

// Export singleton instance
export const bmcStateManager = new BMCStateManagerImpl(true); // Enable debug mode