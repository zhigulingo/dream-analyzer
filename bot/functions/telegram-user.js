// netlify/functions/telegram-user.js

exports.handler = async function (event, context) {
    try {
      // Проверяем, что запрос сделан из Telegram Web App
      const initData = event.headers['x-telegram-init-data'];
      if (!initData) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Not a Telegram Web App request' }),
        };
      }
  
      // Декодируем данные инициализации
      const initDataDecoded = new URLSearchParams(initData);
      const user = JSON.parse(initDataDecoded.get('user'));
  
      if (!user) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'User data not found' }),
        };
      }
  
      // Формируем ответ с данными пользователя
      const userData = {
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        is_premium: user.is_premium || false, // is_premium может отсутствовать
        // ... другие поля, которые вам нужны
      };
  
      return {
        statusCode: 200,
        body: JSON.stringify(userData),
      };
    } catch (error) {
      console.error('Error in telegram-user function:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to get user data from Telegram' }),
      };
    }
  };
  