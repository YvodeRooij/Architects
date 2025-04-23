export interface Agent {
  id: number
  name: string
  active: boolean
}

export interface LogEntry {
  id: number
  agentId: number // 0 for user, otherwise agent ID
  timestamp: Date
  content: string
  isUserInput?: boolean
}

export interface CanvasItem {
  id: number | string
  type: "text" | "image" | "connection"
  x: number
  y: number
  content?: string
  image?: string
  width?: number
  height?: number
  from?: number | string
  to?: number | string
}
