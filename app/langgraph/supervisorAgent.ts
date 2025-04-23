import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { supervisorSystemMessage } from "../prompts";
import { Command } from "@langchain/langgraph";
import { ArchitectureState } from "../state";
import { z } from "zod";

// Define expanded agent roles and architecture stages
const agentRoles = [
  "requirements_analyst",
  "design_pattern_advisor",
  "integration_specialist",
  "database_designer",
  "visualization_expert",
  "implementation_guide", // New role for implementation details
  "visualization_generator", // New role for generating actual diagrams
  "END",
] as const;

// Define expanded architecture stages
const architectureStages = [
  "requirements_gathering",
  "architecture_design",
  "integration_planning",
  "data_modeling",
  "visualization",
  "implementation_planning", // New stage for implementation details
  "diagram_generation", // New stage for generating actual diagrams
  "review",
  "completed",
] as const;

// Enhanced supervisor decision schema
const supervisorDecisionSchema = z.object({
  next: z.enum(agentRoles).describe("The specialist agent that should act next, or END if the architecture process is complete"),
  reasoning: z.string().describe("Detailed explanation of why this specialist was chosen at this stage"),
  currentStage: z.enum(architectureStages).describe("The current stage of the architecture process"),
  completedStages: z.array(z.enum(architectureStages)).describe("List of architecture stages that have been completed"),
});

const supervisorAgent = async (state: typeof ArchitectureState.State) => {
  // Create the LLM instance - keeping temperature low for consistent decisions
  const llm = new ChatOpenAI({
    temperature: 0,
    modelName: "gpt-4.1",
  });

  // Create a function to format the current state for the prompt
  const formatStateForPrompt = () => {
    // Format requirements summary
    const reqSummary =
      state.requirements.functional.length + state.requirements.nonFunctional.length === 0
        ? "No requirements have been identified yet."
        : `${state.requirements.functional.length} functional requirements and ${state.requirements.nonFunctional.length} non-functional requirements identified.`;

    // Format design patterns summary
    const patternsSummary =
      state.designPatterns.length === 0
        ? "No design patterns have been recommended yet."
        : `${state.designPatterns.length} design patterns have been recommended.`;

    // Format integration summary
    const integrationSummary =
      state.integrationStrategies.length === 0
        ? "No integration strategies have been defined yet."
        : `${state.integrationStrategies.length} strategies have been defined.`;

    // Format APIs summary (new)
    const apisSummary = !state.apis || state.apis.length === 0 ? "No APIs have been defined yet." : `${state.apis.length} APIs have been defined.`;

    // Format database schema summary
    const dbSummary =
      state.databaseSchema.entities.length === 0
        ? "No database schema has been designed yet."
        : `Database schema with ${state.databaseSchema.entities.length} entities and ${state.databaseSchema.relationships.length} relationships has been designed.`;

    // Format diagrams summary
    const diagramsSummary =
      state.diagrams.length === 0 ? "No architecture diagrams have been created yet." : `${state.diagrams.length} diagrams have been created.`;

    // Format implementation steps summary (new)
    const implementationSummary =
      !state.implementationSteps || state.implementationSteps.length === 0
        ? "No implementation steps have been defined yet."
        : `${state.implementationSteps.length} implementation steps have been defined.`;

    // Format service architecture summary (new)
    const serviceArchitectureSummary =
      !state.serviceArchitecture || !state.serviceArchitecture.services || state.serviceArchitecture.services.length === 0
        ? "No service architecture has been defined yet."
        : `Service architecture with ${state.serviceArchitecture.services.length} services has been defined.`;

    // Format actual diagrams summary (new)
    const actualDiagramsSummary =
      !state.actualDiagrams || state.actualDiagrams.length === 0
        ? "No actual diagrams have been generated yet."
        : `${state.actualDiagrams.length} SVG diagrams have been generated.`;

    // Format Mermaid diagrams summary (new)
    const mermaidDiagramsSummary =
      !state.mermaidDiagrams || state.mermaidDiagrams.length === 0
        ? "No Mermaid diagrams have been generated yet."
        : `${state.mermaidDiagrams.length} Mermaid diagrams have been generated.`;

    // Return the formatted state summary
    return `
Current Architecture State:
- Stage: ${state.progress.currentStage}
- Completed Stages: ${state.progress.completedStages.join(", ") || "None"}
- Requirements: ${reqSummary}
- Design Patterns: ${patternsSummary}
- Integration: ${integrationSummary}
- APIs: ${apisSummary}
- Database: ${dbSummary}
- Diagrams: ${diagramsSummary}
- Implementation Steps: ${implementationSummary}
- Service Architecture: ${serviceArchitectureSummary}
- Actual Diagrams: ${actualDiagramsSummary}
- Mermaid Diagrams: ${mermaidDiagramsSummary}
`;
  };

  // Prepare all messages for the LLM
  const messages = [
    new SystemMessage(supervisorSystemMessage),
    new SystemMessage(formatStateForPrompt()),
    ...state.messages,
    new HumanMessage("Based on the current state of the architecture process, which specialist should act next? Or is the process complete?"),
  ];

  console.log("Supervisor is analyzing the current state...");

  try {
    // Get the decision from the LLM using our schema
    const decision = await llm.withStructuredOutput(supervisorDecisionSchema).invoke(messages);

    console.log(`Supervisor has decided to call ${decision.next} next.`);
    console.log(`Current stage: ${decision.currentStage}`);

    // Return a command with the routing decision and updated progress
    return new Command({
      goto: decision.next,
      update: {
        progress: {
          currentStage: decision.currentStage,
          completedStages: decision.completedStages,
        },
        // Add a message explaining the decision
        messages: [
          new HumanMessage({
            content: `I'll route to ${decision.next === "END" ? "complete the process" : "the " + decision.next} now. ${decision.reasoning}`,
            name: "Supervisor",
          }),
        ],
      },
    });
  } catch (error) {
    console.error("Error in Supervisor decision making:", error);

    // In case of error, default to calling the requirements analyst
    // This is a fallback to ensure the process continues
    return new Command({
      goto: "requirements_analyst",
      update: {
        messages: [
          new HumanMessage({
            content:
              "I encountered an issue while determining the next step. Let's continue with requirements analysis to ensure we have a solid foundation.",
            name: "Supervisor",
          }),
        ],
      },
    });
  }
};

export { supervisorAgent };
