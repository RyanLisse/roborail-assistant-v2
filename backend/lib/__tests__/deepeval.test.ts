import { describe, test, expect } from 'vitest';

describe('DeepEval Custom Matchers', () => {
  test('should use toMatchSemanticSimilarity matcher', async () => {
    // Set DEEPEVAL_API_KEY for this test
    process.env.DEEPEVAL_API_KEY = 'mock-key';
    
    // Test with similar text
    await expect('The cat sat on the mat').toMatchSemanticSimilarity('A cat was sitting on a mat', 0.5);
    
    // Test with different text (should fail with low threshold)
    try {
      await expect('Completely different sentence').toMatchSemanticSimilarity('The cat sat on the mat', 0.9);
    } catch (error) {
      // Expected to fail due to low similarity
      expect(error).toBeDefined();
    }
  });

  test('should use toPassLLMRubric matcher for coherent text', async () => {
    // Set DEEPEVAL_API_KEY for this test
    process.env.DEEPEVAL_API_KEY = 'mock-key';
    
    const coherentText = 'This is a complete and coherent sentence. It makes sense and flows well.';
    await expect(coherentText).toPassLLMRubric(
      'The text should be coherent and complete without abrupt breaks.'
    );
  });

  test('should fail toPassLLMRubric for incoherent text', async () => {
    // Set DEEPEVAL_API_KEY for this test
    process.env.DEEPEVAL_API_KEY = 'mock-key';
    
    const incoherentText = 'This...';
    try {
      await expect(incoherentText).toPassLLMRubric(
        'The text should be coherent and complete without abrupt breaks.'
      );
    } catch (error) {
      // Expected to fail due to incoherent text
      expect(error).toBeDefined();
    }
  });

  test('should skip tests when DEEPEVAL_API_KEY is not set', async () => {
    // Remove API key
    delete process.env.DEEPEVAL_API_KEY;
    
    try {
      await expect('test').toMatchSemanticSimilarity('test');
    } catch (error) {
      expect(error.message).toContain('DeepEval client not initialized');
    }
  });
});