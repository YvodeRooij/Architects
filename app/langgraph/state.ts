import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { messagesStateReducer } from "@langchain/langgraph";

// Define our enhanced state structure
export const ArchitectureState = Annotation.Root({
  // Chat messages history
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),

  // Routing information - which agent to call next
  next: Annotation<string>({
    reducer: (x, y) => y ?? x ?? "END",
    default: () => "END",
  }),

  // Enhanced requirements structure with acceptance criteria and metrics
  requirements: Annotation<{
    functional: Array<{
      id: string;
      description: string;
      priority: string;
      acceptanceCriteria: string[];
    }>;
    nonFunctional: Array<{
      id: string;
      description: string;
      category: string;
      priority: string;
      metrics: Array<{
        name: string;
        target: string;
      }>;
    }>;
  }>({
    reducer: (x, y) => ({
      functional: [...x.functional, ...(y.functional || [])],
      nonFunctional: [...x.nonFunctional, ...(y.nonFunctional || [])],
    }),
    default: () => ({ functional: [], nonFunctional: [] }),
  }),

  // Enhanced design patterns with implementation considerations
  designPatterns: Annotation<
    {
      name: string;
      category: string;
      description: string;
      benefits: string;
      tradeoffs: string;
      applicableRequirements: string[];
      implementationConsiderations: string;
      technicalCompatibility: string;
      codeExample: string;
    }[]
  >({
    reducer: (x, y) => [...x, ...y],
    default: () => [],
  }),

  // Enhanced integration strategies with security and scalability considerations
  integrationStrategies: Annotation<
    {
      name: string;
      type: string;
      description: string;
      components: string[];
      technologies: string[];
      securityConsiderations: string;
      scalabilityConsiderations: string;
      resilience: string;
    }[]
  >({
    reducer: (x, y) => [...x, ...y],
    default: () => [],
  }),

  // API specifications
  apis: Annotation<
    {
      name: string;
      endpoint: string;
      method: string;
      description: string;
      serviceOwner: string;
      inputSchema: string;
      outputSchema: string;
      authentication: string;
      authorization: string;
      errorHandling: string;
      rateLimiting: string;
      example: {
        request: string;
        response: string;
      };
    }[]
  >({
    reducer: (x, y) => [...x, ...y],
    default: () => [],
  }),

  // Service architecture
  serviceArchitecture: Annotation<{
    services: {
      name: string;
      responsibility: string;
      components: string[];
      dataOwned: string[];
    }[];
    interactions: {
      source: string;
      target: string;
      type: string;
      description: string;
      protocol: string;
    }[];
  }>({
    reducer: (x, y) => ({
      services: [...(x.services || []), ...(y.services || [])],
      interactions: [...(x.interactions || []), ...(y.interactions || [])],
    }),
    default: () => ({ services: [], interactions: [] }),
  }),

  // Enhanced MongoDB database schema
  databaseSchema: Annotation<{
    entities: {
      name: string;
      description: string;
      collectionName: string;
      attributes: {
        name: string;
        type: string;
        description: string;
        isPrimary: boolean;
        isForeign: boolean;
        isRequired: boolean;
        isIndexed: boolean;
        validation: string;
      }[];
      indexes: {
        fields: string[];
        type: string;
        options: string;
      }[];
      validationRules: string;
      sampleDocument: string;
    }[];
    relationships: {
      from: string;
      to: string;
      type: string;
      description: string;
      implementationStrategy: string;
      implementationDetails: string;
    }[];
    sharding: {
      strategy: string;
      shardKey: string;
      rationale: string;
    };
  }>({
    reducer: (x, y) => ({
      entities: [...x.entities, ...(y.entities || [])],
      relationships: [...x.relationships, ...(y.relationships || [])],
      sharding: y.sharding || x.sharding,
    }),
    default: () => ({
      entities: [],
      relationships: [],
      sharding: {
        strategy: "",
        shardKey: "",
        rationale: "",
      },
    }),
  }),

  // MongoDB setup script
  schemaMongoScript: Annotation<string>({
    reducer: (x, y) => y || x,
    default: () => "",
  }),

  // Data access patterns
  dataAccessPatterns: Annotation<
    {
      operation: string;
      description: string;
      query: string;
      optimization: string;
    }[]
  >({
    reducer: (x, y) => [...x, ...y],
    default: () => [],
  }),

  // Enhanced visualization diagrams with Mermaid code
  diagrams: Annotation<
    {
      title: string;
      type: string;
      description: string;
      elements: string[];
      textualRepresentation: string;
      mermaidCode: string;
    }[]
  >({
    reducer: (x, y) => [...x, ...y],
    default: () => [],
  }),

  // Actual SVG diagrams
  actualDiagrams: Annotation<
    {
      title: string;
      type: string;
      svgContent: string;
      description: string;
    }[]
  >({
    reducer: (x, y) => [...x, ...y],
    default: () => [],
  }),

  // Mermaid diagrams
  mermaidDiagrams: Annotation<
    {
      title: string;
      type: string;
      mermaidContent: string;
      description: string;
    }[]
  >({
    reducer: (x, y) => [...x, ...y],
    default: () => [],
  }),

  // Implementation steps
  implementationSteps: Annotation<
    {
      name: string;
      description: string;
      codeSnippet: string;
      dependencies: string[];
    }[]
  >({
    reducer: (x, y) => [...x, ...y],
    default: () => [],
  }),

  // Overall architecture progress tracking
  progress: Annotation<{
    currentStage: string;
    completedStages: string[];
  }>({
    reducer: (x, y) => ({
      currentStage: y.currentStage || x.currentStage,
      completedStages: [...new Set([...x.completedStages, ...(y.completedStages || [])])],
    }),
    default: () => ({
      currentStage: "requirements_gathering",
      completedStages: [],
    }),
  }),
});
