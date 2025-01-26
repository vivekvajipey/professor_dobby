"use client";

import { useState, useEffect } from "react";
import type { Block } from "../pdf/PDFViewer";
import { callFireworksAI, type Message, type DobbyModel, stripHtml } from "@/utils/fireworks";

// Global state to store conversations per block
const blockConversations: { [blockId: string]: Message[] } = {};

interface ChatPaneProps {
  block: Block;
  onClose: () => void;
}

export default function ChatPane({ block, onClose }: ChatPaneProps) {
  // Initialize messages from block conversation history or create new with system message
  const [messages, setMessages] = useState<Message[]>(() => {
    if (!blockConversations[block.id]) {
      blockConversations[block.id] = [
        {
          role: "system",
          content: `The user is reading this part of the text:\n\n${stripHtml(
            block.html
          )}\n\nUse this when answering questions.`,
        },
      ];
    }
    return blockConversations[block.id];
  });

  // The current user-typed message
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState<DobbyModel>('leashed');
  
  // State for tracking width
  const [width, setWidth] = useState(384); // 384px = w-96 default
  const [isResizing, setIsResizing] = useState(false);

  // Update block conversations whenever messages change
  useEffect(() => {
    blockConversations[block.id] = messages;
  }, [messages, block.id]);

  const handleSend = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const messageContent = messageText.trim();
    const userMsg: Message = { role: "user", content: messageContent };
    
    // Clear input but save message content in case we need to restore it
    setNewMessage("");
    setIsLoading(true);

    try {
      // Add user message to conversation
      setMessages(prev => [...prev, userMsg]);

      // Get API key from environment variable
      const apiKey = process.env.NEXT_PUBLIC_FIREWORKS_API_KEY;
      if (!apiKey) {
        throw new Error("Missing Fireworks API key");
      }

      // Call Fireworks AI with the entire conversation
      const aiResponse = await callFireworksAI(apiKey, [...messages, userMsg], model);
      
      // Add AI response to messages with the current model
      const aiMsg: Message = { 
        role: "assistant", 
        content: aiResponse,
        modelUsed: model
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("Error getting AI response:", error);
      // Remove the user message from history
      setMessages(prev => prev.filter((_, i) => i !== prev.length - 1));
      // Restore the user's message to the input
      setNewMessage(messageContent);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputSend = () => {
    handleSend(newMessage);
  };

  // Handle mouse events for resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    const newWidth = window.innerWidth - e.clientX;
    // Constrain width between 320px and 640px
    setWidth(Math.min(Math.max(320, newWidth), 640));
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow new line with Shift+Enter
        return;
      }
      // Submit with just Enter
      e.preventDefault();
      handleInputSend();
    }
  };

  // Cleanup event listeners
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Filter out system messages for display
  const displayMessages = messages.filter(m => m.role !== 'system');

  return (
    <div 
      style={{ width: `${width}px` }}
      className="bg-white text-gray-800 border-l border-gray-300 flex flex-col h-full relative"
    >
      {/* Resize handle */}
      <div
        className="absolute left-0 top-0 w-1 h-full cursor-ew-resize hover:bg-blue-500 hover:opacity-50"
        onMouseDown={handleMouseDown}
      />

      {/* Header */}
      <div className="p-3 flex items-center justify-between bg-gray-200 border-b border-gray-300">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold">Learn with Dobby</h2>
        </div>
        <button onClick={onClose} className="text-sm text-gray-700 hover:text-black">
          ✕
        </button>
      </div>

      {/* Block Content Display */}
      <div className="p-3 border-b border-gray-300">
        <h3 className="font-semibold mb-2">Current Reading:</h3>
        <div
          className="p-2 bg-gray-50 text-gray-900 rounded text-sm 
                     overflow-auto resize-y 
                     min-h-[60px] max-h-[300px]" 
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      </div>

      {/* Chat area */}
      {block.block_type.toLowerCase() === "text" ? (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 min-h-0">
            {/* Preset message buttons */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => handleSend("Summarize this")}
                disabled={isLoading}
                className={`px-3 py-1.5 rounded text-sm text-white transition-colors ${
                  isLoading 
                    ? `${model === 'leashed' ? 'bg-blue-400' : 'bg-red-400'} cursor-not-allowed` 
                    : model === 'leashed'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Summarize {model === 'leashed' ? '😇' : '😈'}
              </button>
              <button
                onClick={() => handleSend("Teach this to me")}
                disabled={isLoading}
                className={`px-3 py-1.5 rounded text-sm text-white transition-colors ${
                  isLoading 
                    ? `${model === 'leashed' ? 'bg-blue-400' : 'bg-red-400'} cursor-not-allowed` 
                    : model === 'leashed'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Teach me {model === 'leashed' ? '😇' : '😈'}
              </button>
            </div>

            {/* Message history */}
            {displayMessages.map((m, idx) => {
              const isAssistant = m.role === "assistant";
              const isLeashed = m.modelUsed === "leashed";
              let bubbleClasses = "";
              let label = "";

              if (isAssistant) {
                if (isLeashed) {
                  bubbleClasses = "bg-blue-100 text-gray-800";
                  label = "Dobby 😇";
                } else {
                  bubbleClasses = "bg-red-100 text-gray-800";
                  label = "Dobby 😈";
                }
              } else {
                bubbleClasses = "bg-gray-700 text-white";
                label = "You";
              }

              return (
                <div
                  key={idx}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`${bubbleClasses} p-2 rounded text-sm max-w-[80%]`}>
                    <strong>{label}:</strong> {m.content}
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="flex justify-start">
                <div className={`${model === 'leashed' ? 'bg-blue-100' : 'bg-red-100'} text-gray-800 p-2 rounded text-sm`}>
                  <em>{model === 'leashed' ? 'Dobby' : 'Unhinged'} is typing...</em>
                </div>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="border-t border-gray-300">
            {/* Message input */}
            <div className="p-3 flex items-center space-x-2">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about this section..."
                className="flex-1 p-2 border rounded text-sm min-h-[40px] max-h-[120px] resize-y"
                rows={1}
                disabled={isLoading}
              />
              <button
                onClick={handleInputSend}
                className={`px-3 py-2 rounded text-white ${
                  isLoading 
                    ? `${model === 'leashed' ? 'bg-blue-400' : 'bg-red-400'} cursor-not-allowed` 
                    : model === 'leashed'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-red-600 hover:bg-red-700'
                }`}
                disabled={isLoading}
              >
                Send
              </button>
            </div>

            {/* Model toggle switch */}
            <div className="px-3 pb-3">
              <label className="flex items-center justify-center cursor-pointer">
                <span className={`mr-2 text-sm ${model === 'leashed' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                  Leashed 😇
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={model === 'unhinged'}
                    onChange={() => setModel(m => m === 'leashed' ? 'unhinged' : 'leashed')}
                  />
                  <div className={`block w-14 h-8 rounded-full transition-colors duration-300 ${
                    model === 'leashed' ? 'bg-blue-600' : 'bg-red-600'
                  }`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-300 ${
                    model === 'unhinged' ? 'translate-x-6' : 'translate-x-0'
                  }`}></div>
                </div>
                <span className={`ml-2 text-sm ${model === 'unhinged' ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                  Unhinged 😈
                </span>
              </label>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 text-gray-700">
          This block is not recognized as a text block.
        </div>
      )}
    </div>
  );
}
