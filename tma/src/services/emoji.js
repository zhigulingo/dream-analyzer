// Simple heuristic emoji mapper based on Russian keywords in a title
// Fallback: sleeping emoji

const MAP = [
  { keys: ['вода','море','река','волна','дожд','океан'], emoji: '🌊' },
  { keys: ['лет','полет','полетать','летать','небо','птиц','самолет'], emoji: '🕊️' },
  { keys: ['погон','убег','догон','преслед'], emoji: '🏃‍♂️' },
  { keys: ['экзам','контрол','тест','урок','школ','учеб','универ'], emoji: '📝' },
  { keys: ['деньг','кошелек','кошель','кошелёк','банк','кредит'], emoji: '💰' },
  { keys: ['любов','поцел','роман','пар','серд'], emoji: '❤️' },
  { keys: ['дом','квартир','комнат','двор','жиль'], emoji: '🏠' },
  { keys: ['работ','офис','началь','коллег'], emoji: '💼' },
  { keys: ['школ','класс','урок'], emoji: '🏫' },
  { keys: ['кот','кошка'], emoji: '🐱' },
  { keys: ['собак','пёс','пес'], emoji: '🐶' },
  { keys: ['зуб','зубы'], emoji: '🦷' },
  { keys: ['темнот','ноч','тьма'], emoji: '🌑' },
  { keys: ['смерт','похорон','кладбищ'], emoji: '🕯️' },
  { keys: ['рожд','младен','ребен','малыш','дет'], emoji: '👶' },
  { keys: ['лес','дерев','парк','природ'], emoji: '🌲' },
  { keys: ['огонь','пожар','жар'], emoji: '🔥' },
  { keys: ['зме','дракон'], emoji: '🐍' },
  { keys: ['путешеств','дорог','путь','троп'], emoji: '🧭' },
]

export function emojiForTitle(title) {
  try {
    const s = String(title || '').toLowerCase()
    for (const group of MAP) {
      if (group.keys.some(k => s.includes(k))) return group.emoji
    }
    return '💤'
  } catch {
    return '💤'
  }
}

export default { emojiForTitle }
