import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCanvas } from '@/lib/stores/useCanvas';
import { ChatMessage } from '@/types/canvas';
import { Send, X, Minimize2, Plus } from 'lucide-react';
import { AIServiceIndicator } from './AIServiceIndicator';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Debug configuration - set to true to show service indicators
const DEBUG_SHOW_SERVICE_INFO = false;

export const AIChat: React.FC = () => {
  const {
    chatMessages,
    isChatOpen,
    canvas,
    is3D,
    isOrthographic,
    addChatMessage,
    toggleChat,
    updateCanvas,
    setLoading,
    setError,
    toggleView,
    switchBMCView
  } = useCanvas();
  
  const [inputValue, setInputValue] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [lastServiceInfo, setLastServiceInfo] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [typingDots, setTypingDots] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isProcessing]);

  // Animated typing indicator effect
  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(() => {
        setTypingDots(prev => {
          if (prev === '') return '.';
          if (prev === '.') return '..';
          if (prev === '..') return '...';
          return '';
        });
      }, 500);
      return () => clearInterval(interval);
    } else {
      setTypingDots('');
    }
  }, [isProcessing]);

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

      // Check if the user is asking to open an "Envisioner" and switch to 3D View
      const userMessageLower = originalMessage.toLowerCase();
      const responseMessageLower = data.response.toLowerCase();
      
      console.log('🔍 Checking for Envisioner keywords...');
      console.log('User message:', userMessageLower);
      console.log('AI response:', responseMessageLower);
      
      const isEnvisionerRequest = (
        (userMessageLower.includes('open') && userMessageLower.includes('envisioner')) ||
        (userMessageLower.includes('launch') && userMessageLower.includes('envisioner')) ||
        (userMessageLower.includes('start') && userMessageLower.includes('envisioner')) ||
        (responseMessageLower.includes('opening envisioner')) ||
        (responseMessageLower.includes('launch') && responseMessageLower.includes('envisioner'))
      );
      
      if (isEnvisionerRequest) {
        console.log('🎯 Envisioner request detected! Opening Business Model Canvas...');
        
        // Load sample canvas data if none exists
        if (!canvas) {
          console.log('📄 Loading sample canvas data...');
          const sampleCanvas = {
            id: 'sample-canvas',
            name: 'Sample Business Model Canvas',
            description: 'A comprehensive business model canvas for demonstration',
            keyPartners: {
              id: 'kp-1',
              title: 'Key Partners',
              content: ['Technology providers', 'Strategic alliances', 'Distribution partners']
            },
            keyActivities: {
              id: 'ka-1',
              title: 'Key Activities',
              content: ['Product development', 'Marketing campaigns', 'Customer support']
            },
            keyResources: {
              id: 'kr-1',
              title: 'Key Resources',
              content: ['Technical expertise', 'Brand reputation', 'Intellectual property']
            },
            valuePropositions: {
              id: 'vp-1',
              title: 'Value Propositions',
              content: ['Innovative solutions', 'Cost-effective services', 'Superior customer experience']
            },
            customerRelationships: {
              id: 'cr-1',
              title: 'Customer Relationships',
              content: ['Personal assistance', 'Self-service platforms', 'Automated services']
            },
            channels: {
              id: 'ch-1',
              title: 'Customer Channels',
              content: ['Direct sales', 'Online platforms', 'Partner networks']
            },
            customerSegments: {
              id: 'cs-1',
              title: 'Customer Segments',
              content: ['Small businesses', 'Enterprise clients', 'Individual consumers']
            },
            costStructure: {
              id: 'cost-1',
              title: 'Cost Structure',
              content: ['Development costs', 'Marketing expenses', 'Operational overhead']
            },
            revenueStreams: {
              id: 'rev-1',
              title: 'Revenue Streams',
              content: ['Subscription fees', 'One-time purchases', 'Service contracts']
            },
            lastModified: new Date().toISOString()
          };
          updateCanvas(sampleCanvas);
        }
        
        // Set the 3D view state immediately
        console.log('🔄 Setting 3D view state...');
        toggleView();
        switchBMCView('view3DPerspective');
        
        // Navigate to the canvas view by triggering a canvas navigation event
        console.log('🚀 Triggering navigation to canvas view...');
        window.dispatchEvent(new CustomEvent('openEnvisioner', { 
          detail: { 
            view: '3D',
            canvas: canvas || 'sample'
          } 
        }));
        
        // Add a system message to indicate the action
        const systemMessage: ChatMessage = {
          id: `system-${Date.now()}`,
          role: 'assistant',
          content: '🎯 **Envisioner activated!** Opening 3D Business Model Canvas view.',
          timestamp: new Date()
        };
        
        setTimeout(() => {
          addChatMessage(systemMessage);
        }, 100);
      } else {
        console.log('ℹ️ No Envisioner keywords detected');
      }

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
    return null;
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
                      {message.role === 'user' ? (
                        message.content
                      ) : (
                        <div className="prose prose-sm max-w-none text-gray-800">
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h1: ({...props}) => <h1 className="text-lg font-bold mb-2 text-gray-900" {...props} />,
                              h2: ({...props}) => <h2 className="text-base font-bold mb-2 text-gray-900" {...props} />,
                              h3: ({...props}) => <h3 className="text-sm font-bold mb-1 text-gray-900" {...props} />,
                              h4: ({...props}) => <h4 className="text-sm font-semibold mb-1 text-gray-900" {...props} />,
                              p: ({...props}) => <p className="mb-2 leading-relaxed" {...props} />,
                              ul: ({...props}) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
                              ol: ({...props}) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
                              li: ({...props}) => <li className="leading-relaxed" {...props} />,
                              strong: ({...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                              em: ({...props}) => <em className="italic" {...props} />,
                              code: ({...props}) => {
                                const { children, className, ...rest } = props;
                                const isInline = !className || !className.includes('language-');
                                return isInline ? (
                                  <code className="bg-gray-200 px-1 py-0.5 rounded text-xs font-mono" {...rest}>
                                    {children}
                                  </code>
                                ) : (
                                  <code className="block bg-gray-200 p-2 rounded text-xs font-mono overflow-x-auto" {...rest}>
                                    {children}
                                  </code>
                                );
                              },
                              blockquote: ({...props}) => (
                                <blockquote className="border-l-4 border-gray-300 pl-3 ml-2 italic text-gray-700" {...props} />
                              ),
                              a: ({...props}) => (
                                <a className="text-blue-600 hover:text-blue-800 underline" {...props} />
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Copilot-style typing indicator */}
                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-800 p-3 rounded-lg text-sm max-w-[80%]">
                      <div className="flex items-center space-x-2 mb-2">
                        <img 
                          src="/copilot-logo.png" 
                          alt="Microsoft Copilot" 
                          className="w-4 h-4 animate-pulse"
                        />
                        <span className="text-gray-600">Microsoft Copilot is thinking</span>
                        <span className="text-blue-500 font-mono w-6">{typingDots}</span>
                      </div>
                      <div className="relative h-1 bg-gray-300 rounded-full overflow-hidden">
                        <div className="absolute top-0 left-0 h-full bg-blue-500 rounded-full animate-loading-bar w-full"></div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input - Fixed at absolute bottom */}
          <div className="border-t border-gray-200 p-4 bg-white rounded-b-lg">
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Message Copilot"
                  className="pr-10 placeholder:text-gray-400" // Add right padding and light grey placeholder
                />
                <button
                  onClick={() => {
                    // Trigger the same file import as "Import Office file..." button
                    window.dispatchEvent(new CustomEvent('triggerFileImport'));
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
                  type="button"
                >
                  <Plus className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                </button>
              </div>
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
