import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { visualizationGeneratorSystemMessage } from "../prompts";
import { Command } from "@langchain/langgraph";
import { ArchitectureState } from "../state";
import { z } from "zod";
import mermaid from "mermaid";

// Define the output schema for visualization generator
const visualizationGeneratorOutputSchema = z.object({
  diagrams: z
    .array(
      z.object({
        title: z.string().describe("Title of the diagram"),
        type: z.string().describe("Type of diagram"),
        svgContent: z.string().describe("SVG content for the diagram"),
        description: z.string().describe("Description of what the diagram shows"),
        originalSpecification: z.string().describe("Reference to the original diagram specification"),
        enhancements: z.string().describe("Enhancements made to the original specification"),
      })
    )
    .describe("Generated SVG diagrams for the architecture"),

  mermaidDiagrams: z
    .array(
      z.object({
        title: z.string().describe("Title of the diagram"),
        type: z.string().describe("Type of diagram (class, sequence, etc.)"),
        mermaidContent: z.string().describe("Mermaid code for the diagram"),
        description: z.string().describe("Description of what the diagram shows"),
        originalSpecification: z.string().describe("Reference to the original diagram specification"),
        enhancements: z.string().describe("Enhancements made to the original specification"),
      })
    )
    .describe("Enhanced Mermaid diagrams for the architecture"),

  explanation: z.string().describe("An explanation of the generated visualizations"),

  visualizationGuidelines: z
    .object({
      style: z.string().describe("Style guidelines for the diagrams"),
      colors: z.string().describe("Color scheme used in the diagrams"),
      notation: z.string().describe("Notation guidelines for the diagrams"),
      terminology: z.string().describe("Terminology guidelines for the diagrams"),
    })
    .describe("Guidelines for the visualizations"),
});

// The visualization generator agent function
const visualizationGeneratorAgent = async (state: typeof ArchitectureState.State) => {
  // Create the LLM instance
  const llm = new ChatOpenAI({
    temperature: 0.2,
    modelName: "gpt-4.1", // Using gpt-4.1 as specified
  });

  // Format diagram specifications for the prompt
  const diagramSpecs = JSON.stringify(state.diagrams, null, 2);

  // Create messages for the LLM
  const promptMessage = visualizationGeneratorSystemMessage.replace("{{DIAGRAM_SPECS}}", diagramSpecs);

  const messages = [
    new SystemMessage(promptMessage),
    ...state.messages,
    new HumanMessage(
      "Based on the diagram specifications, please generate actual SVG diagrams and enhanced Mermaid code that can be rendered. Ensure the diagrams are clear, readable, and visually appealing. Focus on effectively communicating the architecture to both technical and non-technical stakeholders."
    ),
  ];

  console.log("Visualization Generator is creating actual diagrams...");

  try {
    // Get structured output from the LLM using our schema
    const result = await llm.withStructuredOutput(visualizationGeneratorOutputSchema).invoke(messages);

    console.log(`Visualization Generator created ${result.diagrams.length} SVG diagrams and ${result.mermaidDiagrams.length} Mermaid diagrams`);

    // Validate and render Mermaid diagrams to SVG using mermaid
    const validatedMermaidDiagrams = await Promise.all(
      result.mermaidDiagrams.map(async (diagram, idx) => {
        try {
          // Render Mermaid code to SVG
          const { svg } = await mermaid.render(`mermaid-diagram-${idx}`, diagram.mermaidContent);
          return { ...diagram, renderedSvg: svg };
        } catch (err) {
          console.error("Mermaid rendering error:", err);
          return { ...diagram, renderedSvg: null, renderError: String(err) };
        }
      })
    );

    // Return a command that routes back to the supervisor and updates the state
    return new Command({
      goto: "supervisor",
      update: {
        // Update the actual diagrams in the state
        actualDiagrams: result.diagrams,
        // Update the Mermaid diagrams in the state (with rendered SVG)
        mermaidDiagrams: validatedMermaidDiagrams,
        // Update the visualization guidelines in the state
        visualizationGuidelines: result.visualizationGuidelines,
        // Add a message to the conversation
        messages: [
          new HumanMessage({
            content: result.explanation,
            name: "VisualizationGenerator",
          }),
        ],
      },
    });
  } catch (error) {
    console.error("Error in Visualization Generator:", error);

    // Even if there's an error, go back to the supervisor with an error message
    return new Command({
      goto: "supervisor",
      update: {
        messages: [
          new HumanMessage({
            content: "I encountered an error while generating diagrams. Let's revisit the diagram specifications and try again.",
            name: "VisualizationGenerator",
          }),
        ],
      },
    });
  }
};

export { visualizationGeneratorAgent };
