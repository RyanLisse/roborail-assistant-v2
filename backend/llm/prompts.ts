import { api } from "encore.dev/api";
import { z } from "zod";

// Validation schemas
export const RAGContextSchema = z.object({
  chunks: z
    .array(
      z.object({
        id: z.string(),
        content: z.string().min(1, "Chunk content cannot be empty"),
        source: z.string().min(1, "Source is required"),
        metadata: z.record(z.any()).optional(),
      })
    )
    .min(1, "At least one context chunk is required"),
  documentTitles: z.array(z.string()),
  totalChunks: z.number().int().min(0),
});

export const PromptTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().min(1, "Template description is required"),
  systemPrompt: z.string().min(1, "System prompt is required"),
  userPromptTemplate: z.string().min(1, "User prompt template is required"),
  parameters: z.array(z.string()),
});

export const StructuredPromptRequestSchema = z.object({
  query: z.string().min(1, "Query cannot be empty"),
  context: RAGContextSchema,
  templateName: z.string().optional().default("default"),
  customSystemPrompt: z.string().optional(),
  includeMetadata: z.boolean().optional().default(false),
  citationStyle: z.enum(["numbered", "named", "inline"]).optional().default("numbered"),
  responseFormat: z.enum(["paragraph", "bullet", "structured"]).optional().default("paragraph"),
});

// Types
export interface RAGContext {
  chunks: Array<{
    id: string;
    content: string;
    source: string;
    metadata?: Record<string, any>;
  }>;
  documentTitles: string[];
  totalChunks: number;
}

export interface PromptTemplate {
  name: string;
  description: string;
  systemPrompt: string;
  userPromptTemplate: string;
  parameters: string[];
}

export interface StructuredPromptRequest {
  query: string;
  context: RAGContext;
  templateName?: string;
  customSystemPrompt?: string;
  includeMetadata?: boolean;
  citationStyle?: "numbered" | "named" | "inline";
  responseFormat?: "paragraph" | "bullet" | "structured";
}

export interface StructuredPromptResponse {
  systemPrompt: string;
  userPrompt: string;
  template: PromptTemplate;
  contextSummary: {
    chunkCount: number;
    documentCount: number;
    totalTokens: number;
  };
}

