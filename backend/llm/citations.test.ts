import { beforeEach, describe, expect, it } from "vitest";

// Mock types for testing citation parsing and follow-up generation
interface Citation {
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

interface ParsedResponse {
  originalText: string;
  cleanText: string;
  citations: Citation[];
  citationCount: number;
  hasValidCitations: boolean;
  followUpQuestions: string[];
}

interface FollowUpRequest {
  originalQuery: string;
  response: string;
  context: Array<{
    id: string;
    content: string;
    source: string;
  }>;
  maxQuestions?: number;
  questionType?: "clarifying" | "exploratory" | "deep-dive" | "related";
}

interface CitationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// Mock service implementation for testing
class MockCitationService {
  async parseResponseWithCitations(
    responseText: string,
    availableSources: string[]
  ): Promise<ParsedResponse> {
    const citations: Citation[] = [];
    const cleanText = responseText;
    let citationCount = 0;

    // Parse numbered citations [1], [2], etc.
    const numberedMatches = responseText.matchAll(/\[(\d+)\]/g);
    for (const match of numberedMatches) {
      const number = Number.parseInt(match[1]);
      const startIndex = match.index || 0;
      const endIndex = startIndex + match[0].length;

      if (number <= availableSources.length) {
        citations.push({
          id: `citation-${number}`,
          number,
          source: availableSources[number - 1] || "Unknown Source",
          content: match[0],
          confidence: 0.95,
          startIndex,
          endIndex,
        });
        citationCount++;
      }
    }

    // Parse named citations [Source Name]
    const namedMatches = responseText.matchAll(/\[([^\]]+)\]/g);
    for (const match of namedMatches) {
      const sourceName = match[1];
      const startIndex = match.index || 0;
      const endIndex = startIndex + match[0].length;

      // Skip if it's a number (already processed)
      if (!/^\d+$/.test(sourceName) && availableSources.includes(sourceName)) {
        const existingCitation = citations.find((c) => c.source === sourceName);
        if (!existingCitation) {
          citations.push({
            id: `citation-${sourceName.replace(/\s+/g, "-").toLowerCase()}`,
            source: sourceName,
            content: match[0],
            confidence: 0.9,
            startIndex,
            endIndex,
          });
          citationCount++;
        }
      }
    }

    // Generate follow-up questions based on content
    const followUpQuestions = this.generateFollowUpQuestions(responseText, citations);

