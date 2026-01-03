/**
 * Адаптер для запуска Netlify функций на Vercel
 * Позволяет использовать существующие функции без изменений
 * 
 * Использование:
 * const { wrapNetlifyFunction } = require('./_netlify-adapter');
 * const originalHandler = require('./health-check');
 * module.exports = wrapNetlifyFunction(originalHandler.handler);
 */

function createNetlifyEvent(req) {
  // Конвертируем Vercel req в Netlify event формат
  const body = req.body || {};
  
  // Парсим query string из URL если нужно
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const queryParams = {};
  url.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });
  
  return {
    httpMethod: req.method,
    path: url.pathname,
    queryStringParameters: Object.keys(queryParams).length > 0 ? queryParams : (req.query || {}),
    headers: req.headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
    isBase64Encoded: false,
    rawUrl: req.url,
    rawQuery: url.search
  };
}

function createNetlifyContext() {
  // Минимальный контекст для Netlify функций
  return {
    clientContext: {},
    identity: null,
    functionName: 'vercel-function',
    functionVersion: '$LATEST',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:vercel-function',
    memoryLimitInMB: '1024',
    awsRequestId: `vercel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    logGroupName: '/aws/lambda/vercel-function',
    logStreamName: `vercel-${Date.now()}`,
    getRemainingTimeInMillis: () => 30000 // 30 секунд по умолчанию
  };
}

function convertNetlifyResponse(netlifyResponse, res) {
  // Конвертируем Netlify response в Vercel response
  const statusCode = netlifyResponse.statusCode || 200;
  const headers = netlifyResponse.headers || {};
  const body = netlifyResponse.body || '';
  
  // Устанавливаем заголовки
  Object.keys(headers).forEach(key => {
    // Пропускаем заголовки, которые Vercel устанавливает автоматически
    if (key.toLowerCase() !== 'content-length') {
      res.setHeader(key, headers[key]);
    }
  });
  
  // Обрабатываем multiValueHeaders (для Set-Cookie и других множественных заголовков)
  if (netlifyResponse.multiValueHeaders) {
    Object.keys(netlifyResponse.multiValueHeaders).forEach(key => {
      const values = netlifyResponse.multiValueHeaders[key];
      if (Array.isArray(values)) {
        // Для Set-Cookie нужно установить каждый cookie отдельно
        if (key.toLowerCase() === 'set-cookie') {
          values.forEach(cookie => {
            res.appendHeader('Set-Cookie', cookie);
          });
        } else {
          // Для других заголовков - установить массив
          res.setHeader(key, values);
        }
      }
    });
  }
  
  // Отправляем ответ
  res.status(statusCode);
  
  // Парсим body если это JSON
  if (typeof body === 'string' && body.trim().startsWith('{')) {
    try {
      const jsonBody = JSON.parse(body);
      res.json(jsonBody);
      return;
    } catch (e) {
      // Не JSON, отправляем как есть
    }
  }
  
  if (body) {
    res.send(body);
  } else {
    res.end();
  }
}

/**
 * Обертка для Netlify функции
 * @param {Function} netlifyHandler - Netlify функция (exports.handler)
 */
function wrapNetlifyFunction(netlifyHandler) {
  return async (req, res) => {
    try {
      const event = createNetlifyEvent(req);
      const context = createNetlifyContext();
      
      // Вызываем Netlify функцию
      const response = await netlifyHandler(event, context);
      
      // Если функция вернула undefined или null, отправляем 204
      if (!response) {
        return res.status(204).end();
      }
      
      // Конвертируем ответ
      convertNetlifyResponse(response, res);
    } catch (error) {
      console.error('Function error:', error);
      console.error('Stack:', error.stack);
      
      // Пытаемся отправить ошибку в формате JSON
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Internal server error',
          message: error.message,
          // В development можно показать stack
          ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        });
      }
    }
  };
}

module.exports = { 
  wrapNetlifyFunction,
  createNetlifyEvent,
  createNetlifyContext,
  convertNetlifyResponse
};