// Built-in prompt templates
const BUILT_IN_TEMPLATES: Map<string, PromptTemplate> = new Map([
  [
    "default",
    {
      name: "default",
      description: "Standard RAG response template for general knowledge queries",
      systemPrompt: `You are a helpful AI assistant that provides accurate, well-sourced answers based on the given context. Your role is to:

1. Answer questions directly and comprehensively using the provided context
2. Always cite your sources using the provided citation format
3. Be transparent about what information comes from which source
4. Indicate clearly if the context doesn't contain sufficient information to answer the question
5. Maintain a helpful and professional tone
6. Avoid making assumptions or adding information not present in the context

When citing sources, use the format provided in the context. If multiple sources support the same point, mention all relevant sources.`,
      userPromptTemplate: `Based on the following context, please answer the user's question:

{context}

Question: {query}

Please provide a comprehensive answer that:
1. Directly addresses the question
2. Uses information from the provided context
3. Cites sources appropriately using the citation format shown above
4. Indicates if information is missing or unclear
5. Organizes the response logically and clearly`,
      parameters: ["context", "query"],
    },
  ],

  [
    "technical",
    {
      name: "technical",
      description: "Technical documentation and code-focused responses",
      systemPrompt: `You are a technical documentation expert and software engineering assistant. Your expertise includes:

1. Providing precise, technical answers with implementation details
2. Including code examples, configuration snippets, and practical guidance when relevant
3. Explaining complex technical concepts clearly
4. Identifying best practices, potential pitfalls, and performance considerations
5. Referencing specific documentation sections, API methods, and technical specifications
6. Maintaining technical accuracy while being accessible to developers

Focus on actionable, implementable guidance that developers can directly apply.`,
      userPromptTemplate: `Context from technical documentation:

{context}

Technical Question: {query}

Please provide a detailed technical answer that includes:
1. Direct answer with technical details and implementation guidance
2. Code examples, configuration snippets, or API usage examples if applicable
3. Best practices, performance considerations, and potential gotchas
4. References to specific documentation sections, methods, or specifications
5. Step-by-step implementation guidance where appropriate`,
      parameters: ["context", "query"],
    },
  ],

  [
    "research",
    {
      name: "research",
      description: "Academic and research-focused responses with evidence synthesis",
      systemPrompt: `You are a research assistant with expertise in academic analysis and evidence synthesis. Your approach emphasizes:

1. Rigorous analysis of research findings and evidence
2. Clear distinction between established facts, interpretations, and hypotheses
3. Synthesis of information from multiple sources to provide comprehensive insights
4. Identification of research gaps, limitations, and areas needing further investigation
5. Proper academic citation and source attribution
6. Objective, evidence-based reasoning without unsubstantiated claims

Maintain scholarly rigor while making research accessible and actionable.`,
      userPromptTemplate: `Research context and evidence:

{context}

Research Question: {query}

Please provide a research-oriented analysis that:
1. Synthesizes key findings and evidence from the provided sources
2. Identifies patterns, trends, and relationships across different sources
3. Distinguishes between established facts and interpretations
4. Notes any limitations, gaps, or conflicting information in the evidence
5. Suggests areas where additional research might be valuable
6. Provides proper citations and source attribution`,
      parameters: ["context", "query"],
    },
  ],

  [
    "conversational",
    {
      name: "conversational",
      description: "Friendly, accessible responses for general users",
      systemPrompt: `You are a friendly, knowledgeable assistant who excels at making complex information accessible and easy to understand. Your communication style is:

1. Warm, approachable, and conversational without being overly casual
2. Clear and simple while maintaining accuracy and completeness
3. Patient and understanding, especially with complex or technical topics
4. Helpful in providing context and background information when needed
5. Encouraging and supportive, making users feel comfortable asking questions
6. Skilled at using analogies, examples, and relatable explanations

Your goal is to make information accessible to users regardless of their background knowledge.`,
      userPromptTemplate: `Here's some helpful information related to your question:

{context}

Your question: {query}

I'm here to help you understand this topic! Let me break down the information in a clear and accessible way, making sure to explain any complex concepts and point you to the relevant sources.`,
      parameters: ["context", "query"],
    },
  ],

  [
    "analytical",
    {
      name: "analytical",
      description: "Structured analysis for business and strategic contexts",
      systemPrompt: `You are an analytical consultant who specializes in structured problem-solving and strategic analysis. Your approach includes:

1. Breaking down complex problems into manageable components
2. Identifying key factors, relationships, and implications
3. Providing structured analysis with clear reasoning
4. Highlighting strategic considerations and decision factors
5. Balancing different perspectives and stakeholder viewpoints
6. Offering actionable insights and recommendations

Focus on practical analysis that supports informed decision-making.`,
      userPromptTemplate: `Analytical context and information:

{context}

Analysis Request: {query}

Please provide a structured analytical response that:
1. Breaks down the key components and factors involved
2. Analyzes relationships, patterns, and implications
3. Considers different perspectives and stakeholder viewpoints
4. Identifies strategic considerations and decision factors
5. Provides actionable insights and recommendations
6. Supports conclusions with evidence from the provided context`,
      parameters: ["context", "query"],
    },
  ],
]);

// In-memory template storage (in production, this would be a database)
const customTemplates: Map<string, PromptTemplate> = new Map();

// Helper functions
function getAllTemplates(): Map<string, PromptTemplate> {
  const allTemplates = new Map(BUILT_IN_TEMPLATES);
  for (const [key, value] of customTemplates) {
    allTemplates.set(key, value);
  }
  return allTemplates;
}

function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token (more accurate for English text)
  return Math.ceil(text.length / 4);
}

