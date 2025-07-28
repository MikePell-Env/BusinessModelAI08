import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { BusinessModelCanvas, ChatMessage, CanvasUpdateRequest } from "@/types/canvas";

type ViewMode = '2D' | '3D' | '3D_TOP_ORTHO';

interface CanvasState {
  canvas: BusinessModelCanvas | null;
  isLoading: boolean;
  error: string | null;
  viewMode: ViewMode;
  isTransitioning: boolean;
  chatMessages: ChatMessage[];
  isChatOpen: boolean;
  hasImportedFromPowerPoint: boolean;
  camera3DState: {
    alpha: number;
    beta: number;
    radius: number;
  } | null;
  
  // Actions
  loadCanvas: (canvas: BusinessModelCanvas, isFromPowerPoint?: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleView: () => void; // Keep for backward compatibility
  updateCanvas: (updates: Partial<BusinessModelCanvas>) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChat: () => void;
  toggleChat: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  saveCamera3DState: (alpha: number, beta: number, radius: number) => void;
  getCamera3DState: () => { alpha: number; beta: number; radius: number; } | null;
  
  // Computed properties for backward compatibility
  is3D: boolean;
}

export const useCanvas = create<CanvasState>()(
  subscribeWithSelector((set, get) => ({
    canvas: null,
    isLoading: false,
    error: null,
    viewMode: '2D' as ViewMode,
    isTransitioning: false,
    chatMessages: [],
    isChatOpen: false,
    hasImportedFromPowerPoint: false,
    camera3DState: null,
    
    // Computed property for backward compatibility
    get is3D() {
      return get().viewMode !== '2D';
    },
    
    loadCanvas: (canvas, isFromPowerPoint = false) => {
      set({ 
        canvas, 
        error: null,
        hasImportedFromPowerPoint: isFromPowerPoint || get().hasImportedFromPowerPoint
      });
    },
    
    setViewMode: (mode: ViewMode) => {
      set({ isTransitioning: true });
      
      setTimeout(() => {
        set({ viewMode: mode, isTransitioning: false });
      }, 300);
    },
    
    toggleView: () => {
      const { viewMode } = get();
      const newMode = viewMode === '2D' ? '3D' : '2D';
      set({ isTransitioning: true });
      
      setTimeout(() => {
        set({ viewMode: newMode, isTransitioning: false });
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
    }
  }))
);
