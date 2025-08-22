
import { create } from "zustand";
import { subscribeWithSelector, persist, createJSONStorage } from "zustand/middleware";
import { BusinessModelCanvas, ChatMessage, CanvasUpdateRequest } from "@/types/canvas";
import { BMCComponentName, ViewMode, BMCStateManager, BMCObjectState } from "@/types/bmcState";

// Action types for undo/redo
type ActionType = 
  | 'LOAD_CANVAS'
  | 'TOGGLE_VIEW'
  | 'SELECT_OBJECT'
  | 'UPDATE_CANVAS'
  | 'SET_ORTHOGRAPHIC'
  | 'CLEAR_SELECTION';

interface StateAction {
  type: ActionType;
  timestamp: number;
  payload: any;
  previousState?: Partial<UnifiedCanvasState>;
}

interface UnifiedCanvasState {
  // Canvas data
  canvas: BusinessModelCanvas | null;
  isLoading: boolean;
  error: string | null;
  
  // View state
  currentView: ViewMode;
  isTransitioning: boolean;
  camera3DState: {
    alpha: number;
    beta: number;
    radius: number;
  } | null;
  
  // Object selection and interaction
  selectedObject: BMCComponentName | null;
  hoveredObject: BMCComponentName | null;
  originalHeights: { [sectionName: string]: number };
  
  // Object states for all BMC components
  objectStates: Map<BMCComponentName, BMCObjectState>;
  
  // Chat system
  chatMessages: ChatMessage[];
  isChatOpen: boolean;
  
  // Import/export
  hasImportedFromPowerPoint: boolean;
  pendingPowerPointFile: File | null;
  
  // Undo/Redo system
  actionHistory: StateAction[];
  currentActionIndex: number;
  maxHistorySize: number;
  
  // Performance and debugging
  lastStateUpdate: number;
  debugMode: boolean;
  stateMetrics: {
    totalStateChanges: number;
    averageUpdateTime: number;
  };
}

interface UnifiedCanvasActions {
  // Canvas operations
  loadCanvas: (canvas: BusinessModelCanvas, isFromPowerPoint?: boolean) => void;
  updateCanvas: (updates: Partial<BusinessModelCanvas>) => void;
  
  // View management
  switchView: (viewMode: ViewMode) => void;
  setOrthographicView: (isOrtho: boolean) => void;
  saveCamera3DState: (alpha: number, beta: number, radius: number) => void;
  getCamera3DState: () => { alpha: number; beta: number; radius: number; } | null;
  
  // Object selection
  selectObject: (objectName: BMCComponentName | null) => void;
  setHoveredObject: (objectName: BMCComponentName | null) => void;
  clearSelection: () => void;
  getSelectedObject: () => BMCComponentName | null;
  
  // Object state management
  updateObjectState: (objectName: BMCComponentName, updates: Partial<BMCObjectState>) => void;
  getObjectState: (objectName: BMCComponentName) => BMCObjectState | null;
  getAllObjectStates: () => Map<BMCComponentName, BMCObjectState>;
  resetAllObjects: () => void;
  
  // Heights management
  setOriginalHeights: (heights: { [sectionName: string]: number }) => void;
  getOriginalHeights: () => { [sectionName: string]: number };
  
  // Chat system
  addChatMessage: (message: ChatMessage) => void;
  clearChat: () => void;
  toggleChat: () => void;
  
  // Error handling
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  
  // Import/Export
  setPendingPowerPointFile: (file: File | null) => void;
  
  // Undo/Redo system
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  
  // Debugging and performance
  enableDebugMode: (enabled: boolean) => void;
  getStateMetrics: () => any;
  exportState: () => string;
  importState: (stateJson: string) => void;
}

type UnifiedCanvasStore = UnifiedCanvasState & UnifiedCanvasActions;

// Default object state factory
const createDefaultObjectState = (componentName: BMCComponentName): BMCObjectState => ({
  sectionName: componentName,
  objectType: (componentName === 'RevenueStreams' || componentName === 'CostStructure') ? 'separate_glb' : 'main_bmc',
  visual: {
    isSelected: false,
    isHovered: false,
    opacity: 1.0,
    baseColor: { r: 0.07, g: 0.07, b: 0.07 },
    hoverColor: { r: 0.0, g: 0.3, b: 0.8 },
    selectedColor: { r: 0.0, g: 0.3, b: 0.8 },
    emissiveColor: { r: 0, g: 0, b: 0 }
  },
  transform: {
    position: { x: 0, y: 0, z: 0 },
    scaling: { x: 1, y: 1, z: 1 },
    rotation: { x: 0, y: 0, z: 0 },
    originalHeight: 1.0,
    currentHeight: 1.0,
    originalScaling: { x: 1, y: 1, z: 1 }
  },
  ui: {
    contentPanelVisible: false,
    labelVisible: true,
    isInteractable: true
  },
  lastUpdated: Date.now(),
  isDirty: false
});