function formatContext(
  context: RAGContext,
  citationStyle: "numbered" | "named" | "inline" = "numbered",
  includeMetadata = false
): string {
  let formatted = "";

  context.chunks.forEach((chunk, index) => {
    switch (citationStyle) {
      case "numbered":
        formatted += `[${index + 1}] ${chunk.content}`;
        if (includeMetadata && chunk.metadata) {
          const metaStr = Object.entries(chunk.metadata)
            .map(([key, value]) => `${key}: ${value}`)
            .join(", ");
          formatted += ` (Source: ${chunk.source}, ${metaStr})`;
        } else {
          formatted += ` (Source: ${chunk.source})`;
        }
        formatted += "\n\n";
        break;

      case "named":
        formatted += `[${chunk.source}] ${chunk.content}`;
        if (includeMetadata && chunk.metadata) {
          const metaStr = Object.entries(chunk.metadata)
            .map(([key, value]) => `${key}: ${value}`)
            .join(", ");
          formatted += ` (${metaStr})`;
        }
        formatted += "\n\n";
        break;

      case "inline":
        formatted += `${chunk.content} (${chunk.source}`;
        if (includeMetadata && chunk.metadata) {
          const metaStr = Object.entries(chunk.metadata)
            .map(([key, value]) => `${key}: ${value}`)
            .join(", ");
          formatted += `, ${metaStr}`;
        }
        formatted += ")\n\n";
        break;
    }
  });

  return formatted.trim();
}

function getFormatInstructions(responseFormat: "paragraph" | "bullet" | "structured"): string {
  switch (responseFormat) {
    case "bullet":
      return "\n\nPlease format your response using bullet points for clarity and easy scanning.";
    case "structured":
      return "\n\nPlease structure your response with clear headings, sections, and logical organization.";
    case "paragraph":
    default:
      return "\n\nPlease provide your response in well-organized paragraphs with clear flow and structure.";
  }
}

