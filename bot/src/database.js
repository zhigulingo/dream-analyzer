const { createClient } = require('@supabase/supabase-js');

console.log('Инициализация Supabase...');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'Установлен' : 'Не установлен');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function getUser(tgId) {
  try {
    console.log(`Получение пользователя с tgId: ${tgId}`);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('tg_id', tgId)
      .single();
    if (error) {
      console.error('Ошибка получения пользователя:', error);
      return null;
    }
    console.log('Пользователь получен:', data);
    return data;
  } catch (err) {
    console.error('Не удалось подключиться к Supabase (getUser):', err.message);
    return null;
  }
}

async function createUser(tgId) {
  try {
    console.log(`Создание пользователя с tgId: ${tgId}`);
    const { data, error } = await supabase
      .from('users')
      .insert({ tg_id: tgId, subscription_type: 'trial', tokens: 1 })
      .select()
      .single();
    if (error) {
      console.error('Ошибка создания пользователя:', error);
      return null;
    }
    console.log('Пользователь создан:', data);
    return data;
  } catch (err) {
    console.error('Не удалось подключиться к Supabase (createUser):', err.message);
    return null;
  }
}

async function createAnalysis(userId, dreamText, analysis) {
  try {
    console.log(`Создание анализа для userId: ${userId}`);
    // Устанавливаем время в UTC+3
    const createdAt = new Date().toLocaleString('en-US', { timeZone: 'Europe/Moscow' });
    const { data, error } = await supabase
      .from('analyses')
      .insert({ user_id: userId, dream_text: dreamText, analysis, created_at: createdAt })
      .select()
      .single();
    if (error) {
      console.error('Ошибка создания анализа:', error);
      return null;
    }
    console.log('Анализ создан:', data);
    return data;
  } catch (err) {
    console.error('Не удалось подключиться к Supabase (createAnalysis):', err.message);
    return null;
  }
}

module.exports = { getUser, createUser, createAnalysis };
