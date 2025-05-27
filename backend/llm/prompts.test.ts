import { describe, it, expect, beforeEach } from 'vitest';

// Mock types for testing structured prompts
interface RAGContext {
  chunks: Array<{
    id: string;
    content: string;
    source: string;
    metadata?: Record<string, any>;
  }>;
  documentTitles: string[];
  totalChunks: number;
}

interface PromptTemplate {
  name: string;
  description: string;
  systemPrompt: string;
  userPromptTemplate: string;
  parameters: string[];
}

interface StructuredPromptRequest {
  query: string;
  context: RAGContext;
  templateName?: string;
  customSystemPrompt?: string;
  includeMetadata?: boolean;
  citationStyle?: 'numbered' | 'named' | 'inline';
  responseFormat?: 'paragraph' | 'bullet' | 'structured';
}

interface StructuredPromptResponse {
  systemPrompt: string;
  userPrompt: string;
  template: PromptTemplate;
  contextSummary: {
    chunkCount: number;
    documentCount: number;
    totalTokens: number;
  };
}

// Mock implementation for testing
class MockStructuredPromptService {
  private templates: Map<string, PromptTemplate> = new Map([
    ['default', {
      name: 'default',
      description: 'Standard RAG response template',
      systemPrompt: `You are a helpful AI assistant that provides accurate, well-sourced answers based on the given context. Always cite your sources using the provided format and be clear about what information comes from which source.`,
      userPromptTemplate: `Based on the following context, please answer the user's question:

{context}

Question: {query}

Please provide a comprehensive answer that:
1. Directly addresses the question
2. Uses information from the provided context
3. Cites sources appropriately
4. Indicates if information is missing or unclear`,
      parameters: ['context', 'query']
    }],
    ['technical', {
      name: 'technical',
      description: 'Technical documentation and code-focused responses',
      systemPrompt: `You are a technical documentation expert. Provide precise, technical answers with code examples when relevant. Focus on accuracy and practical implementation details.`,
      userPromptTemplate: `Context from technical documentation:

{context}

Technical Question: {query}

Please provide a detailed technical answer that includes:
1. Direct answer with technical details
2. Code examples if applicable
3. Best practices and considerations
4. References to specific documentation sections`,
      parameters: ['context', 'query']
    }],
    ['research', {
      name: 'research',
      description: 'Academic and research-focused responses',
      systemPrompt: `You are a research assistant that provides thorough, evidence-based answers. Always maintain academic rigor and clearly distinguish between established facts and interpretations.`,
      userPromptTemplate: `Research context:

{context}

Research Question: {query}

Please provide a research-oriented response that:
1. Synthesizes information from multiple sources
2. Identifies key findings and evidence
3. Notes any limitations or gaps in the information
4. Suggests areas for further investigation`,
      parameters: ['context', 'query']
    }],
    ['conversational', {
      name: 'conversational',
      description: 'Friendly, accessible responses for general users',
      systemPrompt: `You are a friendly, knowledgeable assistant. Explain complex topics in an accessible way while maintaining accuracy. Use a conversational tone and provide helpful context.`,
      userPromptTemplate: `Here's some information that might help answer your question:

{context}

Your question: {query}

Let me help you understand this! I'll explain it clearly and point you to the relevant information.`,
      parameters: ['context', 'query']
    }]
  ]);

  async buildStructuredPrompt(request: StructuredPromptRequest): Promise<StructuredPromptResponse> {
    // Get template
    const templateName = request.templateName || 'default';
    const template = this.templates.get(templateName);
    
    if (!template) {
      throw new Error(`Template "${templateName}" not found`);
    }

    // Build system prompt
    const systemPrompt = request.customSystemPrompt || template.systemPrompt;

    // Format context based on citation style
    const formattedContext = this.formatContext(request.context, request.citationStyle, request.includeMetadata);

    // Build user prompt from template
    let userPrompt = template.userPromptTemplate
      .replace('{context}', formattedContext)
      .replace('{query}', request.query);

    // Add format instructions based on response format
    if (request.responseFormat) {
      userPrompt += this.getFormatInstructions(request.responseFormat);
    }

    // Calculate context summary
    const contextSummary = {
      chunkCount: request.context.chunks.length,
      documentCount: request.context.documentTitles.length,
      totalTokens: this.estimateTokens(formattedContext),
    };

    return {
      systemPrompt,
      userPrompt,
      template,
      contextSummary,
    };
  }

