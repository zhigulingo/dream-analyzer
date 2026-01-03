// bot/functions/shared/services/test-gemini-service.js
// Простой тест для проверки работы Gemini Service

const geminiService = require('./gemini-service');

async function testGeminiService() {
    console.log('[TEST] Testing Gemini Service...');
    
    try {
        // Тест базового анализа
        console.log('[TEST] Testing basic dream analysis...');
        const result = await geminiService.analyzeDream(
            'Я видел сон, где летал над городом и чувствовал себя свободным.',
            'basic'
        );
        console.log('[TEST] Basic analysis successful:', result.length > 0 ? 'PASS' : 'FAIL');
        
        // Тест статистики кеша
        console.log('[TEST] Cache stats:', geminiService.getCacheStats());
        
        // Тест повторного запроса (должен вернуть из кеша)
        console.log('[TEST] Testing cache...');
        const cachedResult = await geminiService.analyzeDream(
            'Я видел сон, где летал над городом и чувствовал себя свободным.',
            'basic'
        );
        console.log('[TEST] Cache test:', cachedResult === result ? 'PASS' : 'FAIL');
        
        console.log('[TEST] All tests completed successfully!');
        return true;
    } catch (error) {
        console.error('[TEST] Test failed:', error.message);
        return false;
    }
}

// Экспорт для возможного использования
module.exports = { testGeminiService };

// Если запускается напрямую
if (require.main === module) {
    testGeminiService();
}