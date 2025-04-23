import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { requirementsAnalystSystemMessage } from "../prompts";
import { Command } from "@langchain/langgraph";
import { ArchitectureState } from "../state";
import { z } from "zod";

// Define the output schema for the requirements (copied from graph.ts)
// Define the enhanced output schema for the requirements
const requirementsOutputSchema = z.object({
  // An array of functional requirements with acceptance criteria
  functional: z
    .array(
      z.object({
        id: z.string().describe("A unique identifier for this requirement (e.g., F1, F2)"),
        description: z.string().describe("A clear, specific description of the requirement"),
        priority: z.enum(["high", "medium", "low"]).describe("The importance of this requirement"),
        acceptanceCriteria: z.array(z.string()).describe("Criteria that must be met for the requirement to be considered complete"),
      })
    )
    .describe("Functional requirements that specify what the system should do"),

  // An array of non-functional requirements with metrics
  nonFunctional: z
    .array(
      z.object({
        id: z.string().describe("A unique identifier for this requirement (e.g., NF1, NF2)"),
        description: z.string().describe("A clear, specific description of the requirement"),
        category: z
          .enum(["performance", "security", "usability", "reliability", "scalability", "maintainability", "compatibility", "other"])
          .describe("The category of this non-functional requirement"),
        priority: z.enum(["high", "medium", "low"]).describe("The importance of this requirement"),
        metrics: z
          .array(
            z.object({
              name: z.string().describe("Name of the metric"),
              target: z.string().describe("Target value for the metric"),
            })
          )
          .describe("Measurable metrics for this non-functional requirement"),
      })
    )
    .describe("Non-functional requirements that specify qualities the system should have"),

  // A human-readable explanation
  explanation: z.string().describe("An explanation of the requirements analysis for the human"),
});

// The actual agent function for Requirements Analyst with enhanced output
const requirementsAnalystAgent = async (state: typeof ArchitectureState.State) => {
  // Create the LLM instance
  const llm = new ChatOpenAI({
    temperature: 0.2,
    modelName: "gpt-4.1",
  });

  // Create messages for the LLM
  const messages = [
    new SystemMessage(requirementsAnalystSystemMessage),
    ...state.messages,
    new HumanMessage(
      "Please analyze the above conversation and extract all requirements for the system being discussed. For functional requirements, include acceptance criteria. For non-functional requirements, include measurable metrics."
    ),
  ];

  console.log("Requirements Analyst is analyzing the conversation...");

  try {
    // Get structured output from the LLM using our schema
    const result = await llm.withStructuredOutput(requirementsOutputSchema).invoke(messages);

    console.log(
      `Requirements Analyst identified ${result.functional.length} functional and ${result.nonFunctional.length} non-functional requirements`
    );

    // Return a command that routes back to the supervisor and updates the state
    return new Command({
      goto: "supervisor",
      update: {
        // Update the requirements in the state
        requirements: {
          functional: result.functional,
          nonFunctional: result.nonFunctional,
        },
        // Add a message to the conversation
        messages: [
          new HumanMessage({
            content: result.explanation,
            name: "RequirementsAnalyst",
          }),
        ],
      },
    });
  } catch (error) {
    console.error("Error in Requirements Analyst:", error);

    // Use fallback values for requirements in case of error
    const fallbackRequirements = {
      functional: [],
      nonFunctional: [],
    };

    // Even if there's an error, go back to the supervisor with an error message
    return new Command({
      goto: "supervisor",
      update: {
        // Use the fallback values instead of trying to access result
        requirements: fallbackRequirements,
        messages: [
          new HumanMessage({
            content:
              "I encountered an error while analyzing requirements. Let's try a different approach or provide more details about the system requirements.",
            name: "RequirementsAnalyst",
          }),
        ],
      },
    });
  }
};

export { requirementsAnalystAgent };
export type { requirementsOutputSchema };
