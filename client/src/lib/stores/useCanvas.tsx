import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { BusinessModelCanvas, ChatMessage, CanvasUpdateRequest } from "@/types/canvas";

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
  // Per-view selection state for more robust preservation
  selectionState: {
    view2D: string | null;
    view3DPerspective: string | null;
    view3DOrthographic: string | null;
  };
  originalHeights: { [sectionName: string]: number };
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
  // Enhanced selection state management
  saveSelectionForCurrentView: () => void;
  restoreSelectionForCurrentView: () => void;
  getCurrentViewKey: () => string;
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
    // Per-view selection state for robust preservation
    selectionState: {
      view2D: null,
      view3DPerspective: null,
      view3DOrthographic: null,
    },
    originalHeights: {},
    pendingPowerPointFile: null,
    
    loadCanvas: (canvas, isFromPowerPoint = false) => {
      set({ 
        canvas, 
        error: null,
        hasImportedFromPowerPoint: isFromPowerPoint || get().hasImportedFromPowerPoint
      });
    },
    
    toggleView: () => {
      const { is3D } = get();
      // Save current selection for current view before switching
      get().saveSelectionForCurrentView();
      
      set({ isTransitioning: true });
      
      setTimeout(() => {
        set({ is3D: !is3D, isOrthographic: false, isTransitioning: false });
        // Restore selection for new view after transition
        setTimeout(() => {
          get().restoreSelectionForCurrentView();
        }, 50);
      }, 300);
    },
    
    setOrthographicView: (isOrtho: boolean) => {
      // Save current selection for current view before switching
      get().saveSelectionForCurrentView();
      
      set({ isTransitioning: true });
      
      setTimeout(() => {
        set({ 
          is3D: true, // Always in 3D when orthographic
          isOrthographic: isOrtho, 
          isTransitioning: false 
        });
        // Restore selection for new view after transition
        setTimeout(() => {
          get().restoreSelectionForCurrentView();
        }, 50);
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
      // Also save to current view when setting selection
      get().saveSelectionForCurrentView();
    },
    
    getSelectedObject: () => {
      return get().selectedObjectName;
    },
    
    // Enhanced selection state management methods
    getCurrentViewKey: () => {
      const { is3D, isOrthographic } = get();
      if (!is3D) return 'view2D';
      return isOrthographic ? 'view3DOrthographic' : 'view3DPerspective';
    },
    
    saveSelectionForCurrentView: () => {
      const { selectedObjectName, selectionState } = get();
      const viewKey = get().getCurrentViewKey();
      
      console.log(`💾 STORE: Saving selection "${selectedObjectName}" for ${viewKey}`);
      
      set({
        selectionState: {
          ...selectionState,
          [viewKey]: selectedObjectName
        }
      });
    },
    
    restoreSelectionForCurrentView: () => {
      const { selectionState } = get();
      const viewKey = get().getCurrentViewKey();
      const savedSelection = selectionState[viewKey as keyof typeof selectionState];
      
      console.log(`🔄 STORE: Restoring selection "${savedSelection}" for ${viewKey}`);
      
      set({ selectedObjectName: savedSelection });
      
      // Trigger a custom event that the 3D component can listen to
      window.dispatchEvent(new CustomEvent('selectionRestored', { 
        detail: { selection: savedSelection, viewKey } 
      }));
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
