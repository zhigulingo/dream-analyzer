/**
 * @fileoverview Tests for gemini-service module
 */

const GeminiService = require('../bot/functions/shared/services/gemini-service');

// Mock dependencies
jest.mock('@google/generative-ai');
jest.mock('../bot/functions/shared/prompts/dream-prompts');

const { GoogleGenerativeAI } = require('@google/generative-ai');
const dreamPrompts = require('../bot/functions/shared/prompts/dream-prompts');

describe('GeminiService', () => {
  let mockModel;
  let mockGenAI;
  let mockGenerateContent;
  let mockResponse;

  beforeEach(() => {
    // Reset the singleton instance state
    GeminiService.isInitialized = false;
    GeminiService.model = null;
    GeminiService.genAI = null;
    GeminiService.initializationError = null;
    GeminiService.cache.clear();

    // Mock response
    mockResponse = {
      text: jest.fn(() => 'Mocked analysis result'),
      promptFeedback: null
    };

    // Mock generateContent
    mockGenerateContent = jest.fn(() => 
      Promise.resolve({ response: mockResponse })
    );

    // Mock model
    mockModel = {
      generateContent: mockGenerateContent
    };

    // Mock GoogleGenerativeAI
    mockGenAI = {
      getGenerativeModel: jest.fn(() => mockModel)
    };

    GoogleGenerativeAI.mockImplementation(() => mockGenAI);

    // Mock dream prompts
    dreamPrompts.getPrompt = jest.fn((key, text) => `Mocked prompt for ${key}: ${text}`);

    // Set up environment
    process.env.GEMINI_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.GEMINI_API_KEY;
  });

  describe('initialize', () => {
    test('should initialize successfully with valid API key', async () => {
      const model = await GeminiService.initialize();

      expect(GoogleGenerativeAI).toHaveBeenCalledWith('test-api-key');
      expect(mockGenAI.getGenerativeModel).toHaveBeenCalledWith({ 
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0,
          topK: 1,
          topP: 0.1,
        }
      });
      expect(model).toBe(mockModel);
      expect(GeminiService.isInitialized).toBe(true);
    });

    test('should throw error when API key is missing', async () => {
      delete process.env.GEMINI_API_KEY;

      await expect(GeminiService.initialize()).rejects.toThrow(
        'GEMINI_API_KEY environment variable is not set'
      );
    });

    test('should return cached model on subsequent calls', async () => {
      await GeminiService.initialize();
      const model2 = await GeminiService.initialize();

      expect(GoogleGenerativeAI).toHaveBeenCalledTimes(1);
      expect(model2).toBe(mockModel);
    });

    test('should throw cached error on subsequent calls after failure', async () => {
      delete process.env.GEMINI_API_KEY;
      
      await expect(GeminiService.initialize()).rejects.toThrow();
      await expect(GeminiService.initialize()).rejects.toThrow();
    });
  });

  describe('analyzeDream', () => {
    beforeEach(async () => {
      await GeminiService.initialize();
    });

    test('should analyze dream successfully', async () => {
      const dreamText = 'I had a dream about flying';
      const result = await GeminiService.analyzeDream(dreamText);

      expect(dreamPrompts.getPrompt).toHaveBeenCalledWith('basic', dreamText);
      expect(mockGenerateContent).toHaveBeenCalledWith('Mocked prompt for basic: ' + dreamText);
      expect(result).toBe('Mocked analysis result');
    });

    test('should use custom prompt key', async () => {
      const dreamText = 'I had a dream about flying';
      await GeminiService.analyzeDream(dreamText, 'detailed');

      expect(dreamPrompts.getPrompt).toHaveBeenCalledWith('detailed', dreamText);
    });

    test('should throw error for empty dream text', async () => {
      await expect(GeminiService.analyzeDream('')).rejects.toThrow('Empty dream text');
      await expect(GeminiService.analyzeDream(null)).rejects.toThrow('Empty dream text');
      await expect(GeminiService.analyzeDream('   ')).rejects.toThrow('Empty dream text');
    });

    test('should throw error for too long dream text', async () => {
      const longText = 'a'.repeat(4001);
      await expect(GeminiService.analyzeDream(longText)).rejects.toThrow(
        'Dream too long (> 4000 chars)'
      );
    });

    test('should handle blocked content', async () => {
      mockResponse.promptFeedback = { blockReason: 'SAFETY' };

      await expect(GeminiService.analyzeDream('Some text')).rejects.toThrow(
        'Analysis blocked (SAFETY)'
      );
    });

    test('should handle empty response', async () => {
      mockResponse.text.mockReturnValue('');

      await expect(GeminiService.analyzeDream('Some text')).rejects.toThrow(
        'Empty response from analysis service'
      );
    });

    test('should return cached result for same input', async () => {
      const dreamText = 'I had a dream about flying';
      
      const result1 = await GeminiService.analyzeDream(dreamText);
      const result2 = await GeminiService.analyzeDream(dreamText);

      expect(result1).toBe(result2);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    test('should retry on failure', async () => {
      mockGenerateContent
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ response: mockResponse });

      const result = await GeminiService.analyzeDream('Test dream');

      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      expect(result).toBe('Mocked analysis result');
    });

    test('should not retry on non-retryable errors', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API key not valid'));

      await expect(GeminiService.analyzeDream('Test dream')).rejects.toThrow(
        'Invalid Gemini API key'
      );
      
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    test('should fail after max retries', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Network error'));

      await expect(GeminiService.analyzeDream('Test dream')).rejects.toThrow(
        'Error communicating with analysis service: Network error'
      );
      
      // maxRetries = 2, so we expect 2 attempts total
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });
  });

  describe('deepAnalyzeDreams', () => {
    beforeEach(async () => {
      await GeminiService.initialize();
    });

    test('should perform deep analysis successfully', async () => {
      const combinedDreams = 'Multiple dreams combined';
      const result = await GeminiService.deepAnalyzeDreams(combinedDreams);

      expect(dreamPrompts.getPrompt).toHaveBeenCalledWith('deep', combinedDreams);
      expect(result).toBe('Mocked analysis result');
    });

    test('should throw error for empty input', async () => {
      await expect(GeminiService.deepAnalyzeDreams('')).rejects.toThrow(
        'No dream text provided for deep analysis'
      );
    });

    test('should cache deep analysis results', async () => {
      const combinedDreams = 'Multiple dreams combined';
      
      const result1 = await GeminiService.deepAnalyzeDreams(combinedDreams);
      const result2 = await GeminiService.deepAnalyzeDreams(combinedDreams);

      expect(result1).toBe(result2);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });
  });

  describe('error processing', () => {
    test('should process API key errors', () => {
      const error = new Error('API key not valid');
      const processedError = GeminiService._processError(error);
      expect(processedError.message).toBe('Invalid Gemini API key');
    });

    test('should process 404 errors', () => {
      const error = new Error('Model is not found');
      const processedError = GeminiService._processError(error);
      expect(processedError.message).toBe('Gemini model not found');
    });

    test('should process quota errors', () => {
      const error = new Error('quota exceeded');
      const processedError = GeminiService._processError(error);
      expect(processedError.message).toBe('Gemini API quota exceeded');
    });

    test('should process blocked content errors', () => {
      const error = new Error('Content blocked for safety');
      const processedError = GeminiService._processError(error);
      expect(processedError.message).toBe('Analysis blocked: Content blocked for safety');
    });

    test('should process generic errors', () => {
      const error = new Error('Unknown error');
      const processedError = GeminiService._processError(error);
      expect(processedError.message).toBe('Error communicating with analysis service: Unknown error');
    });
  });

  describe('cache management', () => {
    test('should get cache stats', () => {
      const stats = GeminiService.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('isInitialized');
      expect(stats).toHaveProperty('modelName');
      expect(stats.modelName).toBe('gemini-2.5-flash');
    });

    test('should clear cache', () => {
      GeminiService._saveToCache('test-key', 'test-data');
      expect(GeminiService.cache.size).toBe(1);
      
      GeminiService.clearCache();
      expect(GeminiService.cache.size).toBe(0);
    });

    test('should cleanup old cache entries', () => {
      // Mock old timestamp
      const oldTimestamp = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
      GeminiService.cache.set('old-key', { data: 'old-data', timestamp: oldTimestamp });
      GeminiService.cache.set('new-key', { data: 'new-data', timestamp: Date.now() });

      GeminiService._cleanupCache();

      expect(GeminiService.cache.has('old-key')).toBe(false);
      expect(GeminiService.cache.has('new-key')).toBe(true);
    });

    test('should auto-cleanup when cache size exceeds limit', async () => {
      await GeminiService.initialize();
      
      // Fill cache beyond limit
      for (let i = 0; i < 1001; i++) {
        GeminiService._saveToCache(`key-${i}`, `data-${i}`);
      }

      // Cache should have triggered cleanup
      expect(GeminiService.cache.size).toBeLessThanOrEqual(1001);
    });
  });

  describe('utility methods', () => {
    test('should generate consistent cache keys', () => {
      const key1 = GeminiService._getCacheKey('same text', 'basic');
      const key2 = GeminiService._getCacheKey('same text', 'basic');
      const key3 = GeminiService._getCacheKey('different text', 'basic');

      expect(key1).toBe(key2);
      expect(key1).not.toBe(key3);
    });

    test('should respect cache timeout', () => {
      const key = 'test-key';
      GeminiService._saveToCache(key, 'test-data');
      
      // Should return data immediately
      expect(GeminiService._getFromCache(key)).toBe('test-data');
      
      // Mock expired timestamp
      const cached = GeminiService.cache.get(key);
      cached.timestamp = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
      
      // Should return null for expired data
      expect(GeminiService._getFromCache(key)).toBe(null);
      expect(GeminiService.cache.has(key)).toBe(false);
    });
  });
});