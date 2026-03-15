# DreamStalk — Design Research Notes
> Составлено: цикл 1, март 2026

## 1. Apple Human Interface Guidelines (2024-2025)

**Ключевые принципы:**
- **Clarity** — чистота, минимализм, пространство, понятная иерархия. Убрать лишнее (эмоджи-карнавал, FAB).
- **Deference** — UI не перебивает контент. Контент пользователя (сны) должен быть в центре.
- **Depth** — иерархия через тени, слои, анимации перехода. Используем slide-up overlay для карточек.
- **Consistency** — стандартные жесты (свайп назад), стандартная навигация.
- **Accessibility** — Dynamic Type, минимальные tappable targets 44×44pt.
- **2025 update: Liquid Glass** — Apple вводит транслюцентные элементы с эффектом "жидкого стекла".

**Применение к DreamStalk:**
- Меньше эмоджи — только смысловые
- Больше пространства между блоками
- Bottom sheet вместо full-screen модалок где возможно
- Системные цвета вместо хардкода

---

## 2. Telegram Liquid Glass (2025-2026)

Telegram начал внедрять liquid glass дизайн в iOS (октябрь 2025) и Android (февраль 2026):
- Прозрачный bottom navigation bar с рефракцией
- Frosted glass эффект на панелях
- Стекло особенно эффектно в светлой теме
- Особенно заметно на keyboard, sticker panel, nav bar

**Что взять для DreamStalk TMA:**
- Полупрозрачные card surfaces (rgba с blur-backdrop)
- Тонкие бордеры вместо тёмных фонов
- Градиентные подложки с blur — glassmorphism

---

## 3. Glassmorphism паттерны

Ключевые элементы glassmorphism UI:
```css
background: rgba(255, 255, 255, 0.08);
backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.15);
border-radius: 16px;
```

**Когда использовать:**
- Карточки снов — glass-card поверх тёмного фона
- Модальные окна (bottom sheet)
- Навигационная панель (если будет)

**Избегать:**
- Слишком много blur слоёв (тяжело для GPU)
- Стекло на ярком пёстром фоне (нечитаемо)

---

## 4. Лучшие приложения дневников снов

### Somni Dream Journal
- Голосовой ввод прямо после пробуждения (главная фишка)
- Генерация изображений по сну через AI
- Теги и поиск по снам
- Тёмный минималистичный дизайн

### Reflectly
- AI-guided reflection prompts — задаёт вопросы, а не просто записывает
- Mood tracking + correlation со снами
- Gamified streaks (но ненавязчиво)
- Красивые градиентные карточки

### Dream Journal Ultimate
- Calendar view — сны на временной шкале
- Icloud sync
- Теги и символы

**Что брать для DreamStalk:**
1. **Голосовой ввод** — пока нет в TMA, но это топ-фича
2. **Prompts после записи** — "Что ты чувствовал? Кто был в сне?"
3. **Calendar view** — показывать сны на каленаре вместо просто списка
4. **Minimal dark aesthetic** — без карнавала эмоджи
5. **Streak** — показывать streak, но ненавязчиво (в профиле, не на главной)

---

## Следующий цикл — что делать

- [ ] Glassmorphism стили для карточек снов (backdrop-filter)
- [ ] Calendar view в истории снов
- [ ] Голосовой ввод prompt (открытие бота с voice deep link)
- [ ] Liquid Glass навигация (если добавится нижний nav bar)
- [ ] Streak в UserInfoCard (ненавязчиво — строчка, не баннер)
