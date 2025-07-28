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
    
    loadCanvas: (canvas, isFromPowerPoint = false) => {
      set({ 
        canvas, 
        error: null,
        hasImportedFromPowerPoint: isFromPowerPoint || get().hasImportedFromPowerPoint
      });
    },
    
    toggleView: () => {
      const { is3D } = get();
      set({ isTransitioning: true });
      
      setTimeout(() => {
        set({ is3D: !is3D, isOrthographic: false, isTransitioning: false });
      }, 300);
    },
    
    setOrthographicView: (isOrtho: boolean) => {
      set({ isTransitioning: true });
      
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
    }
  }))
);
