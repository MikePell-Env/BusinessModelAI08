import { useState, useEffect, useCallback, useRef } from 'react';
import { VoiceCommandEngine, VoiceCommand } from './VoiceCommandEngine';

export interface VoiceCommandCallbacks {
  onCameraPreset?: (preset: 'PERSPECTIVE_LEFT' | 'PERSPECTIVE_RIGHT' | 'TOP' | 'FRONT') => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onCameraReset?: () => void;
  onTemplateSwitch?: (template: 'business-model' | 'financials') => void;
  onSelectSection?: (sectionName: string) => void;
  onDeselect?: () => void;
}

export interface VoiceCommandState {
  isListening: boolean;
  lastCommand: VoiceCommand | null;
  interimTranscript: string;
  error: string | null;
  isSupported: boolean;
}

export function useVoiceCommands(callbacks: VoiceCommandCallbacks) {
  const [state, setState] = useState<VoiceCommandState>({
    isListening: false,
    lastCommand: null,
    interimTranscript: '',
    error: null,
    isSupported: false,
  });

  const recognitionRef = useRef<any>(null);
  const engineRef = useRef(new VoiceCommandEngine());
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;
  const commandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    setState(prev => ({ ...prev, isSupported: !!SpeechRecognition }));
  }, []);

  const executeCommand = useCallback((command: VoiceCommand) => {
    const cb = callbacksRef.current;
    setState(prev => ({ ...prev, lastCommand: command }));

    if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
    commandTimeoutRef.current = setTimeout(() => {
      setState(prev => ({ ...prev, lastCommand: null }));
    }, 3000);

    switch (command.type) {
      case 'camera_left':
        cb.onCameraPreset?.('PERSPECTIVE_LEFT');
        break;
      case 'camera_right':
        cb.onCameraPreset?.('PERSPECTIVE_RIGHT');
        break;
      case 'camera_top':
        cb.onCameraPreset?.('TOP');
        break;
      case 'camera_front':
        cb.onCameraPreset?.('FRONT');
        break;
      case 'camera_zoom_in':
        cb.onZoomIn?.();
        break;
      case 'camera_zoom_out':
        cb.onZoomOut?.();
        break;
      case 'camera_reset':
        cb.onCameraReset?.();
        break;
      case 'template_business_model':
        cb.onTemplateSwitch?.('business-model');
        break;
      case 'template_financials':
        cb.onTemplateSwitch?.('financials');
        break;
      case 'select_section':
        if (command.payload) cb.onSelectSection?.(command.payload);
        break;
      case 'deselect':
        cb.onDeselect?.();
        break;
    }
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      setState(prev => ({ ...prev, error: 'Speech recognition not supported in this browser' }));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setState(prev => ({ ...prev, isListening: true, error: null }));
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript) {
        setState(prev => ({ ...prev, interimTranscript }));
      }

      if (finalTranscript) {
        setState(prev => ({ ...prev, interimTranscript: '' }));
        const command = engineRef.current.parse(finalTranscript);
        if (command.type !== 'unknown') {
          executeCommand(command);
        } else {
          setState(prev => ({
            ...prev,
            lastCommand: { type: 'unknown', confidence: 0, transcript: finalTranscript },
          }));
          if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
          commandTimeoutRef.current = setTimeout(() => {
            setState(prev => ({ ...prev, lastCommand: null }));
          }, 2000);
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'aborted') return;
      setState(prev => ({ ...prev, error: event.error, isListening: false }));
    };

    recognition.onend = () => {
      setState(prev => {
        if (prev.isListening) {
          try { recognition.start(); } catch {}
          return prev;
        }
        return { ...prev, isListening: false, interimTranscript: '' };
      });
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      setState(prev => ({ ...prev, error: 'Failed to start voice recognition', isListening: false }));
    }
  }, [executeCommand]);

  const stopListening = useCallback(() => {
    setState(prev => ({ ...prev, isListening: false, interimTranscript: '' }));
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (state.isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [state.isListening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
    };
  }, []);

  return {
    ...state,
    toggleListening,
    startListening,
    stopListening,
    getSupportedCommands: () => engineRef.current.getSupportedCommands(),
  };
}
