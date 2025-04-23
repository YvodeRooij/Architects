import type { LogEntry, Agent } from "@/lib/types"

interface AgentLogProps {
  logs: LogEntry[]
  agents: Agent[]
}

export default function AgentLog({ logs, agents }: AgentLogProps) {
  // Function to get agent name by ID
  const getAgentName = (agentId: number) => {
    if (agentId === 0) return "User"
    const agent = agents.find((a) => a.id === agentId)
    return agent ? agent.name : "Unknown Agent"
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div
          key={log.id}
          className={`p-3 rounded-lg ${
            log.isUserInput
              ? "bg-primary/10 ml-8"
              : log.agentId === 0
                ? "bg-muted/50"
                : "bg-muted border-l-4 border-primary"
          }`}
        >
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium">{getAgentName(log.agentId)}</span>
            <span>{log.timestamp.toLocaleTimeString()}</span>
          </div>
          <div className="text-sm">{log.content}</div>
        </div>
      ))}
    </div>
  )
}