// Initialize object states for all BMC components
const initializeObjectStates = (): Map<BMCComponentName, BMCObjectState> => {
  const objectStates = new Map<BMCComponentName, BMCObjectState>();
  const components: BMCComponentName[] = [
    'KeyPartners', 'KeyActivities', 'KeyResources', 'ValueProposition',
    'CustomerRelationships', 'CustomerChannels', 'CustomerSegments',
    'CostStructure', 'RevenueStreams'
  ];
  
  components.forEach(component => {
    objectStates.set(component, createDefaultObjectState(component));
  });
  
  return objectStates;
};

// Middleware for debugging and analytics
const debugMiddleware = (config: any) => (set: any, get: any, api: any) => {
  const originalSet = set;
  
  const wrappedSet = (partial: any, replace?: boolean) => {
    const startTime = performance.now();
    const result = originalSet(partial, replace);
    const endTime = performance.now();
    
    const state = get();
    if (state.debugMode) {
      console.log(`🏪 [State Update] Time: ${(endTime - startTime).toFixed(2)}ms`, {
        timestamp: new Date().toISOString(),
        updateTime: endTime - startTime,
        stateSize: JSON.stringify(state).length
      });
    }
    
    return result;
  };
  
  return config(wrappedSet, get, api);
};

// Action recording middleware for undo/redo
const historyMiddleware = (config: any) => (set: any, get: any, api: any) => {
  const recordAction = (type: ActionType, payload: any, previousState?: Partial<UnifiedCanvasState>) => {
    const state = get();
    const action: StateAction = {
      type,
      timestamp: Date.now(),
      payload,
      previousState
    };
    
    // Trim history if it exceeds max size
    const newHistory = [
      ...state.actionHistory.slice(Math.max(0, state.actionHistory.length - state.maxHistorySize + 1)),
      action
    ];
    
    set({
      actionHistory: newHistory,
      currentActionIndex: newHistory.length - 1,
      lastStateUpdate: Date.now(),
      stateMetrics: {
        totalStateChanges: state.stateMetrics.totalStateChanges + 1,
        averageUpdateTime: state.stateMetrics.averageUpdateTime // Will be calculated properly
      }
    });
  };
  
  return config(set, get, { ...api, recordAction });
};

