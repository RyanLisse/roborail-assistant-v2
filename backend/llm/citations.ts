import { api } from "encore.dev/api";
import { z } from "zod";

// Validation schemas
export const CitationSchema = z.object({
  id: z.string(),
  number: z.number().optional(),
  source: z.string(),
  content: z.string(),
  pageNumber: z.number().optional(),
  section: z.string().optional(),
  confidence: z.number().min(0).max(1),
  startIndex: z.number().min(0),
  endIndex: z.number().min(0),
});

export const ParsedResponseSchema = z.object({
  originalText: z.string(),
  cleanText: z.string(),
  citations: z.array(CitationSchema),
  citationCount: z.number().min(0),
  hasValidCitations: z.boolean(),
  followUpQuestions: z.array(z.string()),
});

export const FollowUpRequestSchema = z.object({
  originalQuery: z.string().min(1, "Original query is required"),
  response: z.string().min(1, "Response text is required"),
  context: z
    .array(
      z.object({
        id: z.string(),
        content: z.string(),
        source: z.string(),
      })
    )
    .optional(),
  maxQuestions: z.number().int().min(1).max(10).optional().default(3),
  questionType: z
    .enum(["clarifying", "exploratory", "deep-dive", "related"])
    .optional()
    .default("exploratory"),
});

export const ValidationRequestSchema = z.object({
  responseText: z.string().min(1, "Response text is required"),
  availableSources: z.array(z.string()).min(1, "At least one source is required"),
});

// Types
export interface Citation {
  id: string;
  number?: number;
  source: string;
  content: string;
  pageNumber?: number;
  section?: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
}

export interface ParsedResponse {
  originalText: string;
  cleanText: string;
  citations: Citation[];
  citationCount: number;
  hasValidCitations: boolean;
  followUpQuestions: string[];
}

export interface FollowUpRequest {
  originalQuery: string;
  response: string;
  context?: Array<{
    id: string;
    content: string;
    source: string;
  }>;
  maxQuestions?: number;
  questionType?: "clarifying" | "exploratory" | "deep-dive" | "related";
}

export interface CitationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// Citation parsing functions
function parseNumberedCitations(text: string, availableSources: string[]): Citation[] {
  const citations: Citation[] = [];
  const numberedMatches = text.matchAll(/\[(\d+)\]/g);

  for (const match of numberedMatches) {
    const number = Number.parseInt(match[1]);
    const startIndex = match.index || 0;
    const endIndex = startIndex + match[0].length;

    if (number > 0 && number <= availableSources.length) {
      citations.push({
        id: `citation-${number}`,
        number,
        source: availableSources[number - 1],
        content: match[0],
        confidence: 0.95,
        startIndex,
        endIndex,
      });
    }
  }

  return citations;
}

function parseNamedCitations(text: string, availableSources: string[]): Citation[] {
  const citations: Citation[] = [];
  const namedMatches = text.matchAll(/\[([^\]]+)\]/g);

  for (const match of namedMatches) {
    const sourceName = match[1];
    const startIndex = match.index || 0;
    const endIndex = startIndex + match[0].length;

    // Skip if it's a number (already processed by numbered citations)
    if (!/^\d+$/.test(sourceName) && availableSources.includes(sourceName)) {
      citations.push({
        id: `citation-${sourceName.replace(/\s+/g, "-").toLowerCase()}`,
        source: sourceName,
        content: match[0],
        confidence: 0.9,
        startIndex,
        endIndex,
      });
    }
  }

  return citations;
}

function removeCitationsFromText(text: string): string {
  // Remove numbered citations [1], [2], etc.
  let cleanText = text.replace(/\[\d+\]/g, "");

  // Remove named citations [Source Name]
  cleanText = cleanText.replace(/\[[^\]]+\]/g, "");

  // Clean up extra whitespace
  cleanText = cleanText.replace(/\s+/g, " ").trim();

  return cleanText;
}