function validateTemplate(template: PromptTemplate): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!template.name || template.name.trim().length === 0) {
    errors.push("Template name is required");
  }

  if (!template.description || template.description.trim().length === 0) {
    errors.push("Template description is required");
  }

  if (!template.systemPrompt || template.systemPrompt.trim().length === 0) {
    errors.push("System prompt is required");
  }

  if (!template.userPromptTemplate || template.userPromptTemplate.trim().length === 0) {
    errors.push("User prompt template is required");
  }

  // Check if template contains required parameters
  const requiredParams = ["context", "query"];
  for (const param of requiredParams) {
    if (!template.userPromptTemplate.includes(`{${param}}`)) {
      errors.push(`Template must include {${param}} parameter`);
    }
  }

  // Check for potentially harmful content (basic check)
  const suspiciousPatterns = [
    "ignore previous instructions",
    "system override",
    "admin access",
    "password",
    "secret key",
  ];

  const templateContent = `${template.systemPrompt} ${template.userPromptTemplate}`.toLowerCase();
  for (const pattern of suspiciousPatterns) {
    if (templateContent.includes(pattern)) {
      errors.push(`Template contains potentially harmful content: "${pattern}"`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Core function to build structured prompts
async function buildStructuredPrompt(
  request: StructuredPromptRequest
): Promise<StructuredPromptResponse> {
  try {
    // Get template
    const templateName = request.templateName || "default";
    const allTemplates = getAllTemplates();
    const template = allTemplates.get(templateName);

    if (!template) {
      throw new Error(`Template "${templateName}" not found`);
    }

    // Build system prompt (custom override takes precedence)
    const systemPrompt = request.customSystemPrompt || template.systemPrompt;

    // Format context based on citation style and metadata preferences
    const formattedContext = formatContext(
      request.context,
      request.citationStyle,
      request.includeMetadata
    );

    // Build user prompt from template
    let userPrompt = template.userPromptTemplate
      .replace("{context}", formattedContext)
      .replace("{query}", request.query);

    // Add format instructions based on response format
    if (request.responseFormat && request.responseFormat !== "paragraph") {
      userPrompt += getFormatInstructions(request.responseFormat);
    }

    // Calculate context summary
    const contextSummary = {
      chunkCount: request.context.chunks.length,
      documentCount: new Set(request.context.chunks.map((c) => c.source)).size,
      totalTokens: estimateTokens(formattedContext),
    };

    console.log(
      `Built structured prompt using template "${templateName}" with ${contextSummary.chunkCount} chunks`
    );

    return {
      systemPrompt,
      userPrompt,
      template,
      contextSummary,
    };
  } catch (error) {
    console.error("Error building structured prompt:", error);
    throw new Error(
      `Failed to build structured prompt: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// API Endpoints

// Build structured prompt endpoint
export const buildPrompt = api(
  { expose: true, method: "POST", path: "/llm/prompt/build" },
  async (req: StructuredPromptRequest): Promise<StructuredPromptResponse> => {
    try {
      // Validate request
      const validatedReq = StructuredPromptRequestSchema.parse(req);

      console.log(
        `Building structured prompt for template "${validatedReq.templateName}" with ${validatedReq.context.chunks.length} chunks`
      );

      return await buildStructuredPrompt(validatedReq);
    } catch (error) {
      console.error("Build prompt endpoint error:", error);
      throw new Error(
        `Failed to build prompt: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

// List available templates endpoint
export const listTemplates = api(
  { expose: true, method: "GET", path: "/llm/prompt/templates" },
  async (): Promise<{ templates: PromptTemplate[]; count: number }> => {
    try {
      const allTemplates = getAllTemplates();
      const templates = Array.from(allTemplates.values());

      console.log(`Listed ${templates.length} prompt templates`);

      return {
        templates,
        count: templates.length,
      };
    } catch (error) {
      console.error("List templates endpoint error:", error);
      throw new Error(
        `Failed to list templates: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

// Get specific template endpoint
export const getTemplate = api(
  { expose: true, method: "GET", path: "/llm/prompt/templates/:name" },
  async (req: { name: string }): Promise<PromptTemplate> => {
    try {
      const allTemplates = getAllTemplates();
      const template = allTemplates.get(req.name);

      if (!template) {
        throw new Error(`Template "${req.name}" not found`);
      }

      console.log(`Retrieved template "${req.name}"`);

      return template;
    } catch (error) {
      console.error("Get template endpoint error:", error);
      throw new Error(
        `Failed to get template: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

// Add custom template endpoint
export const addTemplate = api(
  { expose: true, method: "POST", path: "/llm/prompt/templates" },
  async (req: PromptTemplate): Promise<{ success: boolean; message: string }> => {
    try {
      // Validate template
      const validatedTemplate = PromptTemplateSchema.parse(req);
      const validation = validateTemplate(validatedTemplate);

      if (!validation.valid) {
        throw new Error(`Template validation failed: ${validation.errors.join(", ")}`);
      }

      // Check if template already exists
      if (BUILT_IN_TEMPLATES.has(validatedTemplate.name)) {
        throw new Error(`Cannot override built-in template "${validatedTemplate.name}"`);
      }

      // Add to custom templates
      customTemplates.set(validatedTemplate.name, validatedTemplate);

      console.log(`Added custom template "${validatedTemplate.name}"`);

      return {
        success: true,
        message: `Template "${validatedTemplate.name}" added successfully`,
      };
    } catch (error) {
      console.error("Add template endpoint error:", error);
      throw new Error(
        `Failed to add template: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

// Remove custom template endpoint
export const removeTemplate = api(
  { expose: true, method: "DELETE", path: "/llm/prompt/templates/:name" },
  async (req: { name: string }): Promise<{ success: boolean; message: string }> => {
    try {
      // Check if it's a built-in template
      if (BUILT_IN_TEMPLATES.has(req.name)) {
        throw new Error(`Cannot remove built-in template "${req.name}"`);
      }

      // Remove from custom templates
      const removed = customTemplates.delete(req.name);

      if (!removed) {
        throw new Error(`Template "${req.name}" not found`);
      }

      console.log(`Removed custom template "${req.name}"`);

      return {
        success: true,
        message: `Template "${req.name}" removed successfully`,
      };
    } catch (error) {
      console.error("Remove template endpoint error:", error);
      throw new Error(
        `Failed to remove template: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

// Validate template endpoint
export const validateTemplateEndpoint = api(
  { expose: true, method: "POST", path: "/llm/prompt/validate" },
  async (req: PromptTemplate): Promise<{ valid: boolean; errors: string[] }> => {
    try {
      // Parse and validate the template structure
      const validatedTemplate = PromptTemplateSchema.parse(req);

      // Perform detailed validation
      const validation = validateTemplate(validatedTemplate);

      console.log(
        `Validated template "${validatedTemplate.name}": ${validation.valid ? "valid" : "invalid"}`
      );

      return validation;
    } catch (error) {
      console.error("Validate template endpoint error:", error);
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : "Template validation failed"],
      };
    }
  }
);

// Export core functions for internal use
export {
  buildStructuredPrompt,
  formatContext,
  validateTemplate,
  getAllTemplates,
  BUILT_IN_TEMPLATES,
};
