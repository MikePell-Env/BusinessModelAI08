import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { BusinessModelCanvas, ChatMessage, CanvasUpdateRequest } from "@/types/canvas";

interface CanvasState {
  canvas: BusinessModelCanvas | null;
  isLoading: boolean;
  error: string | null;
  is3D: boolean;
  isTransitioning: boolean;
  chatMessages: ChatMessage[];
  isChatOpen: boolean;
  hasImportedFromPowerPoint: boolean;
  
  // Actions
  loadCanvas: (canvas: BusinessModelCanvas, isFromPowerPoint?: boolean) => void;
  toggleView: () => void;
  updateCanvas: (updates: Partial<BusinessModelCanvas>) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChat: () => void;
  toggleChat: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useCanvas = create<CanvasState>()(
  subscribeWithSelector((set, get) => ({
    canvas: null,
    isLoading: false,
    error: null,
    is3D: false,
    isTransitioning: false,
    chatMessages: [],
    isChatOpen: false,
    hasImportedFromPowerPoint: false,
    
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
        set({ is3D: !is3D, isTransitioning: false });
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
    }
  }))
);