function generateFollowUpQuestions(
  originalQuery: string,
  responseText: string,
  questionType = "exploratory",
  maxQuestions = 3,
  context?: Array<{ id: string; content: string; source: string }>
): string[] {
  const questions: string[] = [];

  switch (questionType) {
    case "clarifying":
      if (
        responseText.includes("might") ||
        responseText.includes("could") ||
        responseText.includes("possibly")
      ) {
        questions.push("Can you provide more specific information about this topic?");
      }
      if (
        responseText.includes("various") ||
        responseText.includes("multiple") ||
        responseText.includes("different")
      ) {
        questions.push("What are the specific examples or types you mentioned?");
      }
      if (
        responseText.includes("generally") ||
        responseText.includes("typically") ||
        responseText.includes("usually")
      ) {
        questions.push("Are there any exceptions to this general rule?");
      }
      break;

    case "exploratory":
      if (originalQuery.toLowerCase().includes("what")) {
        questions.push("How does this work in practice?");
        questions.push("What are the main benefits and drawbacks?");
        questions.push("What are some real-world examples?");
      }
      if (originalQuery.toLowerCase().includes("how")) {
        questions.push("What are the key steps involved?");
        questions.push("Are there alternative approaches?");
        questions.push("What tools or resources are needed?");
      }
      if (originalQuery.toLowerCase().includes("why")) {
        questions.push("What are the underlying reasons for this?");
        questions.push("How does this impact other related areas?");
      }
      break;

    case "deep-dive":
      questions.push("What are the technical details behind this?");
      questions.push("How has this evolved over time?");
      questions.push("What are the current research trends in this area?");
      questions.push("What challenges or limitations exist?");
      questions.push("How does this compare to similar approaches?");
      break;

    case "related":
      questions.push("What related topics should I explore?");
      questions.push("How does this connect to other concepts?");
      questions.push("What are the practical applications?");
      questions.push("What skills or knowledge are needed to implement this?");
      break;
  }

  // Add content-based questions
  if (
    responseText.toLowerCase().includes("however") ||
    responseText.toLowerCase().includes("but")
  ) {
    questions.push("What are the contrasting viewpoints on this topic?");
  }

  if (
    responseText.toLowerCase().includes("example") ||
    responseText.toLowerCase().includes("such as")
  ) {
    questions.push("Can you provide more specific examples?");
  }

  if (
    responseText.toLowerCase().includes("important") ||
    responseText.toLowerCase().includes("significant")
  ) {
    questions.push("Why is this particularly important or significant?");
  }

  // Add context-specific questions
  if (context && context.length > 1) {
    const sources = [...new Set(context.map((c) => c.source))];
    if (sources.length > 1) {
      questions.push("How do different sources compare on this topic?");
    }
  }

  if (responseText.length > 500) {
    questions.push("Can you summarize the key points?");
  }

  // Remove duplicates and limit
  const uniqueQuestions = [...new Set(questions)];
  return uniqueQuestions.slice(0, maxQuestions);
}

function hasNearbyCitation(text: string, indicator: string): boolean {
  const indicatorIndex = text.toLowerCase().indexOf(indicator.toLowerCase());
  if (indicatorIndex === -1) return false;

  // Check for citations within 100 characters before or after the indicator
  const start = Math.max(0, indicatorIndex - 100);
  const end = Math.min(text.length, indicatorIndex + indicator.length + 100);
  const surroundingText = text.slice(start, end);

  return surroundingText.match(/\[\d+\]/) !== null || surroundingText.match(/\[[^\]]+\]/) !== null;
}

