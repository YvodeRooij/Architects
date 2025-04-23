import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { databaseDesignerSystemMessage } from "../prompts";
import { Command } from "@langchain/langgraph";
import { ArchitectureState } from "../state";
import { z } from "zod";

// Define the enhanced output schema for database design
const databaseOutputSchema = z.object({
  schema: z.object({
    entities: z
      .array(
        z.object({
          name: z.string().describe("Name of the entity"),
          description: z.string().describe("Description of what this entity represents"),
          collectionName: z.string().describe("Name of the MongoDB collection for this entity"),
          attributes: z
            .array(
              z.object({
                name: z.string().describe("Name of the attribute"),
                type: z.string().describe("Data type of the attribute (String, Number, Date, ObjectId, etc.)"),
                description: z.string().describe("Description of what this attribute represents"),
                isPrimary: z.boolean().describe("Whether this is a primary key"),
                isForeign: z.boolean().describe("Whether this is a foreign key"),
                isRequired: z.boolean().describe("Whether this attribute is required"),
                isIndexed: z.boolean().describe("Whether this attribute should be indexed"),
                validation: z.string().describe("Validation rules for this attribute"),
              })
            )
            .describe("Attributes of this entity"),
          indexes: z
            .array(
              z.object({
                fields: z.array(z.string()).describe("Fields to include in the index"),
                type: z.enum(["single", "compound", "text", "geospatial", "hashed", "unique"]).describe("Type of index"),
                options: z.string().describe("Additional index options"),
              })
            )
            .describe("Indexes for this collection"),
          validationRules: z.string().describe("MongoDB validation rules for this collection"),
          sampleDocument: z.string().describe("A sample document in JSON format"),
        })
      )
      .describe("Entities in the database schema"),
    relationships: z
      .array(
        z.object({
          from: z.string().describe("Source entity name"),
          to: z.string().describe("Target entity name"),
          type: z.enum(["one-to-one", "one-to-many", "many-to-many"]).describe("Type of relationship"),
          description: z.string().describe("Description of the relationship"),
          implementationStrategy: z.enum(["embedding", "reference", "hybrid"]).describe("How this relationship is implemented in MongoDB"),
          implementationDetails: z.string().describe("Detailed explanation of how the relationship is implemented"),
        })
      )
      .describe("Relationships between entities"),
    sharding: z
      .object({
        strategy: z.string().describe("Sharding strategy if applicable"),
        shardKey: z.string().describe("Shard key if applicable"),
        rationale: z.string().describe("Rationale for the sharding strategy and shard key selection"),
      })
      .describe("Sharding configuration for MongoDB"),
  }),
  explanation: z.string().describe("An explanation of the database schema design"),
  schemaMongoScript: z.string().describe("MongoDB script to create this schema (collections, indexes, validation)"),
  dataAccessPatterns: z
    .array(
      z.object({
        operation: z.string().describe("Type of operation (create, read, update, delete)"),
        description: z.string().describe("Description of the data access pattern"),
        query: z.string().describe("Example MongoDB query or operation"),
        optimization: z.string().describe("How this access pattern is optimized by the schema design"),
      })
    )
    .describe("Common data access patterns and how they are optimized by the schema design"),
});

// The agent function for Database Designer with enhanced MongoDB-specific output
const databaseDesignerAgent = async (state: typeof ArchitectureState.State) => {
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
  const promptMessage = databaseDesignerSystemMessage
    .replace("{{REQUIREMENTS}}", formattedRequirements)
    .replace("{{DESIGN_PATTERNS}}", formattedPatterns);

  const messages = [
    new SystemMessage(promptMessage),
    ...state.messages,
    new HumanMessage(
      "Based on the requirements and design patterns, please design a MongoDB database schema for this architecture. Include collections, document structures, relationships, indexes, validation rules, and sharding strategy if applicable. Also provide example MongoDB queries for common data access patterns and a MongoDB script to create the schema."
    ),
  ];

  console.log("Database Designer is creating a database schema...");

  try {
    // Get structured output from the LLM using our schema
    const result = await llm.withStructuredOutput(databaseOutputSchema).invoke(messages);

    console.log(
      `Database Designer created a schema with ${result.schema.entities.length} entities and ${result.schema.relationships.length} relationships`
    );

    // Return a command that routes back to the supervisor and updates the state
    return new Command({
      goto: "supervisor",
      update: {
        // Update the database schema in the state
        databaseSchema: result.schema,
        // Add MongoDB script to the state
        schemaMongoScript: result.schemaMongoScript,
        // Add data access patterns to the state
        dataAccessPatterns: result.dataAccessPatterns,
        // Add a message to the conversation
        messages: [
          new HumanMessage({
            content: result.explanation,
            name: "DatabaseDesigner",
          }),
        ],
      },
    });
  } catch (error) {
    console.error("Error in Database Designer:", error);

    // Even if there's an error, go back to the supervisor with an error message
    return new Command({
      goto: "supervisor",
      update: {
        messages: [
          new HumanMessage({
            content: "I encountered an error while designing the database schema. Let's revisit the requirements and try a different approach.",
            name: "DatabaseDesigner",
          }),
        ],
      },
    });
  }
};

export { databaseDesignerAgent };