export const useCanvas = create<UnifiedCanvasStore>()(
  debugMiddleware(
    historyMiddleware(
      subscribeWithSelector(
        persist(
          (set, get, api) => ({
            // Initial state
            canvas: null,
            isLoading: false,
            error: null,
            currentView: 'view2D' as ViewMode,
            isTransitioning: false,
            camera3DState: null,
            selectedObject: null,
            hoveredObject: null,
            originalHeights: {},
            objectStates: initializeObjectStates(),
            chatMessages: [],
            isChatOpen: false,
            hasImportedFromPowerPoint: false,
            pendingPowerPointFile: null,
            actionHistory: [],
            currentActionIndex: -1,
            maxHistorySize: 50,
            lastStateUpdate: Date.now(),
            debugMode: true,
            stateMetrics: {
              totalStateChanges: 0,
              averageUpdateTime: 0
            },

            // Canvas operations
            loadCanvas: (canvas, isFromPowerPoint = false) => {
              const previousState = { canvas: get().canvas };
              set({ 
                canvas, 
                error: null,
                hasImportedFromPowerPoint: isFromPowerPoint || get().hasImportedFromPowerPoint
              });
              (api as any).recordAction('LOAD_CANVAS', { canvas, isFromPowerPoint }, previousState);
            },

            updateCanvas: (updates) => {
              const { canvas } = get();
              if (canvas) {
                const previousState = { canvas };
                const updatedCanvas = {
                  ...canvas,
                  ...updates,
                  lastModified: new Date().toISOString()
                };
                set({ canvas: updatedCanvas });
                (api as any).recordAction('UPDATE_CANVAS', updates, previousState);
              }
            },

            // View management
            switchView: (viewMode: ViewMode) => {
              const previousState = { 
                currentView: get().currentView,
                isTransitioning: get().isTransitioning
              };
              
              set({ 
                currentView: viewMode,
                isTransitioning: true 
              });
              
              setTimeout(() => {
                set({ isTransitioning: false });
              }, 300);
              
              (api as any).recordAction('TOGGLE_VIEW', { viewMode }, previousState);
            },

            setOrthographicView: (isOrtho: boolean) => {
              const viewMode = isOrtho ? 'view3DOrthographic' : 'view3DPerspective';
              get().switchView(viewMode);
            },

            saveCamera3DState: (alpha: number, beta: number, radius: number) => {
              set({ camera3DState: { alpha, beta, radius } });
            },

            getCamera3DState: () => {
              return get().camera3DState;
            },

            // Object selection
            selectObject: (objectName: BMCComponentName | null) => {
              const previousState = { 
                selectedObject: get().selectedObject,
                objectStates: new Map(get().objectStates)
              };
              
              const { objectStates } = get();
              
              // Clear previous selection
              objectStates.forEach((state, name) => {
                if (state.visual.isSelected) {
                  state.visual.isSelected = false;
                  state.visual.opacity = 1.0;
                  state.transform.currentHeight = state.transform.originalHeight;
                  state.lastUpdated = Date.now();
                  state.isDirty = true;
                }
              });
              
              // Set new selection
              if (objectName) {
                const objectState = objectStates.get(objectName);
                if (objectState) {
                  objectState.visual.isSelected = true;
                  objectState.visual.opacity = 1.0;
                  objectState.transform.currentHeight = objectState.transform.originalHeight;
                  objectState.lastUpdated = Date.now();
                  objectState.isDirty = true;
                }
                
                // Dim other objects
                objectStates.forEach((state, name) => {
                  if (name !== objectName) {
                    state.visual.opacity = 0.5;
                    state.transform.currentHeight = 0.1;
                    state.lastUpdated = Date.now();
                    state.isDirty = true;
                  }
                });
              } else {
                // No selection - restore all objects
                objectStates.forEach((state) => {
                  state.visual.opacity = 1.0;
                  state.transform.currentHeight = state.transform.originalHeight;
                  state.lastUpdated = Date.now();
                  state.isDirty = true;
                });
              }
              
              set({ 
                selectedObject: objectName,
                objectStates: new Map(objectStates)
              });
              
              (api as any).recordAction('SELECT_OBJECT', { objectName }, previousState);
            },

            setHoveredObject: (objectName: BMCComponentName | null) => {
              const { objectStates } = get();
              
              // Clear previous hover
              objectStates.forEach((state) => {
                if (state.visual.isHovered) {
                  state.visual.isHovered = false;
                  state.lastUpdated = Date.now();
                  state.isDirty = true;
                }
              });
              
              // Set new hover
              if (objectName) {
                const objectState = objectStates.get(objectName);
                if (objectState) {
                  objectState.visual.isHovered = true;
                  objectState.lastUpdated = Date.now();
                  objectState.isDirty = true;
                }
              }
              
              set({ 
                hoveredObject: objectName,
                objectStates: new Map(objectStates)
              });
            },

            clearSelection: () => {
              get().selectObject(null);
            },

            getSelectedObject: () => {
              return get().selectedObject;
            },

            // Object state management
            updateObjectState: (objectName: BMCComponentName, updates: Partial<BMCObjectState>) => {
              const { objectStates } = get();
              const objectState = objectStates.get(objectName);
              
              if (objectState) {
                Object.assign(objectState, updates);
                objectState.lastUpdated = Date.now();
                objectState.isDirty = true;
                
                set({ objectStates: new Map(objectStates) });
              }
            },

            getObjectState: (objectName: BMCComponentName) => {
              return get().objectStates.get(objectName) || null;
            },

            getAllObjectStates: () => {
              return get().objectStates;
            },

            resetAllObjects: () => {
              const { objectStates } = get();
              
              objectStates.forEach((state) => {
                state.visual.isSelected = false;
                state.visual.isHovered = false;
                state.visual.opacity = 1.0;
                state.transform.currentHeight = state.transform.originalHeight;
                state.ui.contentPanelVisible = false;
                state.lastUpdated = Date.now();
                state.isDirty = true;
              });
              
              set({ 
                selectedObject: null,
                hoveredObject: null,
                objectStates: new Map(objectStates)
              });
            },

            // Heights management
            setOriginalHeights: (heights: { [sectionName: string]: number }) => {
              set({ originalHeights: heights });
            },

            getOriginalHeights: () => {
              return get().originalHeights;
            },

            // Chat system
            addChatMessage: (message: ChatMessage) => {
              const { chatMessages } = get();
              set({ chatMessages: [...chatMessages, message] });
            },

            clearChat: () => {
              set({ chatMessages: [] });
            },

            toggleChat: () => {
              const { isChatOpen } = get();
              set({ isChatOpen: !isChatOpen });
            },

            // Error handling
            setError: (error: string | null) => {
              set({ error });
            },

            setLoading: (loading: boolean) => {
              set({ isLoading: loading });
            },

            // Import/Export
            setPendingPowerPointFile: (file: File | null) => {
              set({ pendingPowerPointFile: file });
            },

            // Undo/Redo system
            undo: () => {
              const { actionHistory, currentActionIndex } = get();
              
              if (currentActionIndex > 0) {
                const action = actionHistory[currentActionIndex];
                if (action.previousState) {
                  set({
                    ...action.previousState,
                    currentActionIndex: currentActionIndex - 1
                  });
                }
              }
            },

            redo: () => {
              const { actionHistory, currentActionIndex } = get();
              
              if (currentActionIndex < actionHistory.length - 1) {
                const nextAction = actionHistory[currentActionIndex + 1];
                // Apply the action's payload
                set({ currentActionIndex: currentActionIndex + 1 });
                
                // Re-apply the action based on its type
                switch (nextAction.type) {
                  case 'SELECT_OBJECT':
                    get().selectObject(nextAction.payload.objectName);
                    break;
                  case 'TOGGLE_VIEW':
                    get().switchView(nextAction.payload.viewMode);
                    break;
                  // Add more cases as needed
                }
              }
            },

            canUndo: () => {
              return get().currentActionIndex > 0;
            },

            canRedo: () => {
              const { actionHistory, currentActionIndex } = get();
              return currentActionIndex < actionHistory.length - 1;
            },

            clearHistory: () => {
              set({ 
                actionHistory: [],
                currentActionIndex: -1
              });
            },

            // Debugging and performance
            enableDebugMode: (enabled: boolean) => {
              set({ debugMode: enabled });
            },

            getStateMetrics: () => {
              const state = get();
              return {
                totalStateChanges: state.stateMetrics.totalStateChanges,
                objectStatesCount: state.objectStates.size,
                historyLength: state.actionHistory.length,
                lastUpdate: new Date(state.lastStateUpdate).toISOString(),
                memoryUsage: JSON.stringify(state).length
              };
            },

            exportState: () => {
              const state = get();
              return JSON.stringify({
                canvas: state.canvas,
                currentView: state.currentView,
                selectedObject: state.selectedObject,
                originalHeights: state.originalHeights,
                hasImportedFromPowerPoint: state.hasImportedFromPowerPoint
              }, null, 2);
            },

            importState: (stateJson: string) => {
              try {
                const importedState = JSON.parse(stateJson);
                set({
                  ...importedState,
                  isLoading: false,
                  error: null,
                  isTransitioning: false
                });
              } catch (error) {
                console.error('Failed to import state:', error);
                set({ error: 'Failed to import state: Invalid JSON format' });
              }
            }
          }),
          {
            name: 'unified-canvas-store',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
              canvas: state.canvas,
              currentView: state.currentView,
              selectedObject: state.selectedObject,
              originalHeights: state.originalHeights,
              hasImportedFromPowerPoint: state.hasImportedFromPowerPoint,
              chatMessages: state.chatMessages.slice(-20), // Keep only last 20 messages
              actionHistory: state.actionHistory.slice(-10), // Keep only last 10 actions
              debugMode: state.debugMode
            })
          }
        )
      )
    )
  )
);

