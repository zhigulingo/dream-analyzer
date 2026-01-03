#!/usr/bin/env node

/**
 * Скрипт для создания Vercel оберток для Netlify функций
 * 
 * Использование:
 * node scripts/create-vercel-wrappers.js
 */

const fs = require('fs');
const path = require('path');

const FUNCTIONS_DIR = path.join(__dirname, '../bot/functions');
const API_DIR = path.join(__dirname, '../bot/api');

// Убедимся, что директория api существует
if (!fs.existsSync(API_DIR)) {
  fs.mkdirSync(API_DIR, { recursive: true });
  console.log('✓ Created bot/api directory');
}

// Проверяем наличие адаптера
const adapterPath = path.join(API_DIR, '_netlify-adapter.js');
if (!fs.existsSync(adapterPath)) {
  console.error('❌ Error: _netlify-adapter.js not found!');
  console.error('   Please create it first or copy from the migration guide.');
  process.exit(1);
}

// Список функций для обертки (можно автоматически определить)
function getFunctionFiles() {
  if (!fs.existsSync(FUNCTIONS_DIR)) {
    console.error(`❌ Functions directory not found: ${FUNCTIONS_DIR}`);
    process.exit(1);
  }
  
  const files = fs.readdirSync(FUNCTIONS_DIR);
  return files
    .filter(file => file.endsWith('.js') && !file.startsWith('_'))
    .map(file => file.replace('.js', ''));
}

// Функции, которые нужно пропустить (внутренние модули)
const SKIP_FUNCTIONS = ['bot.js.backup', 'survey-update.txt'];

function createWrapper(functionName) {
  const originalPath = path.join(FUNCTIONS_DIR, `${functionName}.js`);
  
  if (!fs.existsSync(originalPath)) {
    console.warn(`⚠️  Original function not found: ${functionName}.js`);
    return false;
  }
  
  // Проверяем, что функция экспортирует handler
  const originalContent = fs.readFileSync(originalPath, 'utf8');
  if (!originalContent.includes('exports.handler') && !originalContent.includes('module.exports.handler')) {
    console.warn(`⚠️  Skipping ${functionName}.js - no exports.handler found`);
    return false;
  }
  
  const wrapperContent = `// Auto-generated wrapper for ${functionName}
// This allows Netlify functions to run on Vercel without modification
// TODO: Migrate this function to native Vercel format

const { wrapNetlifyFunction } = require('./_netlify-adapter');
const originalHandler = require('../functions/${functionName}');

module.exports = wrapNetlifyFunction(originalHandler.handler);
`;

  const wrapperPath = path.join(API_DIR, `${functionName}.js`);
  
  // Не перезаписываем если файл уже существует (может быть уже мигрирован)
  if (fs.existsSync(wrapperPath)) {
    const existingContent = fs.readFileSync(wrapperPath, 'utf8');
    if (!existingContent.includes('Auto-generated wrapper')) {
      console.log(`⏭  Skipping ${functionName}.js - already exists (possibly migrated)`);
      return false;
    }
  }
  
  fs.writeFileSync(wrapperPath, wrapperContent);
  return true;
}

function copySharedDirectory() {
  const sharedSrc = path.join(FUNCTIONS_DIR, 'shared');
  const sharedDest = path.join(API_DIR, 'shared');
  
  if (!fs.existsSync(sharedSrc)) {
    console.warn('⚠️  Shared directory not found');
    return;
  }
  
  // Копируем shared директорию если её нет
  if (!fs.existsSync(sharedDest)) {
    console.log('📁 Copying shared directory...');
    copyDirectory(sharedSrc, sharedDest);
    console.log('✓ Shared directory copied');
  } else {
    console.log('⏭  Shared directory already exists');
  }
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Основная логика
console.log('🚀 Creating Vercel wrappers for Netlify functions...\n');

// Копируем shared директорию
copySharedDirectory();

// Получаем список функций
const functions = getFunctionFiles().filter(f => !SKIP_FUNCTIONS.includes(f));

console.log(`Found ${functions.length} functions to wrap:\n`);

let created = 0;
let skipped = 0;

functions.forEach(func => {
  if (createWrapper(func)) {
    console.log(`✓ Created wrapper: ${func}.js`);
    created++;
  } else {
    skipped++;
  }
});

console.log(`\n✅ Summary:`);
console.log(`   Created: ${created} wrappers`);
console.log(`   Skipped: ${skipped} functions`);
console.log(`\n📝 Next steps:`);
console.log(`   1. Create bot/vercel.json with rewrites`);
console.log(`   2. Deploy to Vercel`);
console.log(`   3. Test endpoints`);
console.log(`   4. Gradually migrate functions to native Vercel format`);
