#!/usr/bin/env node

/**
 * Скрипт проверки готовности проекта к деплою на Vercel
 */

const fs = require('fs');
const path = require('path');

const BOT_DIR = path.join(__dirname, '../bot');
const API_DIR = path.join(BOT_DIR, 'api');
const FUNCTIONS_DIR = path.join(BOT_DIR, 'functions');

let errors = [];
let warnings = [];
let success = [];

console.log('🔍 Проверка готовности к деплою на Vercel...\n');

// 1. Проверка структуры директорий
console.log('📁 Проверка структуры:');
if (!fs.existsSync(API_DIR)) {
  errors.push('❌ bot/api/ не существует');
} else {
  success.push('✓ bot/api/ существует');
}

if (!fs.existsSync(FUNCTIONS_DIR)) {
  errors.push('❌ bot/functions/ не существует (нужны оригинальные функции)');
} else {
  success.push('✓ bot/functions/ существует');
}

// 2. Проверка адаптера
console.log('\n🔧 Проверка адаптера:');
const adapterPath = path.join(API_DIR, '_netlify-adapter.js');
if (!fs.existsSync(adapterPath)) {
  errors.push('❌ bot/api/_netlify-adapter.js не найден');
} else {
  success.push('✓ Адаптер существует');
  
  // Проверяем что адаптер экспортирует нужные функции
  try {
    const adapter = require(adapterPath);
    if (typeof adapter.wrapNetlifyFunction === 'function') {
      success.push('✓ Адаптер экспортирует wrapNetlifyFunction');
    } else {
      errors.push('❌ Адаптер не экспортирует wrapNetlifyFunction');
    }
  } catch (e) {
    errors.push(`❌ Ошибка при загрузке адаптера: ${e.message}`);
  }
}

// 3. Проверка оберток
console.log('\n📦 Проверка оберток функций:');
if (fs.existsSync(API_DIR)) {
  const apiFiles = fs.readdirSync(API_DIR)
    .filter(f => f.endsWith('.js') && !f.startsWith('_'));
  
  if (apiFiles.length === 0) {
    warnings.push('⚠️  Нет оберток функций в bot/api/');
    warnings.push('   Запустите: node scripts/create-vercel-wrappers.js');
  } else {
    success.push(`✓ Найдено ${apiFiles.length} оберток`);
    
    // Проверяем несколько оберток
    const sampleWrappers = apiFiles.slice(0, 3);
    for (const wrapper of sampleWrappers) {
      const wrapperPath = path.join(API_DIR, wrapper);
      const content = fs.readFileSync(wrapperPath, 'utf8');
      
      // Проверяем что обертка правильная
      if (content.includes('wrapNetlifyFunction')) {
        success.push(`✓ ${wrapper} выглядит правильно`);
      } else {
        errors.push(`❌ ${wrapper} не использует wrapNetlifyFunction`);
      }
      
      // Проверяем что оригинальная функция существует
      const funcName = wrapper.replace('.js', '');
      const originalPath = path.join(FUNCTIONS_DIR, `${funcName}.js`);
      if (!fs.existsSync(originalPath)) {
        errors.push(`❌ Оригинальная функция не найдена: bot/functions/${funcName}.js`);
      }
    }
  }
}

// 4. Проверка shared директории
console.log('\n📚 Проверка shared модулей:');
const sharedApi = path.join(API_DIR, 'shared');
const sharedFunctions = path.join(FUNCTIONS_DIR, 'shared');

if (!fs.existsSync(sharedApi)) {
  warnings.push('⚠️  bot/api/shared/ не существует');
  if (fs.existsSync(sharedFunctions)) {
    warnings.push('   Запустите скрипт создания оберток для копирования');
  }
} else {
  success.push('✓ bot/api/shared/ существует');
  
  // Проверяем ключевые модули
  const keyModules = ['middleware/cors.js', 'middleware/api-wrapper.js', 'utils/logger.js'];
  for (const module of keyModules) {
    const modulePath = path.join(sharedApi, module);
    if (fs.existsSync(modulePath)) {
      success.push(`✓ ${module} скопирован`);
    } else {
      warnings.push(`⚠️  ${module} не найден в bot/api/shared/`);
    }
  }
}

// 5. Проверка vercel.json
console.log('\n⚙️  Проверка конфигурации:');
const vercelJsonPath = path.join(BOT_DIR, 'vercel.json');
if (!fs.existsSync(vercelJsonPath)) {
  errors.push('❌ bot/vercel.json не найден');
} else {
  success.push('✓ vercel.json существует');
  
  try {
    const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
    
    if (vercelConfig.functions && vercelConfig.functions['api/**/*.js']) {
      success.push('✓ Конфигурация functions найдена');
    } else {
      warnings.push('⚠️  Конфигурация functions не найдена в vercel.json');
    }
    
    if (vercelConfig.rewrites && vercelConfig.rewrites.length > 0) {
      success.push(`✓ Найдено ${vercelConfig.rewrites.length} rewrites`);
    } else {
      warnings.push('⚠️  Нет rewrites в vercel.json');
    }
  } catch (e) {
    errors.push(`❌ Ошибка при парсинге vercel.json: ${e.message}`);
  }
}

// 6. Проверка package.json
console.log('\n📦 Проверка зависимостей:');
const packageJsonPath = path.join(BOT_DIR, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  // Проверяем корневой package.json
  const rootPackagePath = path.join(__dirname, '../package.json');
  if (fs.existsSync(rootPackagePath)) {
    success.push('✓ package.json найден в корне');
  } else {
    warnings.push('⚠️  package.json не найден');
  }
} else {
  success.push('✓ package.json существует в bot/');
}

// Итоги
console.log('\n' + '='.repeat(50));
console.log('📊 ИТОГИ ПРОВЕРКИ:\n');

if (success.length > 0) {
  console.log('✅ Успешно:');
  success.forEach(msg => console.log(`   ${msg}`));
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️  Предупреждения:');
  warnings.forEach(msg => console.log(`   ${msg}`));
  console.log('');
}

if (errors.length > 0) {
  console.log('❌ Ошибки:');
  errors.forEach(msg => console.log(`   ${msg}`));
  console.log('');
  console.log('🔧 Исправьте ошибки перед деплоем!');
  process.exit(1);
} else {
  console.log('✅ Все проверки пройдены! Проект готов к деплою на Vercel.\n');
  console.log('📝 Следующие шаги:');
  console.log('   1. Закоммить изменения: git add . && git commit -m "Add Vercel setup"');
  console.log('   2. Запушить в ветку: git push origin vercel-export');
  console.log('   3. Проверить деплой в Vercel Dashboard');
  console.log('   4. Протестировать: curl https://your-project.vercel.app/api/health');
  process.exit(0);
}
