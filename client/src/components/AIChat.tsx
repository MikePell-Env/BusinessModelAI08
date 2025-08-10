import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCanvas } from '@/lib/stores/useCanvas';
import { ChatMessage } from '@/types/canvas';
import { Send, X, Minimize2 } from 'lucide-react';
import { AIServiceIndicator } from './AIServiceIndicator';

// Debug configuration - set to true to show service indicators
const DEBUG_SHOW_SERVICE_INFO = false;

export const AIChat: React.FC = () => {
  const {
    chatMessages,
    isChatOpen,
    canvas,
    addChatMessage,
    toggleChat,
    updateCanvas,
    setLoading,
    setError
  } = useCanvas();
  
  const [inputValue, setInputValue] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [lastServiceInfo, setLastServiceInfo] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) {
      return;
    }

    // Store the original input value before clearing
    const originalMessage = inputValue;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    addChatMessage(userMessage);
    setInputValue('');
    setLoading(true);
    setIsProcessing(true);

    // Create a default canvas structure if none is loaded
    const defaultCanvas = {
      id: 'default',
      name: 'General Business Discussion',
      description: 'No specific business model canvas loaded',
      keyPartners: { content: [] },
      keyActivities: { content: [] },
      keyResources: { content: [] },
      valuePropositions: { content: [] },
      customerRelationships: { content: [] },
      channels: { content: [] },
      customerSegments: { content: [] },
      costStructure: { content: [] },
      revenueStreams: { content: [] },
      lastModified: new Date()
    };

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: originalMessage,
          canvas: canvas || defaultCanvas,
          chatHistory: chatMessages
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Capture service information for display
      if (data.serviceInfo) {
        setLastServiceInfo(data.serviceInfo);
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      addChatMessage(assistantMessage);

      // Apply any canvas updates from AI response
      if (data.canvasUpdates) {
        updateCanvas(data.canvasUpdates);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
      
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      
      addChatMessage(errorMessage);
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isChatOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-[9999]">
        <Button
          onClick={toggleChat}
          className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 shadow-lg flex items-center justify-center"
        >
          <img 
            src="/copilot-logo.png" 
            alt="Microsoft Copilot" 
            className="w-8 h-8"
          />
        </Button>
      </div>
    );
  }

  return (
    <div className={`fixed top-6 bottom-6 right-6 w-96 bg-white shadow-xl z-[9999] transition-all duration-300 rounded-lg border flex flex-col ${
      isMinimized ? 'h-14 top-auto' : ''
    }`}>
      {/* Header */}
      <div className="flex flex-row items-center justify-between space-y-0 p-4 pb-2 bg-white border-b">
        <div className="flex flex-col space-y-1">
          <div className="flex items-center space-x-2">
            <img 
              src="/copilot-logo.png" 
              alt="Microsoft Copilot" 
              className="w-6 h-6"
            />
            <h3 className="text-lg font-semibold">Microsoft Copilot</h3>
          </div>
          {DEBUG_SHOW_SERVICE_INFO && (
            <AIServiceIndicator 
              serviceInfo={lastServiceInfo} 
              isLoading={isProcessing}
            />
          )}
        </div>
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-8 w-8"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleChat}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {!isMinimized && (
        <>
          {/* Messages Area - Takes up all available space */}
          <div className="flex-1 overflow-y-auto p-4 bg-white">
            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-500 text-sm mt-8">
                Ask me anything about your business model canvas!
                <br />
                <span className="text-xs mt-2 block">
                  Try: "Explain my value proposition" or "Suggest improvements"
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg text-sm ${
                        message.role === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input - Fixed at absolute bottom */}
          <div className="border-t border-gray-200 p-4 bg-white rounded-b-lg">
            <div className="flex space-x-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your business model..."
                className="flex-1"
              />
              <Button 
                onClick={handleSendMessage} 
                size="icon" 
                disabled={!inputValue.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