  private formatContext(context: RAGContext, citationStyle: string = 'numbered', includeMetadata: boolean = false): string {
    let formatted = '';

    context.chunks.forEach((chunk, index) => {
      switch (citationStyle) {
        case 'numbered':
          formatted += `[${index + 1}] ${chunk.content}`;
          if (includeMetadata && chunk.metadata) {
            formatted += ` (Source: ${chunk.source})`;
          }
          formatted += '\n\n';
          break;
        
        case 'named':
          formatted += `[${chunk.source}] ${chunk.content}`;
          if (includeMetadata && chunk.metadata) {
            formatted += ` (${JSON.stringify(chunk.metadata)})`;
          }
          formatted += '\n\n';
          break;
        
        case 'inline':
          formatted += `${chunk.content} (${chunk.source})\n\n`;
          break;
        
        default:
          formatted += `${chunk.content}\n\n`;
      }
    });

    return formatted.trim();
  }

  private getFormatInstructions(responseFormat: string): string {
    switch (responseFormat) {
      case 'bullet':
        return '\n\nPlease format your response using bullet points for clarity.';
      case 'structured':
        return '\n\nPlease structure your response with clear headings and sections.';
      case 'paragraph':
      default:
        return '\n\nPlease provide your response in well-organized paragraphs.';
    }
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  async getTemplate(name: string): Promise<PromptTemplate | null> {
    return this.templates.get(name) || null;
  }

  async listTemplates(): Promise<PromptTemplate[]> {
    return Array.from(this.templates.values());
  }

  async addTemplate(template: PromptTemplate): Promise<void> {
    this.templates.set(template.name, template);
  }

  async removeTemplate(name: string): Promise<boolean> {
    return this.templates.delete(name);
  }

  async validateTemplate(template: PromptTemplate): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!template.name || template.name.trim().length === 0) {
      errors.push('Template name is required');
    }

    if (!template.systemPrompt || template.systemPrompt.trim().length === 0) {
      errors.push('System prompt is required');
    }

    if (!template.userPromptTemplate || template.userPromptTemplate.trim().length === 0) {
      errors.push('User prompt template is required');
    }

