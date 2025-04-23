import { HumanMessage } from "@langchain/core/messages";
import { ArchitectureState } from "./state";
import { StateGraph, MemorySaver, START } from "@langchain/langgraph";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { requirementsAnalystAgent } from "./agents/requirementsAnalystAgent";
import { supervisorAgent } from "./agents/supervisorAgent";
import { designPatternAdvisorAgent } from "./agents/designPatternAdvisorAgent";
import { integrationSpecialistAgent } from "./agents/integrationSpecialistAgent";
import { databaseDesignerAgent } from "./agents/databaseDesignerAgent";
import { visualizationGeneratorAgent } from "./agents/visualizationExpertAgent";

dotenv.config();

// Define expanded agent roles
const agentRoles = [
  "requirements_analyst",
  "design_pattern_advisor",
  "integration_specialist",
  "database_designer",
  "visualization_expert",
  "END",
] as const;

// Create the complete graph with all specialists
// Add a checkpointer for state persistence
const memorySaver = new MemorySaver();
const architectureGraph = new StateGraph(ArchitectureState)
  // Add the supervisor node
  .addNode("supervisor", supervisorAgent, {
    ends: [...agentRoles],
  })

  // Add all specialist nodes
  .addNode("requirements_analyst", requirementsAnalystAgent, {
    ends: ["supervisor"],
  })
  .addNode("design_pattern_advisor", designPatternAdvisorAgent, {
    ends: ["supervisor"],
  })
  .addNode("integration_specialist", integrationSpecialistAgent, {
    ends: ["supervisor"],
  })
  .addNode("database_designer", databaseDesignerAgent, {
    ends: ["supervisor"],
  })
  .addNode("visualization_expert", visualizationGeneratorAgent, {
    ends: ["supervisor"],
  })
  // Add END node as a no-op to allow graph to terminate
  .addNode("END", async () => {
    return;
  })

  // Start with the supervisor
  .addEdge(START, "supervisor")
  .compile({ checkpointer: memorySaver });

// Export the graph instance for LangGraph Cloud
export const graph = architectureGraph;

import crypto from "crypto";

// Stream the full state of the graph after each node using LangGraph's streaming API
export async function* streamArchitectureAssistant(userInput: string) {
  const threadId = crypto.randomUUID();
  // Start the stream with the user's input
  const stream = await architectureGraph.stream(
    { messages: [new HumanMessage(userInput)] },
    { configurable: { thread_id: threadId }, streamMode: "values" }
  );

  for await (const chunk of stream) {
    yield chunk;
  }
}

