"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"

export default function AgentInterface() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [thoughts, setThoughts] = useState<string[]>([])
  const [completedThoughts, setCompletedThoughts] = useState<string[]>([])
  const [userInput, setUserInput] = useState("")
  const [outputLines, setOutputLines] = useState<string[]>([])
  const [summary, setSummary] = useState("")
  const [topic, setTopic] = useState("Miami")
  const [agentStatus, setAgentStatus] = useState("")

  const thoughtsContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll the thoughts container when new thoughts are added
  useEffect(() => {
    if (thoughtsContainerRef.current) {
      thoughtsContainerRef.current.scrollTop = thoughtsContainerRef.current.scrollHeight
    }
  }, [thoughts, completedThoughts])

  const startResearch = () => {
    setIsProcessing(true)
    setThoughts([])
    setCompletedThoughts([])
    setOutputLines([])
    setSummary("")
    setAgentStatus(`research_agent agent executing chat_node node`)

    // Simulate the agent thinking process
    const researchSteps = [
      `Search for ${topic} history`,
      `Search for ${topic} culture`,
      `Search for ${topic} economy`,
      `Search for ${topic} tourism`,
      `Search for ${topic} demographics`,
      `Downloading https://en.wikipedia.org/wiki/History_of_${topic}`,
      `Downloading https://www.britannica.com/place/${topic}-Florida`,
      `Downloading https://miamitopwatertours.com/${topic.toLowerCase()}-cultural-experiences/`,
      `Downloading https://www.visitflorida.com/places-to-go/southeast/${topic.toLowerCase()}/`,
      `Downloading https://worldpopulationreview.com/us-cities/florida/${topic.toLowerCase()}`,
    ]

    let currentStep = 0

    const thinkingInterval = setInterval(() => {
      if (currentStep < researchSteps.length) {
        setCompletedThoughts((prev) => [...prev, researchSteps[currentStep]])
        currentStep++

        // Add output lines with some delay
        if (currentStep % 2 === 0) {
          setOutputLines((prev) => [...prev, ""])
        }
      } else {
        clearInterval(thinkingInterval)
        setSummary(
          `I've completed the research report on ${topic}! It covers various aspects such as its history, cultural significance, economy, demographics.`,
        )
        setIsProcessing(false)
      }
    }, 800)

    return () => clearInterval(thinkingInterval)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && userInput.trim()) {
      setTopic(userInput.trim())
      setUserInput("")
      startResearch()
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#f0f4f8]">
      <div className="flex-1 flex p-4 gap-4 overflow-hidden">
        {/* Left Panel - Agent Thoughts */}
        <div className="w-[450px] bg-white rounded-lg shadow-sm flex flex-col overflow-hidden">
          <div className="p-4">
            <Button className="bg-blue-500 hover:bg-blue-600 text-white w-full" onClick={startResearch}>
              Lets do research on {topic}
            </Button>
          </div>

          <div ref={thoughtsContainerRef} className="flex-1 bg-gray-50 p-6 overflow-y-auto">
            {completedThoughts.map((thought, index) => (
              <div key={index} className="flex items-start mb-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-green-500 mr-3"></div>
                <p className="text-gray-700 text-sm">{thought}</p>
              </div>
            ))}

            {summary && (
              <div className="mt-6 p-4 bg-white rounded-md shadow-sm">
                <p className="text-gray-700 text-sm">{summary}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Output */}
        <div className="flex-1 bg-white rounded-lg shadow-sm flex flex-col overflow-hidden">
          {agentStatus && (
            <div className="p-2 flex justify-end">
              <div className="bg-green-500 text-white text-xs px-4 py-2 rounded-full">{agentStatus}</div>
            </div>
          )}

          <div className="flex-1 p-6 overflow-y-auto">
            {outputLines.map((_, index) => (
              <div
                key={index}
                className="h-6 bg-gray-200 rounded mb-4 animate-pulse"
                style={{
                  width: `${Math.random() * 60 + 40}%`,
                  opacity: Math.min(1, 0.3 + index * 0.1),
                }}
              ></div>
            ))}

            {outputLines.length > 3 && (
              <>
                <div className="h-20 bg-gray-200 rounded mb-6 animate-pulse"></div>
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={`full-${index}`} className="h-6 bg-gray-200 rounded mb-4 animate-pulse w-full"></div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto flex items-center">
          {isProcessing && (
            <div className="mr-3">
              <Checkbox id="stopGenerating" />
              <label htmlFor="stopGenerating" className="ml-2 text-sm text-gray-600">
                Stop generating
              </label>
            </div>
          )}
          <div className="flex-1 relative">
            <Input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type your message here..."
              className="pr-10"
              onKeyDown={handleInputKeyDown}
              disabled={isProcessing}
            />
            <button
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              disabled={isProcessing}
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
  )
}