function validateCitations(
  responseText: string,
  availableSources: string[]
): CitationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Check for numbered citations that exceed available sources
  const numberedMatches = responseText.matchAll(/\[(\d+)\]/g);

  for (const match of numberedMatches) {
    const number = Number.parseInt(match[1]);
    if (number > availableSources.length) {
      errors.push(
        `Citation [${number}] refers to non-existent source (only ${availableSources.length} sources available)`
      );
    }
    if (number <= 0) {
      errors.push(`Citation [${number}] uses invalid numbering (must be positive)`);
    }
  }

  // Check for named citations that don't match available sources
  const namedMatches = responseText.matchAll(/\[([^\]]+)\]/g);
  for (const match of namedMatches) {
    const sourceName = match[1];
    if (!/^\d+$/.test(sourceName) && !availableSources.includes(sourceName)) {
      warnings.push(`Citation [${sourceName}] does not match any available source`);

      // Suggest similar source names
      const similar = availableSources.find(
        (source) =>
          source.toLowerCase().includes(sourceName.toLowerCase()) ||
          sourceName.toLowerCase().includes(source.toLowerCase())
      );
      if (similar) {
        suggestions.push(`Did you mean [${similar}] instead of [${sourceName}]?`);
      }
    }
  }

  // Check for claims that might need citations
  const claimIndicators = [
    "according to",
    "research shows",
    "studies indicate",
    "data suggests",
    "evidence shows",
    "findings reveal",
    "analysis demonstrates",
    "experts say",
  ];

  for (const indicator of claimIndicators) {
    if (responseText.toLowerCase().includes(indicator)) {
      const isCited = hasNearbyCitation(responseText, indicator);
      if (!isCited) {
        warnings.push(`Claim with "${indicator}" may need a citation for verification`);
      }
    }
  }

  // Check citation distribution
  const paragraphs = responseText.split("\n\n").filter((p) => p.trim().length > 0);
  let uncitedParagraphs = 0;

  for (const paragraph of paragraphs) {
    if (!paragraph.match(/\[\d+\]/) && !paragraph.match(/\[[^\]]+\]/)) {
      uncitedParagraphs++;
    }
  }

  if (paragraphs.length > 1 && uncitedParagraphs > paragraphs.length * 0.6) {
    suggestions.push("Consider adding more citations to support your claims");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

function formatCitationsForDisplay(
  citations: Citation[],
  style: "numbered" | "alphabetical" | "author-date" = "numbered"
): string[] {
  const formatted: string[] = [];

  switch (style) {
    case "numbered":
      const sortedCitations = citations.sort((a, b) => (a.number || 0) - (b.number || 0));
      for (const [index, citation] of sortedCitations.entries()) {
        formatted.push(`[${citation.number || index + 1}] ${citation.source}`);
      }
      break;

    case "alphabetical":
      const alphabeticalCitations = citations.sort((a, b) => a.source.localeCompare(b.source));
      for (const citation of alphabeticalCitations) {
        formatted.push(`• ${citation.source}`);
      }
      break;

    case "author-date":
      for (const citation of citations) {
        // Extract year if present in source name
        const yearMatch = citation.source.match(/\((\d{4})\)/);
        const year = yearMatch ? yearMatch[1] : "n.d.";
        const author = citation.source.replace(/\s*\(\d{4}\)/, "");
        formatted.push(`${author} (${year})`);
      }
      break;
  }

  return formatted;
}

// Core function to parse response with citations
async function parseResponseWithCitations(
  responseText: string,
  availableSources: string[]
): Promise<ParsedResponse> {
  try {
    console.log(
      `Parsing citations from response with ${availableSources.length} available sources`
    );

    // Parse numbered citations
    const numberedCitations = parseNumberedCitations(responseText, availableSources);

    // Parse named citations
    const namedCitations = parseNamedCitations(responseText, availableSources);

    // Combine and deduplicate citations
    const allCitations = [...numberedCitations, ...namedCitations];
    const uniqueCitations = allCitations.filter(
      (citation, index, self) => index === self.findIndex((c) => c.source === citation.source)
    );

    // Sort by position in text
    const sortedCitations = uniqueCitations.sort((a, b) => a.startIndex - b.startIndex);

    // Generate clean text
    const cleanText = removeCitationsFromText(responseText);

    // Generate follow-up questions
    const followUpQuestions = generateFollowUpQuestions(
      "", // We don't have the original query here
      responseText,
      "exploratory",
      3
    );

    const result: ParsedResponse = {
      originalText: responseText,
      cleanText,
      citations: sortedCitations,
      citationCount: sortedCitations.length,
      hasValidCitations: sortedCitations.length > 0,
      followUpQuestions,
    };

    console.log(
      `Parsed ${result.citationCount} citations and generated ${result.followUpQuestions.length} follow-up questions`
    );

    return result;
  } catch (error) {
    console.error("Error parsing citations:", error);
    throw new Error(
      `Citation parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// Core function to generate follow-up questions
async function generateFollowUpQuestionsFromContext(request: FollowUpRequest): Promise<string[]> {
  try {
    console.log(
      `Generating ${request.questionType} follow-up questions for query: "${request.originalQuery}"`
    );

    const questions = generateFollowUpQuestions(
      request.originalQuery,
      request.response,
      request.questionType,
      request.maxQuestions,
      request.context
    );

    console.log(`Generated ${questions.length} follow-up questions`);

    return questions;
  } catch (error) {
    console.error("Error generating follow-up questions:", error);
    throw new Error(
      `Follow-up generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// API Endpoints

// Parse citations endpoint
export const parseCitations = api(
  { expose: true, method: "POST", path: "/llm/citations/parse" },
  async (req: { responseText: string; availableSources: string[] }): Promise<ParsedResponse> => {
    try {
      // Validate request
      const validatedReq = ValidationRequestSchema.parse(req);

      console.log(
        `Parsing citations from response with ${validatedReq.availableSources.length} sources`
      );

      return await parseResponseWithCitations(
        validatedReq.responseText,
        validatedReq.availableSources
      );
    } catch (error) {
      console.error("Parse citations endpoint error:", error);
      throw new Error(
        `Failed to parse citations: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

// Validate citations endpoint
export const validateCitationsEndpoint = api(
  { expose: true, method: "POST", path: "/llm/citations/validate" },
  async (req: {
    responseText: string;
    availableSources: string[];
  }): Promise<CitationValidationResult> => {
    try {
      // Validate request
      const validatedReq = ValidationRequestSchema.parse(req);

      console.log(
        `Validating citations in response with ${validatedReq.availableSources.length} sources`
      );

      const validation = validateCitations(
        validatedReq.responseText,
        validatedReq.availableSources
      );

      console.log(
        `Validation result: ${validation.valid ? "valid" : "invalid"} (${validation.errors.length} errors, ${validation.warnings.length} warnings)`
      );

      return validation;
    } catch (error) {
      console.error("Validate citations endpoint error:", error);
      throw new Error(
        `Failed to validate citations: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

// Generate follow-up questions endpoint
export const generateFollowUp = api(
  { expose: true, method: "POST", path: "/llm/citations/follow-up" },
  async (req: FollowUpRequest): Promise<{ questions: string[]; count: number }> => {
    try {
      // Validate request
      const validatedReq = FollowUpRequestSchema.parse(req);

      console.log(`Generating follow-up questions for query: "${validatedReq.originalQuery}"`);

      const questions = await generateFollowUpQuestionsFromContext(validatedReq);

      return {
        questions,
        count: questions.length,
      };
    } catch (error) {
      console.error("Generate follow-up endpoint error:", error);
      throw new Error(
        `Failed to generate follow-up questions: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

// Format citations endpoint
export const formatCitations = api(
  { expose: true, method: "POST", path: "/llm/citations/format" },
  async (req: {
    citations: Citation[];
    style?: "numbered" | "alphabetical" | "author-date";
  }): Promise<{ formatted: string[]; style: string }> => {
    try {
      const style = req.style || "numbered";

      console.log(`Formatting ${req.citations.length} citations in ${style} style`);

      const formatted = formatCitationsForDisplay(req.citations, style);

      return {
        formatted,
        style,
      };
    } catch (error) {
      console.error("Format citations endpoint error:", error);
      throw new Error(
        `Failed to format citations: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

// Request/Response interfaces for extract cited content
interface ExtractCitedContentRequest {
  responseText: string;
  context: Array<{ id: string; content: string; source: string }>;
}

interface CitedContentItem {
  citation: Citation;
  sourceContent: string;
}

interface ExtractCitedContentResponse {
  citedContent: CitedContentItem[];
}

// Extract cited content endpoint
export const extractCitedContent = api(
  { expose: true, method: "POST", path: "/llm/citations/extract" },
  async (req: ExtractCitedContentRequest): Promise<ExtractCitedContentResponse> => {
    try {
      console.log(
        `Extracting cited content from response with ${req.context.length} context items`
      );

      const availableSources = req.context.map((c) => c.source);
      const parsed = await parseResponseWithCitations(req.responseText, availableSources);

      const citedContent = [];

      for (const citation of parsed.citations) {
        const sourceItem = req.context.find((c) => c.source === citation.source);
        if (sourceItem) {
          citedContent.push({
            citation,
            sourceContent: sourceItem.content,
          });
        }
      }

      console.log(`Extracted content for ${citedContent.length} citations`);

      return { citedContent };
    } catch (error) {
      console.error("Extract cited content endpoint error:", error);
      throw new Error(
        `Failed to extract cited content: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

// Export core functions for internal use
export {
  parseResponseWithCitations,
  generateFollowUpQuestionsFromContext,
  validateCitations,
  formatCitationsForDisplay,
  parseNumberedCitations,
  parseNamedCitations,
  removeCitationsFromText,
};
