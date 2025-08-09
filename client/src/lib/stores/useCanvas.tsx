import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { BusinessModelCanvas, ChatMessage, CanvasUpdateRequest } from "@/types/canvas";
import { bmcStateManager } from "@/lib/bmcStateManager";
import { BMCComponentName, ViewMode } from "@/types/bmcState";

interface CanvasState {
  canvas: BusinessModelCanvas | null;
  isLoading: boolean;
  error: string | null;
  is3D: boolean;
  isOrthographic: boolean;
  isTransitioning: boolean;
  chatMessages: ChatMessage[];
  isChatOpen: boolean;
  hasImportedFromPowerPoint: boolean;
  camera3DState: {
    alpha: number;
    beta: number;
    radius: number;
  } | null;
  selectedObjectName: string | null;
  originalHeights: { [sectionName: string]: number };
  // New BMC State Manager integration
  bmcState: typeof bmcStateManager;
  pendingPowerPointFile: File | null;
  
  // Actions
  loadCanvas: (canvas: BusinessModelCanvas, isFromPowerPoint?: boolean) => void;
  toggleView: () => void;
  setOrthographicView: (isOrtho: boolean) => void;
  updateCanvas: (updates: Partial<BusinessModelCanvas>) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChat: () => void;
  toggleChat: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  saveCamera3DState: (alpha: number, beta: number, radius: number) => void;
  getCamera3DState: () => { alpha: number; beta: number; radius: number; } | null;
  setSelectedObject: (objectName: string | null) => void;
  getSelectedObject: () => string | null;
  // New BMC State Manager methods
  selectBMCObject: (componentName: BMCComponentName | null) => void;
  getBMCSelectedObject: () => BMCComponentName | null;
  switchBMCView: (viewMode: ViewMode) => void;
  getCurrentBMCView: () => ViewMode;
  setOriginalHeights: (heights: { [sectionName: string]: number }) => void;
  getOriginalHeights: () => { [sectionName: string]: number };
  setPendingPowerPointFile: (file: File | null) => void;
}

export const useCanvas = create<CanvasState>()(
  subscribeWithSelector((set, get) => ({
    canvas: null,
    isLoading: false,
    error: null,
    is3D: false,
    isOrthographic: false,
    isTransitioning: false,
    chatMessages: [],
    isChatOpen: false,
    hasImportedFromPowerPoint: false,
    camera3DState: null,
    selectedObjectName: null,
    originalHeights: {},
    pendingPowerPointFile: null,
    bmcState: bmcStateManager,
    
    loadCanvas: (canvas, isFromPowerPoint = false) => {
      set({ 
        canvas, 
        error: null,
        hasImportedFromPowerPoint: isFromPowerPoint || get().hasImportedFromPowerPoint
      });
    },
    
    toggleView: () => {
      const { is3D, bmcState } = get();
      set({ isTransitioning: true });
      
      // Use BMC State Manager for view switching
      const newViewMode: ViewMode = is3D ? 'view2D' : 'view3DPerspective';
      console.log(`🎛️ useCanvas.toggleView: Switching to ${newViewMode}`);
      bmcState.switchView(newViewMode);
      
      setTimeout(() => {
        set({ is3D: !is3D, isOrthographic: false, isTransitioning: false });
      }, 300);
    },
    
    setOrthographicView: (isOrtho: boolean) => {
      const { bmcState } = get();
      set({ isTransitioning: true });
      
      // Use BMC State Manager for orthographic view switching
      const newViewMode: ViewMode = isOrtho ? 'view3DOrthographic' : 'view3DPerspective';
      console.log(`🎛️ useCanvas.setOrthographicView: Switching to ${newViewMode}`);
      bmcState.switchView(newViewMode);
      
      setTimeout(() => {
        set({ 
          is3D: true, // Always in 3D when orthographic
          isOrthographic: isOrtho, 
          isTransitioning: false 
        });
      }, 300);
    },
    
    updateCanvas: (updates) => {
      const { canvas } = get();
      if (canvas) {
        set({
          canvas: {
            ...canvas,
            ...updates,
            lastModified: new Date().toISOString()
          }
        });
      }
    },
    
    addChatMessage: (message) => {
      const { chatMessages } = get();
      set({
        chatMessages: [...chatMessages, message]
      });
    },
    
    clearChat: () => {
      set({ chatMessages: [] });
    },
    
    toggleChat: () => {
      const { isChatOpen } = get();
      set({ isChatOpen: !isChatOpen });
    },
    
    setError: (error) => {
      set({ error });
    },
    
    setLoading: (loading) => {
      set({ isLoading: loading });
    },
    
    saveCamera3DState: (alpha: number, beta: number, radius: number) => {
      set({ camera3DState: { alpha, beta, radius } });
    },
    
    getCamera3DState: () => {
      return get().camera3DState;
    },
    
    setSelectedObject: (objectName: string | null) => {
      set({ selectedObjectName: objectName });
    },
    
    getSelectedObject: () => {
      return get().selectedObjectName;
    },
    
    // New BMC State Manager integration methods
    selectBMCObject: (componentName: BMCComponentName | null) => {
      console.log(`🎯 useCanvas.selectBMCObject called with: ${componentName}`);
      const { bmcState } = get();
      console.log(`🎯 BMC State available: ${!!bmcState}`);
      bmcState.selectObject(componentName);
      // Also update legacy state for backward compatibility
      set({ selectedObjectName: componentName });
      console.log(`🎯 Updated legacy selectedObjectName to: ${componentName}`);
    },
    
    getBMCSelectedObject: () => {
      const { bmcState } = get();
      return bmcState.getSelectedObject();
    },
    
    switchBMCView: (viewMode: ViewMode) => {
      console.log(`🔄 useCanvas.switchBMCView called with: ${viewMode}`);
      const { bmcState } = get();
      bmcState.switchView(viewMode);
      
      // Update Zustand state to match
      switch (viewMode) {
        case 'view2D':
          set({ is3D: false, isOrthographic: false });
          break;
        case 'view3DPerspective':
          set({ is3D: true, isOrthographic: false });
          break;
        case 'view3DOrthographic':
          set({ is3D: true, isOrthographic: true });
          break;
      }
    },
    
    getCurrentBMCView: () => {
      const { bmcState } = get();
      return bmcState.currentView;
    },
    
    setOriginalHeights: (heights: { [sectionName: string]: number }) => {
      console.log("🏪 STORE: Setting originalHeights:", heights);
      set({ originalHeights: heights });
    },
    
    getOriginalHeights: () => {
      return get().originalHeights;
    },
    
    setPendingPowerPointFile: (file: File | null) => {
      set({ pendingPowerPointFile: file });
    },
  }))
);