async function runArchitectureAssistant(userInput: string) {
  const threadId = crypto.randomUUID();
  const stream = await architectureGraph.stream({ messages: [new HumanMessage(userInput)] }, { configurable: { thread_id: threadId } });

  const process: { role: string; content: string }[] = [];
  let finalState: unknown = null;

  for await (const chunk of stream) {
    if (chunk.supervisor) {
      const msg = chunk.supervisor.messages[chunk.supervisor.messages.length - 1];
      process.push({ role: "Supervisor", content: msg.content });
    } else if (chunk.requirements_analyst) {
      const msg = chunk.requirements_analyst.messages[chunk.requirements_analyst.messages.length - 1];
      process.push({ role: "Requirements Analyst", content: msg.content });
    } else if (chunk.design_pattern_advisor) {
      const msg = chunk.design_pattern_advisor.messages[chunk.design_pattern_advisor.messages.length - 1];
      process.push({ role: "Design Pattern Advisor", content: msg.content });
    } else if (chunk.integration_specialist) {
      const msg = chunk.integration_specialist.messages[chunk.integration_specialist.messages.length - 1];
      process.push({ role: "Integration Specialist", content: msg.content });
    } else if (chunk.database_designer) {
      const msg = chunk.database_designer.messages[chunk.database_designer.messages.length - 1];
      process.push({ role: "Database Designer", content: msg.content });
    } else if (chunk.visualization_expert) {
      const msg = chunk.visualization_expert.messages[chunk.visualization_expert.messages.length - 1];
      process.push({ role: "Visualization Expert", content: msg.content });
    }
    finalState = chunk;
  }

  let fullState = null;
  try {
    fullState = await architectureGraph.getState({ configurable: { thread_id: threadId } });
  } catch (e) {
    console.error("Could not retrieve full state from graph:", e);
  }

  let report = "";
  if (fullState && fullState.values) {
    report = generateArchitectureReport(fullState.values);
    const outputDir = path.join(__dirname, "output");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    const outputPath = path.join(outputDir, `architecture_result_${threadId}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(fullState.values, null, 2), "utf-8");
    const reportPath = path.join(outputDir, `architecture_report_${threadId}.md`);
    fs.writeFileSync(reportPath, report, "utf-8");
  } else {
    console.error("No final state to save. Check thread/session handling and ensure threadId is passed consistently.");
  }

  return { process, report };
}

// Utility to generate a full architecture report from the state
export function generateArchitectureReport(state: typeof ArchitectureState.State): string {
  let report = "# Architecture Report\n\n";

  // Executive Summary
  report += "## Executive Summary\n";
  report +=
    "This document provides a comprehensive overview of the architecture design for the multi-agent LangGraph JS workflow system with Next.js frontend and MongoDB integration. The architecture follows industry best practices for scalability, maintainability, and performance.\n\n";

  // Requirements
  report += "## Requirements\n";
  if (state.requirements.functional.length === 0 && state.requirements.nonFunctional.length === 0) {
    report += "No requirements defined.\n\n";
  } else {
    if (state.requirements.functional.length > 0) {
      report += "### Functional Requirements\n";
      state.requirements.functional.forEach((r) => {
        report += `- **(${r.id})** ${r.description} [${r.priority}]\n`;
        if (r.acceptanceCriteria && r.acceptanceCriteria.length > 0) {
          report += "  - **Acceptance Criteria:**\n";
          r.acceptanceCriteria.forEach((ac) => {
            report += `    - ${ac}\n`;
          });
        }
      });
      report += "\n";
    }
    if (state.requirements.nonFunctional.length > 0) {
      report += "### Non-Functional Requirements\n";
      state.requirements.nonFunctional.forEach((r) => {
        report += `- **(${r.id})** ${r.description} (${r.category}) [${r.priority}]\n`;
        if (r.metrics && r.metrics.length > 0) {
          report += "  - **Metrics:**\n";
          r.metrics.forEach((m) => {
            report += `    - ${m.name}: ${m.target}\n`;
          });
        }
      });
      report += "\n";
    }
  }

  // Design Patterns
  report += "## Design Patterns\n";
  if (state.designPatterns.length === 0) {
    report += "No design patterns recommended.\n\n";
  } else {
    state.designPatterns.forEach((p) => {
      report += `### ${p.name} (${p.category})\n`;
      report += `${p.description}\n\n`;
      report += `**Benefits:** ${p.benefits}\n\n`;
      report += `**Tradeoffs:** ${p.tradeoffs}\n\n`;
      report += `**Implementation Considerations:** ${p.implementationConsiderations || "None specified."}\n\n`;
      report += `**Technical Compatibility:** ${p.technicalCompatibility || "None specified."}\n\n`;
      report += `**Applicable Requirements:** ${p.applicableRequirements.join(", ") || "None specified."}\n\n`;

      if (p.codeExample) {
        report += "**Code Example:**\n```typescript\n";
        report += p.codeExample;
        report += "\n```\n\n";
      }
    });
  }

  // Integration Strategies
  report += "## Integration Strategies\n";
  if (state.integrationStrategies.length === 0) {
    report += "No integration strategies defined.\n\n";
  } else {
    state.integrationStrategies.forEach((s) => {
      report += `### ${s.name} (${s.type})\n`;
      report += `${s.description}\n\n`;
      report += `**Components:** ${s.components.join(", ")}\n\n`;
      report += `**Technologies:** ${s.technologies.join(", ")}\n\n`;
    });
  }

  // Database Schema
  report += "## MongoDB Database Schema\n";
  if (state.databaseSchema.entities.length === 0) {
    report += "No database schema defined.\n\n";
  } else {
    // Collections
    report += "### Collections\n";
    state.databaseSchema.entities.forEach((e) => {
      report += `#### ${e.name} (${e.collectionName || e.name})\n`;
      report += `${e.description}\n\n`;

      // Attributes table
      report += "| Field | Type | Description | Required | Indexed | Validation |\n";
      report += "|-------|------|-------------|----------|----------|------------|\n";
      e.attributes.forEach((a) => {
        report += `| ${a.name} | ${a.type} | ${a.description} | ${a.isRequired ? "Yes" : "No"} | ${a.isIndexed ? "Yes" : "No"} | ${
          a.validation || "None"
        } |\n`;
      });
      report += "\n";

      // Indexes
      if (e.indexes && e.indexes.length > 0) {
        report += "**Indexes:**\n";
        e.indexes.forEach((idx) => {
          report += `- ${idx.type} index on ${idx.fields.join(", ")}${idx.options ? ` (${idx.options})` : ""}\n`;
        });
        report += "\n";
      }

      // Validation rules
      if (e.validationRules) {
        report += "**Validation Rules:**\n";
        report += "```javascript\n";
        report += e.validationRules;
        report += "\n```\n\n";
      }

      // Sample document
      if (e.sampleDocument) {
        report += "**Sample Document:**\n";
        report += "```json\n";
        report += e.sampleDocument;
        report += "\n```\n\n";
      }
    });

    // Relationships
    report += "### Relationships\n";
    state.databaseSchema.relationships.forEach((r) => {
      report += `#### ${r.from} ${r.type} ${r.to}\n`;
      report += `${r.description}\n\n`;
      report += `**Implementation Strategy:** ${r.implementationStrategy}\n\n`;

      if (r.implementationDetails) {
        report += `**Implementation Details:** ${r.implementationDetails}\n\n`;
      }
    });

    // Sharding
    if (state.databaseSchema.sharding && state.databaseSchema.sharding.strategy) {
      report += "### Sharding Strategy\n";
      report += `**Strategy:** ${state.databaseSchema.sharding.strategy}\n\n`;
      report += `**Shard Key:** ${state.databaseSchema.sharding.shardKey}\n\n`;

      if (state.databaseSchema.sharding.rationale) {
        report += `**Rationale:** ${state.databaseSchema.sharding.rationale}\n\n`;
      }
    }

    // MongoDB Setup Script
    if (state.schemaMongoScript) {
      report += "### MongoDB Setup Script\n";
      report += "```javascript\n";
      report += state.schemaMongoScript;
      report += "\n```\n\n";
    }
  }

  return report;
}

export async function runArchitectureAssistantMock(userInput: string) {
  // Fast mock for integration/UI testing
  const process = [
    { role: "Supervisor", content: "Analyzing the current state..." },
    { role: "Requirements Analyst", content: "Identified 2 functional and 3 non-functional requirements." },
    { role: "Design Pattern Advisor", content: "Recommended 7 design patterns." },
    { role: "Integration Specialist", content: "Recommended 5 integration strategies and defined 6 APIs." },
    { role: "Database Designer", content: "Created a schema with 4 entities and 4 relationships." },
    { role: "Visualization Expert", content: "Created 3 Mermaid diagrams (SVG rendering moved to frontend)." },
  ];
  const report = `# Architecture Report\n\nThis is a mock report for fast UI testing.\n\n- 2 functional requirements\n- 3 non-functional requirements\n- 7 design patterns\n- 5 integration strategies\n- 4 entities, 4 relationships in DB\n- 3 diagrams (see right panel)`;
  return { process, report };
}

export { runArchitectureAssistant };
