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
  setOverviewData: (overviewData: BusinessModelCanvas['overviewData']) => void;
  getOverviewData: () => BusinessModelCanvas['overviewData'];
}

export const useCanvas = create<CanvasState>()(
  subscribeWithSelector((set, get) => ({
    canvas: null,
    isLoading: false,
    error: null,
    is3D: true,
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
      set((state) => ({ 
        is3D: !state.is3D,
        isTransitioning: false // Always false to prevent flashing
      }));
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
          set({ is3D: false });
          break;
        case 'view3DPerspective':
          set({ is3D: true });
          break;
          // Removed orthographic view - only perspective available
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
    
    setOverviewData: (overviewData: BusinessModelCanvas['overviewData']) => {
      const { canvas } = get();
      if (canvas) {
        set({
          canvas: {
            ...canvas,
            overviewData,
            lastModified: new Date().toISOString()
          }
        });
      }
    },
    
    getOverviewData: () => {
      const { canvas } = get();
      return canvas?.overviewData;
    },
  }))
);