// Export legacy compatibility functions
export const useLegacyCanvas = () => {
  const store = useCanvas();
  
  return {
    // Legacy Zustand compatibility
    canvas: store.canvas,
    isLoading: store.isLoading,
    error: store.error,
    is3D: store.currentView !== 'view2D',
    isOrthographic: store.currentView === 'view3DOrthographic',
    isTransitioning: store.isTransitioning,
    chatMessages: store.chatMessages,
    isChatOpen: store.isChatOpen,
    hasImportedFromPowerPoint: store.hasImportedFromPowerPoint,
    selectedObjectName: store.selectedObject,
    
    // Legacy methods mapped to new unified methods
    loadCanvas: store.loadCanvas,
    toggleView: () => {
      const currentView = store.currentView;
      const newView = currentView === 'view2D' ? 'view3DPerspective' : 'view2D';
      store.switchView(newView);
    },
    setOrthographicView: store.setOrthographicView,
    updateCanvas: store.updateCanvas,
    addChatMessage: store.addChatMessage,
    clearChat: store.clearChat,
    toggleChat: store.toggleChat,
    setError: store.setError,
    setLoading: store.setLoading,
    saveCamera3DState: store.saveCamera3DState,
    getCamera3DState: store.getCamera3DState,
    setSelectedObject: store.selectObject,
    getSelectedObject: store.getSelectedObject,
    selectBMCObject: store.selectObject,
    getBMCSelectedObject: store.getSelectedObject,
    switchBMCView: store.switchView,
    getCurrentBMCView: () => store.currentView,
    setOriginalHeights: store.setOriginalHeights,
    getOriginalHeights: store.getOriginalHeights,
    setPendingPowerPointFile: store.setPendingPowerPointFile
  };
};
