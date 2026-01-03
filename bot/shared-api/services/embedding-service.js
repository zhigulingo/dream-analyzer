// bot/functions/shared/services/embedding-service.js
// Унифицированный доступ к модели эмбеддингов Gemini (text-embedding-004)

const { GoogleGenerativeAI } = require('@google/generative-ai');

class EmbeddingService {
  constructor() {
    this.client = null;
    this.model = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized && this.model) {
      return this.model;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    this.client = new GoogleGenerativeAI(apiKey);
    this.model = this.client.getGenerativeModel({ model: 'text-embedding-004' });
    this.initialized = true;
    return this.model;
  }

  async embed(text) {
    if (!text || !text.trim()) {
      throw new Error('Cannot embed empty text');
    }

    const model = await this.initialize();
    const response = await model.embedContent({
      content: { parts: [{ text }] },
      outputDimensionality: 768
    });
    return response.embedding.values;
  }
}

module.exports = new EmbeddingService();
