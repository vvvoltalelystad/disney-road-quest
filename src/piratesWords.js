import { DEFAULT_TASKS } from './questions.js';

const DUTCH_TARGET = 450;
const ENGLISH_TARGET = 150;

const CURATED_WORDS = [
  ['PHANTOM MANOR', 'en', 'Attractie', 'Een spookachtig landhuis in Frontierland.'],
  ['THUNDER MESA', 'en', 'Disney-locatie', 'Het mijnstadje rond Big Thunder Mountain.'],
  ['CASEY JR CIRCUS TRAIN', 'en', 'Attractie', 'Een kleine circustrein uit Fantasyland.'],
  ['NAUTILUS', 'en', 'Disney-locatie', 'De beroemde onderzeeër van kapitein Nemo.'],
  ['DISCOVERYLAND', 'en', 'Disney-locatie', 'Hier draait alles om uitvindingen en de toekomst.'],
  ['SKULL ROCK', 'en', 'Disney-locatie', 'Een rots in de vorm van een piratenschedel.'],
  ['ADMIRAL BOOM', 'en', 'Personage', 'De luidruchtige buurman uit Mary Poppins.'],
  ['CLARABELLE COW', 'en', 'Personage', 'Een klassieke vriendin van Mickey en Minnie.'],
  ['PROFESSOR PORTER', 'en', 'Personage', 'De vader van Jane in Tarzan.'],
  ['KRONKS SPINACH PUFFS', 'en', 'Disney-gerecht', 'Kronks beroemdste ovenhapjes.'],
  ['MAURICES INVENTION', 'en', 'Disney-voorwerp', 'Een uitvinding van Belles vader.'],
  ['YEN SID', 'en', 'Personage', 'De machtige tovenaar uit Fantasia.'],
  ['GREAT MOUSE DETECTIVE', 'en', 'Film', 'Een muis lost een mysterie op in Londen.'],
  ['SILVERMIST', 'en', 'Personage', 'Een watertalent uit Pixie Hollow.'],
  ['MADAME MEDUSA', 'en', 'Personage', 'De schurk uit The Rescuers.'],
  ['ROBIN HOOD AND LITTLE JOHN', 'en', 'Film', 'Twee vrienden die door het woud trekken.'],
  ['THE RESCUERS DOWN UNDER', 'en', 'Film', 'Bernard en Bianca reizen naar Australië.'],
  ['WALT DISNEY STUDIOS PARK', 'en', 'Disney-locatie', 'De vroegere naam van het tweede park in Parijs.'],
  ['AVENGERS ASSEMBLE FLIGHT FORCE', 'en', 'Attractie', 'Een snelle Marvel-missie in Avengers Campus.'],
  ['LAND OF FAIRY TALES', 'en', 'Attractie', 'Een boottocht langs miniatuur-sprookjes.'],
  ['DE KLEINE ZEEMEERMIN', 'nl', 'Film', 'Een prinses droomt van een leven op het land.'],
  ['BELLE EN HET BEEST', 'nl', 'Film', 'Een betoverd kasteel en een magische roos.'],
  ['DE PRINSES EN DE KIKKER', 'nl', 'Film', 'Een ambitieuze kokkin in New Orleans.'],
  ['DE REDDERTJES', 'nl', 'Film', 'Twee dappere muizen schieten te hulp.'],
  ['KNABBEL EN BABBEL', 'nl', 'Personages', 'Twee ondeugende aardeekhoorns.'],
  ['HET JUNGLEBOEK', 'nl', 'Film', 'Mowgli groeit op tussen de dieren.'],
  ['DE KLOKKENLUIDER VAN DE NOTRE DAME', 'nl', 'Film', 'Een verhaal rond de kathedraal van Parijs.'],
  ['101 DALMATIERS', 'nl', 'Film', 'Een heleboel gevlekte puppy’s.']
];

const SOURCE_KEYS = new Set(['answer', 'movie_nl', 'movie_en', 'movie_aliases', 'character_nl', 'character_en', 'character', 'name', 'solution']);

// Some source questions contain short accepted aliases. For the Plank we always
// use the complete, recognisable Disney name instead of such an answer fragment.
const CANONICAL_PLANK_WORDS = new Map([
  ['MIM', 'MADAM MIM']
]);