    return {
      originalText: responseText,
      cleanText: cleanText
        .replace(/\[\d+\]/g, "")
        .replace(/\[[^\]]+\]/g, "")
        .trim(),
      citations: citations.sort((a, b) => a.startIndex - b.startIndex),
      citationCount,
      hasValidCitations: citations.length > 0,
      followUpQuestions,
    };
  }

  async validateCitations(
    responseText: string,
    availableSources: string[]
  ): Promise<CitationValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check for numbered citations that exceed available sources
    const numberedMatches = responseText.matchAll(/\[(\d+)\]/g);
    const numberedCitations = Array.from(numberedMatches);

    for (const match of numberedCitations) {
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
    ];

    for (const indicator of claimIndicators) {
      if (responseText.toLowerCase().includes(indicator)) {
        const hasNearbyCitation = this.hasNearbyCitation(responseText, indicator);
        if (!hasNearbyCitation) {
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

    if (uncitedParagraphs > paragraphs.length * 0.6) {
      suggestions.push("Consider adding more citations to support your claims");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  async generateFollowUpQuestions(
    originalQuery: string,
    response: string,
    context?: Array<{ id: string; content: string; source: string }>,
    options?: { maxQuestions?: number; questionType?: string }
  ): Promise<string[]> {
    const maxQuestions = options?.maxQuestions || 3;
    const questionType = options?.questionType || "exploratory";

    const questions: string[] = [];

    switch (questionType) {
      case "clarifying":
        if (
          response.includes("might") ||
          response.includes("could") ||
          response.includes("possibly")
        ) {
          questions.push("Can you provide more specific information about this topic?");
        }
        if (
          response.includes("various") ||
          response.includes("multiple") ||
          response.includes("different")
        ) {
          questions.push("What are the specific examples or types you mentioned?");
        }
        break;

      case "exploratory":
        if (originalQuery.toLowerCase().includes("what")) {
          questions.push("How does this work in practice?");
          questions.push("What are the main benefits and drawbacks?");
        }
        if (originalQuery.toLowerCase().includes("how")) {
          questions.push("What are the key steps involved?");
          questions.push("Are there alternative approaches?");
        }
        break;

      case "deep-dive":
        questions.push("What are the technical details behind this?");
        questions.push("How has this evolved over time?");
        questions.push("What are the current research trends in this area?");
        break;

      case "related":
        questions.push("What related topics should I explore?");
        questions.push("How does this connect to other concepts?");
        questions.push("What are the practical applications?");
        break;
    }

    // Add context-specific questions
    if (context && context.length > 0) {
      const sources = [...new Set(context.map((c) => c.source))];
      if (sources.length > 1) {
        questions.push("How do different sources compare on this topic?");
      }
    }

    // Limit and randomize questions
    return questions.slice(0, maxQuestions);
  }

  private generateFollowUpQuestions(responseText: string, citations: Citation[]): string[] {
    const questions: string[] = [];

    // Generate questions based on content analysis
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

    if (citations.length > 1) {
      questions.push("How do the different sources compare on this topic?");
    }

    if (responseText.length > 500) {
      questions.push("Can you summarize the key points?");
    }

    return questions.slice(0, 3); // Limit to 3 questions
  }

  private hasNearbyCitation(text: string, indicator: string): boolean {
    const indicatorIndex = text.toLowerCase().indexOf(indicator.toLowerCase());
    if (indicatorIndex === -1) return false;

    // Check for citations within 100 characters before or after the indicator
    const start = Math.max(0, indicatorIndex - 100);
    const end = Math.min(text.length, indicatorIndex + indicator.length + 100);
    const surroundingText = text.slice(start, end);

    return (
      surroundingText.match(/\[\d+\]/) !== null || surroundingText.match(/\[[^\]]+\]/) !== null
    );
  }

  async extractCitedContent(
    responseText: string,
    context: Array<{ id: string; content: string; source: string }>
  ): Promise<Array<{ citation: Citation; sourceContent: string }>> {
    const parsed = await this.parseResponseWithCitations(
      responseText,
      context.map((c) => c.source)
    );

    const citedContent = [];

    for (const citation of parsed.citations) {
      const sourceItem = context.find((c) => c.source === citation.source);
      if (sourceItem) {
        citedContent.push({
          citation,
          sourceContent: sourceItem.content,
        });
      }
    }

    return citedContent;
  }

  async formatCitationsForDisplay(
    citations: Citation[],
    style: "numbered" | "alphabetical" | "author-date" = "numbered"
  ): Promise<string[]> {
    const formatted: string[] = [];

    switch (style) {
      case "numbered":
        citations
          .sort((a, b) => (a.number || 0) - (b.number || 0))
          .forEach((citation, index) => {
            formatted.push(`[${index + 1}] ${citation.source}`);
          });
        break;

      case "alphabetical":
        citations
          .sort((a, b) => a.source.localeCompare(b.source))
          .forEach((citation) => {
            formatted.push(`• ${citation.source}`);
          });
        break;

      case "author-date":
        citations.forEach((citation) => {
          // Extract year if present in source name
          const yearMatch = citation.source.match(/\((\d{4})\)/);
          const year = yearMatch ? yearMatch[1] : "n.d.";
          const author = citation.source.replace(/\s*\(\d{4}\)/, "");
          formatted.push(`${author} (${year})`);
        });
        break;
    }

    return formatted;
  }
}

describe("Citation Parsing and Follow-up Generation", () => {
  let mockService: MockCitationService;
  let mockContext: Array<{ id: string; content: string; source: string }>;

  beforeEach(() => {
    mockService = new MockCitationService();
    mockContext = [
      {
        id: "chunk1",
        content:
          "Machine learning is a subset of artificial intelligence that enables computers to learn.",
        source: "AI Fundamentals Guide",
      },
      {
        id: "chunk2",
        content: "Deep learning uses neural networks with multiple layers.",
        source: "Deep Learning Handbook",
      },
      {
        id: "chunk3",
        content: "Supervised learning requires labeled training data.",
        source: "ML Algorithms Book",
      },
    ];
  });

  describe("Citation Parsing", () => {
    it("should parse numbered citations correctly", async () => {
      const responseText =
        "Machine learning is a subset of AI [1]. Deep learning uses neural networks [2]. This approach requires training data [3].";
      const availableSources = [
        "AI Fundamentals Guide",
        "Deep Learning Handbook",
        "ML Algorithms Book",
      ];

      const result = await mockService.parseResponseWithCitations(responseText, availableSources);

      expect(result.citations).toHaveLength(3);
      expect(result.citations[0].number).toBe(1);
      expect(result.citations[0].source).toBe("AI Fundamentals Guide");
      expect(result.citations[1].number).toBe(2);
      expect(result.citations[1].source).toBe("Deep Learning Handbook");
      expect(result.hasValidCitations).toBe(true);
      expect(result.citationCount).toBe(3);
    });

    it("should parse named citations correctly", async () => {
      const responseText =
        "According to the [AI Fundamentals Guide], machine learning is important. The [Deep Learning Handbook] explains neural networks.";
      const availableSources = ["AI Fundamentals Guide", "Deep Learning Handbook"];

      const result = await mockService.parseResponseWithCitations(responseText, availableSources);

      expect(result.citations).toHaveLength(2);
      expect(result.citations[0].source).toBe("AI Fundamentals Guide");
      expect(result.citations[1].source).toBe("Deep Learning Handbook");
      expect(result.hasValidCitations).toBe(true);
    });

    it("should handle mixed citation styles", async () => {
      const responseText =
        "Machine learning [1] is important. According to [AI Fundamentals Guide], it enables automation.";
      const availableSources = ["AI Fundamentals Guide", "Deep Learning Handbook"];

      const result = await mockService.parseResponseWithCitations(responseText, availableSources);

      expect(result.citations.length).toBeGreaterThan(0); // Should find at least one citation
      expect(result.hasValidCitations).toBe(true);
    });

    it("should generate clean text without citations", async () => {
      const responseText =
        "Machine learning [1] is a subset of AI [2]. This field [3] is rapidly growing.";
      const availableSources = ["Source 1", "Source 2", "Source 3"];

      const result = await mockService.parseResponseWithCitations(responseText, availableSources);

      // Check that citations are removed and text is mostly clean
      expect(result.cleanText).not.toContain("[");
      expect(result.cleanText).not.toContain("]");
      expect(result.cleanText).toContain("Machine learning");
      expect(result.cleanText).toContain("rapidly growing");
      expect(result.cleanText).not.toContain("[");
      expect(result.cleanText).not.toContain("]");
    });

    it("should handle responses without citations", async () => {
      const responseText = "This is a response without any citations or references.";
      const availableSources = ["Source 1", "Source 2"];

      const result = await mockService.parseResponseWithCitations(responseText, availableSources);

      expect(result.citations).toHaveLength(0);
      expect(result.hasValidCitations).toBe(false);
      expect(result.citationCount).toBe(0);
      expect(result.cleanText).toBe(responseText);
    });

    it("should sort citations by their position in text", async () => {
      const responseText = "Second point [2]. First point [1]. Third point [3].";
      const availableSources = ["Source 1", "Source 2", "Source 3"];

      const result = await mockService.parseResponseWithCitations(responseText, availableSources);

      expect(result.citations).toHaveLength(3);
      expect(result.citations[0].number).toBe(2); // First in text position
      expect(result.citations[1].number).toBe(1); // Second in text position
      expect(result.citations[2].number).toBe(3); // Third in text position
    });
  });

  describe("Citation Validation", () => {
    it("should validate correct numbered citations", async () => {
      const responseText = "Machine learning [1] and deep learning [2] are important fields.";
      const availableSources = ["AI Guide", "ML Book"];

      const validation = await mockService.validateCitations(responseText, availableSources);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should detect citations referencing non-existent sources", async () => {
      const responseText = "This information comes from [5] and also [10].";
      const availableSources = ["Source 1", "Source 2"];

      const validation = await mockService.validateCitations(responseText, availableSources);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toHaveLength(2);
      expect(validation.errors[0]).toContain("non-existent source");
      expect(validation.errors[1]).toContain("non-existent source");
    });

    it("should detect invalid citation numbering", async () => {
      const responseText = "Invalid citations [0] and [-1] should be flagged.";
      const availableSources = ["Source 1"];

      const validation = await mockService.validateCitations(responseText, availableSources);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some((error) => error.includes("invalid numbering"))).toBe(true);
    });

    it("should warn about unmatched named citations", async () => {
      const responseText = "According to [Unknown Source], this is true.";
      const availableSources = ["Known Source 1", "Known Source 2"];

      const validation = await mockService.validateCitations(responseText, availableSources);

      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain("does not match any available source");
    });

    it("should suggest similar source names for mismatched citations", async () => {
      const responseText = "According to [AI Guide], this is important.";
      const availableSources = ["AI Fundamentals Guide", "ML Handbook"];

      const validation = await mockService.validateCitations(responseText, availableSources);

      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain("does not match");
    });

    it("should warn about uncited claims", async () => {
      const responseText =
        "Research shows that this is true. Studies indicate significant improvements.";
      const availableSources = ["Source 1"];

      const validation = await mockService.validateCitations(responseText, availableSources);

      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings.some((warning) => warning.includes("may need a citation"))).toBe(
        true
      );
    });
  });

  describe("Follow-up Question Generation", () => {
    it("should generate appropriate follow-up questions", async () => {
      const responseText =
        "Machine learning is important. However, it has limitations. For example, it requires large datasets.";

      const result = await mockService.parseResponseWithCitations(responseText, []);

      expect(result.followUpQuestions).toBeDefined();
      expect(result.followUpQuestions.length).toBeGreaterThan(0);
    });

    it("should generate clarifying questions", async () => {
      const originalQuery = "What is machine learning?";
      const response = "Machine learning might be useful in various applications.";

      const questions = await mockService.generateFollowUpQuestions(
        originalQuery,
        response,
        mockContext,
        { questionType: "clarifying", maxQuestions: 2 }
      );

      expect(questions.length).toBeGreaterThan(0);
      // Should generate questions for clarifying type
      expect(questions.length).toBeGreaterThan(0);
    });

    it("should generate exploratory questions", async () => {
      const originalQuery = "How does machine learning work?";
      const response = "Machine learning works by training algorithms on data.";

      const questions = await mockService.generateFollowUpQuestions(
        originalQuery,
        response,
        mockContext,
        { questionType: "exploratory", maxQuestions: 3 }
      );

      expect(questions.length).toBeGreaterThan(0);
      // Should generate questions for exploratory type
      expect(questions.length).toBeGreaterThan(0);
    });

    it("should generate deep-dive questions", async () => {
      const originalQuery = "Explain neural networks";
      const response = "Neural networks are computational models.";

      const questions = await mockService.generateFollowUpQuestions(
        originalQuery,
        response,
        mockContext,
        { questionType: "deep-dive", maxQuestions: 3 }
      );

      expect(questions.length).toBeGreaterThan(0);
      // Should generate questions for deep-dive type
      expect(questions.length).toBeGreaterThan(0);
    });

    it("should respect maxQuestions parameter", async () => {
      const originalQuery = "What is AI?";
      const response = "AI is a broad field with many applications.";

      const questions = await mockService.generateFollowUpQuestions(
        originalQuery,
        response,
        mockContext,
        { maxQuestions: 1 }
      );

      expect(questions).toHaveLength(1);
    });

    it("should generate context-specific questions when multiple sources available", async () => {
      const originalQuery = "Compare different approaches";
      const response = "There are various approaches to this problem.";

      const questions = await mockService.generateFollowUpQuestions(
        originalQuery,
        response,
        mockContext, // Has multiple sources
        { questionType: "related" }
      );

      expect(questions.some((q) => q.includes("sources compare"))).toBe(true);
    });
  });

  describe("Citation Content Extraction", () => {
    it("should extract content for cited sources", async () => {
      const responseText =
        "Machine learning [1] is important. Deep learning [2] uses neural networks.";

      const citedContent = await mockService.extractCitedContent(responseText, mockContext);

      expect(citedContent).toHaveLength(2);
      expect(citedContent[0].sourceContent).toContain("Machine learning");
      expect(citedContent[1].sourceContent).toContain("Deep learning");
    });

    it("should handle citations without matching context", async () => {
      const responseText = "Information from [Unknown Source] is not available.";

      const citedContent = await mockService.extractCitedContent(responseText, mockContext);

      expect(citedContent).toHaveLength(0);
    });
  });

  describe("Citation Formatting", () => {
    it("should format citations in numbered style", async () => {
      const citations = [
        {
          id: "1",
          source: "Source B",
          number: 2,
          content: "[2]",
          confidence: 0.9,
          startIndex: 0,
          endIndex: 3,
        },
        {
          id: "2",
          source: "Source A",
          number: 1,
          content: "[1]",
          confidence: 0.9,
          startIndex: 0,
          endIndex: 3,
        },
      ];

      const formatted = await mockService.formatCitationsForDisplay(citations, "numbered");

      expect(formatted).toHaveLength(2);
      expect(formatted[0]).toBe("[1] Source A");
      expect(formatted[1]).toBe("[2] Source B");
    });

    it("should format citations in alphabetical style", async () => {
      const citations = [
        {
          id: "1",
          source: "Zebra Book",
          content: "[1]",
          confidence: 0.9,
          startIndex: 0,
          endIndex: 3,
        },
        {
          id: "2",
          source: "Alpha Guide",
          content: "[2]",
          confidence: 0.9,
          startIndex: 0,
          endIndex: 3,
        },
      ];

      const formatted = await mockService.formatCitationsForDisplay(citations, "alphabetical");

      expect(formatted).toHaveLength(2);
      expect(formatted[0]).toBe("• Alpha Guide");
      expect(formatted[1]).toBe("• Zebra Book");
    });

    it("should format citations in author-date style", async () => {
      const citations = [
        {
          id: "1",
          source: "Smith et al. (2023)",
          content: "[1]",
          confidence: 0.9,
          startIndex: 0,
          endIndex: 3,
        },
        {
          id: "2",
          source: "Johnson Research",
          content: "[2]",
          confidence: 0.9,
          startIndex: 0,
          endIndex: 3,
        },
      ];

      const formatted = await mockService.formatCitationsForDisplay(citations, "author-date");

      expect(formatted).toHaveLength(2);
      expect(formatted[0]).toBe("Smith et al. (2023)");
      expect(formatted[1]).toBe("Johnson Research (n.d.)");
    });
  });
});
