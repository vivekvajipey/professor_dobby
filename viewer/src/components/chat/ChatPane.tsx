"use client";

import { useState, useEffect } from "react";
import type { Block } from "../pdf/PDFViewer";
import { callFireworksAI, type Message } from "@/utils/fireworks";

// Global state to store conversations per block
const blockConversations: { [blockId: string]: Message[] } = {};

interface ChatPaneProps {
  block: Block;
  onClose: () => void;
}

export default function ChatPane({ block, onClose }: ChatPaneProps) {
  // Initialize messages from block conversation history or with default message
  const [messages, setMessages] = useState<Message[]>(() => {
    return (
      blockConversations[block.id] || [
        {
          role: "assistant",
          content: "Hello! I'm your AI helper. Ask me something about the block below.",
        },
      ]
    );
  });

  // The current user-typed message
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // State for tracking width
  const [width, setWidth] = useState(384); // 384px = w-96 default
  const [isResizing, setIsResizing] = useState(false);

  // Update block conversations whenever messages change
  useEffect(() => {
    blockConversations[block.id] = messages;
  }, [messages, block.id]);

  const handleSend = async () => {
    if (!newMessage.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: newMessage };
    
    // Immediately show user message and clear input
    setMessages(prev => [...prev, userMsg]);
    setNewMessage("");
    setIsLoading(true);

    try {
      // Get API key from environment variable
      const apiKey = process.env.NEXT_PUBLIC_FIREWORKS_API_KEY;
      if (!apiKey) {
        throw new Error("Missing Fireworks API key");
      }

      // Call Fireworks AI with the entire conversation
      const aiResponse = await callFireworksAI(apiKey, [...messages, userMsg]);
      
      // Add AI response to messages
      const aiMsg: Message = { role: "assistant", content: aiResponse };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("Error getting AI response:", error);
      // Show error message in chat
      const errorMsg: Message = {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
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
      handleSend();
    }
  };

  // Cleanup event listeners
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // A simple check for a text-type block
  const blockIsText = block.block_type.toLowerCase().includes("text");

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
        <h2 className="font-semibold">Block Chat</h2>
        <button onClick={onClose} className="text-sm text-gray-700 hover:text-black">
          ✕
        </button>
      </div>

      {/* Block Content Display */}
      <div className="p-3 border-b border-gray-300">
        <h3 className="font-semibold mb-2">Block Content</h3>
        <div
          className="p-2 bg-gray-50 text-gray-900 rounded text-sm 
                     overflow-auto resize-y 
                     min-h-[60px] max-h-[300px]" 
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      </div>

      {/* Chat area */}
      {blockIsText ? (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 min-h-0">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={
                    m.role === "assistant"
                      ? "bg-blue-100 text-gray-800 p-2 rounded text-sm max-w-[80%]"
                      : "bg-gray-700 text-white p-2 rounded text-sm max-w-[80%]"
                  }
                >
                  <strong>{m.role === "assistant" ? "AI" : "You"}:</strong> {m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-blue-100 text-gray-800 p-2 rounded text-sm">
                  <em>AI is typing...</em>
                </div>
              </div>
            )}
          </div>

          {/* Input box */}
          <div className="p-3 border-t border-gray-300 flex items-center space-x-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about this block..."
              className="flex-1 p-2 border rounded text-sm min-h-[40px] max-h-[120px] resize-y"
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              className={`px-3 py-2 rounded text-white ${
                isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
              disabled={isLoading}
            >
              Send
            </button>
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