const normalizeWord = value => {
  const normalized = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9 '&-]/g, ' ').replace(/\s+/g, ' ').trim();
  return CANONICAL_PLANK_WORDS.get(normalized) || normalized;
};
const slug = value => normalizeWord(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const categoryForKey = key => key.startsWith('movie') ? 'Film' : key.startsWith('character') ? 'Personage' : 'Disney-kennis';
const hintFor = (category, language) => category === 'Film'
  ? (language === 'nl' ? 'Een titel uit de wereld van Disney en Pixar.' : 'An original Disney or Pixar title.')
  : category === 'Personage'
    ? (language === 'nl' ? 'Een personage uit een Disney- of Pixarverhaal.' : 'A character from a Disney or Pixar story.')
    : (language === 'nl' ? 'Een bekend antwoord uit de Disney-wereld.' : 'A familiar answer from the world of Disney.');

const extracted = [];
const fallbackOptions = [];
const collect = (value, key = '') => {
  if (typeof value === 'string') {
    if (SOURCE_KEYS.has(key)) extracted.push({ word: normalizeWord(value), key });
  } else if (Array.isArray(value)) {
    value.forEach(item => collect(item, key));
  } else if (value && typeof value === 'object') {
    if (Array.isArray(value.answers)) {
      if (Number.isInteger(value.correct) && value.answers[value.correct] != null) {
        value.answers.forEach((answer, index) => {
          const target = index === value.correct ? extracted : fallbackOptions;
          target.push({ word: normalizeWord(answer), key: 'answers' });
        });
      } else {
        value.answers.forEach(answer => extracted.push({ word: normalizeWord(answer), key: 'answers' }));
      }
    }
    Object.entries(value).forEach(([childKey, child]) => {
      if (childKey !== 'answers') collect(child, childKey);
    });
  }
};
DEFAULT_TASKS.forEach(task => collect(task));

const makeEntry = ({ word, language, category, hint }, index) => ({ id: `plank-${language}-${String(index + 1).padStart(3, '0')}-${slug(word)}`, word, language, category, hint });

const buildDatabase = () => {
  const usedWords = new Set();
  const dutch = [];
  const english = [];
  const add = (target, candidate, language) => {
    const word = normalizeWord(candidate.word);
    if (word.length < 3 || word.length > 42 || !/[A-Z]/.test(word) || usedWords.has(word)) return;
    usedWords.add(word);
    const category = candidate.category || categoryForKey(candidate.key || '');
    target.push({ word, language, category, hint: candidate.hint || hintFor(category, language) });
  };
  CURATED_WORDS.forEach(([word, language, category, hint]) => add(language === 'nl' ? dutch : english, { word, category, hint }, language));
  extracted.filter(item => item.key.endsWith('_en') || item.key === 'movie_aliases').forEach(item => add(english, item, 'en'));
  extracted.filter(item => item.key.endsWith('_nl') || ['answers', 'answer'].includes(item.key)).forEach(item => add(dutch, item, 'nl'));
  extracted.forEach(item => {
    if (english.length < ENGLISH_TARGET) add(english, item, 'en');
    else if (dutch.length < DUTCH_TARGET) add(dutch, item, 'nl');
  });
  // The curated and correct-answer pool gets priority. Plausible alternative
  // quiz options are only used to complete the requested 450/150 database.
  fallbackOptions.forEach(item => {
    if (english.length < ENGLISH_TARGET) add(english, item, 'en');
    else if (dutch.length < DUTCH_TARGET) add(dutch, item, 'nl');
  });
  if (dutch.length < DUTCH_TARGET || english.length < ENGLISH_TARGET) throw new Error(`Pirates-woordendatabase is onvolledig: ${dutch.length} NL en ${english.length} EN.`);
  return [...dutch.slice(0, DUTCH_TARGET).map((entry, index) => makeEntry(entry, index)), ...english.slice(0, ENGLISH_TARGET).map((entry, index) => makeEntry(entry, index))];
};

export const PIRATES_PLANK_WORDS = buildDatabase();
export const PIRATES_PLANK_WORD_COUNTS = Object.freeze({ total: PIRATES_PLANK_WORDS.length, nl: PIRATES_PLANK_WORDS.filter(entry => entry.language === 'nl').length, en: PIRATES_PLANK_WORDS.filter(entry => entry.language === 'en').length });
