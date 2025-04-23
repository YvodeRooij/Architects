import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { designPatternAdvisorSystemMessage } from "../prompts";
import { Command } from "@langchain/langgraph";
import { ArchitectureState } from "../state";
import { z } from "zod";

// Define the enhanced output schema for design patterns
const designPatternOutputSchema = z.object({
  patterns: z
    .array(
      z.object({
        name: z.string().describe("The name of the design pattern"),
        category: z.enum(["architectural", "structural", "behavioral", "creational", "integration"]).describe("The category of the design pattern"),
        description: z.string().describe("A description of the design pattern"),
        benefits: z.string().describe("The benefits of using this pattern"),
        tradeoffs: z.string().describe("The tradeoffs or considerations when using this pattern"),
        applicableRequirements: z.array(z.string()).describe("IDs of requirements that this pattern addresses"),
        implementationConsiderations: z.string().describe("Detailed considerations for implementing this pattern in the context of this system"),
        technicalCompatibility: z
          .string()
          .describe("How this pattern is compatible with the required technologies (Node.js, Next.js, MongoDB, LangGraph.js)"),
        codeExample: z.string().describe("A brief code example or pseudocode demonstrating how this pattern might be implemented"),
      })
    )
    .describe("Recommended design patterns for the architecture"),
  explanation: z.string().describe("An explanation of the design pattern recommendations"),
});

// The agent function for Design Pattern Advisor with enhanced output
const designPatternAdvisorAgent = async (state: typeof ArchitectureState.State) => {
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

  // Create messages for the LLM
  const promptMessage = designPatternAdvisorSystemMessage.replace("{{REQUIREMENTS}}", formattedRequirements);

  const messages = [
    new SystemMessage(promptMessage),
    ...state.messages,
    new HumanMessage(
      "Based on these requirements, please recommend appropriate design patterns for this architecture, including detailed implementation considerations and technical compatibility with the required technologies (Node.js, Next.js, MongoDB, LangGraph.js). Include a brief code example for each pattern."
    ),
  ];

  console.log("Design Pattern Advisor is analyzing the requirements...");

  try {
    // Get structured output from the LLM using our schema
    const result = await llm.withStructuredOutput(designPatternOutputSchema).invoke(messages);

    console.log(`Design Pattern Advisor recommended ${result.patterns.length} design patterns`);

    // Return a command that routes back to the supervisor and updates the state
    return new Command({
      goto: "supervisor",
      update: {
        // Update the design patterns in the state
        designPatterns: result.patterns,
        // Add a message to the conversation
        messages: [
          new HumanMessage({
            content: result.explanation,
            name: "DesignPatternAdvisor",
          }),
        ],
      },
    });
  } catch (error) {
    console.error("Error in Design Pattern Advisor:", error);

    // Even if there's an error, go back to the supervisor with an error message
    return new Command({
      goto: "supervisor",
      update: {
        messages: [
          new HumanMessage({
            content: "I encountered an error while recommending design patterns. Let's revisit the requirements or try a different approach.",
            name: "DesignPatternAdvisor",
          }),
        ],
      },
    });
  }
};

export { designPatternAdvisorAgent };
