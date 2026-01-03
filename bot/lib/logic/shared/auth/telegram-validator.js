/**
 * @fileoverview Общая библиотека для валидации данных Telegram Web App
 * @author Dream Analyzer Bot
 * @version 1.0.0
 */

const crypto = require('crypto');

/**
 * Результат валидации Telegram initData
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Успешна ли валидация
 * @property {Object|null} data - Данные пользователя (если валидация успешна)
 * @property {string|null} error - Сообщение об ошибке (если валидация не удалась)
 */

/**
 * Валидирует данные initData от Telegram Web App
 * 
 * Проверяет подпись данных, используя алгоритм HMAC-SHA256 согласно документации Telegram.
 * Извлекает и парсит данные пользователя из валидированной строки.
 * 
 * @param {string} initData - Строка initData от Telegram Web App
 * @param {string} botToken - Токен бота для проверки подписи
 * @param {Object} [options] - Дополнительные опции
 * @param {boolean} [options.enableLogging=true] - Включить консольные сообщения
 * @returns {ValidationResult} Результат валидации с данными пользователя или ошибкой
 * 
 * @example
 * const { validateTelegramData } = require('./shared/auth/telegram-validator');
 * 
 * const result = validateTelegramData(initData, botToken);
 * if (result.valid && result.data) {
 *   console.log('User ID:', result.data.id);
 * } else {
 *   console.error('Validation failed:', result.error);
 * }
 */
function validateTelegramData(initData, botToken, options = {}) {
    const { enableLogging = true } = options;
    
    // Проверяем наличие обязательных параметров
    if (!initData || !botToken) {
        if (enableLogging) {
            console.warn("[validateTelegramData] Missing initData or botToken");
        }
        return { valid: false, data: null, error: "Missing initData or botToken" };
    }
    
    // Парсим параметры из initData
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    
    if (!hash) {
        if (enableLogging) {
            console.warn("[validateTelegramData] Hash is missing in initData");
        }
        return { valid: false, data: null, error: "Hash is missing" };
    }
    
    // Удаляем hash для проверки
    params.delete('hash');
    
    // Создаем строку для проверки подписи
    const dataCheckArr = [];
    params.sort(); // Важно сортировать параметры
    params.forEach((value, key) => dataCheckArr.push(`${key}=${value}`));
    const dataCheckString = dataCheckArr.join('\n');
    
    try {
        // Создаем секретный ключ согласно алгоритму Telegram
        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
        const checkHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
        
        if (checkHash === hash) {
            // Валидация успешна, пытаемся извлечь данные пользователя
            const userDataString = params.get('user');
            
            if (!userDataString) {
                if (enableLogging) {
                    console.warn("[validateTelegramData] User data is missing in initData");
                }
                return { valid: true, data: null, error: "User data missing" };
            }
            
            try {
                const userData = JSON.parse(decodeURIComponent(userDataString));
                
                // Проверяем наличие ID пользователя
                if (!userData || typeof userData.id === 'undefined') {
                    if (enableLogging) {
                        console.warn("[validateTelegramData] Parsed user data is missing ID");
                    }
                    return { valid: true, data: null, error: "User ID missing in parsed data" };
                }
                
                if (enableLogging) {
                    console.log(`[validateTelegramData] Successfully validated user ${userData.id}`);
                }
                
                return { valid: true, data: userData, error: null };
                
            } catch (parseError) {
                if (enableLogging) {
                    console.error("[validateTelegramData] Error parsing user data JSON:", parseError);
                }
                return { valid: true, data: null, error: "Failed to parse user data" };
            }
        } else {
            if (enableLogging) {
                console.warn("[validateTelegramData] Hash mismatch during validation.");
            }
            return { valid: false, data: null, error: "Hash mismatch" };
        }
    } catch (error) {
        if (enableLogging) {
            console.error("[validateTelegramData] Crypto error during validation:", error);
        }
        return { valid: false, data: null, error: "Validation crypto error" };
    }
}

/**
 * Проверяет, истекло ли время жизни initData
 * 
 * @param {string} initData - Строка initData от Telegram Web App
 * @param {number} [maxAge=86400] - Максимальный возраст в секундах (по умолчанию 24 часа)
 * @returns {boolean} true, если данные ещё действительны
 */
function isInitDataValid(initData, maxAge = 86400) {
    try {
        const params = new URLSearchParams(initData);
        const authDate = params.get('auth_date');
        
        if (!authDate) {
            return false;
        }
        
        const authTimestamp = parseInt(authDate, 10);
        const currentTimestamp = Math.floor(Date.now() / 1000);
        
        return (currentTimestamp - authTimestamp) <= maxAge;
    } catch (error) {
        return false;
    }
}

module.exports = {
    validateTelegramData,
    isInitDataValid
};