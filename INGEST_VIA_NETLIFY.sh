#!/bin/bash
# Скрипт для загрузки данных через Netlify функцию (обходит географические ограничения Gemini)

echo "🚀 Запуск загрузки данных через Netlify функцию..."
echo ""

# URL вашего Bot site на Netlify
NETLIFY_SITE="https://sparkling-cupcake-940504.netlify.app"

# Вызываем функцию ingest-knowledge с параметром reset=true
curl -X POST "${NETLIFY_SITE}/.netlify/functions/ingest-knowledge" \
  -H "Content-Type: application/json" \
  -d '{"reset": true}' \
  -w "\n\nHTTP Status: %{http_code}\n" \
  --max-time 300 \
  -v

echo ""
echo "✅ Запрос отправлен!"
echo ""
echo "📊 Проверьте статус загрузки в Netlify Dashboard:"
echo "   https://app.netlify.com/sites/sparkling-cupcake-940504/functions"
echo ""
echo "🔍 Фильтр: ingest-knowledge"
echo ""
echo "⏱️  Процесс может занять 3-5 минут (зависит от API лимитов Gemini)"