    // Check if template contains required parameters
    const requiredParams = ['context', 'query'];
    for (const param of requiredParams) {
      if (!template.userPromptTemplate.includes(`{${param}}`)) {
        errors.push(`Template must include {${param}} parameter`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

describe('Structured Prompt Engineering', () => {
  let mockService: MockStructuredPromptService;
  let mockContext: RAGContext;

  beforeEach(() => {
    mockService = new MockStructuredPromptService();
    mockContext = {
      chunks: [
        {
          id: 'chunk1',
          content: 'Machine learning is a subset of artificial intelligence that enables computers to learn without being explicitly programmed.',
          source: 'AI Fundamentals Guide',
          metadata: { page: 5, section: 'Introduction' }
        },
        {
          id: 'chunk2',
          content: 'Deep learning uses neural networks with multiple layers to model and understand complex patterns in data.',
          source: 'Deep Learning Handbook',
          metadata: { page: 12, section: 'Neural Networks' }
        },
        {
          id: 'chunk3',
          content: 'Supervised learning algorithms learn from labeled training data to make predictions on new, unseen data.',
          source: 'ML Algorithms Book',
          metadata: { page: 23, section: 'Supervised Learning' }
        }
      ],
      documentTitles: ['AI Fundamentals Guide', 'Deep Learning Handbook', 'ML Algorithms Book'],
      totalChunks: 3
    };
  });

  describe('Template Management', () => {
    it('should retrieve default template', async () => {
      const template = await mockService.getTemplate('default');

      expect(template).toBeTruthy();
      expect(template?.name).toBe('default');
      expect(template?.systemPrompt).toContain('helpful AI assistant');
      expect(template?.userPromptTemplate).toContain('{context}');
      expect(template?.userPromptTemplate).toContain('{query}');
    });

    it('should list all available templates', async () => {
      const templates = await mockService.listTemplates();

      expect(templates).toHaveLength(4);
      expect(templates.map(t => t.name)).toContain('default');
      expect(templates.map(t => t.name)).toContain('technical');
      expect(templates.map(t => t.name)).toContain('research');
      expect(templates.map(t => t.name)).toContain('conversational');
    });

    it('should add new custom template', async () => {
      const customTemplate: PromptTemplate = {
        name: 'custom',
        description: 'Custom template for testing',
        systemPrompt: 'You are a custom assistant.',
        userPromptTemplate: 'Context: {context}\nQuery: {query}\nCustom instructions.',
        parameters: ['context', 'query']
      };

      await mockService.addTemplate(customTemplate);
      const retrieved = await mockService.getTemplate('custom');

      expect(retrieved).toEqual(customTemplate);
    });

    it('should remove template', async () => {
      const removed = await mockService.removeTemplate('conversational');
      const templates = await mockService.listTemplates();

      expect(removed).toBe(true);
      expect(templates.map(t => t.name)).not.toContain('conversational');
    });

    it('should validate template structure', async () => {
      const validTemplate: PromptTemplate = {
        name: 'valid',
        description: 'Valid template',
        systemPrompt: 'Valid system prompt',
        userPromptTemplate: 'Context: {context}\nQuery: {query}',
        parameters: ['context', 'query']
      };

      const validation = await mockService.validateTemplate(validTemplate);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid template structure', async () => {
      const invalidTemplate: PromptTemplate = {
        name: '',
        description: 'Invalid template',
        systemPrompt: '',
        userPromptTemplate: 'Missing parameters',
        parameters: []
      };

      const validation = await mockService.validateTemplate(invalidTemplate);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors).toContain('Template name is required');
      expect(validation.errors).toContain('System prompt is required');
    });
  });

  describe('Prompt Building', () => {
    it('should build structured prompt with default template', async () => {
      const request: StructuredPromptRequest = {
        query: 'What is machine learning?',
        context: mockContext
      };

      const response = await mockService.buildStructuredPrompt(request);

      expect(response.systemPrompt).toContain('helpful AI assistant');
      expect(response.userPrompt).toContain('What is machine learning?');
      expect(response.userPrompt).toContain('[1] Machine learning is a subset');
      expect(response.template.name).toBe('default');
      expect(response.contextSummary.chunkCount).toBe(3);
      expect(response.contextSummary.documentCount).toBe(3);
    });

    it('should build structured prompt with technical template', async () => {
      const request: StructuredPromptRequest = {
        query: 'How do neural networks work?',
        context: mockContext,
        templateName: 'technical'
      };

      const response = await mockService.buildStructuredPrompt(request);

      expect(response.systemPrompt).toContain('technical documentation expert');
      expect(response.userPrompt).toContain('Technical Question: How do neural networks work?');
      expect(response.userPrompt).toContain('Code examples if applicable');
      expect(response.template.name).toBe('technical');
    });

    it('should handle custom system prompt override', async () => {
      const request: StructuredPromptRequest = {
        query: 'Test query',
        context: mockContext,
        customSystemPrompt: 'You are a specialized AI for testing purposes.'
      };

      const response = await mockService.buildStructuredPrompt(request);

      expect(response.systemPrompt).toBe('You are a specialized AI for testing purposes.');
    });

    it('should handle different citation styles', async () => {
      const request: StructuredPromptRequest = {
        query: 'Test query',
        context: mockContext,
        citationStyle: 'named'
      };

      const response = await mockService.buildStructuredPrompt(request);

      expect(response.userPrompt).toContain('[AI Fundamentals Guide]');
      expect(response.userPrompt).toContain('[Deep Learning Handbook]');
      expect(response.userPrompt).not.toContain('[1]');
    });

    it('should include metadata when requested', async () => {
      const request: StructuredPromptRequest = {
        query: 'Test query',
        context: mockContext,
        includeMetadata: true,
        citationStyle: 'numbered'
      };

      const response = await mockService.buildStructuredPrompt(request);

      expect(response.userPrompt).toContain('Source: AI Fundamentals Guide');
      expect(response.userPrompt).toContain('Source: Deep Learning Handbook');
    });

    it('should apply response format instructions', async () => {
      const request: StructuredPromptRequest = {
        query: 'Test query',
        context: mockContext,
        responseFormat: 'bullet'
      };

      const response = await mockService.buildStructuredPrompt(request);

      expect(response.userPrompt).toContain('bullet points for clarity');
    });
  });

  describe('Context Formatting', () => {
    it('should format context with numbered citations', async () => {
      const request: StructuredPromptRequest = {
        query: 'Test query',
        context: mockContext,
        citationStyle: 'numbered'
      };

      const response = await mockService.buildStructuredPrompt(request);

      expect(response.userPrompt).toContain('[1] Machine learning is a subset');
      expect(response.userPrompt).toContain('[2] Deep learning uses neural');
      expect(response.userPrompt).toContain('[3] Supervised learning algorithms');
    });

    it('should format context with named citations', async () => {
      const request: StructuredPromptRequest = {
        query: 'Test query',
        context: mockContext,
        citationStyle: 'named'
      };

      const response = await mockService.buildStructuredPrompt(request);

      expect(response.userPrompt).toContain('[AI Fundamentals Guide] Machine learning');
      expect(response.userPrompt).toContain('[Deep Learning Handbook] Deep learning');
      expect(response.userPrompt).toContain('[ML Algorithms Book] Supervised learning');
    });

    it('should format context with inline citations', async () => {
      const request: StructuredPromptRequest = {
        query: 'Test query',
        context: mockContext,
        citationStyle: 'inline'
      };

      const response = await mockService.buildStructuredPrompt(request);

      expect(response.userPrompt).toContain('(AI Fundamentals Guide)');
      expect(response.userPrompt).toContain('(Deep Learning Handbook)');
      expect(response.userPrompt).toContain('(ML Algorithms Book)');
    });

    it('should handle empty context gracefully', async () => {
      const emptyContext: RAGContext = {
        chunks: [],
        documentTitles: [],
        totalChunks: 0
      };

      const request: StructuredPromptRequest = {
        query: 'Test query',
        context: emptyContext
      };

      const response = await mockService.buildStructuredPrompt(request);

      expect(response.contextSummary.chunkCount).toBe(0);
      expect(response.contextSummary.documentCount).toBe(0);
      expect(response.userPrompt).toContain('Test query');
    });
  });

  describe('Template Selection and Validation', () => {
    it('should throw error for non-existent template', async () => {
      const request: StructuredPromptRequest = {
        query: 'Test query',
        context: mockContext,
        templateName: 'nonexistent'
      };

      await expect(mockService.buildStructuredPrompt(request)).rejects.toThrow('Template "nonexistent" not found');
    });

    it('should calculate accurate context summary', async () => {
      const request: StructuredPromptRequest = {
        query: 'Test query',
        context: mockContext
      };

      const response = await mockService.buildStructuredPrompt(request);

      expect(response.contextSummary.chunkCount).toBe(3);
      expect(response.contextSummary.documentCount).toBe(3);
      expect(response.contextSummary.totalTokens).toBeGreaterThan(0);
    });

    it('should preserve template parameters and metadata', async () => {
      const request: StructuredPromptRequest = {
        query: 'Test query',
        context: mockContext,
        templateName: 'research'
      };

      const response = await mockService.buildStructuredPrompt(request);

      expect(response.template.name).toBe('research');
      expect(response.template.description).toContain('research-focused');
      expect(response.template.parameters).toContain('context');
      expect(response.template.parameters).toContain('query');
    });
  });
});