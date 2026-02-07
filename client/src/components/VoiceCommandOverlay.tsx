import { useState } from 'react';
import { Mic, MicOff, HelpCircle, X } from 'lucide-react';
import { useVoiceCommands, VoiceCommandCallbacks } from '@/lib/voice/useVoiceCommands';

interface VoiceCommandOverlayProps {
  callbacks: VoiceCommandCallbacks;
}

export function VoiceCommandOverlay({ callbacks }: VoiceCommandOverlayProps) {
  const [showHelp, setShowHelp] = useState(false);
  const voice = useVoiceCommands(callbacks);

  if (!voice.isSupported) return null;

  const commandLabel = voice.lastCommand
    ? voice.lastCommand.type === 'unknown'
      ? `"${voice.lastCommand.transcript}" — not recognized`
      : formatCommandLabel(voice.lastCommand.type, voice.lastCommand.payload)
    : null;

  return (
    <div className="absolute left-4 z-20" style={{ bottom: '80px' }}>
      <div className="flex flex-col items-start gap-2">
        {(voice.interimTranscript || commandLabel) && (
          <div
            className={`px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg max-w-[280px] truncate ${
              voice.lastCommand?.type === 'unknown'
                ? 'bg-yellow-900/90 text-yellow-200 border border-yellow-700'
                : commandLabel
                ? 'bg-green-900/90 text-green-200 border border-green-700'
                : 'bg-gray-900/90 text-gray-200 border border-gray-700'
            }`}
          >
            {voice.interimTranscript && !commandLabel && (
              <span className="italic opacity-80">"{voice.interimTranscript}"</span>
            )}
            {commandLabel && <span>{commandLabel}</span>}
          </div>
        )}

        {voice.error && (
          <div className="px-3 py-1.5 rounded-lg text-sm bg-red-900/90 text-red-200 border border-red-700 shadow-lg">
            {voice.error}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={voice.toggleListening}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg transition-all duration-200 ${
              voice.isListening
                ? 'bg-red-600 hover:bg-red-700 text-white ring-2 ring-red-400/50'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-600'
            }`}
            title={voice.isListening ? 'Stop voice commands' : 'Start voice commands'}
          >
            {voice.isListening ? (
              <>
                <MicOff className="h-4 w-4" />
                <span className="text-sm font-medium">Listening...</span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-200"></span>
                </span>
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" />
                <span className="text-sm font-medium">Voice</span>
              </>
            )}
          </button>

          <button
            onClick={() => setShowHelp(!showHelp)}
            className={`p-2 rounded-lg shadow-lg transition-all duration-200 ${
              showHelp
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-600'
            }`}
            title="Voice command help"
          >
            {showHelp ? <X className="h-4 w-4" /> : <HelpCircle className="h-4 w-4" />}
          </button>
        </div>

        {showHelp && (
          <div className="bg-gray-900/95 border border-gray-700 rounded-lg p-3 shadow-xl max-w-[300px]">
            <h4 className="text-sm font-semibold text-white mb-2">Voice Commands</h4>
            <div className="space-y-1.5">
              {voice.getSupportedCommands().map((cmd, i) => (
                <p key={i} className="text-xs text-gray-300 leading-relaxed">{cmd}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatCommandLabel(type: string, payload?: string): string {
  const labels: Record<string, string> = {
    camera_left: 'Moving to left view',
    camera_right: 'Moving to right view',
    camera_top: 'Moving to top view',
    camera_front: 'Moving to front view',
    camera_zoom_in: 'Zooming in',
    camera_zoom_out: 'Zooming out',
    camera_reset: 'Resetting view',
    template_business_model: 'Switching to Business Model',
    template_financials: 'Switching to Financials',
    deselect: 'Cleared selection',
  };
  if (type === 'select_section' && payload) {
    return `Selected: ${payload}`;
  }
  return labels[type] || type;
}
