"use client"

import { useRef, useEffect, useState } from "react"

interface CanvasProps {
  canvasData: any[]
}

export default function Canvas({ canvasData }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  // Update canvas dimensions when the window resizes
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        setDimensions({ width, height })
      }
    }

    updateDimensions()
    window.addEventListener("resize", updateDimensions)

    return () => {
      window.removeEventListener("resize", updateDimensions)
    }
  }, [])

  // Draw on the canvas whenever canvasData changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Set some default styles
    ctx.font = "16px Arial"
    ctx.textBaseline = "middle"
    ctx.textAlign = "center"

    // Draw all items
    canvasData.forEach((item) => {
      if (item.type === "text") {
        // Draw text
        ctx.fillStyle = "#000"
        ctx.fillText(item.content, item.x, item.y)

        // Draw a circle around the text
        ctx.beginPath()
        ctx.arc(item.x, item.y, 40, 0, Math.PI * 2)
        ctx.strokeStyle = "#3b82f6"
        ctx.lineWidth = 2
        ctx.stroke()
      } else if (item.type === "image" && item.image) {
        // Draw image if it exists
        const image = new Image()
        image.crossOrigin = "anonymous"
        image.src = item.image
        image.onload = () => {
          ctx.drawImage(image, item.x, item.y, item.width || 100, item.height || 100)
        }
      } else if (item.type === "connection" && item.from && item.to) {
        // Draw connection between two items
        const fromItem = canvasData.find((i) => i.id === item.from)
        const toItem = canvasData.find((i) => i.id === item.to)

        if (fromItem && toItem) {
          ctx.beginPath()
          ctx.moveTo(fromItem.x, fromItem.y)
          ctx.lineTo(toItem.x, toItem.y)
          ctx.strokeStyle = "#9ca3af"
          ctx.lineWidth = 1
          ctx.stroke()

          // Draw arrow at the end
          const angle = Math.atan2(toItem.y - fromItem.y, toItem.x - fromItem.x)
          ctx.beginPath()
          ctx.moveTo(toItem.x, toItem.y)
          ctx.lineTo(toItem.x - 10 * Math.cos(angle - Math.PI / 6), toItem.y - 10 * Math.sin(angle - Math.PI / 6))
          ctx.lineTo(toItem.x - 10 * Math.cos(angle + Math.PI / 6), toItem.y - 10 * Math.sin(angle + Math.PI / 6))
          ctx.closePath()
          ctx.fillStyle = "#9ca3af"
          ctx.fill()
        }
      }
    })
  }, [canvasData, dimensions])

  return (
    <div ref={containerRef} className="w-full h-full bg-white">
      <canvas ref={canvasRef} width={dimensions.width} height={dimensions.height} className="w-full h-full" />
    </div>
  )
}
