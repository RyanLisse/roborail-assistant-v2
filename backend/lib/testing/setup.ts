import { expect } from 'vitest';

// Mock Encore secrets for testing
if (!globalThis.process?.env?.NODE_ENV) {
  globalThis.process = { env: { NODE_ENV: 'test' } } as any;
}

// DeepEval integration (mocked for now - would need Python/API integration in production)
// Note: DeepEval is primarily a Python package, so this is a conceptual implementation
// In production, this would either call a Python service or use DeepEval's API directly

interface DeepEvalConfig {
  metrics?: string[];
  threshold?: number;
  model?: string;
  [key: string]: any;
}

// Mock DeepEval client for testing purposes
class MockDeepEvalClient {
  async measureSimilarity(text1: string, text2: string): Promise<number> {
    // Simple mock similarity based on common words
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    const commonWords = words1.filter(word => words2.includes(word));
    const similarity = commonWords.length / Math.max(words1.length, words2.length);
    return Math.min(similarity * 2, 1); // Scale up for testing
  }

  async evaluateRubric(text: string, rubric: string): Promise<{ pass: boolean; score: number; reason: string }> {
    // Mock evaluation based on simple heuristics
    const rubricLower = rubric.toLowerCase();

    let score = 0.5; // Base score
    let reasons: string[] = [];

    // Check for coherence indicators
    if (rubricLower.includes('coherent')) {
      const hasCoherentStructure = text.length > 10 && 
                                   !text.includes('...') && 
                                   !text.endsWith(' ') &&
                                   text.split('.').length > 1;
      if (hasCoherentStructure) {
        score += 0.3;
        reasons.push('Text appears to have coherent structure');
      } else {
        reasons.push('Text may lack coherent structure');
      }
    }

    // Check for completeness
    if (rubricLower.includes('complete')) {
      const isComplete = text.length > 20 && 
                        text.includes('.') && 
                        !text.trim().endsWith(',');
      if (isComplete) {
        score += 0.2;
        reasons.push('Text appears complete');
      } else {
        reasons.push('Text may be incomplete');
      }
    }

    return {
      pass: score >= 0.7,
      score,
      reason: reasons.join('; ')
    };
  }
}

// Initialize mock DeepEval client - lazy initialization
let deepeval: MockDeepEvalClient | null = null;

function getDeepEvalClient(): MockDeepEvalClient | null {
  if ((process.env.DEEPEVAL_API_KEY || process.env.NODE_ENV === 'test') && !deepeval) {
    deepeval = new MockDeepEvalClient();
  }
  return deepeval;
}

if (!deepeval) {
  console.warn("DEEPEVAL_API_KEY not set. DeepEval dependent tests may be skipped or use mock evaluation.");
}

// Extend Vitest expect with custom matchers
expect.extend({
  async toMatchSemanticSimilarity(received: string, expected: string, threshold = 0.8) {
    const client = getDeepEvalClient();
    if (!client) {
      return { 
        pass: false, 
        message: () => 'DeepEval client not initialized (DEEPEVAL_API_KEY missing).' 
      };
    }
    
    try {
      const similarity = await client.measureSimilarity(received, expected);
      const pass = similarity >= threshold;
      return {
        pass,
        message: () => `Expected semantic similarity >= ${threshold}, got ${similarity.toFixed(3)}.\nReceived: "${received}"\nExpected: "${expected}"`,
      };
    } catch (e: any) {
      return { 
        pass: false, 
        message: () => `DeepEval similarity measurement failed: ${e.message}` 
      };
    }
  },

  async toPassLLMRubric(received: string, rubric: string, config?: DeepEvalConfig) {
    const client = getDeepEvalClient();
    if (!client) {
      return { 
        pass: false, 
        message: () => 'DeepEval client not initialized.' 
      };
    }
    
    try {
      const result = await client.evaluateRubric(received, rubric);
      const threshold = config?.threshold || 0.7;
      const pass = result.score >= threshold;
      
      return {
        pass,
        message: () => pass 
          ? `Output "${received}" passed rubric evaluation (score: ${result.score.toFixed(3)}): ${result.reason}`
          : `Output "${received}" failed rubric evaluation (score: ${result.score.toFixed(3)}): ${result.reason}`
      };
    } catch (e: any) {
      return { 
        pass: false, 
        message: () => `DeepEval rubric evaluation failed: ${e.message}` 
      };
    }
  },
});

// Type declarations for custom matchers
declare module 'vitest' {
  interface Assertion<T = any> {
    toMatchSemanticSimilarity(expected: string, threshold?: number): Promise<T>;
    toPassLLMRubric(rubric: string, config?: DeepEvalConfig): Promise<T>;
  }
  interface AsymmetricMatchersContaining {
    toMatchSemanticSimilarity(expected: string, threshold?: number): any;
    toPassLLMRubric(rubric: string, config?: DeepEvalConfig): any;
  }
}

console.log('Vitest test setup with DeepEval matchers initialized');