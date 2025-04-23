"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStream } from "@langchain/langgraph-sdk/react";
import type { Message } from "@langchain/langgraph-sdk";

export default function AgentInterface() {
  const [userInput, setUserInput] = useState("");
  const apiUrl = typeof window !== "undefined" ? `${window.location.origin}/api/agent` : "http://localhost:3000/api/agent";

  const thread = useStream<{ messages: Message[] }>({
    apiUrl,
    assistantId: "agent",
    messagesKey: "messages",
  });

  return (
    <div className="flex flex-col h-screen bg-[#f0f4f8]">
      <div className="flex-1 flex p-4 gap-4 overflow-hidden">
        {/* Left Panel - Agent Messages */}
        <div className="w-[450px] bg-white rounded-lg shadow-sm flex flex-col overflow-hidden">
          <div className="p-4">
            <Button
              className="bg-blue-500 hover:bg-blue-600 text-white w-full"
              onClick={() => {
                if (userInput.trim()) {
                  thread.submit({ messages: [{ type: "human", content: userInput }] });
                  setUserInput("");
                }
              }}
              disabled={thread.isLoading}
            >
              Run Agent
            </Button>
          </div>
          <div className="flex-1 bg-gray-50 p-6 overflow-y-auto">
            {thread.messages.map((message, idx) => (
              <div key={message.id || idx} className="mb-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-green-500 mr-3 inline-block"></div>
                <span className="text-gray-700 text-sm">{message.content as string}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Right Panel - Output (optional, can be customized) */}
        <div className="flex-1 bg-white rounded-lg shadow-sm flex flex-col overflow-hidden">
          <div className="flex-1 p-6 overflow-y-auto">{/* You can render additional state or outputs here if needed */}</div>
        </div>
      </div>
      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto flex items-center">
          <div className="flex-1 relative">
            <Input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type your message here..."
              className="pr-10"
              disabled={thread.isLoading}
            />
            <button
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              disabled={thread.isLoading}
              onClick={() => {
                if (userInput.trim()) {
                  thread.submit({ messages: [{ type: "human", content: userInput }] });
                  setUserInput("");
                }
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 2L11 13"></path>
                <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
