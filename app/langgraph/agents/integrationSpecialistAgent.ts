import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { integrationSpecialistSystemMessage } from "../prompts";
import { Command } from "@langchain/langgraph";
import { ArchitectureState } from "../state";
import { z } from "zod";

// Define the enhanced output schema for integration
const integrationOutputSchema = z.object({
  strategies: z
    .array(
      z.object({
        name: z.string().describe("Name of the integration strategy"),
        type: z.enum(["API", "messaging", "batch", "event-driven", "shared-database", "other"]).describe("Type of integration"),
        description: z.string().describe("Description of the integration strategy"),
        components: z.array(z.string()).describe("Components or systems being integrated"),
        technologies: z.array(z.string()).describe("Suggested technologies for implementation"),
        securityConsiderations: z.string().describe("Security considerations for this integration strategy"),
        scalabilityConsiderations: z.string().describe("Scalability considerations for this integration strategy"),
        resilience: z.string().describe("How this strategy handles failures and ensures system resilience"),
      })
    )
    .describe("Integration strategies for the architecture"),

  apis: z
    .array(
      z.object({
        name: z.string().describe("Name of the API"),
        endpoint: z.string().describe("API endpoint path"),
        method: z.string().describe("HTTP method"),
        description: z.string().describe("Description of what this API does"),
        serviceOwner: z.string().describe("Service that owns this API"),
        inputSchema: z.string().describe("Input schema in JSON format"),
        outputSchema: z.string().describe("Output schema in JSON format"),
        authentication: z.string().describe("Authentication requirements for this API"),
        authorization: z.string().describe("Authorization requirements for this API"),
        errorHandling: z.string().describe("Error handling approach for this API"),
        rateLimiting: z.string().describe("Rate limiting recommendations for this API"),
        example: z
          .object({
            request: z.string().describe("Example request"),
            response: z.string().describe("Example response"),
          })
          .describe("Example request and response"),
      })
    )
    .describe("API specifications for the architecture"),

  serviceArchitecture: z
    .object({
      services: z
        .array(
          z.object({
            name: z.string().describe("Name of the service"),
            responsibility: z.string().describe("Primary responsibility of this service"),
            components: z.array(z.string()).describe("Components included in this service"),
            dataOwned: z.array(z.string()).describe("Data entities owned by this service"),
          })
        )
        .describe("Services in the architecture"),

      interactions: z
        .array(
          z.object({
            source: z.string().describe("Source service"),
            target: z.string().describe("Target service"),
            type: z.string().describe("Type of interaction (sync, async, etc.)"),
            description: z.string().describe("Description of the interaction"),
            protocol: z.string().describe("Communication protocol"),
          })
        )
        .describe("Service interactions"),
    })
    .describe("Service architecture"),

  explanation: z.string().describe("An explanation of the integration strategy and API recommendations"),
});

// The agent function for Integration Specialist with enhanced output
const integrationSpecialistAgent = async (state: typeof ArchitectureState.State) => {
  // Create the LLM instance
  const llm = new ChatOpenAI({
    temperature: 0.2,
    modelName: "gpt-4.1", // Using gpt-4.1 as specified
  });

  // Format requirements for the prompt
  const formattedRequirements = [
    ...state.requirements.functional.map((r) => {
      const acString =
        r.acceptanceCriteria && r.acceptanceCriteria.length > 0
          ? `\n   Acceptance Criteria: ${r.acceptanceCriteria.map((ac) => `\n    - ${ac}`).join("")}`
          : "";
      return `F${r.id}: ${r.description} (${r.priority})${acString}`;
    }),
    ...state.requirements.nonFunctional.map((r) => {
      const metricsString =
        r.metrics && r.metrics.length > 0 ? `\n   Metrics: ${r.metrics.map((m) => `\n    - ${m.name}: ${m.target}`).join("")}` : "";
      return `NF${r.id}: ${r.description} (${r.category}, ${r.priority})${metricsString}`;
    }),
  ].join("\n");

  // Format design patterns for the prompt
  const formattedPatterns = state.designPatterns
    .map(
      (p) => `
${p.name} (${p.category}):
  Description: ${p.description}
  Benefits: ${p.benefits}
  Tradeoffs: ${p.tradeoffs}
  Implementation Considerations: ${p.implementationConsiderations || "None specified"}
  Applicable Requirements: ${p.applicableRequirements.join(", ") || "None specified"}
  Technical Compatibility: ${p.technicalCompatibility || "None specified"}
  `
    )
    .join("\n");

  // Create messages for the LLM
  const promptMessage = integrationSpecialistSystemMessage
    .replace("{{REQUIREMENTS}}", formattedRequirements)
    .replace("{{DESIGN_PATTERNS}}", formattedPatterns);

  const messages = [
    new SystemMessage(promptMessage),
    ...state.messages,
    new HumanMessage(
      "Based on the requirements and design patterns, please recommend integration strategies and define API specifications for this architecture. Include security and scalability considerations for each integration strategy, and provide detailed API specifications. Also define a clear service architecture with well-defined boundaries and interactions."
    ),
  ];

  console.log("Integration Specialist is analyzing the architecture...");

  try {
    // Get structured output from the LLM using our schema
    const result = await llm.withStructuredOutput(integrationOutputSchema).invoke(messages);

    console.log(`Integration Specialist recommended ${result.strategies.length} integration strategies and defined ${result.apis.length} APIs`);

    // Return a command that routes back to the supervisor and updates the state
    return new Command({
      goto: "supervisor",
      update: {
        // Update the integration strategies in the state
        integrationStrategies: result.strategies,
        // Update the APIs in the state
        apis: result.apis,
        // Update the service architecture in the state
        serviceArchitecture: result.serviceArchitecture,
        // Add a message to the conversation
        messages: [
          new HumanMessage({
            content: result.explanation,
            name: "IntegrationSpecialist",
          }),
        ],
      },
    });
  } catch (error) {
    console.error("Error in Integration Specialist:", error);

    // Even if there's an error, go back to the supervisor with an error message
    return new Command({
      goto: "supervisor",
      update: {
        messages: [
          new HumanMessage({
            content: "I encountered an error while defining integration strategies and APIs. Let's revisit the requirements and design patterns.",
            name: "IntegrationSpecialist",
          }),
        ],
      },
    });
  }
};

export { integrationSpecialistAgent };
