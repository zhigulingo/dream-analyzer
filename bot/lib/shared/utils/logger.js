// shared/utils/logger.js
const winston = require('winston');
const crypto = require('crypto');

// Константы для конфигурации
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const DEFAULT_LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const EXTERNAL_LOG_SERVICE_URL = process.env.EXTERNAL_LOG_SERVICE_URL;
const EXTERNAL_LOG_SERVICE_TOKEN = process.env.EXTERNAL_LOG_SERVICE_TOKEN;

// Создание correlation ID для трассировки
function generateCorrelationId() {
  return crypto.randomBytes(8).toString('hex');
}

// Custom format для structured logging
const structuredFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, correlationId, context, stack, ...meta }) => {
    const logObject = {
      timestamp,
      level,
      message,
      correlationId: correlationId || 'unknown',
      service: 'dream-analyzer',
      environment: process.env.NODE_ENV || 'development',
      context: context || {},
      ...meta
    };

    if (stack) {
      logObject.stack = stack;
    }

    return JSON.stringify(logObject);
  })
);

// Проверяем, запущено ли в serverless-среде (Netlify Functions)
const isServerless = process.env.NETLIFY_FUNCTIONS_PORT || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL;

// Транспорты для логирования
const transports = [
  // Console transport (всегда доступен)
  new winston.transports.Console({
    level: DEFAULT_LOG_LEVEL,
    format: process.env.NODE_ENV === 'development' 
      ? winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: 'HH:mm:ss' }),
          winston.format.printf(({ timestamp, level, message, correlationId, context }) => {
            const contextStr = context && Object.keys(context).length > 0 
              ? ` [${JSON.stringify(context)}]` 
              : '';
            return `${timestamp} ${level}: [${correlationId || 'no-id'}] ${message}${contextStr}`;
          })
        )
      : structuredFormat
  })
];

// File transports только для локальной разработки (не в serverless среде)
if (!isServerless) {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: structuredFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),

    new winston.transports.File({
      filename: 'logs/combined.log',
      format: structuredFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
}

// External logging service transport (если настроен)
if (EXTERNAL_LOG_SERVICE_URL && EXTERNAL_LOG_SERVICE_TOKEN) {
  const ExternalLogTransport = winston.transports.Http;
  transports.push(
    new ExternalLogTransport({
      host: new URL(EXTERNAL_LOG_SERVICE_URL).hostname,
      port: new URL(EXTERNAL_LOG_SERVICE_URL).port || 443,
      path: new URL(EXTERNAL_LOG_SERVICE_URL).pathname,
      ssl: new URL(EXTERNAL_LOG_SERVICE_URL).protocol === 'https:',
      auth: {
        bearer: EXTERNAL_LOG_SERVICE_TOKEN
      },
      format: structuredFormat
    })
  );
}

// Создание Winston logger
const baseLogger = winston.createLogger({
  levels: LOG_LEVELS,
  level: DEFAULT_LOG_LEVEL,
  format: structuredFormat,
  transports,
  exitOnError: false
});

// Класс для structured logging с correlation IDs
class StructuredLogger {
  constructor(defaultContext = {}) {
    this.defaultContext = defaultContext;
    this.correlationId = null;
  }

  // Установить correlation ID
  setCorrelationId(correlationId) {
    this.correlationId = correlationId;
    return this;
  }

  // Сгенерировать новый correlation ID
  generateCorrelationId() {
    this.correlationId = generateCorrelationId();
    return this.correlationId;
  }

  // Создать дочерний логгер с дополнительным контекстом
  child(additionalContext = {}) {
    const childLogger = new StructuredLogger({
      ...this.defaultContext,
      ...additionalContext
    });
    childLogger.correlationId = this.correlationId;
    return childLogger;
  }

  // Базовый метод логирования
  _log(level, message, context = {}, error = null) {
    const logData = {
      message,
      correlationId: this.correlationId || generateCorrelationId(),
      context: {
        ...this.defaultContext,
        ...context
      }
    };

    if (error) {
      logData.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    baseLogger.log(level, logData);
  }

  // Методы для разных уровней логирования
  error(message, context = {}, error = null) {
    this._log('error', message, context, error);
  }

  warn(message, context = {}) {
    this._log('warn', message, context);
  }

  info(message, context = {}) {
    this._log('info', message, context);
  }

  debug(message, context = {}) {
    this._log('debug', message, context);
  }

  // Специальные методы для различных компонентов системы
  
  // Логирование API запросов
  apiRequest(method, path, statusCode, duration, userId = null, context = {}) {
    this.info('API Request', {
      api: {
        method,
        path,
        statusCode,
        duration,
        userId
      },
      ...context
    });
  }

  // Логирование ошибок API
  apiError(method, path, error, userId = null, context = {}) {
    this.error('API Error', {
      api: {
        method,
        path,
        userId
      },
      ...context
    }, error);
  }

  // Логирование операций с базой данных
  dbOperation(operation, table, duration, rowsAffected = null, context = {}) {
    this.info('Database Operation', {
      database: {
        operation,
        table,
        duration,
        rowsAffected
      },
      ...context
    });
  }

  // Логирование ошибок базы данных
  dbError(operation, table, error, context = {}) {
    this.error('Database Error', {
      database: {
        operation,
        table
      },
      ...context
    }, error);
  }

  // Логирование Telegram Bot событий
  botEvent(eventType, userId, chatId, context = {}) {
    this.info('Bot Event', {
      bot: {
        eventType,
        userId,
        chatId
      },
      ...context
    });
  }

  // Логирование ошибок бота
  botError(eventType, error, userId = null, chatId = null, context = {}) {
    this.error('Bot Error', {
      bot: {
        eventType,
        userId,
        chatId
      },
      ...context
    }, error);
  }

  // Логирование операций с Gemini AI
  geminiOperation(operation, model, duration, tokensUsed = null, context = {}) {
    this.info('Gemini Operation', {
      gemini: {
        operation,
        model,
        duration,
        tokensUsed
      },
      ...context
    });
  }

  // Логирование ошибок Gemini
  geminiError(operation, error, context = {}) {
    this.error('Gemini Error', {
      gemini: {
        operation
      },
      ...context
    }, error);
  }

  // Логирование кеш операций
  cacheOperation(operation, key, hit = null, duration = null, context = {}) {
    this.debug('Cache Operation', {
      cache: {
        operation,
        key,
        hit,
        duration
      },
      ...context
    });
  }

  // Логирование аутентификации
  authEvent(event, userId, result, context = {}) {
    this.info('Auth Event', {
      auth: {
        event,
        userId,
        result
      },
      ...context
    });
  }

  // Логирование ошибок аутентификации
  authError(event, error, userId = null, context = {}) {
    this.error('Auth Error', {
      auth: {
        event,
        userId
      },
      ...context
    }, error);
  }
}

// Создание директории для логов только в локальной среде
if (!isServerless) {
  const fs = require('fs');
  const path = require('path');

  try {
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  } catch (error) {
    console.warn('Failed to create logs directory:', error.message);
  }
}

// Экспорт
module.exports = {
  StructuredLogger,
  generateCorrelationId,
  
  // Создание логгера с контекстом
  createLogger: (context = {}) => new StructuredLogger(context),
  
  // Дефолтный логгер для быстрого использования
  logger: new StructuredLogger(),
  
  // Уровни логирования для внешнего использования
  LOG_LEVELS
};