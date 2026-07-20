import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DEFAULT_TASKS, MAGIC_NEWS } from './questions';
import { supabase } from './supabaseClient';
import {
  createRoom,
  joinRoom,
  fetchRoomData,
  subscribeToRoom,
  updateRoomState as dbUpdateRoomState,
  addPlayerScore as dbAddPlayerScore,
  adjustScoreEntry,
  removeScoreEntry
} from './multiplayer';
import { MiniGameRenderer, MiniGameRulesButton } from './MiniGames';

const GAME_MODES = [
  { id: "mix", name: "Road Race", icon: "🚗", description: "De volledige afwisselende mix van alle speltypen." },
  { id: "Quiz", name: "Quiz", icon: "❓", description: "Test je kennis over Disney en Pixar films." },
  { id: "Samen", name: "Samen", icon: "🤝", description: "Werk samen om groepsdoelen te halen." }
];

const STAGES = [
  "Start de motor!",
  "Grens oversteken",
  "Parijs in zicht",
  "De Disney-sfeer stijgt",
  "Parkeerterrein bereikt",
  "Welkom in het Park!"
];

const POWER_CARDS = {
  fastpass: { name: "FastPass \u{1F3AB}", desc: "Sla de huidige actieve opdracht over.", icon: "\u{1F3AB}", type: "self" },
  hyperdrive: { name: "Hyperdrive \u{1F680}", desc: "Verdubbel de score die je verdient bij je eerstvolgende speelbeurt.", icon: "\u{1F680}", type: "self" },
  tink: { name: "Tinkelbel Stof \u{1FA84}", desc: "Streep 2 foute opties weg bij je volgende Quiz of Emoji Quiz-vraag.", icon: "\u{1FA84}", type: "self" },
  time: { name: "Tijdverdrijver \u{1F570}\u{FE0F}", desc: "Geeft 30 seconden extra tijd voor de actieve timer.", icon: "\u{1F570}\u{FE0F}", type: "self" },
  wish: { name: "Wens van Genie \u{1F9DE}\u{200D}\u{2642}\u{FE0F}", desc: "Ruil deze kaart in om direct 2 nieuwe willekeurige actiekaarten te trekken.", icon: "\u{1F9DE}\u{200D}\u{2642}\u{FE0F}", type: "self" },
  autopech: { name: "Autopech \u{1FA93}", desc: "Bevries een medespeler. Hij/zij moet zijn eerstvolgende speelbeurt overslaan.", icon: "\u{1FA93}", type: "attack", selectTarget: true },
  apple: { name: "Giftige Appel \u{1F34E}", desc: "Steel direct 1 ster van een speler naar keuze en voeg deze toe aan jouw score.", icon: "\u{1F34E}", type: "attack", selectTarget: true },
  abu: { name: "Sluipen met Abu \u{1F463}", desc: "Steel een willekeurige actiekaart uit de hand van een medespeler naar keuze.", icon: "\u{1F463}", type: "attack", selectTarget: true },
  kuzco: { name: "Kroon van Kuzco \u{1F451}", desc: "Wissel al jouw actiekaarten om met de kaarten van een medespeler naar keuze.", icon: "\u{1F451}", type: "attack", selectTarget: true },
  kaahypnose: { name: "Kaa's Hypnose \u{1F300}", desc: "Halveer de beschikbare tijd op de timer van de speler die nu aan de beurt is.", icon: "\u{1F300}", type: "attack" },
  shield: { name: "Magische Bumper \u{1F6E1}\u{FE0F}", desc: "Blokkeer een aanval (zoals Autopech of Giftige Appel) die een speler op jou speelt.", icon: "\u{1F6E1}\u{FE0F}", type: "defense" },
  spiegel: { name: "Magische Spiegel \u{1F3AD}", desc: "Kaats een aanval van een medespeler direct terug naar de speler die hem op jou speelde.", icon: "\u{1F3AD}", type: "defense" },
  shortcut: { name: "Sluiproute \u{1F5FA}\u{FE0F}", desc: "Wissel de huidige opdracht met een willekeurige opdracht uit een categorie naar keuze.", icon: "\u{1F5FA}\u{FE0F}", type: "self" },
  elsa: { name: "Elsa's Bevriezing \u{2744}\u{FE0F}", desc: "Zet de actieve timer gedurende 15 seconden volledig stil om rustig na te denken.", icon: "\u{2744}\u{FE0F}", type: "self" }
};

const ARENA_GAMES = [
  { id: 'othello', name: "Ursula's Spiegelstrijd", icon: "\u26AA", image: 'arena/games/Ursula.png', desc: "Origineel: Othello / Reversi. Verover het bord door vijandelijke fiches in te sluiten.", maxPlayers: 2 },
  { id: 'dotsboxes', name: "Rapunzel's Torenkamers", icon: "\u270F\uFE0F", image: 'arena/games/Rapunzel.png', desc: "Origineel: Dots & Boxes. Trek lijntjes en claim de meeste kamertjes.", maxPlayers: 4 },
  { id: 'colorlines', name: "Inside Out Kleurenchaos", icon: "\u{1F534}", image: 'arena/games/Inside Out.png', desc: "Origineel: Color Lines. Solo puzzel: maak rijen van 5 gelijke bollen.", maxPlayers: 1 },
  { id: 'abalone', name: "Louisa's Power Push", icon: "\u{1F41C}", image: 'arena/games/Louisa.png', desc: "Origineel: Marble Push / Abalone. Duw de bollen van de tegenstander uit het hex-raster.", maxPlayers: 2 },
  { id: 'piratesplank', name: "Black Pearl's Plank", icon: "\u2620\uFE0F", image: 'arena/games/The Black Pearl.png', desc: "Origineel: Galgje/Wheel of Fortune. Gooi dobbelstenen, koop klinkers en kraak de blanco schatkistcode.", maxPlayers: 4 },
  { id: 'yahtzee', name: "Goofy's Geluksworp", icon: "\u{1F3B2}", image: 'arena/games/Goofy.png', desc: "Origineel: Yahtzee. Gooi, houd dobbelstenen vast en vul je magische scorekaart.", maxPlayers: 2 },
  { id: 'qwixx', name: "Mike's Wazowski-Board", icon: "\u270F\uFE0F", image: 'arena/games/Mike.png', desc: "Origineel: Qwixx. Streep gekleurde rijen af en ontwijk strafvakjes.", maxPlayers: 2 },
  { id: 'mastermind', name: "Yzma's Poison Struggle", icon: "\u{1F9E0}", image: 'arena/games/Yzma.png', desc: "Origineel: Mastermind. Solo puzzel: kraak de geheime Disney-kleurcode.", maxPlayers: 1 },
  { id: 'tictactinker', name: "Tic Tac Tinker Bell", icon: "\u2728", image: 'arena/games/Tinker Bell.png', desc: "Origineel: Ultimate Tic Tac Toe. Win kleine borden om het grote bord te veroveren.", maxPlayers: 2 },
  { id: 'sudoku9', name: "Zazu's Sudoku", icon: "\u{1F3F0}", image: 'arena/games/Zazu.png', desc: "Origineel: Sudoku 9x9. Klassiek raster met Disney-symbolen.", maxPlayers: 1 }
];

const getArenaGame = (gameId) => ARENA_GAMES.find(game => game.id === gameId);
const AI_ARENA_GAME_IDS = new Set(['othello', 'dotsboxes', 'abalone', 'yahtzee', 'qwixx', 'tictactinker']);
const hasArenaAi = gameId => AI_ARENA_GAME_IDS.has(gameId);

const COCO_BANK_KEY = 'disney_coco_coin_bank';
const COCO_PROFILES_KEY = 'disney_coco_profiles';
const PROFILE_PREFERENCES_KEY = 'disney_profile_preferences';
const ARENA_SAVES_KEY = 'disney_arena_saves';
const ACTIVE_PROFILE_KEY = 'disney_active_profile';
const COCO_PROFILE_STORE_CODE = 'COCO-PROFILES-V1';
const BADGE_COLLECTION_KEY = 'disney_badge_collections';
const BADGE_MARKET_KEY = 'disney_badge_market';
const BADGE_ACHIEVEMENT_KEY = 'disney_badge_achievements';
const BADGE_PACK_COST = 5;
const BADGE_SELL_VALUE = 2;
const BADGE_SHOWCASE_SEED_VERSION = 2;
const ENABLE_LEGACY_SHOP = false;

const DISNEY_PROFILE_COLORS = [
  { id: 'blue', name: 'Blauw', hex: '#00c9ff' },
  { id: 'green', name: 'Groen', hex: '#2ee77d' },
  { id: 'yellow', name: 'Geel', hex: '#ffd615' },
  { id: 'pink', name: 'Roze', hex: '#ff3b91' },
  { id: 'purple', name: 'Paars', hex: '#bd62ed' },
  { id: 'orange', name: 'Oranje', hex: '#ff7a1a' }
];

const DISNEY_PROFILE_AVATARS = [
  ['linguini', 'Alfredo Linguini', 'linguini.webp'], ['bruno', 'Bruno', 'bruno.png'],
  ['buzz', 'Buzz Lightyear', 'buzz.png'], ['heihei', 'Heihei', 'heihei.png'],
  ['hen-wen', 'Hen Wen', 'hen-wen.png'], ['jack', 'Jack Sparrow', 'jack.png'],
  ['kuzco', 'Kuzco', 'kuzco.png'], ['maximus', 'Maximus', 'maximus.png'],
  ['medusa', 'Madame Medusa', 'medusa.png'], ['miguel', 'Miguel', 'miguel.png'],
  ['mufasa', 'Mufasa', 'mufasa.png'], ['mushu', 'Mushu', 'mushu.png'],
  ['olaf', 'Olaf', 'olaf.png'], ['pascal', 'Pascal', 'pascal.png'],
  ['percy', 'Percy', 'percy.png'], ['peter', 'Peter Pan', 'peter.png'],
  ['redpanda', 'Rode panda', 'redpanda.png'], ['remy', 'Remy', 'remy.png'],
  ['stitch', 'Stitch', 'stitch.png'], ['taran', 'Taran', 'taran.png']
].map(([id, name, file]) => ({ id, name, image: `music/avatars/${file}` }));

const BADGE_RARITIES = [
  { id: 'common', name: 'Common', subtitle: 'De eerste stap van ieder Disney-avontuur', perPark: 12, frame: 'badges/frames/common-silver.png' },
  { id: 'uncommon', name: 'Uncommon', subtitle: 'Bijzondere herinneringen uit beide parken', perPark: 8, frame: 'badges/frames/uncommon-green.png' },
  { id: 'rare', name: 'Rare', subtitle: 'Voor verzamelaars met oog voor magie', perPark: 8, frame: 'badges/frames/rare-blue.png' },
  { id: 'epic', name: 'Epic', subtitle: 'Iconische belevenissen in een exclusieve uitvoering', perPark: 6, frame: 'badges/frames/epic-purple.png' },
  { id: 'legendary', name: 'Legendary', subtitle: 'De kroonjuwelen van de Disney-collectie', perPark: 4, frame: 'badges/frames/legendary-gold.png' }
];

const BADGE_NAMES = {
  disneyland: {
    common: ['Main Street Station', 'Town Square', 'Horse-Drawn Streetcars', 'Casey’s Corner', 'Liberty Arcade', 'Discovery Arcade', 'Sleeping Beauty Castle', 'Le Carrousel de Lancelot', 'Alice’s Curious Labyrinth', 'Mad Hatter’s Tea Cups', 'Le Pays des Contes de Fées', 'It’s a Small World'],
    uncommon: ['Pirates’ Beach', 'Adventure Isle', 'Swiss Family Treehouse', 'Frontierland Depot', 'Thunder Mesa', 'Phantom Manor', 'Orbitron', 'Autopia'],
    rare: ['Peter Pan’s Flight', 'Pirates of the Caribbean', 'Star Tours', 'Buzz Lightyear Laser Blast', 'Mickey’s PhilharMagic', 'Big Thunder Mountain', 'Indiana Jones Temple', 'Dragon’s Lair'],
    epic: ['Disney Stars on Parade', 'Disney Tales of Magic', 'Meet Mickey Mouse', 'Princess Pavilion', 'Star Wars Hyperspace Mountain', 'Castle Dream'],
    legendary: ['Disneyland Hotel', 'Walt & Mickey', 'Sleeping Beauty Castle Gold', 'Disneyland Park Icon']
  },
  adventure: {
    common: ['World Premiere Entrance', 'Studio Theater', 'Worlds of Pixar Entrance', 'World Premiere Plaza', 'Animation Celebration', 'Cars ROAD TRIP', 'Toy Story Playland', 'Slinky Dog Zigzag Spin', 'Cars Quatre Roues Rallye', 'Flying Carpets Over Agrabah', 'Stitch Live!', 'Minnie’s Dream Factory'],
    uncommon: ['Ratatouille Courtyard', 'Place de Rémy', 'Spider-Man W.E.B.', 'Avengers Headquarters', 'Training Center', 'Frozen Promenade', 'Arendelle Village', 'Raiponce Tangled Spin'],
    rare: ['Ratatouille Adventure', 'Crush’s Coaster', 'Tower of Terror', 'RC Racer', 'Toy Soldiers Parachute Drop', 'Avengers Flight Force', 'Frozen Ever After', 'Mickey and the Magician'],
    epic: ['World of Frozen', 'Avengers Campus', 'Together: Pixar Adventure', 'Disney Studio 1', 'Adventure Bay', 'Adventure Way'],
    legendary: ['Hollywood Tower', 'Arendelle Castle', 'Adventure Bay Night', 'Disney Adventure World Icon']
  }
};

const BADGE_PARKS = [
  { id: 'disneyland', name: 'Disneyland Park', short: 'DLP' },
  { id: 'adventure', name: 'Disney Adventure World', short: 'DAW' }
];

const BADGE_DEFINITIONS = BADGE_RARITIES.flatMap(rarity =>
  BADGE_PARKS.flatMap(park =>
    BADGE_NAMES[park.id][rarity.id].map((name, index) => ({
      id: `${park.id}-${rarity.id}-${index + 1}`,
      name,
      rarity: rarity.id,
      rarityName: rarity.name,
      park: park.id,
      parkName: park.name,
      parkShort: park.short,
      number: index + 1,
      image: `badges/collection/${park.id}-${rarity.id}-${index + 1}.png`
    }))
  )
);

const BADGE_ACHIEVEMENTS = [
  {
    id: 'special-common-complete', rarity: 'common', name: 'De Eerste Vonk',
    subtitle: 'Alle 24 Common-badges verzameld', emblem: '✦',
    reward: 'Profieltitel: Verzamelaar', image: 'badges/special/special_common_complete.png'
  },
  {
    id: 'special-uncommon-complete', rarity: 'uncommon', name: 'Ontdekkingsreiziger van Twee Werelden',
    subtitle: 'Alle 16 Uncommon-badges verzameld', emblem: '⌁',
    reward: 'Smaragdgroene profielrand', image: 'badges/special/special_uncommon_complete.png'
  },
  {
    id: 'special-rare-complete', rarity: 'rare', name: 'Hoeder van de Magie',
    subtitle: 'Alle 16 Rare-badges verzameld', emblem: '⚿',
    reward: 'Saffierblauwe fonkelrand', image: 'badges/special/special_rare_complete.png'
  },
  {
    id: 'special-epic-complete', rarity: 'epic', name: 'Meester van Dromen en Avontuur',
    subtitle: 'Alle 12 Epic-badges verzameld', emblem: '✧',
    reward: 'Paarse profielgloed', image: 'badges/special/special_epic_complete.png'
  },
  {
    id: 'special-legendary-complete', rarity: 'legendary', name: 'Legende van de Twee Parken',
    subtitle: 'Alle 8 Legendary-badges verzameld', emblem: '♛',
    reward: 'Gouden profielrand en titel: Legende', image: 'badges/special/special_legendary_complete.png'
  },
  {
    id: 'special-master-collector', rarity: 'ultimate', name: 'Het Hart van Disneyland Paris',
    subtitle: 'Alle vijf badgecollecties voltooid', emblem: '♥',
    reward: 'Iriserende profielrand en titel: Hoeder van de Magie', image: 'badges/special/special_master_collector.png',
    ultimate: true
  }
];

const BADGE_CATEGORY_ACHIEVEMENTS = BADGE_ACHIEVEMENTS.filter(achievement => !achievement.ultimate);
const JACCO_BADGE_SHOWCASE_COUNTS = {
  'disneyland-common-1': 3,
  'disneyland-common-2': 2,
  'disneyland-common-3': 4,
  'disneyland-common-4': 1,
  'disneyland-common-5': 2,
  'disneyland-common-6': 3,
  'disneyland-common-7': 1,
  'disneyland-common-8': 2,
  'disneyland-common-9': 4,
  'disneyland-common-10': 2,
  'disneyland-common-11': 3,
  'disneyland-common-12': 2,
  'adventure-common-1': 3,
  'adventure-common-2': 2,
  'adventure-common-3': 4,
  'adventure-common-4': 1,
  'adventure-common-5': 3,
  'adventure-common-6': 2,
  'adventure-common-7': 4,
  'adventure-common-8': 2,
  'adventure-common-9': 1,
  'adventure-common-10': 3,
  'adventure-common-11': 2,
  'adventure-common-12': 4,
  'disneyland-uncommon-1': 2,
  'disneyland-uncommon-2': 3
};
const BADGE_FACTS = {
  'disneyland-common-1': 'Een volledige ronde met de Disneyland Railroad duurt ongeveer dertig minuten.',
  'disneyland-common-2': 'Town Square is het eerste plein na de ingang en vormt de poort naar Main Street, U.S.A.',
  'disneyland-common-3': 'Deze paardentram rijdt in klassieke negentiende-eeuwse stijl over Main Street, U.S.A.',
  'disneyland-common-4': 'Casey’s Corner is een Amerikaans restaurant dat helemaal in het teken staat van honkbal.',
  'disneyland-common-5': 'Liberty Arcade is een van de twee overdekte passages vol kunst, foto’s en schaalmodellen.',
  'disneyland-common-6': 'Discovery Arcade laat je langs fantasierijke uitvindingen en toekomstvisies uit het verleden wandelen.',
  'disneyland-common-7': 'Onder het kasteel woont een 24 meter lange draak van ruim twee ton.',
  'disneyland-common-8': 'Dit carrousel brengt de legende van ridder Lancelot tot leven in het hart van Fantasyland.',
  'disneyland-common-9': 'Het doolhof van Wonderland eindigt bij het kasteel van de Hartenkoningin.',
  'disneyland-common-10': 'De kleurrijke theekopjes draaien rond een enorme theepot van de Mad Hatter.',
  'disneyland-common-11': 'In 2024 kreeg deze miniatuurwereld nieuwe scènes van Frozen, Winnie de Poeh en Up.',
  'disneyland-common-12': 'Tijdens de boottocht zie je bijna 300 Audio-Animatronics-poppen uit alle hoeken van de wereld.',
  'adventure-common-1': 'World Premiere herschept de glitter en spanning van de openingsavond van een Hollywoodfilm.',
  'adventure-common-2': 'In Studio Theater krijgt TOGETHER een live soundtrack van acht muzikanten mee.',
  'adventure-common-3': 'Worlds of Pixar bracht bij de introductie zeven populaire Pixar-attracties samen in één kleurrijk gebied.',
  'adventure-common-4': 'De theatergevels van World Premiere Plaza zijn geïnspireerd op Broadway en het Londense West End.',
  'adventure-common-5': 'Bij Animation Celebration kun je met Anna, Kristoff en Sven dansen en met Elsa meezingen.',
  'adventure-common-6': 'Deze rit voert over een Cars-versie van Route 66 langs natuurlijke én mechanische wonderen.',
  'adventure-common-7': 'In Toy Story Playland wandel je door Andy’s tuin alsof je zelf tot speelgoedformaat bent gekrompen.',
  'adventure-common-8': 'De voertuigen van Slinky Dog Zigzag Spin heten achter de schermen “croquettes”: hondenbrokjes.',
  'adventure-common-9': 'Bij deze Cars-attractie mag iedere lengte instappen voor een zwierende rit met Lightning McQueen.',
  'adventure-common-10': 'Na de renovatie werden gouden scarabeeën in het decor verstopt als verwijzing naar de Grot der Wonderen.',
  'adventure-common-11': 'Stitch reageert tijdens deze interactieve ontmoeting live op wat bezoekers zeggen en doen.',
  'adventure-common-12': 'Voor de vernieuwde Minnie’s Dream Factory deden meer dan achthonderd artiesten auditie.',
  'disneyland-uncommon-1': 'Pirates’ Beach is een piratenspeelplaats in Adventureland waar jonge avonturiers zelf kunnen klimmen en klauteren.',
  'disneyland-uncommon-2': 'Adventure Isle is een wandelavontuur vol smokkelaarspaden, grotten en verborgen plekken.'
};
const getAchievement = achievementId => BADGE_ACHIEVEMENTS.find(achievement => achievement.id === achievementId);
const getRarityBadgeProgress = (ownedBadges, rarity) => {
  const badges = BADGE_DEFINITIONS.filter(badge => badge.rarity === rarity);
  const owned = badges.filter(badge => Number(ownedBadges?.[badge.id]) > 0);
  return { badges, owned, missing: badges.filter(badge => Number(ownedBadges?.[badge.id]) <= 0), total: badges.length };
};

const getBadge = badgeId => BADGE_DEFINITIONS.find(badge => badge.id === badgeId);
const getMarketHour = () => Math.floor(Date.now() / 3600000);

const weightedRarity = weights => {
  const roll = Math.random() * 100;
  let cursor = 0;
  for (const [rarity, chance] of Object.entries(weights)) {
    cursor += chance;
    if (roll < cursor) return rarity;
  }
  return Object.keys(weights)[0];
};

const randomBadge = (weights, excludedIds = []) => {
  const rarity = weightedRarity(weights);
  const candidates = BADGE_DEFINITIONS.filter(badge => badge.rarity === rarity && !excludedIds.includes(badge.id));
  const fallback = BADGE_DEFINITIONS.filter(badge => !excludedIds.includes(badge.id));
  const pool = candidates.length ? candidates : fallback;
  return pool[Math.floor(Math.random() * pool.length)];
};

const createHourlyBadgeMarket = (hour = getMarketHour()) => {
  const offers = [];
  const weights = { common: 42, uncommon: 28, rare: 17, epic: 9, legendary: 4 };
  while (offers.length < 3) offers.push(randomBadge(weights, offers).id);
  return { hour, offers };
};

function CocoCoinIcon({ size = 30, onInspect }) {
  const icon = (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flex: '0 0 auto',
        filter: 'drop-shadow(0 0 9px rgba(255, 196, 71, 0.65))'
      }}
    >
      <img
        src={assetPath('collectables/coco-coin-front.png')}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
      />
    </span>
  );

  if (!onInspect) return icon;

  return (
    <button
      type="button"
      className="coco-coin-button"
      onClick={onInspect}
      aria-label="Bekijk Coco Coin"
      title="Bekijk Coco Coin"
    >
      {icon}
    </button>
  );
}

const assetPath = (path) => {
  if (location.hostname.includes('github.io')) {
    return '/disney-road-quest/' + path;
  }
  return '/' + path;
};

const LEGACY_DISNEY_SHOP_ITEMS = [
  { id: 'mickey-sticker', name: 'Mickey Sticker', icon: '🔴', image: 'collectables/mickey-sticker.png', cost: 1, type: 'everyone', desc: 'Een vrolijke startbadge voor elke speler.' },
  { id: 'castle-pin', name: 'Kasteel Pin', icon: '🏰', cost: 1, type: 'everyone', desc: 'Voor in je Disney Collection.' },
  { id: 'pixie-dust', name: 'Tinkelstof Zakje', icon: '✨', cost: 1, type: 'everyone', desc: 'Een klein beetje magie voor onderweg.' },
  { id: 'golden-fastpass', name: 'Gouden FastPass', icon: '🎫', cost: 5, type: 'exclusive', desc: 'Exclusief: maar een speler kan deze claimen.' },
  { id: 'captains-compass', name: 'Kapiteinskompas', icon: '🧭', cost: 7, type: 'exclusive', desc: 'Exclusief verzamelitem voor de snelste avonturier.' },
  { id: 'crystal-castle', name: 'Kristallen Kasteel', icon: '💎', cost: 10, type: 'exclusive', desc: 'Zeldzaam pronkstuk voor de Collection.' }
];

const DISNEY_SHOP_ITEMS = [
  { id: 'mickey-sticker', name: 'Mickey Sticker', icon: 'MS', image: 'collectables/mickey-sticker.png', cost: 1, type: 'everyone', desc: 'Een vrolijke startbadge voor elke speler.' },
  { id: 'castle-pin', name: 'Kasteel Pin', icon: 'KP', image: 'collectables/castle-pin.png', cost: 1, type: 'everyone', desc: 'Een klassiek pin-item voor elke Disney Collection.' },
  { id: 'pixie-dust', name: 'Tinkelstof Zakjes', icon: 'TZ', image: 'collectables/pixie-dust-bags.png', cost: 1, type: 'everyone', desc: 'Een voorraadje magie voor onderweg.' },
  { id: 'golden-fastpass', name: 'Royal Access Pass', icon: 'RA', image: 'collectables/royal-access-pass.png', cost: 5, type: 'exclusive', desc: 'Exclusief: maar een speler kan deze claimen.' },
  { id: 'captains-compass', name: "Jack Sparrow's Compass", icon: 'JS', image: 'collectables/jack-sparrows-compass.png', cost: 7, type: 'exclusive', desc: 'Exclusief verzamelitem voor wie altijd de juiste route vindt.' },
  { id: 'disney-pin-trading', name: 'Disney Pin Trading Logo', icon: 'PT', image: 'collectables/disney-pin-trading-front.png', backImage: 'collectables/disney-pin-trading-back.png', cost: 1, type: 'everyone', desc: 'Een officieel Pin Trading-logo voor je Disney Collection.' },
  { id: 'crystal-castle', name: 'Swarovski Pluto', icon: 'SP', image: 'collectables/swarovski-pluto.png', cost: 8, type: 'exclusive', desc: 'Een fonkelend pronkstuk voor de Collection.' },
  { id: 'swarovski-beauty-set', name: 'Swarovski Beauty Set', icon: 'SB', image: 'collectables/swarovski-beauty-set.png', cost: 12, type: 'exclusive', desc: 'Een luxe set voor de speler met de meeste Coco Coin-discipline.' }
];

const formatCocoCoins = (amount) => `${amount} Coco Coin${Number(amount) === 1 ? '' : 's'}`;

const renderCollectableVisual = (item, className = '', style = {}) => {
  if (item?.image) {
    return (
      <img
        src={assetPath(item.image)}
        alt={item.name}
        className={className}
        style={style}
      />
    );
  }
  return <span className={className} style={style}>{item?.icon}</span>;
};

function BadgeArtwork({ badge, count = 0, compact = false }) {
  const [customImageLoaded, setCustomImageLoaded] = useState(false);
  if (!badge) return null;
  const initials = badge.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map(word => word[0])
    .join('')
    .toUpperCase();
  return (
    <div
      className={`disney-badge-art rarity-${badge.rarity} park-${badge.park}${customImageLoaded ? ' has-custom-image' : ''}${compact ? ' is-compact' : ''}`}
      aria-label={`${badge.name}, ${badge.rarityName}, ${badge.parkName}`}
    >
      <span className="disney-badge-rim" />
      <span className="disney-badge-park">{badge.parkShort}</span>
      <strong>{initials}</strong>
      <span className="disney-badge-spark">✦</span>
      <img
        className="disney-badge-image"
        src={assetPath(badge.image)}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        onLoad={() => setCustomImageLoaded(true)}
        onError={event => { setCustomImageLoaded(false); event.currentTarget.hidden = true; }}
      />
      {count > 1 && <span className="disney-badge-count">×{count}</span>}
    </div>
  );
}

function AchievementBadgeArtwork({ achievement, unlocked = false, compact = false }) {
  if (!achievement) return null;
  return (
    <div
      className={`achievement-badge-art achievement-${achievement.rarity}${unlocked ? ' is-unlocked' : ' is-locked'}${compact ? ' is-compact' : ''}`}
      aria-label={`${achievement.name}${unlocked ? ', behaald' : ', vergrendeld'}`}
    >
      <span className="achievement-badge-placeholder" aria-hidden="true">
        <span className="achievement-gem-ring" />
        <strong>{achievement.emblem}</strong>
        {achievement.ultimate && <span className="achievement-five-gems"><i /><i /><i /><i /><i /></span>}
      </span>
      <img
        src={assetPath(achievement.image)}
        alt=""
        aria-hidden="true"
        onError={event => { event.currentTarget.hidden = true; }}
      />
      {!unlocked && <span className="achievement-lock" aria-hidden="true">◆</span>}
    </div>
  );
}

function MiguelMarket({
  activeName, balance, ownedBadges, badgeMarket, badgeMarketNow,
  ownedAchievements, achievementCelebration, tradeOfferIndex, sellOpen, openedPack,
  onOpenPack, onChooseTrade, onTrade, onOpenSell, onCloseSell, onSell, onClosePack, onCloseAchievement, onInspectCoin
}) {
  const [selectedCollectionBadgeId, setSelectedCollectionBadgeId] = useState(null);
  const [viewerBadgeId, setViewerBadgeId] = useState(null);
  const [viewerFlipped, setViewerFlipped] = useState(false);
  const uniqueOwned = Object.values(ownedBadges).filter(count => Number(count) > 0).length;
  const totalOwned = Object.values(ownedBadges).reduce((sum, count) => sum + (Number(count) || 0), 0);
  const secondsUntilRefresh = Math.max(0, Math.ceil((((badgeMarket.hour + 1) * 3600000) - badgeMarketNow) / 1000));
  const refreshTime = `${String(Math.floor(secondsUntilRefresh / 60)).padStart(2, '0')}:${String(secondsUntilRefresh % 60).padStart(2, '0')}`;
  const sellableBadges = BADGE_DEFINITIONS.filter(badge => ownedBadges[badge.id] > 0);
  const offeredBadge = tradeOfferIndex === null ? null : getBadge(badgeMarket.offers[tradeOfferIndex]);
  const categoryAchievementsUnlocked = BADGE_CATEGORY_ACHIEVEMENTS.filter(achievement => ownedAchievements?.[achievement.id]);
  const viewerBadge = getBadge(viewerBadgeId);
  const viewerRarity = BADGE_RARITIES.find(rarity => rarity.id === viewerBadge?.rarity);
  const viewerCount = Number(ownedBadges?.[viewerBadgeId]) || 0;
  const viewerFact = BADGE_FACTS[viewerBadgeId] || `Deze badge bewaart een bijzondere herinnering aan ${viewerBadge?.parkName || 'Disneyland Paris'}.`;

  const handleCollectionBadgeClick = badgeId => {
    if ((Number(ownedBadges?.[badgeId]) || 0) <= 0) return;
    if (selectedCollectionBadgeId !== badgeId) {
      setSelectedCollectionBadgeId(badgeId);
      return;
    }
    setViewerBadgeId(badgeId);
    setViewerFlipped(false);
  };

  const closeBadgeViewer = () => {
    setViewerBadgeId(null);
    setViewerFlipped(false);
  };

  useEffect(() => {
    const marketModalOpen = Boolean(viewerBadgeId || tradeOfferIndex !== null || sellOpen || openedPack || achievementCelebration);
    if (!marketModalOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = event => {
      if (event.key === 'Escape') {
        setViewerBadgeId(null);
        setViewerFlipped(false);
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [achievementCelebration, openedPack, sellOpen, tradeOfferIndex, viewerBadgeId]);

  return (
    <section className="card portal-shop-content miguel-market">
      <div className="portal-shop-heading">
        <div>
          <span className="portal-section-kicker">Collectie van {activeName}</span>
          <h2>{uniqueOwned} van {BADGE_DEFINITIONS.length} badges ontdekt</h2>
          <p>{totalOwned} badge{totalOwned === 1 ? '' : 's'} in bezit, inclusief dubbele exemplaren.</p>
        </div>
        <div className="portal-shop-balance" aria-label={`${formatCocoCoins(balance)} beschikbaar`}>
          <CocoCoinIcon size={30} onInspect={onInspectCoin} /><strong>{balance}</strong>
        </div>
      </div>

      <section className="badge-hall-of-honor" aria-labelledby="badge-hall-title">
        <header className="badge-hall-heading">
          <div>
            <span className="portal-section-kicker">Permanente prestatiebadges</span>
            <h3 id="badge-hall-title">Eregalerij</h3>
            <p>Voltooi collecties, verlicht de vijf edelstenen en ontgrendel uiteindelijk Het Hart van Disneyland Paris.</p>
          </div>
          <strong>{Object.keys(ownedAchievements || {}).filter(id => getAchievement(id)).length}/6 behaald</strong>
        </header>

        <div className="achievement-display-grid">
          {BADGE_ACHIEVEMENTS.map(achievement => {
            const unlocked = Boolean(ownedAchievements?.[achievement.id]);
            const progress = achievement.ultimate
              ? { owned: categoryAchievementsUnlocked, total: BADGE_CATEGORY_ACHIEVEMENTS.length, missing: BADGE_CATEGORY_ACHIEVEMENTS.filter(item => !ownedAchievements?.[item.id]) }
              : getRarityBadgeProgress(ownedBadges, achievement.rarity);
            const progressCount = progress.owned.length;
            return (
              <article key={achievement.id} className={`achievement-display-card achievement-${achievement.rarity}${unlocked ? ' is-unlocked' : ''}`}>
                <div className="achievement-pedestal">
                  <AchievementBadgeArtwork achievement={achievement} unlocked={unlocked} />
                </div>
                <div className="achievement-nameplate">
                  <span>{unlocked ? 'Behaald' : `${progressCount}/${progress.total}`}</span>
                  <strong>{achievement.name}</strong>
                  <p>{achievement.subtitle}</p>
                  <em>{unlocked ? achievement.reward : 'Nog vergrendeld'}</em>
                </div>
                {!unlocked && progress.missing.length > 0 && (
                  <details className="achievement-missing">
                    <summary>Wat ontbreekt er?</summary>
                    <div>{progress.missing.map(item => <span key={item.id}>{item.name}</span>)}</div>
                  </details>
                )}
              </article>
            );
          })}
        </div>

        <div className="achievement-master-progress" aria-label={`${categoryAchievementsUnlocked.length} van 5 collectie-edelstenen verlicht`}>
          {BADGE_CATEGORY_ACHIEVEMENTS.map(achievement => (
            <span key={achievement.id} className={`achievement-progress-gem achievement-${achievement.rarity}${ownedAchievements?.[achievement.id] ? ' is-lit' : ''}`} title={achievement.name} />
          ))}
          <strong>{categoryAchievementsUnlocked.length}/5 edelstenen verlicht</strong>
        </div>
      </section>

      <div className="miguel-commerce-grid">
        <article className="badge-pack-card">
          <span className="portal-section-kicker">Verrassingspakje</span>
          <div className="badge-pack-visual" aria-hidden="true"><span>?</span><span>?</span></div>
          <h3>2 willekeurige badges</h3>
          <p>Nooit twee dezelfde badges in één pakje. Badges uit je collectie kunnen wel opnieuw verschijnen.</p>
          <details className="badge-odds">
            <summary>Bekijk de kansen</summary>
            <p><strong>Badge 1:</strong> 55% Common · 25% Uncommon · 15% Rare · 5% Epic</p>
            <p><strong>Badge 2:</strong> 40% Common · 30% Uncommon · 15% Rare · 10% Epic · 5% Legendary</p>
          </details>
          <button type="button" className="btn primary full" disabled={balance < BADGE_PACK_COST} onClick={onOpenPack}>
            {balance < BADGE_PACK_COST ? 'Niet genoeg Coco Coins' : `Open pakje · ${BADGE_PACK_COST} Coco Coins`}
          </button>
        </article>

        <article className="miguel-trade-card">
          <button type="button" className="miguel-portrait-button" onClick={onOpenSell} aria-label="Verkoop een badge aan Miguel">
            <strong className="miguel-sell-title"><span>Verkoop</span><span>aan</span><span>Miguel</span></strong>
            <img src={assetPath('portal/miguel-sell.png')} alt="Miguel met zijn gitaar" />
            <span className="miguel-sell-value">
              <span className="miguel-sell-coins" aria-hidden="true"><CocoCoinIcon size={18} /><CocoCoinIcon size={18} /></span>
              <span>per badge</span>
            </span>
          </button>
          <div className="miguel-trade-copy">
            <span className="portal-section-kicker">Miguel ruilt altijd</span>
            <h3>Ruilaanbod van dit uur</h3>
            <p>Kies een badge en geef daarna één van je eigen badges terug.</p>
            <span className="market-countdown">Nieuw aanbod over {refreshTime}</span>
          </div>
          <div className="market-offer-grid">
            {badgeMarket.offers.map((badgeId, index) => {
              const badge = getBadge(badgeId);
              return (
                <button key={`${badgeId}-${index}`} type="button" className="market-offer" onClick={() => onChooseTrade(index)} disabled={totalOwned === 0}>
                  <BadgeArtwork badge={badge} compact />
                  <strong>{badge?.name}</strong>
                  <span>{badge?.rarityName} · {badge?.parkShort}</span>
                  <em>{totalOwned === 0 ? 'Geen badge om te ruilen' : 'Kies om te ruilen'}</em>
                </button>
              );
            })}
          </div>
        </article>
      </div>

      <div className="badge-jewel-collection">
        {BADGE_RARITIES.map(rarity => {
          const rarityBadges = BADGE_DEFINITIONS.filter(badge => badge.rarity === rarity.id);
          const rarityOwned = rarityBadges.filter(badge => ownedBadges[badge.id] > 0).length;
          return (
            <section key={rarity.id} className={`badge-rarity-case rarity-${rarity.id}`}>
              <header className="badge-rarity-heading">
                <div><h3>{rarity.name}</h3><p>{rarity.subtitle}</p></div>
                <strong>{rarityOwned} / {rarityBadges.length}</strong>
              </header>
              {BADGE_PARKS.map(park => (
                <div key={park.id} className="badge-park-section">
                  <div className="badge-park-divider"><span>{park.name}</span></div>
                  <div className="badge-display-grid">
                    {rarityBadges.filter(badge => badge.park === park.id).map(badge => {
                      const count = Number(ownedBadges[badge.id]) || 0;
                      return (
                        <button
                          key={badge.id}
                          type="button"
                          className={`badge-jewel-slot${count ? ' is-owned' : ' is-empty'}${selectedCollectionBadgeId === badge.id ? ' is-selected' : ''}`}
                          onClick={() => handleCollectionBadgeClick(badge.id)}
                          aria-pressed={count > 0 ? selectedCollectionBadgeId === badge.id : undefined}
                          aria-label={count > 0 ? `${badge.name}, ${count} in bezit. ${selectedCollectionBadgeId === badge.id ? 'Nogmaals indrukken om groot te bekijken.' : 'Indrukken om te selecteren.'}` : `${badge.name}, nog niet verzameld`}
                          disabled={count <= 0}
                        >
                          <div className="badge-recess">
                            {count > 0
                              ? <BadgeArtwork badge={badge} count={count} />
                              : <img className="badge-empty-frame" src={assetPath(rarity.frame)} alt="" aria-hidden="true" />}
                          </div>
                          <div className="badge-nameplate">
                            <strong>{badge.name}</strong>
                            <span>{count ? `${badge.rarityName} · ×${count}` : 'Nog niet verzameld'}</span>
                            {selectedCollectionBadgeId === badge.id && <em>Nogmaals tikken om te bekijken</em>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>
          );
        })}
      </div>

      {viewerBadge && viewerRarity && viewerCount > 0 && createPortal(
        <div className="badge-viewer-modal" role="dialog" aria-modal="true" aria-label={`${viewerBadge.name} bekijken`} onClick={closeBadgeViewer}>
          <section className={`badge-viewer-shell rarity-${viewerBadge.rarity}`} onClick={event => event.stopPropagation()}>
            <button type="button" className="badge-viewer-close" onClick={closeBadgeViewer} aria-label="Badgeviewer sluiten">×</button>

            <button
              type="button"
              className="badge-flip-stage"
              onClick={() => setViewerFlipped(current => !current)}
              aria-label={`${viewerBadge.name} omdraaien. Nu wordt de ${viewerFlipped ? 'achterkant' : 'voorkant'} getoond.`}
            >
              <span className={`badge-flip-card${viewerFlipped ? ' is-flipped' : ''}`}>
                <span className="badge-flip-face badge-flip-front">
                  <img src={assetPath(viewerBadge.image)} alt={`Voorkant van ${viewerBadge.name}`} />
                </span>
                <span className="badge-flip-face badge-flip-back">
                  <img src={assetPath(viewerRarity.frame)} alt="" aria-hidden="true" />
                  <span className="badge-back-fact">
                    <strong>Wist je dat?</strong>
                    <span>{viewerFact}</span>
                  </span>
                </span>
              </span>
            </button>

            <p className="badge-viewer-hint">{viewerBadge.rarityName} · ×{viewerCount} <span>·</span> Tik om te draaien</p>
          </section>
        </div>,
        document.body
      )}

      {tradeOfferIndex !== null && createPortal(
        <div className="badge-market-modal" role="dialog" aria-modal="true" aria-label="Kies een badge om te ruilen" onClick={() => onChooseTrade(null)}>
          <div className="badge-market-dialog" onClick={event => event.stopPropagation()}>
            <button className="badge-dialog-close" type="button" onClick={() => onChooseTrade(null)} aria-label="Sluiten">×</button>
            <span className="portal-section-kicker">Ruil met Miguel</span>
            <h2>Kies jouw badge</h2>
            <p>Je ontvangt <strong>{offeredBadge?.name}</strong>. Miguel accepteert iedere andere badge.</p>
            <div className="badge-choice-grid">
              {sellableBadges.map(badge => (
                <button key={badge.id} type="button" className="badge-choice" disabled={badge.id === offeredBadge?.id} onClick={() => onTrade(badge.id)}>
                  <BadgeArtwork badge={badge} count={ownedBadges[badge.id]} compact />
                  <strong>{badge.name}</strong><span>{ownedBadges[badge.id] === 1 ? 'Enige exemplaar' : `${ownedBadges[badge.id]} exemplaren`}</span>
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {sellOpen && createPortal(
        <div className="badge-market-modal" role="dialog" aria-modal="true" aria-label="Verkoop badges aan Miguel" onClick={onCloseSell}>
          <div className="badge-market-dialog" onClick={event => event.stopPropagation()}>
            <button className="badge-dialog-close" type="button" onClick={onCloseSell} aria-label="Sluiten">×</button>
            <span className="portal-section-kicker">Miguel koopt badges</span>
            <h2>Verkoop een badge</h2>
            <p>Iedere badge levert <strong>{BADGE_SELL_VALUE} Coco Coins</strong> op. Bij je laatste exemplaar waarschuwt Miguel je eerst.</p>
            {sellableBadges.length ? <div className="badge-choice-grid">
              {sellableBadges.map(badge => (
                <button key={badge.id} type="button" className="badge-choice" onClick={() => onSell(badge.id)}>
                  <BadgeArtwork badge={badge} count={ownedBadges[badge.id]} compact />
                  <strong>{badge.name}</strong><span>×{ownedBadges[badge.id]} · verkoop voor {BADGE_SELL_VALUE}</span>
                </button>
              ))}
            </div> : <div className="empty-badge-message">Je hebt nog geen badge om te verkopen.</div>}
          </div>
        </div>,
        document.body
      )}

      {openedPack && createPortal(
        <div className="badge-market-modal badge-pack-reveal" role="dialog" aria-modal="true" aria-label="Nieuwe badges" onClick={onClosePack}>
          <div className="badge-market-dialog" onClick={event => event.stopPropagation()}>
            <span className="portal-section-kicker">Pakje geopend</span>
            <h2>Dit zijn jouw nieuwe badges!</h2>
            <div className="opened-badges">
              {openedPack.map((badge, index) => (
                <div key={badge.id} style={{ '--reveal-delay': `${index * 180}ms` }}>
                  <BadgeArtwork badge={badge} /><strong>{badge.name}</strong><span>{badge.rarityName} · {badge.parkName}</span>
                </div>
              ))}
            </div>
            <button type="button" className="btn primary full" onClick={onClosePack}>Voeg toe aan mijn collectie</button>
          </div>
        </div>,
        document.body
      )}

      {achievementCelebration && createPortal(
        <div className="badge-market-modal achievement-celebration" role="dialog" aria-modal="true" aria-label="Prestatiebadge ontgrendeld">
          <div className={`badge-market-dialog achievement-celebration-dialog achievement-${achievementCelebration.rarity}`}>
            <span className="achievement-spotlight" aria-hidden="true" />
            <span className="portal-section-kicker">Nieuwe prestatiebadge</span>
            <h2>{achievementCelebration.name}</h2>
            <AchievementBadgeArtwork achievement={achievementCelebration} unlocked />
            <p>{achievementCelebration.subtitle}</p>
            <strong className="achievement-reward">{achievementCelebration.reward}</strong>
            <button type="button" className="btn primary full" onClick={onCloseAchievement}>Plaats in mijn Eregalerij</button>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}

const readJsonStorage = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
};

// Helper for fuzzy string matching (synonyms and spelling typos)
const norm = (str) => {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9]/g, ""); // remove spaces/punctuation
};

const match = (val, targets) => {
  const a = norm(val);
  if (!a) return false;
  return targets.some(t => {
    const b = norm(t);
    if (!b) return false;
    return a === b || (a.length >= 4 && (a.includes(b) || b.includes(a)));
  });
};

const removeBg = (e) => {
  const img = e.target;
  if (!img || img.dataset.processed) return;
  img.dataset.processed = "true";
  
  const canvas = document.createElement('canvas');
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  canvas.width = w;
  canvas.height = h;
  if (!w || !h) return;
  
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  
  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    
    const queue = [];
    const visited = new Uint8Array(w * h);
    
    const isWhite = (x, y) => {
      const idx = (y * w + x) * 4;
      return data[idx] > 220 && data[idx + 1] > 220 && data[idx + 2] > 220;
    };
    
    for (let x = 0; x < w; x++) {
      if (isWhite(x, 0)) { queue.push(x, 0); visited[x] = 1; }
      if (isWhite(x, h - 1)) { queue.push(x, h - 1); visited[(h - 1) * w + x] = 1; }
    }
    for (let y = 0; y < h; y++) {
      if (isWhite(0, y)) { queue.push(0, y); visited[y * w] = 1; }
      if (isWhite(w - 1, y)) { queue.push(w - 1, y); visited[y * w + w - 1] = 1; }
    }
    
    let head = 0;
    while (head < queue.length) {
      const cx = queue[head++];
      const cy = queue[head++];
      
      const idx = (cy * w + cx) * 4;
      data[idx + 3] = 0;
      
      const neighbors = [
        [cx + 1, cy],
        [cx - 1, cy],
        [cx, cy + 1],
        [cx, cy - 1]
      ];
      
      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const nidx = ny * w + nx;
          if (!visited[nidx] && isWhite(nx, ny)) {
            visited[nidx] = 1;
            queue.push(nx, ny);
          }
        }
      }
    }
    
    let minX = w, minY = h, maxX = 0, maxY = 0;
    let found = false;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const alpha = data[(y * w + x) * 4 + 3];
        if (alpha > 0) {
          found = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    
    ctx.putImageData(imgData, 0, 0);
    
    if (found) {
      const cropW = maxX - minX + 1;
      const cropH = maxY - minY + 1;
      if (cropW > 0 && cropH > 0 && (cropW < w || cropH < h)) {
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = cropW;
        cropCanvas.height = cropH;
        const cropCtx = cropCanvas.getContext('2d');
        cropCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
        img.src = cropCanvas.toDataURL();
        return;
      }
    }
    img.src = canvas.toDataURL();
  } catch (err) {
    console.error("Canvas background removal failed:", err);
  }
};

// Helper to check mastermind guess against code
const checkGuess = (guess, code) => {
  let black = 0;
  let white = 0;
  const guessUsed = Array(guess.length).fill(false);
  const codeUsed = Array(code.length).fill(false);

  // First pass: check for black pegs (correct color and position)
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === code[i]) {
      black++;
      guessUsed[i] = true;
      codeUsed[i] = true;
    }
  }

  // Second pass: check for white pegs (correct color, wrong position)
  for (let i = 0; i < guess.length; i++) {
    if (!guessUsed[i]) {
      for (let j = 0; j < code.length; j++) {
        if (!codeUsed[j] && guess[i] === code[j]) {
          white++;
          codeUsed[j] = true;
          break;
        }
      }
    }
  }

  return { black, white };
};

// Helper to calculate score rating
const getMmRating = (turns, codeLength, maxTurns) => {
  let goedMax = 5;
  let gemMax = 8;
  if (codeLength === 4) {
    goedMax = 4;
    gemMax = 6;
  } else if (codeLength === 5) {
    goedMax = 6;
    gemMax = 9;
  } else if (codeLength === 6) {
    goedMax = 7;
    gemMax = 10;
  }

  if (maxTurns < gemMax) {
    gemMax = maxTurns - 1;
    goedMax = Math.min(goedMax, Math.floor(gemMax / 2) + 1);
  }

  if (turns <= goedMax) return { label: "Goed", points: 3 };
  if (turns <= gemMax) return { label: "Gemiddeld", points: 2 };
  return { label: "Matig", points: 1 };
};

const EMOJIS_6X6 = ["👑", "🍎", "🦁", "❄️", "🌹", "🧞‍♂️"];
const EMOJIS_9X9 = ["👑", "🍎", "🦁", "❄️", "🌹", "🧞‍♂️", "🐚", "🚀", "🔮"];

const SUDOKU_6X6_TEMPLATES = [
  {
    solution: [
      [1, 2, 3, 4, 5, 6],
      [4, 5, 6, 1, 2, 3],
      [2, 3, 4, 5, 6, 1],
      [5, 6, 1, 2, 3, 4],
      [3, 4, 5, 6, 1, 2],
      [6, 1, 2, 3, 4, 5]
    ],
    clues: [
      [1, 0, 3, 0, 5, 0],
      [0, 5, 0, 1, 0, 3],
      [2, 0, 4, 0, 6, 0],
      [0, 6, 0, 2, 0, 4],
      [3, 0, 5, 0, 1, 0],
      [0, 1, 0, 3, 0, 5]
    ]
  },
  {
    solution: [
      [5, 6, 1, 2, 3, 4],
      [2, 3, 4, 5, 6, 1],
      [6, 1, 2, 3, 4, 5],
      [3, 4, 5, 6, 1, 2],
      [1, 2, 3, 4, 5, 6],
      [4, 5, 6, 1, 2, 3]
    ],
    clues: [
      [0, 6, 0, 2, 0, 0],
      [2, 0, 0, 0, 6, 1],
      [0, 1, 2, 0, 4, 0],
      [3, 0, 5, 0, 0, 2],
      [0, 0, 3, 4, 0, 6],
      [4, 5, 0, 0, 2, 0]
    ]
  }
];

const SUDOKU_9X9_TEMPLATES = [
  {
    solution: [
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
      [4, 5, 6, 7, 8, 9, 1, 2, 3],
      [7, 8, 9, 1, 2, 3, 4, 5, 6],
      [2, 3, 1, 5, 6, 4, 8, 9, 7],
      [5, 6, 4, 8, 9, 7, 2, 3, 1],
      [8, 9, 7, 2, 3, 1, 5, 6, 4],
      [3, 1, 2, 6, 4, 5, 9, 7, 8],
      [6, 4, 5, 9, 7, 8, 3, 1, 2],
      [9, 7, 8, 3, 1, 2, 6, 4, 5]
    ],
    clues: [
      [1, 0, 0, 4, 0, 0, 7, 0, 0],
      [0, 5, 0, 0, 8, 0, 0, 2, 0],
      [0, 0, 9, 0, 0, 3, 0, 0, 6],
      [2, 0, 0, 5, 0, 0, 8, 0, 0],
      [0, 6, 0, 0, 9, 0, 0, 3, 0],
      [0, 0, 7, 0, 0, 1, 0, 0, 4],
      [3, 0, 0, 6, 0, 0, 9, 0, 0],
      [0, 4, 0, 0, 7, 0, 0, 1, 0],
      [0, 0, 8, 0, 0, 2, 0, 0, 5]
    ]
  },
  {
    solution: [
      [5, 3, 4, 6, 7, 8, 9, 1, 2],
      [6, 7, 2, 1, 9, 5, 3, 4, 8],
      [1, 9, 8, 3, 4, 2, 5, 6, 7],
      [8, 5, 9, 7, 6, 1, 4, 2, 3],
      [4, 2, 6, 8, 5, 3, 7, 9, 1],
      [7, 1, 3, 9, 2, 4, 8, 5, 6],
      [9, 6, 1, 5, 3, 7, 2, 8, 4],
      [2, 8, 7, 4, 1, 9, 6, 3, 5],
      [3, 4, 5, 2, 8, 6, 1, 7, 9]
    ],
    clues: [
      [5, 3, 0, 0, 7, 0, 0, 0, 0],
      [6, 0, 0, 1, 9, 5, 0, 0, 0],
      [0, 9, 8, 0, 0, 0, 0, 6, 0],
      [8, 0, 0, 0, 6, 0, 0, 0, 3],
      [4, 0, 0, 8, 0, 3, 0, 0, 1],
      [7, 0, 0, 0, 2, 0, 0, 0, 6],
      [0, 6, 0, 0, 0, 0, 2, 8, 0],
      [0, 0, 0, 4, 1, 9, 0, 0, 5],
      [0, 0, 0, 0, 8, 0, 0, 7, 9]
    ]
  }
];

const getCellBorderStyles = (r, c, size, isSelected, hasError) => {
  const baseBorder = isSelected 
    ? '2.5px solid var(--gold)' 
    : hasError 
      ? '1.5px solid var(--danger)' 
      : '1px solid var(--line)';

  const styles = {
    borderTop: baseBorder,
    borderLeft: baseBorder,
    borderRight: baseBorder,
    borderBottom: baseBorder
  };

  const goldBorder = '3.5px solid var(--gold)';

  if (size === 6) {
    if (c === 2) styles.borderRight = goldBorder;
    if (r === 1 || r === 3) styles.borderBottom = goldBorder;
  } else if (size === 9) {
    if (c === 2 || c === 5) styles.borderRight = goldBorder;
    if (r === 2 || r === 5) styles.borderBottom = goldBorder;
  }
  return styles;
};

function GameZoomContainer({ children, maxHeight = '560px', aspectRatio = '3 / 4', maxWidth = '100%', resetKey, toolbarContent, footerContent, fluid = false, fitContent = true, label = 'Speelveld' }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [fitScale, setFitScale] = useState(1);
  const viewportRef = useRef(null);
  const contentRef = useRef(null);
  const contentMetricsRef = useRef({ width: 0, height: 0 });
  const touchRef = useRef(null);
  const mouseRef = useRef(null);
  const suppressClickRef = useRef(false);

  const clampZoom = (value) => Math.min(2.5, Math.max(1, value));

  const clampPan = (p, currentZoom = zoom) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect || currentZoom <= 1) return { x: 0, y: 0 };
    const metrics = contentMetricsRef.current;
    const baseScale = fitContent ? fitScale : 1;
    const scaledWidth = (metrics.width || rect.width) * baseScale * currentZoom;
    const scaledHeight = (metrics.height || rect.height) * baseScale * currentZoom;
    const maxX = Math.max(18, (scaledWidth - rect.width) / 2 + 18);
    const maxY = Math.max(18, (scaledHeight - rect.height) / 2 + 18);
    return {
      x: Math.min(maxX, Math.max(-maxX, p.x)),
      y: Math.min(maxY, Math.max(-maxY, p.y))
    };
  };

  const applyZoom = (value) => {
    const nextZoom = clampZoom(value);
    setZoom(nextZoom);
    setPan(prev => nextZoom <= 1 ? { x: 0, y: 0 } : clampPan(prev, nextZoom));
  };

  const getLocalTouchDistance = (touches) => {
    const [a, b] = touches;
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      touchRef.current = {
        mode: 'pinch',
        distance: getLocalTouchDistance(e.touches),
        zoom,
        pan
      };
      return;
    }
    if (e.touches.length === 1 && zoom > 1) {
      const touch = e.touches[0];
      touchRef.current = {
        mode: 'pan',
        startX: touch.clientX,
        startY: touch.clientY,
        pan,
        moved: false
      };
    }
  };

  const handleTouchMove = (e) => {
    const gesture = touchRef.current;
    if (!gesture) return;

    if (e.touches.length === 2 && gesture.mode === 'pinch') {
      e.preventDefault();
      const nextZoom = clampZoom(gesture.zoom * (getLocalTouchDistance(e.touches) / gesture.distance));
      setZoom(nextZoom);
      setPan(nextZoom <= 1 ? { x: 0, y: 0 } : clampPan(gesture.pan, nextZoom));
      return;
    }

    if (e.touches.length !== 1 || gesture.mode !== 'pan') return;
    const touch = e.touches[0];
    const dx = touch.clientX - gesture.startX;
    const dy = touch.clientY - gesture.startY;
    if (!gesture.moved && Math.abs(dx) + Math.abs(dy) > 6) {
      gesture.moved = true;
      suppressClickRef.current = true;
    }
    if (!gesture.moved) return;
    e.preventDefault();
    setPan(clampPan({ x: gesture.pan.x + dx, y: gesture.pan.y + dy }, zoom));
  };

  const handleTouchEnd = () => {
    const wasMoved = touchRef.current?.moved;
    touchRef.current = null;
    setPan(prev => clampPan(prev, zoom));
    if (wasMoved) {
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 250);
    }
  };

  const handleMouseDown = (e) => {
    if (zoom <= 1 || e.button !== 0) return;
    mouseRef.current = { startX: e.clientX, startY: e.clientY, pan, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handleMouseMove = (e) => {
    const gesture = mouseRef.current;
    if (!gesture) return;
    const dx = e.clientX - gesture.startX;
    const dy = e.clientY - gesture.startY;
    if (!gesture.moved && Math.abs(dx) + Math.abs(dy) > 5) {
      gesture.moved = true;
      suppressClickRef.current = true;
    }
    setPan(clampPan({ x: gesture.pan.x + dx, y: gesture.pan.y + dy }, zoom));
  };

  const handleMouseUp = (e) => {
    const moved = mouseRef.current?.moved;
    mouseRef.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    if (moved) window.setTimeout(() => { suppressClickRef.current = false; }, 220);
  };

  useEffect(() => {
    if (!fitContent || !viewportRef.current || !contentRef.current) return undefined;
    let frameId = null;
    const measure = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const viewport = viewportRef.current;
        const content = contentRef.current;
        if (!viewport || !content) return;
        const availableWidth = Math.max(1, viewport.clientWidth - 12);
        const availableHeight = Math.max(1, viewport.clientHeight - 12);
        const contentWidth = Math.max(1, content.scrollWidth);
        const contentHeight = Math.max(1, content.scrollHeight);
        contentMetricsRef.current = { width: contentWidth, height: contentHeight };
        setFitScale(Math.min(1, availableWidth / contentWidth, availableHeight / contentHeight));
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(viewportRef.current);
    observer.observe(contentRef.current);
    measure();
    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [fitContent, resetKey]);

  useEffect(() => {
    const keepInView = () => {
      setPan(prev => clampPan(prev, zoom));
    };
    keepInView();
    window.addEventListener('resize', keepInView);
    return () => window.removeEventListener('resize', keepInView);
  }, [zoom]);

  useEffect(() => {
    touchRef.current = null;
    mouseRef.current = null;
    suppressClickRef.current = false;
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [resetKey]);

  if (fluid) {
    return (
      <div className="game-fluid-container">
        {toolbarContent && <div className="game-fluid-toolbar">{toolbarContent}</div>}
        {children}
        {footerContent && <div className="game-fluid-footer">{footerContent}</div>}
      </div>
    );
  }

  return (
    <div className="arena-zoom-shell">
      <div className="arena-zoom-toolbar">
        <div className="arena-zoom-toolbar-copy">
          {toolbarContent || <strong>{label}</strong>}
          <small>{zoom > 1 ? 'Sleep om over het speelveld te bewegen' : '100% toont het volledige speelveld'}</small>
        </div>
        <div className="arena-zoom-controls" aria-label={`Zoom ${label}`}>
          <button type="button" onClick={() => applyZoom(+(zoom - 0.2).toFixed(2))} disabled={zoom <= 1} aria-label={`${label} verkleinen`}>−</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => applyZoom(+(zoom + 0.2).toFixed(2))} disabled={zoom >= 2.5} aria-label={`${label} vergroten`}>+</button>
        </div>
      </div>

      <div
        className="arena-zoom-viewport"
        ref={viewportRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onPointerDown={(e) => e.pointerType === 'mouse' && handleMouseDown(e)}
        onPointerMove={(e) => e.pointerType === 'mouse' && handleMouseMove(e)}
        onPointerUp={(e) => e.pointerType === 'mouse' && handleMouseUp(e)}
        onPointerCancel={(e) => e.pointerType === 'mouse' && handleMouseUp(e)}
        style={{
          width: '100%',
          maxWidth: maxWidth,
          maxHeight: maxHeight,
          aspectRatio: aspectRatio,
          overflow: 'hidden',
          margin: '0 auto',
          borderRadius: '18px',
          border: '2px solid var(--line)',
          background: '#041026',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          touchAction: zoom > 1 ? 'none' : 'pan-y',
          cursor: zoom > 1 ? 'grab' : 'default',
          boxSizing: 'border-box'
        }}
      >
        <div className="arena-zoom-centering-layer">
          <div
            ref={contentRef}
            className="arena-zoom-content"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${fitContent ? fitScale * zoom : zoom})`,
              height: fitContent ? 'auto' : '100%'
            }}
            onClickCapture={(e) => {
              if (suppressClickRef.current) {
                e.stopPropagation();
                e.preventDefault();
                suppressClickRef.current = false;
              }
            }}
          >
            {children}
          </div>
        </div>
      </div>
      {footerContent && <div style={{ marginTop: '9px', textAlign: 'center' }}>{footerContent}</div>}
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState(() => new URLSearchParams(window.location.search).get('join') ? 'home' : 'portal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [localPlayer, setLocalPlayer] = useState(null);
  const [roomCodeInput, setRoomCodeInput] = useState(() => (new URLSearchParams(window.location.search).get('join') || '').toUpperCase());
  const [activeProfileName, setActiveProfileName] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('portal') !== '1' && !params.get('join')) return '';
    return localStorage.getItem(ACTIVE_PROFILE_KEY) || localStorage.getItem('disney_player_name') || '';
  });
  const [logPopupOpen, setLogPopupOpen] = useState(false);
  const [logProfileName, setLogProfileName] = useState('');
  const [openLedgerSection, setOpenLedgerSection] = useState(null);
  const [selectedPortalGame, setSelectedPortalGame] = useState(null);
  const [showPortalShop, setShowPortalShop] = useState(false);
  const [playerNameInput, setPlayerNameInput] = useState(() => localStorage.getItem(ACTIVE_PROFILE_KEY) || localStorage.getItem('disney_player_name') || '');

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [screen, showPortalShop]);

  const [setupMode, setSetupMode] = useState('mix');
  const [roundsPerPlayer, setRoundsPerPlayer] = useState(10);
  const [roadHostRole, setRoadHostRole] = useState('player');
  const [playerNames, setPlayerNames] = useState(['Speler 1', 'Speler 2', 'Speler 3', 'Speler 4']);

  // New Category setup choice checklist
  const [selectedCats, setSelectedCats] = useState(["Disney Dagboek", "Pictionary", "Inschattingsvragen", "Dilemma", "Emoji Quiz", "Wie ben ik?", "Feit of Fabel", "Quiz", "Samen"]);

  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [sound, setSound] = useState(true);
  const [starBank, setStarBank] = useState(() => readJsonStorage(COCO_BANK_KEY, readJsonStorage('disney_star_bank', {})));
  const [collections, setCollections] = useState(() => readJsonStorage('disney_collections', {}));
  const [exclusiveClaims, setExclusiveClaims] = useState(() => readJsonStorage('disney_exclusive_claims', {}));
  const [badgeCollections, setBadgeCollections] = useState(() => readJsonStorage(BADGE_COLLECTION_KEY, {}));
  const [badgeAchievements, setBadgeAchievements] = useState(() => readJsonStorage(BADGE_ACHIEVEMENT_KEY, {}));
  const [badgeShowcaseSeedVersion, setBadgeShowcaseSeedVersion] = useState(0);
  const [achievementQueue, setAchievementQueue] = useState([]);
  const [badgeMarket, setBadgeMarket] = useState(() => {
    const saved = readJsonStorage(BADGE_MARKET_KEY, null);
    return saved?.hour === getMarketHour() && Array.isArray(saved.offers) && saved.offers.length === 3
      ? saved
      : createHourlyBadgeMarket();
  });
  const [badgeMarketNow, setBadgeMarketNow] = useState(() => Date.now());
  const [marketTradeOfferIndex, setMarketTradeOfferIndex] = useState(null);
  const [badgeSellOpen, setBadgeSellOpen] = useState(false);
  const [openedBadgePack, setOpenedBadgePack] = useState(null);
  const [shopPlayerName, setShopPlayerName] = useState(() => localStorage.getItem('disney_player_name') || 'Speler 1');
  const [cocoProfiles, setCocoProfiles] = useState(() => {
    const saved = readJsonStorage(COCO_PROFILES_KEY, []);
    const legacyName = localStorage.getItem('disney_player_name');
    const savedProfiles = Array.isArray(saved) ? saved : [];
    const names = savedProfiles.length
      ? [legacyName, ...savedProfiles].filter(Boolean)
      : [legacyName].filter(Boolean);
    const seen = new Set();
    return names
      .map(name => String(name).trim())
      .filter(name => {
        const key = norm(name);
        if (!name || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 12);
  });
  const [profilePreferences, setProfilePreferences] = useState(() => readJsonStorage(PROFILE_PREFERENCES_KEY, {}));
  const [profileRewardReceipts, setProfileRewardReceipts] = useState({});
  const [profileSetupOpen, setProfileSetupOpen] = useState(false);
  const [profileDraftAvatar, setProfileDraftAvatar] = useState('miguel');
  const [profileDraftColor, setProfileDraftColor] = useState('blue');
  const [newShopPlayerName, setNewShopPlayerName] = useState('');
  const [startupProfileName, setStartupProfileName] = useState('');
  const [donationTargetName, setDonationTargetName] = useState('');
  const [donationAmount, setDonationAmount] = useState('');
  const [selectedCollectionItem, setSelectedCollectionItem] = useState(null);
  const [selectedCollectionFlipped, setSelectedCollectionFlipped] = useState(false);
  const [coinPopupOpen, setCoinPopupOpen] = useState(false);
  const [coinFlipped, setCoinFlipped] = useState(false);
  const [cocoProfilesReady, setCocoProfilesReady] = useState(false);
  const cocoProfileStoreIdRef = useRef(null);
  const [aiLevel, setAiLevel] = useState(() => localStorage.getItem('disney_ai_level') || 'normal');
  const [piratesDifficulty, setPiratesDifficulty] = useState(() => localStorage.getItem('disney_pirates_difficulty') || 'normal');

  // Solo mode states and history
  const [soloHistory, setSoloHistory] = useState(() => JSON.parse(localStorage.getItem('disney_solo_history') || '[]'));
  const [captainsLogs, setCaptainsLogs] = useState(() => readJsonStorage('disney_captains_log', {}));
  const soloLoggedRef = useRef(false);

  // Arcade Arena states
  const [selectedArcadeGame, setSelectedArcadeGame] = useState(null);
  const [arcadePlayMode, setArcadePlayMode] = useState(null); // 'solo' or 'duel'
  const [arcadeOptionsOpen, setArcadeOptionsOpen] = useState(false);
  const [arcadeLobbyCode, setArcadeLobbyCode] = useState('');
  const [arenaToolbar, setArenaToolbar] = useState(null);
  const [arenaSaves, setArenaSaves] = useState(() => readJsonStorage(ARENA_SAVES_KEY, {}));

  const isRoomHost = () => {
    const facilitatorId = room?.current_task_state?.facilitator?.id;
    return facilitatorId ? facilitatorId === localPlayer?.id : players[0]?.id === localPlayer?.id;
  };

  const isFacilitatorHost = () => room?.current_task_state?.facilitator?.id === localPlayer?.id;

  useEffect(() => {
    if (room?.status !== 'playing' || !room?.game_mode?.startsWith('arcade-') || !activeProfileName) return undefined;
    const gameId = room.game_mode.replace('arcade-', '');
    const saveKey = `${getCollectorKey(activeProfileName)}:${gameId}`;
    setArenaSaves(current => {
      const nextSaves = { ...current, [saveKey]: { gameId, room, players, localPlayer, savedAt: new Date().toISOString(), version: 2 } };
      localStorage.setItem(ARENA_SAVES_KEY, JSON.stringify(nextSaves));
      return nextSaves;
    });
    return undefined;
  }, [activeProfileName, localPlayer, players, room]);

  // Sudoku states
  const [sudokuGrid, setSudokuGrid] = useState([]);
  const [sudokuSolution, setSudokuSolution] = useState([]);
  const [sudokuClues, setSudokuClues] = useState([]);
  const [sudokuSize, setSudokuSize] = useState(6);
  const [sudokuSelectedCell, setSudokuSelectedCell] = useState(null);
  const [sudokuStartTime, setSudokuStartTime] = useState(0);
  const [sudokuErrors, setSudokuErrors] = useState([]);
  const [sudokuSolved, setSudokuSolved] = useState(false);
  const [sudokuSolvedStats, setSudokuSolvedStats] = useState(null);
  const [sudokuHintsUsed, setSudokuHintsUsed] = useState(0);
  const [sudokuZoom, setSudokuZoom] = useState(1);
  const [sudokuPan, setSudokuPan] = useState({ x: 0, y: 0 });
  const sudokuViewportRef = useRef(null);
  const sudokuTouchRef = useRef(null);
  const sudokuSuppressClickRef = useRef(false);

  const checkSudokuConflicts = (grid, size) => {
    const conflicts = [];
    const blockRSize = size === 6 ? 2 : 3;
    const blockCSize = 3;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const val = grid[r]?.[c];
        if (!val) continue;

        for (let c2 = 0; c2 < size; c2++) {
          if (c !== c2 && grid[r]?.[c2] === val) {
            conflicts.push({ r, c });
          }
        }

        for (let r2 = 0; r2 < size; r2++) {
          if (r !== r2 && grid[r2]?.[c] === val) {
            conflicts.push({ r, c });
          }
        }

        const startR = Math.floor(r / blockRSize) * blockRSize;
        const startC = Math.floor(c / blockCSize) * blockCSize;

        for (let br = startR; br < startR + blockRSize; br++) {
          for (let bc = startC; bc < startC + blockCSize; bc++) {
            if ((br !== r || bc !== c) && grid[br]?.[bc] === val) {
              conflicts.push({ r, c });
            }
          }
        }
      }
    }
    return conflicts;
  };

  const shuffleArray = (items) => [...items].sort(() => Math.random() - 0.5);

  const getSudokuBlockShape = (size) => size === 6
    ? { blockRows: 2, blockCols: 3 }
    : { blockRows: 3, blockCols: 3 };

  const makeSolvedSudokuNumbers = (size) => {
    const { blockRows, blockCols } = getSudokuBlockShape(size);
    const rowBands = shuffleArray(Array.from({ length: size / blockRows }, (_, i) => i));
    const colBands = shuffleArray(Array.from({ length: size / blockCols }, (_, i) => i));
    const rows = rowBands.flatMap(band => shuffleArray(Array.from({ length: blockRows }, (_, i) => band * blockRows + i)));
    const cols = colBands.flatMap(band => shuffleArray(Array.from({ length: blockCols }, (_, i) => band * blockCols + i)));
    const nums = shuffleArray(Array.from({ length: size }, (_, i) => i + 1));
    const pattern = (r, c) => (blockCols * (r % blockRows) + Math.floor(r / blockRows) + c) % size;
    return rows.map(r => cols.map(c => nums[pattern(r, c)]));
  };

  const getSudokuCandidates = (puzzle, size, row, col) => {
    if (puzzle[row][col]) return [];
    const { blockRows, blockCols } = getSudokuBlockShape(size);
    const used = new Set();
    for (let i = 0; i < size; i++) {
      if (puzzle[row][i]) used.add(puzzle[row][i]);
      if (puzzle[i][col]) used.add(puzzle[i][col]);
    }
    const startR = Math.floor(row / blockRows) * blockRows;
    const startC = Math.floor(col / blockCols) * blockCols;
    for (let r = startR; r < startR + blockRows; r++) {
      for (let c = startC; c < startC + blockCols; c++) {
        if (puzzle[r][c]) used.add(puzzle[r][c]);
      }
    }
    return shuffleArray(Array.from({ length: size }, (_, i) => i + 1).filter(value => !used.has(value)));
  };

  const countSudokuSolutions = (puzzle, size, limit = 2) => {
    const board = puzzle.map(row => [...row]);
    let count = 0;

    const solve = () => {
      if (count >= limit) return;
      let bestCell = null;
      let bestCandidates = null;

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (board[r][c]) continue;
          const candidates = getSudokuCandidates(board, size, r, c);
          if (candidates.length === 0) return;
          if (!bestCandidates || candidates.length < bestCandidates.length) {
            bestCell = { r, c };
            bestCandidates = candidates;
            if (candidates.length === 1) break;
          }
        }
        if (bestCandidates?.length === 1) break;
      }

      if (!bestCell) {
        count++;
        return;
      }

      for (const value of bestCandidates) {
        board[bestCell.r][bestCell.c] = value;
        solve();
        board[bestCell.r][bestCell.c] = 0;
        if (count >= limit) return;
      }
    };

    solve();
    return count;
  };

  const makeUniqueSudokuPuzzle = (solution, size) => {
    const puzzle = solution.map(row => [...row]);
    const minClues = size === 6 ? 16 : 32;
    let clues = size * size;
    const positions = shuffleArray(Array.from({ length: size * size }, (_, idx) => ({
      r: Math.floor(idx / size),
      c: idx % size
    })));

    for (const { r, c } of positions) {
      if (clues <= minClues) break;
      const oldValue = puzzle[r][c];
      puzzle[r][c] = 0;
      if (countSudokuSolutions(puzzle, size, 2) === 1) {
        clues--;
      } else {
        puzzle[r][c] = oldValue;
      }
    }
    return puzzle;
  };

  const generateSudoku = (size) => {
    const emojis = size === 6 ? EMOJIS_6X6 : EMOJIS_9X9;
    const solutionNumbers = makeSolvedSudokuNumbers(size);
    const puzzleNumbers = makeUniqueSudokuPuzzle(solutionNumbers, size);
    const shuffledEmojis = shuffleArray(emojis);
    const mapping = Object.fromEntries(shuffledEmojis.map((emoji, index) => [index + 1, emoji]));
    const newSolution = solutionNumbers.map(row => row.map(value => mapping[value]));
    const newGrid = puzzleNumbers.map(row => row.map(value => value ? mapping[value] : null));
    const newClues = puzzleNumbers.map(row => row.map(value => value !== 0));

    setSudokuGrid(newGrid);
    setSudokuSolution(newSolution);
    setSudokuClues(newClues);
    setSudokuSize(size);
    setSudokuSelectedCell(null);
    setSudokuStartTime(Date.now());
    setSudokuErrors([]);
    setSudokuSolved(false);
    setSudokuSolvedStats(null);
    setSudokuHintsUsed(0);
    setSudokuZoom(1);
    setSudokuPan({ x: 0, y: 0 });
  };

  const isSudokuSolvedGrid = (grid) => (
    grid.length === sudokuSolution.length
    && grid.every((row, r) => row.every((cell, c) => cell && cell === sudokuSolution[r]?.[c]))
  );

  const finishSudokuIfSolved = (grid, hintsUsed = sudokuHintsUsed) => {
    const newConflicts = checkSudokuConflicts(grid, sudokuSize);
    setSudokuErrors(newConflicts);
    if (!isSudokuSolvedGrid(grid) || newConflicts.length > 0) return;

    const sec = Math.round((Date.now() - sudokuStartTime) / 1000);
    let pts = 1;
    let label = "Matig";
    if (sudokuSize === 6) {
      if (sec <= 120) { pts = 3; label = "Goed"; }
      else if (sec <= 240) { pts = 2; label = "Gemiddeld"; }
    } else {
      if (sec <= 300) { pts = 3; label = "Goed"; }
      else if (sec <= 480) { pts = 2; label = "Gemiddeld"; }
    }
    const finalPts = Math.max(0, pts - hintsUsed);
    const hintText = hintsUsed > 0 ? ` Hint gebruikt: -${hintsUsed} ster${hintsUsed === 1 ? '' : 'ren'}.` : '';
    const statsStr = `${sudokuSize === 6 ? "Tinker Bell Sudoku" : "Zazu's Sudoku"} gekraakt in ${Math.floor(sec / 60)}m ${sec % 60}s. Beoordeling: ${label}. Score: ${finalPts} ster${finalPts === 1 ? '' : 'ren'}.${hintText}`;
    setSudokuSolved(true);
    setSudokuSolvedStats(statsStr);
    addPlayerScore('solo', localPlayer, finalPts, statsStr, 'knowledge');
  };

  const handleSudokuHint = () => {
    if (sudokuSolved) return;
    const emptyCells = [];
    sudokuGrid.forEach((row, r) => row.forEach((cell, c) => {
      if (!sudokuClues[r]?.[c] && cell !== sudokuSolution[r]?.[c]) {
        emptyCells.push({ r, c });
      }
    }));
    if (!emptyCells.length) return;

    const selected = sudokuSelectedCell
      && !sudokuClues[sudokuSelectedCell.row]?.[sudokuSelectedCell.col]
      && sudokuGrid[sudokuSelectedCell.row]?.[sudokuSelectedCell.col] !== sudokuSolution[sudokuSelectedCell.row]?.[sudokuSelectedCell.col]
      ? { r: sudokuSelectedCell.row, c: sudokuSelectedCell.col }
      : emptyCells[0];

    const nextGrid = sudokuGrid.map(row => [...row]);
    const nextClues = sudokuClues.map(row => [...row]);
    nextGrid[selected.r][selected.c] = sudokuSolution[selected.r][selected.c];
    nextClues[selected.r][selected.c] = true;
    const nextHintsUsed = sudokuHintsUsed + 1;
    setSudokuGrid(nextGrid);
    setSudokuClues(nextClues);
    setSudokuSelectedCell(null);
    setSudokuHintsUsed(nextHintsUsed);
    finishSudokuIfSolved(nextGrid, nextHintsUsed);
  };

  const getTouchDistance = (touches) => {
    const [a, b] = touches;
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  };

  const clampSudokuZoom = (value) => Math.min(2.4, Math.max(1, value));

  const clampSudokuPan = (pan, zoom = sudokuZoom) => {
    const rect = sudokuViewportRef.current?.getBoundingClientRect();
    if (!rect) return pan;

    const basePanAllowance = 22;
    const maxX = basePanAllowance + Math.max(0, (rect.width * (zoom - 1)) / 2);
    const maxY = basePanAllowance + Math.max(0, (rect.height * (zoom - 1)) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, pan.x)),
      y: Math.min(maxY, Math.max(-maxY, pan.y))
    };
  };

  const applySudokuZoom = (value) => {
    const nextZoom = clampSudokuZoom(value);
    setSudokuZoom(nextZoom);
    setSudokuPan(prev => nextZoom <= 1 ? { x: 0, y: 0 } : clampSudokuPan(prev, nextZoom));
  };

  const handleSudokuTouchStart = (e) => {
    if (e.touches.length === 2) {
      sudokuTouchRef.current = {
        mode: 'pinch',
        distance: getTouchDistance(e.touches),
        zoom: sudokuZoom,
        pan: sudokuPan
      };
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      sudokuTouchRef.current = {
        mode: 'pan',
        startX: touch.clientX,
        startY: touch.clientY,
        pan: sudokuPan,
        moved: false
      };
    }
  };

  const handleSudokuTouchMove = (e) => {
    const gesture = sudokuTouchRef.current;
    if (!gesture) return;

    if (e.touches.length === 2 && gesture.mode === 'pinch') {
      e.preventDefault();
      const nextZoom = clampSudokuZoom(gesture.zoom * (getTouchDistance(e.touches) / gesture.distance));
      setSudokuZoom(nextZoom);
      setSudokuPan(nextZoom <= 1 ? { x: 0, y: 0 } : clampSudokuPan(gesture.pan, nextZoom));
      return;
    }

    if (e.touches.length !== 1 || gesture.mode !== 'pan') return;
    e.preventDefault();
    const touch = e.touches[0];
    const dx = touch.clientX - gesture.startX;
    const dy = touch.clientY - gesture.startY;
    if (Math.abs(dx) + Math.abs(dy) > 6) {
      gesture.moved = true;
      sudokuSuppressClickRef.current = true;
    }
    setSudokuPan(clampSudokuPan({ x: gesture.pan.x + dx, y: gesture.pan.y + dy }, sudokuZoom));
  };

  const handleSudokuTouchEnd = () => {
    const wasMoved = sudokuTouchRef.current?.moved;
    sudokuTouchRef.current = null;
    setSudokuPan(prev => clampSudokuPan(prev, sudokuZoom));
    if (wasMoved) {
      window.setTimeout(() => {
        sudokuSuppressClickRef.current = false;
      }, 250);
    }
  };

  useEffect(() => {
    const keepSudokuInView = () => {
      setSudokuPan(prev => clampSudokuPan(prev, sudokuZoom));
    };
    keepSudokuInView();
    window.addEventListener('resize', keepSudokuInView);
    return () => window.removeEventListener('resize', keepSudokuInView);
  }, [sudokuZoom, sudokuSize]);

  const getCollectorKey = (name) => norm(name || 'speler') || 'speler';

  const createProfilePreference = (name, index = 0) => ({
    id: globalThis.crypto?.randomUUID?.() || `profile-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: String(name || '').trim(),
    avatar: DISNEY_PROFILE_AVATARS[index % DISNEY_PROFILE_AVATARS.length].id,
    color: DISNEY_PROFILE_COLORS[index % DISNEY_PROFILE_COLORS.length].id,
    theme: 'day',
    configured: false
  });

  const getProfilePreference = (name = activeProfileName) => profilePreferences[getCollectorKey(name)] || null;

  const openProfileAppearance = (name = activeProfileName) => {
    const key = getCollectorKey(name);
    const preference = profilePreferences[key] || createProfilePreference(name, cocoProfiles.findIndex(profileName => getCollectorKey(profileName) === key));
    if (!profilePreferences[key]) {
      const nextPreferences = { ...profilePreferences, [key]: preference };
      setProfilePreferences(nextPreferences);
      localStorage.setItem(PROFILE_PREFERENCES_KEY, JSON.stringify(nextPreferences));
    }
    setProfileDraftAvatar(preference.avatar || 'miguel');
    setProfileDraftColor(preference.color || 'blue');
    setProfileSetupOpen(true);
  };

  const getAvailableProfileColors = (name = activeProfileName) => {
    const currentKey = getCollectorKey(name);
    const usedByOthers = new Set(Object.entries(profilePreferences)
      .filter(([key]) => key !== currentKey)
      .map(([, preference]) => preference?.color)
      .filter(Boolean));
    if (usedByOthers.size >= DISNEY_PROFILE_COLORS.length) return DISNEY_PROFILE_COLORS;
    return DISNEY_PROFILE_COLORS.filter(color => !usedByOthers.has(color.id) || color.id === profilePreferences[currentKey]?.color);
  };

  const saveProfileAppearance = () => {
    const key = getCollectorKey(activeProfileName);
    if (!key || !activeProfileName) return;
    const current = profilePreferences[key] || createProfilePreference(activeProfileName);
    const nextPreferences = {
      ...profilePreferences,
      [key]: { ...current, name: activeProfileName, avatar: profileDraftAvatar, color: profileDraftColor, configured: true }
    };
    setProfilePreferences(nextPreferences);
    localStorage.setItem(PROFILE_PREFERENCES_KEY, JSON.stringify(nextPreferences));
    setProfileSetupOpen(false);
  };

  const uniqueProfileNames = (names) => {
    const seen = new Set();
    return names
      .filter(Boolean)
      .map(name => String(name).trim())
      .filter(name => {
        const key = getCollectorKey(name);
        if (!name || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 12);
  };

  const persistCocoProfiles = (names) => {
    const next = uniqueProfileNames(names);
    setCocoProfiles(next);
    localStorage.setItem(COCO_PROFILES_KEY, JSON.stringify(next));
    return next;
  };

  const activateCocoProfile = (name) => {
    const cleanName = String(name || '').trim();
    if (!cleanName) return;
    persistCocoProfiles([...cocoProfiles, cleanName]);
    setActiveProfileName(cleanName);
    setShopPlayerName(cleanName);
    setPlayerNameInput(cleanName);
    localStorage.setItem(ACTIVE_PROFILE_KEY, cleanName);
    localStorage.setItem('disney_player_name', cleanName);
    const key = getCollectorKey(cleanName);
    const existingPreference = profilePreferences[key];
    if (!existingPreference?.configured || !existingPreference?.avatar || !existingPreference?.color) {
      const nextPreference = existingPreference || createProfilePreference(cleanName, cocoProfiles.length);
      const nextPreferences = { ...profilePreferences, [key]: nextPreference };
      setProfilePreferences(nextPreferences);
      localStorage.setItem(PROFILE_PREFERENCES_KEY, JSON.stringify(nextPreferences));
      setProfileDraftAvatar(nextPreference.avatar);
      setProfileDraftColor(nextPreference.color);
      setProfileSetupOpen(true);
    }
  };

  const getDisplayShopPlayers = () => {
    return uniqueProfileNames(cocoProfiles);
  };

  useEffect(() => {
    let cancelled = false;

    const mergeCollections = (remoteCollections, localCollections) => {
      const keys = new Set([...Object.keys(remoteCollections || {}), ...Object.keys(localCollections || {})]);
      return Object.fromEntries([...keys].map(key => [
        key,
        [...new Set([...(remoteCollections?.[key] || []), ...(localCollections?.[key] || [])])]
      ]));
    };

    const mergeBank = (remoteBank, localBank) => {
      const keys = new Set([...Object.keys(remoteBank || {}), ...Object.keys(localBank || {})]);
      return Object.fromEntries([...keys].map(key => [key, Math.max(Number(remoteBank?.[key]) || 0, Number(localBank?.[key]) || 0)]));
    };

    const mergeBadgeCollections = (remoteBadges, localBadges) => {
      const profileKeys = new Set([...Object.keys(remoteBadges || {}), ...Object.keys(localBadges || {})]);
      return Object.fromEntries([...profileKeys].map(profileKey => {
        const badgeIds = new Set([
          ...Object.keys(remoteBadges?.[profileKey] || {}),
          ...Object.keys(localBadges?.[profileKey] || {})
        ]);
        return [profileKey, Object.fromEntries([...badgeIds].map(badgeId => [
          badgeId,
          Math.max(Number(remoteBadges?.[profileKey]?.[badgeId]) || 0, Number(localBadges?.[profileKey]?.[badgeId]) || 0)
        ]))];
      }));
    };

    const mergeBadgeAchievements = (remoteAchievements, localAchievements) => {
      const profileKeys = new Set([...Object.keys(remoteAchievements || {}), ...Object.keys(localAchievements || {})]);
      return Object.fromEntries([...profileKeys].map(profileKey => [
        profileKey,
        { ...(localAchievements?.[profileKey] || {}), ...(remoteAchievements?.[profileKey] || {}) }
      ]));
    };

    const mergeProfilePreferences = (remotePreferences, localPreferences, profileNames) => {
      const merged = { ...(localPreferences || {}), ...(remotePreferences || {}) };
      profileNames.forEach((profileName, index) => {
        const key = getCollectorKey(profileName);
        merged[key] = {
          ...createProfilePreference(profileName, index),
          ...(merged[key] || {}),
          name: profileName
        };
      });
      return merged;
    };

    const mergeEventLists = (remoteList = [], localList = [], signature, newestFirst = false) => {
      const seen = new Set();
      const merged = [...remoteList, ...localList]
        .filter(item => {
          const key = signature(item);
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) => {
          const difference = new Date(a.date || a.timestamp || 0) - new Date(b.date || b.timestamp || 0);
          return newestFirst ? -difference : difference;
        });
      return newestFirst ? merged.slice(0, 1500) : merged.slice(-1500);
    };

    const mergeCaptainsLogs = (remoteLogs = {}, localLogs = {}) => {
      const profileNames = new Set([...Object.keys(remoteLogs || {}), ...Object.keys(localLogs || {})]);
      return Object.fromEntries([...profileNames].map(profileName => [
        profileName,
        mergeEventLists(remoteLogs?.[profileName], localLogs?.[profileName], entry => [entry?.timestamp, entry?.amount, entry?.type, entry?.description].join('|'))
      ]));
    };

    const mergeGameHistory = (remoteHistory = [], localHistory = []) => mergeEventLists(
      remoteHistory,
      localHistory,
      item => [item?.date, item?.profileKey || item?.profileName, item?.gameType, item?.score, item?.details].join('|'),
      true
    );

    const loadSharedProfiles = async () => {
      const localProfiles = uniqueProfileNames(cocoProfiles);
      const localState = {
        coco_profiles: localProfiles,
        coco_profile_preferences: profilePreferences,
        coco_reward_receipts: profileRewardReceipts,
        coco_bank: starBank,
        coco_collections: collections,
        coco_exclusive_claims: exclusiveClaims,
        coco_badge_collections: badgeCollections,
        coco_badge_achievements: badgeAchievements,
        coco_badge_showcase_seed_version: badgeShowcaseSeedVersion,
        coco_badge_market: badgeMarket,
        coco_captains_log: captainsLogs,
        coco_game_history: soloHistory,
        coco_profile_store_version: 7,
        updated_at: new Date().toISOString()
      };

      try {
        let { data: store, error } = await supabase
          .from('rooms')
          .select('id,current_task_state')
          .eq('code', COCO_PROFILE_STORE_CODE)
          .maybeSingle();

        if (error) throw error;

        if (!store) {
          const { data: createdStore, error: createError } = await supabase
            .from('rooms')
            .insert({
              code: COCO_PROFILE_STORE_CODE,
              status: 'ended',
              game_mode: 'profile-store',
              game_version: 1,
              rounds_per_player: 0,
              total_rounds: 0,
              current_task_state: localState
            })
            .select('id,current_task_state')
            .single();

          if (createError?.code === '23505') {
            const retry = await supabase
              .from('rooms')
              .select('id,current_task_state')
              .eq('code', COCO_PROFILE_STORE_CODE)
              .maybeSingle();
            if (retry.error) throw retry.error;
            store = retry.data;
          } else if (createError) {
            throw createError;
          } else {
            store = createdStore;
          }
        }

        const remoteState = store?.current_task_state || {};
        const remoteProfiles = uniqueProfileNames(remoteState.coco_profiles || []);
        const migrateLocalState = remoteProfiles.length === 0 && localProfiles.length > 0;
        const mergedProfiles = migrateLocalState ? uniqueProfileNames([...remoteProfiles, ...localProfiles]) : remoteProfiles;
        const mergedProfilePreferences = mergeProfilePreferences(remoteState.coco_profile_preferences, profilePreferences, mergedProfiles);
        const mergedRewardReceipts = { ...profileRewardReceipts, ...(remoteState.coco_reward_receipts || {}) };
        const mergedBank = migrateLocalState ? mergeBank(remoteState.coco_bank, starBank) : (remoteState.coco_bank || {});
        const mergedCollections = migrateLocalState ? mergeCollections(remoteState.coco_collections, collections) : (remoteState.coco_collections || {});
        const mergedClaims = migrateLocalState
          ? { ...(exclusiveClaims || {}), ...(remoteState.coco_exclusive_claims || {}) }
          : (remoteState.coco_exclusive_claims || {});
        let mergedBadgeCollections = (migrateLocalState
          ? mergeBadgeCollections(remoteState.coco_badge_collections, badgeCollections)
          : remoteState.coco_badge_collections) || {};
        let mergedBadgeShowcaseSeedVersion = Number(remoteState.coco_badge_showcase_seed_version) || 0;
        if (mergedBadgeShowcaseSeedVersion < BADGE_SHOWCASE_SEED_VERSION) {
          const jaccoProfile = mergedProfiles.find(profileName => norm(profileName) === 'jacco');
          if (jaccoProfile) {
            const jaccoKey = getCollectorKey(jaccoProfile);
            const currentJaccoBadges = { ...(mergedBadgeCollections[jaccoKey] || {}) };
            Object.entries(JACCO_BADGE_SHOWCASE_COUNTS).forEach(([badgeId, count]) => {
              currentJaccoBadges[badgeId] = Math.max(Number(currentJaccoBadges[badgeId]) || 0, count);
            });
            mergedBadgeCollections = { ...mergedBadgeCollections, [jaccoKey]: currentJaccoBadges };
            mergedBadgeShowcaseSeedVersion = BADGE_SHOWCASE_SEED_VERSION;
          }
        }
        const mergedBadgeAchievements = mergeBadgeAchievements(remoteState.coco_badge_achievements, badgeAchievements);
        let mergedCaptainsLogs = mergeCaptainsLogs(remoteState.coco_captains_log, captainsLogs);
        const profileStoreVersion = Number(remoteState.coco_profile_store_version) || 0;
        if (profileStoreVersion < 7) {
          const ledgerStartedAt = new Date().toISOString();
          mergedProfiles.forEach(profileName => {
            const matchingLogName = Object.keys(mergedCaptainsLogs).find(name => getCollectorKey(name) === getCollectorKey(profileName)) || profileName;
            const existingEntries = mergedCaptainsLogs[matchingLogName] || [];
            if (existingEntries.some(entry => entry.ledgerOpening)) return;
            const openingBalance = Number(mergedBank[getCollectorKey(profileName)]) || 0;
            mergedCaptainsLogs = {
              ...mergedCaptainsLogs,
              [matchingLogName]: [...existingEntries, {
                timestamp: ledgerStartedAt,
                amount: openingBalance,
                type: 'earn',
                description: 'Saldo voor mutaties',
                balanceAfter: openingBalance,
                ledgerOpening: true
              }]
            };
          });
        }
        const mergedGameHistory = mergeGameHistory(remoteState.coco_game_history, soloHistory);
        const remoteMarket = remoteState.coco_badge_market;
        const mergedBadgeMarket = remoteMarket?.hour === getMarketHour() && Array.isArray(remoteMarket.offers) && remoteMarket.offers.length === 3
          ? remoteMarket
          : createHourlyBadgeMarket();
        const mergedState = {
          coco_profiles: mergedProfiles,
          coco_profile_preferences: mergedProfilePreferences,
          coco_reward_receipts: mergedRewardReceipts,
          coco_bank: mergedBank,
          coco_collections: mergedCollections,
          coco_exclusive_claims: mergedClaims,
          coco_badge_collections: mergedBadgeCollections,
          coco_badge_achievements: mergedBadgeAchievements,
          coco_badge_showcase_seed_version: mergedBadgeShowcaseSeedVersion,
          coco_badge_market: mergedBadgeMarket,
          coco_captains_log: mergedCaptainsLogs,
          coco_game_history: mergedGameHistory,
          coco_profile_store_version: 7,
          updated_at: new Date().toISOString()
        };

        if (!cancelled) {
          cocoProfileStoreIdRef.current = store?.id || null;
          setCocoProfiles(mergedProfiles);
          setProfilePreferences(mergedProfilePreferences);
          setProfileRewardReceipts(mergedRewardReceipts);
          setStarBank(mergedBank);
          setCollections(mergedCollections);
          setExclusiveClaims(mergedClaims);
          setBadgeCollections(mergedBadgeCollections);
          setBadgeAchievements(mergedBadgeAchievements);
          setBadgeShowcaseSeedVersion(mergedBadgeShowcaseSeedVersion);
          setBadgeMarket(mergedBadgeMarket);
          setCaptainsLogs(mergedCaptainsLogs);
          setSoloHistory(mergedGameHistory);
          localStorage.setItem(COCO_PROFILES_KEY, JSON.stringify(mergedProfiles));
          localStorage.setItem(PROFILE_PREFERENCES_KEY, JSON.stringify(mergedProfilePreferences));
          localStorage.setItem(COCO_BANK_KEY, JSON.stringify(mergedBank));
          localStorage.setItem('disney_collections', JSON.stringify(mergedCollections));
          localStorage.setItem('disney_exclusive_claims', JSON.stringify(mergedClaims));
          localStorage.setItem(BADGE_COLLECTION_KEY, JSON.stringify(mergedBadgeCollections));
          localStorage.setItem(BADGE_ACHIEVEMENT_KEY, JSON.stringify(mergedBadgeAchievements));
          localStorage.setItem(BADGE_MARKET_KEY, JSON.stringify(mergedBadgeMarket));
          localStorage.setItem('disney_captains_log', JSON.stringify(mergedCaptainsLogs));
          localStorage.setItem('disney_solo_history', JSON.stringify(mergedGameHistory));
        }

        if (store?.id) {
          await supabase.from('rooms').update({ current_task_state: mergedState }).eq('id', store.id);
        }
      } catch (syncError) {
        console.warn('Coco-profielen konden niet worden gesynchroniseerd.', syncError);
      } finally {
        if (!cancelled) setCocoProfilesReady(true);
      }
    };

    loadSharedProfiles();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!cocoProfilesReady || !cocoProfileStoreIdRef.current) return;

    const timeoutId = window.setTimeout(() => {
      supabase
        .from('rooms')
        .update({
          current_task_state: {
            coco_profiles: uniqueProfileNames(cocoProfiles),
            coco_profile_preferences: profilePreferences,
            coco_reward_receipts: profileRewardReceipts,
            coco_bank: starBank,
            coco_collections: collections,
            coco_exclusive_claims: exclusiveClaims,
            coco_badge_collections: badgeCollections,
            coco_badge_achievements: badgeAchievements,
            coco_badge_showcase_seed_version: badgeShowcaseSeedVersion,
            coco_badge_market: badgeMarket,
            coco_captains_log: captainsLogs,
            coco_game_history: soloHistory,
            coco_profile_store_version: 7,
            updated_at: new Date().toISOString()
          }
        })
        .eq('id', cocoProfileStoreIdRef.current)
        .then(({ error }) => {
          if (error) console.warn('Coco-profielen konden niet worden opgeslagen.', error);
        });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [badgeAchievements, badgeCollections, badgeMarket, badgeShowcaseSeedVersion, captainsLogs, cocoProfiles, cocoProfilesReady, collections, exclusiveClaims, profilePreferences, profileRewardReceipts, soloHistory, starBank]);

  useEffect(() => {
    const updateMarketClock = () => {
      setBadgeMarketNow(Date.now());
      setBadgeMarket(current => {
        if (current?.hour === getMarketHour()) return current;
        const next = createHourlyBadgeMarket();
        localStorage.setItem(BADGE_MARKET_KEY, JSON.stringify(next));
        return next;
      });
    };
    const intervalId = window.setInterval(updateMarketClock, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const profileKeys = new Set([
      ...Object.keys(badgeCollections || {}),
      ...Object.keys(badgeAchievements || {})
    ]);
    if (!profileKeys.size) return;

    const nextAchievements = { ...(badgeAchievements || {}) };
    const newlyUnlocked = [];
    let changed = false;

    profileKeys.forEach(profileKey => {
      const ownedBadges = badgeCollections?.[profileKey] || {};
      const profileAchievements = { ...(nextAchievements[profileKey] || {}) };

      BADGE_CATEGORY_ACHIEVEMENTS.forEach(achievement => {
        if (profileAchievements[achievement.id]) return;
        const progress = getRarityBadgeProgress(ownedBadges, achievement.rarity);
        if (progress.total > 0 && progress.owned.length === progress.total) {
          profileAchievements[achievement.id] = new Date().toISOString();
          newlyUnlocked.push({ profileKey, achievementId: achievement.id });
          changed = true;
        }
      });

      const masterAchievement = BADGE_ACHIEVEMENTS.find(achievement => achievement.ultimate);
      const allCategoriesComplete = BADGE_CATEGORY_ACHIEVEMENTS.every(achievement => profileAchievements[achievement.id]);
      if (masterAchievement && allCategoriesComplete && !profileAchievements[masterAchievement.id]) {
        profileAchievements[masterAchievement.id] = new Date().toISOString();
        newlyUnlocked.push({ profileKey, achievementId: masterAchievement.id });
        changed = true;
      }

      nextAchievements[profileKey] = profileAchievements;
    });

    const activeName = activeProfileName || shopPlayerName.trim() || playerNameInput.trim() || 'Speler 1';
    const activeKey = getCollectorKey(activeName);
    const activeUnlocks = newlyUnlocked.filter(item => item.profileKey === activeKey).map(item => item.achievementId);
    if (!changed) return;

    const unlockTimer = window.setTimeout(() => {
      setBadgeAchievements(nextAchievements);
      localStorage.setItem(BADGE_ACHIEVEMENT_KEY, JSON.stringify(nextAchievements));
      if (activeUnlocks.length) {
        setAchievementQueue(current => [...current, ...activeUnlocks.filter(id => !current.includes(id))]);
      }
    }, 0);

    return () => window.clearTimeout(unlockTimer);
  }, [activeProfileName, badgeAchievements, badgeCollections, playerNameInput, shopPlayerName]);

  useEffect(() => {
    const dagobertProfile = cocoProfiles.find(name => norm(name) === 'dagobert');
    if (!dagobertProfile) return;

    const dagobertKey = getCollectorKey(dagobertProfile);
    setStarBank(prev => {
      if ((prev[dagobertKey] || 0) >= 100) return prev;
      const next = { ...prev, [dagobertKey]: 100 };
      localStorage.setItem(COCO_BANK_KEY, JSON.stringify(next));
      return next;
    });
  }, [cocoProfiles]);

  const logCaptainMutation = (profileName, amount, type, description, balanceAfter) => {
    const currentLogs = readJsonStorage('disney_captains_log', {});
    const nextEntry = {
      timestamp: new Date().toISOString(),
      amount,
      type,
      description,
      balanceAfter
    };
    const logs = {
      ...currentLogs,
      [profileName]: [...(currentLogs[profileName] || []), nextEntry]
    };
    localStorage.setItem('disney_captains_log', JSON.stringify(logs));
    setCaptainsLogs(logs);
  };

  const getOrGenerateCaptainsLog = (profileName) => {
    const rawLogs = localStorage.getItem('disney_captains_log');
    let logs = {};
    try {
      if (rawLogs) logs = JSON.parse(rawLogs);
    } catch (e) {}

    // If we already have explicit logs for this profile, use them
    if (logs[profileName] && logs[profileName].length > 0) {
      return logs[profileName];
    }

    const key = getCollectorKey(profileName);
    
    // 1. Get collection purchases
    const collectionsRaw = localStorage.getItem('disney_collections');
    let profileCollections = [];
    try {
      if (collectionsRaw) {
        const allCollections = JSON.parse(collectionsRaw);
        profileCollections = allCollections[key] || [];
      }
    } catch (e) {}

    // 2. Get solo history
    const historyRaw = localStorage.getItem('disney_solo_history');
    let history = [];
    try {
      if (historyRaw) history = JSON.parse(historyRaw);
    } catch (e) {}

    const events = [];

    // Add solo games
    history.forEach(item => {
      const scoreVal = Number(item.score) || 0;
      let coinsEarned = 0;
      const gameTypeNorm = item.gameType || "";
      if (
        gameTypeNorm === 'Othello' || 
        gameTypeNorm === 'Rapunzel\'s Torenkamers' || 
        gameTypeNorm === 'Ricochet Shot' || 
        gameTypeNorm === 'Curling Duel' || 
        gameTypeNorm === 'Marble Push (Abalone)'
      ) {
        coinsEarned = scoreVal;
      } else {
        coinsEarned = scoreVal > 0 ? Math.max(1, Math.ceil(scoreVal / 2)) : 0;
      }

      events.push({
        timestamp: item.date || new Date().toISOString(),
        amount: coinsEarned,
        type: 'earn',
        description: `${item.gameType}: ${item.details || 'Opdracht voltooid'}`
      });
    });

    // Add purchases
    profileCollections.forEach((itemId, idx) => {
      const shopItem = [...DISNEY_SHOP_ITEMS, ...LEGACY_DISNEY_SHOP_ITEMS].find(x => x.id === itemId);
      const itemName = shopItem ? shopItem.name : itemId;
      const cost = shopItem ? shopItem.cost : 1;

      // Timestamp slightly after the games to sort correctly
      const timestamp = new Date(Date.now() - (profileCollections.length - idx) * 60000).toISOString();
      events.push({
        timestamp,
        amount: cost,
        type: 'spend',
        description: `Gekocht in shop: ${itemName}`
      });
    });

    // Sort events by timestamp ascending
    events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Compute cumulative balance
    let balance = 0;
    const finalEntries = events.map(ev => {
      if (ev.type === 'earn') {
        balance += ev.amount;
      } else {
        balance -= ev.amount;
      }
      return {
        ...ev,
        amount: ev.type === 'spend' ? -ev.amount : ev.amount,
        balanceAfter: balance
      };
    });

    // Compare with current starBank balance and insert adjustment if needed
    const bankRaw = localStorage.getItem(COCO_BANK_KEY);
    let currentBankBalance = 0;
    try {
      if (bankRaw) {
        const bank = JSON.parse(bankRaw);
        currentBankBalance = bank[key] || 0;
      }
    } catch (e) {}

    if (balance !== currentBankBalance) {
      const diff = currentBankBalance - balance;
      if (diff !== 0) {
        finalEntries.push({
          timestamp: new Date().toISOString(),
          amount: Math.abs(diff),
          type: diff > 0 ? 'earn' : 'spend',
          description: "Saldo correctie (historische synchronisatie)",
          balanceAfter: currentBankBalance
        });
      }
    }

    // Save generated logs
    if (finalEntries.length > 0) {
      logs[profileName] = finalEntries;
      localStorage.setItem('disney_captains_log', JSON.stringify(logs));
      window.setTimeout(() => setCaptainsLogs(logs), 0);
    }

    return finalEntries;
  };

  const awardStarsToCollector = (name, amount, reason = "Coins verdiend") => {
    const coins = Math.max(0, Number(amount) || 0);
    const key = getCollectorKey(name || activeProfileName);
    const profName = name || activeProfileName || 'Speler 1';
    
    setCocoProfiles(prev => {
      const next = uniqueProfileNames([...prev, profName]);
      localStorage.setItem(COCO_PROFILES_KEY, JSON.stringify(next));
      return next;
    });

    if (coins > 0) {
      setStarBank(prev => {
        const next = { ...prev, [key]: (prev[key] || 0) + coins };
        localStorage.setItem(COCO_BANK_KEY, JSON.stringify(next));
        
        logCaptainMutation(profName, coins, 'earn', reason, next[key]);
        return next;
      });
    } else {
      const currentBalance = starBank[key] || 0;
      logCaptainMutation(profName, 0, 'earn', reason, currentBalance);
    }
  };

  const handleBuyShopItem = (item) => {
    const name = activeProfileName || shopPlayerName.trim() || playerNameInput.trim() || 'Speler 1';
    const key = getCollectorKey(name);
    const balance = starBank[key] || 0;
    const owned = collections[key] || [];
    const exclusiveOwner = exclusiveClaims[item.id];

    if (owned.includes(item.id)) return;
    if (item.type === 'exclusive' && exclusiveOwner && exclusiveOwner !== key) return;
    if (balance < item.cost) return;

    const nextBank = { ...starBank, [key]: balance - item.cost };
    const nextCollections = { ...collections, [key]: [...owned, item.id] };
    const nextClaims = item.type === 'exclusive' ? { ...exclusiveClaims, [item.id]: key } : exclusiveClaims;

    setStarBank(nextBank);
    setCollections(nextCollections);
    setExclusiveClaims(nextClaims);
    localStorage.setItem(COCO_BANK_KEY, JSON.stringify(nextBank));
    localStorage.setItem('disney_collections', JSON.stringify(nextCollections));
    localStorage.setItem('disney_exclusive_claims', JSON.stringify(nextClaims));
    logCaptainMutation(name, -item.cost, 'spend', `Gekocht in shop: ${item.name}`, nextBank[key]);
    setSelectedCollectionFlipped(false);
    setSelectedCollectionItem(item);
  };

  const getActiveBadgeProfile = () => {
    const name = activeProfileName || shopPlayerName.trim() || playerNameInput.trim() || 'Speler 1';
    return { name, key: getCollectorKey(name) };
  };

  const persistBadgeCollections = nextCollections => {
    setBadgeCollections(nextCollections);
    localStorage.setItem(BADGE_COLLECTION_KEY, JSON.stringify(nextCollections));
  };

  const handleOpenBadgePack = () => {
    const { name, key } = getActiveBadgeProfile();
    const balance = Number(starBank[key]) || 0;
    if (balance < BADGE_PACK_COST) return;

    const firstBadge = randomBadge({ common: 55, uncommon: 25, rare: 15, epic: 5 });
    const secondBadge = randomBadge({ common: 40, uncommon: 30, rare: 15, epic: 10, legendary: 5 }, [firstBadge.id]);
    const wonBadges = [firstBadge, secondBadge];
    const profileBadges = { ...(badgeCollections[key] || {}) };
    wonBadges.forEach(badge => { profileBadges[badge.id] = (profileBadges[badge.id] || 0) + 1; });

    const nextBank = { ...starBank, [key]: balance - BADGE_PACK_COST };
    const nextCollections = { ...badgeCollections, [key]: profileBadges };
    setStarBank(nextBank);
    localStorage.setItem(COCO_BANK_KEY, JSON.stringify(nextBank));
    persistBadgeCollections(nextCollections);
    logCaptainMutation(name, -BADGE_PACK_COST, 'spend', 'Badgepakje geopend bij Miguel', nextBank[key]);
    setOpenedBadgePack(wonBadges);
  };

  const handleTradeBadge = offeredBadgeId => {
    if (marketTradeOfferIndex === null) return;
    const { name, key } = getActiveBadgeProfile();
    const receivedBadgeId = badgeMarket.offers[marketTradeOfferIndex];
    const profileBadges = { ...(badgeCollections[key] || {}) };
    if (!profileBadges[offeredBadgeId] || offeredBadgeId === receivedBadgeId) return;
    const offeredBadge = getBadge(offeredBadgeId);
    const receivedBadge = getBadge(receivedBadgeId);
    const onlyCopyWarning = profileBadges[offeredBadgeId] === 1 ? '\n\nDit is je enige exemplaar van deze badge.' : '';
    if (!window.confirm(`${offeredBadge?.name} ruilen voor ${receivedBadge?.name}?${onlyCopyWarning}`)) return;

    profileBadges[offeredBadgeId] -= 1;
    if (profileBadges[offeredBadgeId] <= 0) delete profileBadges[offeredBadgeId];
    profileBadges[receivedBadgeId] = (profileBadges[receivedBadgeId] || 0) + 1;
    const nextCollections = { ...badgeCollections, [key]: profileBadges };
    const nextMarket = {
      ...badgeMarket,
      offers: badgeMarket.offers.map((badgeId, index) => index === marketTradeOfferIndex ? offeredBadgeId : badgeId)
    };
    persistBadgeCollections(nextCollections);
    setBadgeMarket(nextMarket);
    localStorage.setItem(BADGE_MARKET_KEY, JSON.stringify(nextMarket));
    logCaptainMutation(name, 0, 'earn', `Badge geruild: ${offeredBadge?.name} voor ${receivedBadge?.name}`, starBank[key] || 0);
    setMarketTradeOfferIndex(null);
  };

  const handleSellBadge = badgeId => {
    const { name, key } = getActiveBadgeProfile();
    const badge = getBadge(badgeId);
    const profileBadges = { ...(badgeCollections[key] || {}) };
    const count = Number(profileBadges[badgeId]) || 0;
    if (!badge || count <= 0) return;
    const onlyCopyWarning = count === 1 ? '\n\nDit is je enige exemplaar van deze badge.' : '';
    if (!window.confirm(`${badge.name} aan Miguel verkopen voor ${BADGE_SELL_VALUE} Coco Coins?${onlyCopyWarning}`)) return;

    profileBadges[badgeId] -= 1;
    if (profileBadges[badgeId] <= 0) delete profileBadges[badgeId];
    const nextCollections = { ...badgeCollections, [key]: profileBadges };
    const nextBank = { ...starBank, [key]: (starBank[key] || 0) + BADGE_SELL_VALUE };
    persistBadgeCollections(nextCollections);
    setStarBank(nextBank);
    localStorage.setItem(COCO_BANK_KEY, JSON.stringify(nextBank));
    logCaptainMutation(name, BADGE_SELL_VALUE, 'earn', `Badge verkocht aan Miguel: ${badge.name}`, nextBank[key]);
  };

  const handleAddShopPlayer = () => {
    const name = newShopPlayerName.trim();
    if (!name) return;
    activateCocoProfile(name);
    setNewShopPlayerName('');
  };

  const handleCreateStartupProfile = () => {
    const name = startupProfileName.trim();
    if (!name) return;
    activateCocoProfile(name);
    setStartupProfileName('');
  };

  const handleRenameShopProfile = async () => {
    const currentName = activeProfileName || shopPlayerName.trim() || 'Speler 1';
    const keepProfileChooserOpen = !activeProfileName;
    const nextName = window.prompt('Nieuwe profielnaam', currentName)?.trim();
    if (!nextName || nextName === currentName) return;

    const oldKey = getCollectorKey(currentName);
    const newKey = getCollectorKey(nextName);
    const exists = getDisplayShopPlayers().some(name => getCollectorKey(name) === newKey && getCollectorKey(name) !== oldKey);
    if (exists) {
      window.alert('Er bestaat al een profiel met deze naam.');
      return;
    }

    const nextProfiles = uniqueProfileNames(cocoProfiles.map(name => getCollectorKey(name) === oldKey ? nextName : name));
    setCocoProfiles(nextProfiles);
    localStorage.setItem(COCO_PROFILES_KEY, JSON.stringify(nextProfiles));

    let persistedBank = starBank;
    let persistedCollections = collections;
    let persistedClaims = exclusiveClaims;
    let persistedBadgeCollections = badgeCollections;
    let persistedBadgeAchievements = badgeAchievements;
    let persistedPreferences = profilePreferences;
    let persistedCaptainsLogs = captainsLogs;
    let persistedGameHistory = soloHistory;

    if (oldKey !== newKey) {
      const nextBank = { ...starBank };
      nextBank[newKey] = (nextBank[newKey] || 0) + (nextBank[oldKey] || 0);
      delete nextBank[oldKey];

      const nextCollections = { ...collections };
      nextCollections[newKey] = [...new Set([...(nextCollections[newKey] || []), ...(nextCollections[oldKey] || [])])];
      delete nextCollections[oldKey];

      const nextClaims = Object.fromEntries(
        Object.entries(exclusiveClaims).map(([itemId, ownerKey]) => [itemId, ownerKey === oldKey ? newKey : ownerKey])
      );

      const nextBadgeCollections = { ...badgeCollections };
      const mergedBadges = { ...(nextBadgeCollections[newKey] || {}) };
      Object.entries(nextBadgeCollections[oldKey] || {}).forEach(([badgeId, count]) => {
        mergedBadges[badgeId] = (mergedBadges[badgeId] || 0) + (Number(count) || 0);
      });
      nextBadgeCollections[newKey] = mergedBadges;
      delete nextBadgeCollections[oldKey];

      const nextBadgeAchievements = { ...badgeAchievements };
      nextBadgeAchievements[newKey] = {
        ...(nextBadgeAchievements[newKey] || {}),
        ...(nextBadgeAchievements[oldKey] || {})
      };
      delete nextBadgeAchievements[oldKey];

      const nextPreferences = { ...profilePreferences };
      nextPreferences[newKey] = {
        ...(nextPreferences[oldKey] || createProfilePreference(nextName)),
        name: nextName
      };
      delete nextPreferences[oldKey];

      const nextCaptainsLogs = { ...captainsLogs };
      nextCaptainsLogs[nextName] = [...(nextCaptainsLogs[nextName] || []), ...(nextCaptainsLogs[currentName] || [])];
      delete nextCaptainsLogs[currentName];

      const nextGameHistory = soloHistory.map(item => {
        const belongsToRenamedProfile = item.profileKey === oldKey || getCollectorKey(item.profileName || '') === oldKey;
        return belongsToRenamedProfile ? { ...item, profileName: nextName, profileKey: newKey } : item;
      });

      const nextArenaSaves = Object.fromEntries(Object.entries(arenaSaves).map(([saveKey, save]) => {
        if (!saveKey.startsWith(`${oldKey}:`)) return [saveKey, save];
        const gameId = saveKey.slice(oldKey.length + 1);
        return [`${newKey}:${gameId}`, {
          ...save,
          localPlayer: save.localPlayer ? { ...save.localPlayer, name: nextName } : save.localPlayer,
          players: (save.players || []).map(player => player.id === save.localPlayer?.id ? { ...player, name: nextName } : player)
        }];
      }));

      setStarBank(nextBank);
      setCollections(nextCollections);
      setExclusiveClaims(nextClaims);
      setBadgeCollections(nextBadgeCollections);
      setBadgeAchievements(nextBadgeAchievements);
      setProfilePreferences(nextPreferences);
      setCaptainsLogs(nextCaptainsLogs);
      setSoloHistory(nextGameHistory);
      setArenaSaves(nextArenaSaves);
      localStorage.setItem(COCO_BANK_KEY, JSON.stringify(nextBank));
      localStorage.setItem('disney_collections', JSON.stringify(nextCollections));
      localStorage.setItem('disney_exclusive_claims', JSON.stringify(nextClaims));
      localStorage.setItem(BADGE_COLLECTION_KEY, JSON.stringify(nextBadgeCollections));
      localStorage.setItem(BADGE_ACHIEVEMENT_KEY, JSON.stringify(nextBadgeAchievements));
      localStorage.setItem(PROFILE_PREFERENCES_KEY, JSON.stringify(nextPreferences));
      localStorage.setItem('disney_captains_log', JSON.stringify(nextCaptainsLogs));
      localStorage.setItem('disney_solo_history', JSON.stringify(nextGameHistory));
      localStorage.setItem(ARENA_SAVES_KEY, JSON.stringify(nextArenaSaves));

      persistedBank = nextBank;
      persistedCollections = nextCollections;
      persistedClaims = nextClaims;
      persistedBadgeCollections = nextBadgeCollections;
      persistedBadgeAchievements = nextBadgeAchievements;
      persistedPreferences = nextPreferences;
      persistedCaptainsLogs = nextCaptainsLogs;
      persistedGameHistory = nextGameHistory;
    }

    setShopPlayerName(nextName);
    setActiveProfileName(keepProfileChooserOpen ? '' : nextName);
    setPlayerNameInput(nextName);
    if (keepProfileChooserOpen) {
      localStorage.removeItem(ACTIVE_PROFILE_KEY);
      localStorage.removeItem('disney_player_name');
    } else {
      localStorage.setItem(ACTIVE_PROFILE_KEY, nextName);
      localStorage.setItem('disney_player_name', nextName);
    }

    if (cocoProfileStoreIdRef.current) {
      const { error: renameSaveError } = await supabase.from('rooms').update({
        current_task_state: {
          coco_profiles: nextProfiles,
          coco_profile_preferences: persistedPreferences,
          coco_reward_receipts: profileRewardReceipts,
          coco_bank: persistedBank,
          coco_collections: persistedCollections,
          coco_exclusive_claims: persistedClaims,
          coco_badge_collections: persistedBadgeCollections,
          coco_badge_achievements: persistedBadgeAchievements,
          coco_badge_showcase_seed_version: badgeShowcaseSeedVersion,
          coco_badge_market: badgeMarket,
          coco_captains_log: persistedCaptainsLogs,
          coco_game_history: persistedGameHistory,
          coco_profile_store_version: 7,
          updated_at: new Date().toISOString()
        }
      }).eq('id', cocoProfileStoreIdRef.current);
      if (renameSaveError) {
        window.alert('De naam staat lokaal goed, maar kon nog niet online worden opgeslagen. Controleer je verbinding en probeer het opnieuw.');
      }
    }
  };

  const getCompetitionRank = (player, standings = players) => {
    const score = Number(player?.score) || 0;
    return 1 + new Set(standings.filter(other => (Number(other.score) || 0) > score).map(other => Number(other.score) || 0)).size;
  };

  const getRoadRaceReward = (player, standings = players) => ({ 1: 10, 2: 6, 3: 4 }[getCompetitionRank(player, standings)] || 2);

  const getRankMedal = rank => rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🎖️';

  useEffect(() => {
    if (screen !== 'end' || !room?.id || room.id === 'solo' || !localPlayer?.id || room.game_mode?.startsWith('arcade-')) return;
    const rewardKey = `road-race-final-reward-${room.id}-${localPlayer.id}`;
    if (localStorage.getItem(rewardKey)) return;
    const currentPlayer = players.find(player => player.id === localPlayer.id);
    if (!currentPlayer) return;
    const reward = getRoadRaceReward(currentPlayer, players);
    const rank = getCompetitionRank(currentPlayer, players);
    localStorage.setItem(rewardKey, String(reward));
    awardStarsToCollector(currentPlayer.name, reward, `McQueen's Road Race afgerond · plaats ${rank}`);
    setSoloHistory(previous => {
      const next = [{
        profileName: currentPlayer.name,
        profileKey: getCollectorKey(currentPlayer.name),
        category: 'road-race',
        gameType: "McQueen's Road Race",
        date: new Date().toISOString(),
        score: currentPlayer.score,
        details: rank === 1 ? 'Gewonnen' : `Geëindigd op plaats ${rank}`
      }, ...previous];
      localStorage.setItem('disney_solo_history', JSON.stringify(next));
      return next;
    });
  }, [localPlayer?.id, room?.id, room?.game_mode, screen]);

  const handleDeleteShopProfile = () => {
    const currentName = activeProfileName || shopPlayerName.trim() || 'Speler 1';
    const keepProfileChooserOpen = !activeProfileName;
    if (getDisplayShopPlayers().length <= 1) {
      window.alert('Er moet minimaal een profiel overblijven.');
      return;
    }
    if (!window.confirm(`Profiel "${currentName}" verwijderen? De Coco Coins en Collection van dit profiel worden ook verwijderd.`)) return;

    const currentKey = getCollectorKey(currentName);
    const nextProfiles = persistCocoProfiles(cocoProfiles.filter(name => getCollectorKey(name) !== currentKey));
    const nextName = nextProfiles[0] || 'Speler 1';

    const nextBank = { ...starBank };
    const nextCollections = { ...collections };
    const nextBadgeCollections = { ...badgeCollections };
    const nextBadgeAchievements = { ...badgeAchievements };
    const nextPreferences = { ...profilePreferences };
    const nextCaptainsLogs = Object.fromEntries(Object.entries(captainsLogs).filter(([profileName]) => getCollectorKey(profileName) !== currentKey));
    const nextGameHistory = soloHistory.filter(item => (item.profileKey || getCollectorKey(item.profileName || '')) !== currentKey);
    const nextArenaSaves = Object.fromEntries(Object.entries(arenaSaves).filter(([saveKey]) => !saveKey.startsWith(`${currentKey}:`)));
    delete nextBank[currentKey];
    delete nextCollections[currentKey];
    delete nextBadgeCollections[currentKey];
    delete nextBadgeAchievements[currentKey];
    delete nextPreferences[currentKey];

    const nextClaims = Object.fromEntries(
      Object.entries(exclusiveClaims).filter(([, ownerKey]) => ownerKey !== currentKey)
    );

    setStarBank(nextBank);
    setCollections(nextCollections);
    setExclusiveClaims(nextClaims);
    setBadgeCollections(nextBadgeCollections);
    setBadgeAchievements(nextBadgeAchievements);
    setProfilePreferences(nextPreferences);
    setCaptainsLogs(nextCaptainsLogs);
    setSoloHistory(nextGameHistory);
    setArenaSaves(nextArenaSaves);
    setShopPlayerName(nextName);
    setActiveProfileName(keepProfileChooserOpen ? '' : nextName);
    setPlayerNameInput(nextName);
    setDonationTargetName('');
    localStorage.setItem(COCO_BANK_KEY, JSON.stringify(nextBank));
    localStorage.setItem('disney_collections', JSON.stringify(nextCollections));
    localStorage.setItem('disney_exclusive_claims', JSON.stringify(nextClaims));
    localStorage.setItem(BADGE_COLLECTION_KEY, JSON.stringify(nextBadgeCollections));
    localStorage.setItem(BADGE_ACHIEVEMENT_KEY, JSON.stringify(nextBadgeAchievements));
    localStorage.setItem(PROFILE_PREFERENCES_KEY, JSON.stringify(nextPreferences));
    localStorage.setItem('disney_captains_log', JSON.stringify(nextCaptainsLogs));
    localStorage.setItem('disney_solo_history', JSON.stringify(nextGameHistory));
    localStorage.setItem(ARENA_SAVES_KEY, JSON.stringify(nextArenaSaves));
    if (keepProfileChooserOpen) {
      localStorage.removeItem(ACTIVE_PROFILE_KEY);
      localStorage.removeItem('disney_player_name');
    } else {
      localStorage.setItem(ACTIVE_PROFILE_KEY, nextName);
      localStorage.setItem('disney_player_name', nextName);
    }
  };

  const handleDonateCoins = () => {
    const fromName = activeProfileName || shopPlayerName.trim() || 'Speler 1';
    const fromKey = getCollectorKey(fromName);
    const targetName = donationTargetName || getDisplayShopPlayers().find(name => getCollectorKey(name) !== fromKey);
    const targetKey = getCollectorKey(targetName);
    const amount = Math.floor(Number(donationAmount));

    if (!targetName || targetKey === fromKey) {
      window.alert('Kies een ander profiel om Coco Coins aan te doneren.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      window.alert('Vul een positief aantal Coco Coins in.');
      return;
    }
    if ((starBank[fromKey] || 0) < amount) {
      window.alert('Dit profiel heeft niet genoeg Coco Coins.');
      return;
    }

    const nextProfiles = persistCocoProfiles([...cocoProfiles, targetName]);
    const nextBank = {
      ...starBank,
      [fromKey]: (starBank[fromKey] || 0) - amount,
      [targetKey]: (starBank[targetKey] || 0) + amount
    };

    setStarBank(nextBank);
    setDonationAmount('');
    setDonationTargetName(nextProfiles.find(name => getCollectorKey(name) === targetKey) || '');
    localStorage.setItem(COCO_BANK_KEY, JSON.stringify(nextBank));
    logCaptainMutation(fromName, -amount, 'spend', `Donatie aan ${targetName}`, nextBank[fromKey]);
    logCaptainMutation(targetName, amount, 'earn', `Donatie ontvangen van ${fromName}`, nextBank[targetKey]);
  };

  const logSoloAttempt = (points = 0, customReason = null, isCoins = false) => {
    const currentTask = getCurrentTask();
    if (!currentTask) return;

    const gameName = currentTask.cat || "Onbekend Spel";
    let reason = customReason || "";
    if (!reason) {
      if (currentTask.type === 'mastermind') {
        reason = mmSolved ? `Code gekraakt in ${mmGuesses.length} beurten` : "Code niet gekraakt";
      } else if (currentTask.type === 'sudoku') {
        reason = sudokuSolved && sudokuSolvedStats ? sudokuSolvedStats : "Sudoku niet opgelost";
      } else {
        reason = `Opdracht afgerond`;
      }
    }

    const newEntry = {
      profileName: activeProfileName || localPlayer?.name || playerNameInput || shopPlayerName,
      profileKey: getCollectorKey(activeProfileName || localPlayer?.name || playerNameInput || shopPlayerName),
      category: currentTask.type === 'arcade-game' || room?.game_mode?.startsWith('arcade-') ? 'arena' : 'quest-solo',
      gameType: gameName,
      date: new Date().toISOString(),
      score: points,
      details: reason
    };

    setSoloHistory(prev => {
      const updated = [newEntry, ...prev];
      localStorage.setItem('disney_solo_history', JSON.stringify(updated));
      return updated;
    });
    const soloCoinReward = isCoins ? points : (points > 0 ? Math.max(1, Math.ceil(points / 2)) : 0);
    awardStarsToCollector(activeProfileName || localPlayer?.name || playerNameInput || shopPlayerName, soloCoinReward, `${gameName}: ${reason}`);
  };

  const isArenaHistoryItem = (item) => {
    const text = `${item?.gameType || ''} ${item?.details || ''}`;
    return item?.category === 'arena'
      || item?.gameType === 'Duel Arena'
      || /Othello|Dots|Color Lines|Marble|Pirates|Plank|Yahtzee|Qwixx|Mastermind|Sudoku|verhuren/i.test(text);
  };

  const updateRoomState = async (roomId, updates) => {
    if (roomId === 'solo') {
      setRoom(prev => {
        const nextState = {
          ...prev,
          ...updates,
          current_task_state: {
            ...(prev?.current_task_state || {}),
            ...(updates?.current_task_state || {})
          }
        };
        return nextState;
      });
      return;
    }
    await dbUpdateRoomState(roomId, updates);
  };

  const addPlayerScore = async (roomId, player, delta, reason, bucket, taskObj = null) => {
    if (roomId === 'solo') {
      setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, score: (p.score || 0) + delta } : p));
      if (!soloLoggedRef.current) {
        logSoloAttempt(delta, reason);
        soloLoggedRef.current = true;
      }
      return;
    }
    if (player?.id === localPlayer?.id) {
      awardStarsToCollector(player?.name, delta, reason);
    }
    await dbAddPlayerScore(roomId, player, delta, reason, bucket, taskObj);
  };

  const handleStartSoloGame = (category) => {
    let taskId;
    let size = 6;
    if (category.startsWith('Disney Sudoku') || category === "Tinker Bell Sudoku" || category === "Zazu's Sudoku" || category === "Kasteel Sudoku") {
      taskId = 'solo-sudoku';
      size = category.endsWith('6x6') || category === "Tinker Bell Sudoku" ? 6 : 9;
      generateSudoku(size);
    } else if (category === "Yzma's Poison Struggle" || category === "Yzma's Geheime Code") {
      taskId = DEFAULT_TASKS.find(t => t.type === 'mastermind')?.id || 'mastermind-01';
    } else if (category === 'Quiz') {
      taskId = 'quiz-choice';
    } else {
      const tasksOfCat = DEFAULT_TASKS.filter(t => t.cat === category && t.active !== false);
      if (!tasksOfCat.length) {
        alert("Geen opdrachten beschikbaar voor deze categorie.");
        return;
      }
      const task = tasksOfCat[Math.floor(Math.random() * tasksOfCat.length)];
      taskId = task.id;
    }
    
    setRoom({
      id: 'solo',
      status: 'playing',
      game_mode: 'solo',
      current_task_id: taskId,
      current_player_index: 0,
      current_task_state: {
        usedTasks: (taskId !== 'quiz-choice' && taskId !== 'solo-sudoku') ? [taskId] : [],
        taskHistory: [],
        codeLength: 5,
        enabledCategories: [category],
        sudokuSize: size
      }
    });

    soloLoggedRef.current = false;

    const name = activeProfileName || playerNameInput.trim() || localStorage.getItem('disney_player_name') || 'Solo Speler';
    const pObj = { id: 'solo-player', name, score: 0 };
    setPlayers([pObj]);
    setLocalPlayer(pObj);
    setScreen('game');
  };

  const handleStartArcadeSolo = (gameId) => {
    if (getArenaGame(gameId)?.comingSoon) return;
    setArcadeOptionsOpen(false);
    setArcadePlayMode(null);
    const name = activeProfileName || playerNameInput.trim() || localStorage.getItem('disney_player_name') || 'Solo Speler';
    localStorage.setItem('disney_player_name', name);
    localStorage.setItem('disney_ai_level', aiLevel);
    if (gameId === 'piratesplank') localStorage.setItem('disney_pirates_difficulty', piratesDifficulty);
    const p = { id: 'solo-player', name, score: 0 };

    if (gameId === 'mastermind' || gameId === 'sudoku6' || gameId === 'sudoku9') {
      const isSudoku = gameId.startsWith('sudoku');
      const size = gameId === 'sudoku9' ? 9 : 6;
      const taskId = isSudoku
        ? 'solo-sudoku'
        : (DEFAULT_TASKS.find(t => t.type === 'mastermind')?.id || 'mastermind-01');

      if (isSudoku) generateSudoku(size);

      setLocalPlayer(p);
      setPlayers([p]);
      setRoom({
        id: 'solo',
        status: 'playing',
        game_mode: 'arcade-' + gameId,
        current_task_id: taskId,
        current_player_index: 0,
        current_task_state: {
          usedTasks: isSudoku ? [] : [taskId],
          taskHistory: [],
          codeLength: 5,
          enabledCategories: [isSudoku ? (size === 6 ? "Tinker Bell Sudoku" : "Zazu's Sudoku") : "Yzma's Poison Struggle"],
          sudokuSize: size
        }
      });
      soloLoggedRef.current = false;
      setScreen('game');
      return;
    }
    
    setLocalPlayer(p);
    setPlayers([p]);
    setRoom({
      id: 'solo',
      status: 'playing',
      game_mode: 'arcade-' + gameId,
      current_task_id: 'solo-arcade-' + gameId,
      current_player_index: 0,
      current_task_state: {
        aiLevel,
        ...(gameId === 'piratesplank' ? { piratesDifficulty } : {})
      }
    });
    soloLoggedRef.current = false;
    setScreen('game');
  };

  const handleCreateArcadeDuel = async (gameId) => {
    if (getArenaGame(gameId)?.comingSoon) return;
    const profileName = activeProfileName || playerNameInput.trim();
    if (!profileName) {
      setError("Voer een naam in om te kunnen starten.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const arenaGame = getArenaGame(gameId);
      const { room: r, player: p } = await createRoom('mix', 1, 10, profileName);
      
      const updates = { 
        game_mode: 'arcade-' + gameId, 
        current_task_id: 'duel-arcade-' + gameId,
        status: 'lobby',
        current_task_state: {
          aiLevel,
          ...(gameId === 'piratesplank' ? { piratesDifficulty } : {}),
          arcadeGameId: gameId,
          arcadeMaxPlayers: arenaGame?.maxPlayers || 2
        }
      };
      await dbUpdateRoomState(r.id, updates);
      
      const updatedRoom = { ...r, ...updates };

      setRoom(updatedRoom);
      setPlayers([p]);
      setLocalPlayer(p);
      
      localStorage.setItem('disney_room_id', updatedRoom.id);
      localStorage.setItem('disney_player_id', p.id);
      localStorage.setItem('disney_player_name', p.name);

      setScreen('lobby');
    } catch (e) {
      setError("Duel aanmaken mislukt: " + (e.message || e.toString() || "Onbekende fout"));
    } finally {
      setLoading(false);
    }
  };

  const [timerRunning, setTimerRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [quizLocked, setQuizLocked] = useState(false);
  const [quizSelectedAnswer, setQuizSelectedAnswer] = useState(null);
  const [quizPendingIndex, setQuizPendingIndex] = useState(null);
  const [scoreReturnScreen, setScoreReturnScreen] = useState('game');
  const [stagePause, setStagePause] = useState(false);

  const [taskSearch, setTaskSearch] = useState('');
  const [customTasks, setCustomTasks] = useState([]);

  // Ref for timer
  const timerRef = useRef(null);
  const svgRef = useRef(null);

  // New Interactive Games States
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [localEstimate, setLocalEstimate] = useState('');
  const [diaryChar, setDiaryChar] = useState('');
  const [diaryMovie, setDiaryMovie] = useState('');

  // Mastermind states
  const [mmCode, setMmCode] = useState([]);
  const [mmGuesses, setMmGuesses] = useState([]);
  const [mmCurrentGuess, setMmCurrentGuess] = useState([0, 0, 0, 0, 0]);
  const [mmSolved, setMmSolved] = useState(false);
  const [mmFailed, setMmFailed] = useState(false);
  const [mmPointsEarned, setMmPointsEarned] = useState(0);
  const [mmGameStarted, setMmGameStarted] = useState(false);
  const [mmCodeLength, setMmCodeLength] = useState(5);
  const [mmColorCount, setMmColorCount] = useState(6);
  const [mmMaxTurns, setMmMaxTurns] = useState(10);
  const [mmActiveSlot, setMmActiveSlot] = useState(0);

  // Wie ben ik states
  const [whoamiRevealed, setWhoamiRevealed] = useState(1);
  const [whoamiLocked, setWhoamiLocked] = useState(false);
  const [whoamiSelected, setWhoamiSelected] = useState(null);

  // Feit of Fabel states
  const [factLocked, setFactLocked] = useState(false);
  const [factSelected, setFactSelected] = useState(null);

  // Upgrade 1: Day/Night Theme and Power Cards Zoom/Flip HUD states
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('disney_theme_mode') || 'day'); // 'day' or 'night'
  const [zoomedCardKey, setZoomedCardKey] = useState(null); // card key like 'fastpass' or null
  const [cardFlipped, setCardFlipped] = useState(false); // boolean flip
  const [strafTargetMode, setStrafTargetMode] = useState(null); // card key if selecting target player

  // Session recovery
  useEffect(() => {
    async function recoverSession() {
      // A direct join link must always open the join form, even when this
      // device still remembers an older room.
      if (new URLSearchParams(window.location.search).get('join')) return;
      const savedRoomId = localStorage.getItem('disney_room_id');
      const savedPlayerId = localStorage.getItem('disney_player_id');
      const savedPlayerName = localStorage.getItem('disney_player_name');
      const savedSound = localStorage.getItem('disney_sound_enabled');

      if (savedSound !== null) {
        setSound(savedSound === 'true');
      }

      if (savedRoomId && savedPlayerId && savedPlayerName) {
        setLoading(true);
        try {
          const { room: r, players: p, scoreHistory: sh } = await fetchRoomData(savedRoomId);
          setRoom(r);
          setPlayers(p);
          setScoreHistory(sh);
          setLocalPlayer({ id: savedPlayerId, name: savedPlayerName });

          if (r.status === 'lobby') {
            setScreen('lobby');
          } else if (r.status === 'playing') {
            setScreen('game');
          } else if (r.status === 'ended') {
            setScreen('end');
          }
        } catch (e) {
          console.error("Session recovery failed", e);
          clearSession();
        } finally {
          setLoading(false);
        }
      }
    }
    recoverSession();
  }, []);

  // Day/Night theme applies everywhere after a Disney profile is active.
  useEffect(() => {
    if (!activeProfileName) return;
    const savedTheme = profilePreferences[getCollectorKey(activeProfileName)]?.theme || localStorage.getItem('disney_theme_mode') || 'day';
    setThemeMode(savedTheme);
  }, [activeProfileName]);

  useEffect(() => {
    document.body.classList.toggle('night-theme', Boolean(activeProfileName) && themeMode === 'night');
    document.body.classList.toggle('day-theme', Boolean(activeProfileName) && themeMode === 'day');
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', !activeProfileName ? '#08162f' : themeMode === 'night' ? '#030713' : '#277bc0');
    return () => {
      document.body.classList.remove('night-theme');
      document.body.classList.remove('day-theme');
    };
  }, [themeMode, activeProfileName]);

  const toggleThemeMode = () => {
    const nextTheme = themeMode === 'day' ? 'night' : 'day';
    setThemeMode(nextTheme);
    localStorage.setItem('disney_theme_mode', nextTheme);
    if (!activeProfileName) return;
    const key = getCollectorKey(activeProfileName);
    const current = profilePreferences[key] || createProfilePreference(activeProfileName);
    const nextPreferences = { ...profilePreferences, [key]: { ...current, name: activeProfileName, theme: nextTheme } };
    setProfilePreferences(nextPreferences);
    localStorage.setItem(PROFILE_PREFERENCES_KEY, JSON.stringify(nextPreferences));
  };

  const getArenaSave = gameId => arenaSaves[`${getCollectorKey(activeProfileName)}:${gameId}`] || null;

  const clearArenaSave = gameId => {
    if (!gameId || !activeProfileName) return;
    const saveKey = `${getCollectorKey(activeProfileName)}:${gameId}`;
    setArenaSaves(current => {
      if (!current[saveKey]) return current;
      const nextSaves = { ...current };
      delete nextSaves[saveKey];
      localStorage.setItem(ARENA_SAVES_KEY, JSON.stringify(nextSaves));
      return nextSaves;
    });
  };

  const handleResumeArenaSave = async gameId => {
    const saved = getArenaSave(gameId);
    if (!saved?.room) return;
    let savedRoom = saved.room;
    let savedPlayers = saved.players || [];
    if (savedRoom.id !== 'solo') {
      try {
        const fresh = await fetchRoomData(savedRoom.id);
        if (fresh.room?.status === 'ended') {
          clearArenaSave(gameId);
          window.alert('Dit duel is inmiddels afgerond en kan niet meer worden hervat.');
          return;
        }
        savedRoom = fresh.room;
        savedPlayers = fresh.players;
        localStorage.setItem('disney_room_id', savedRoom.id);
        localStorage.setItem('disney_player_id', saved.localPlayer?.id || '');
      } catch (error) {
        console.error('Arena save recovery failed', error);
        window.alert('Dit duel kon niet worden geladen. Controleer je internetverbinding en probeer het opnieuw.');
        return;
      }
    }
    setRoom(savedRoom);
    setPlayers(savedPlayers);
    setLocalPlayer(saved.localPlayer || savedPlayers[0] || null);
    setArcadeOptionsOpen(false);
    setArcadePlayMode(null);
    soloLoggedRef.current = false;
    setScreen('game');
  };

  const clearSession = () => {
    localStorage.removeItem('disney_room_id');
    localStorage.removeItem('disney_player_id');
    setRoom(null);
    setPlayers([]);
    setScoreHistory([]);
    setLocalPlayer(null);
    setScreen('portal');
  };

  const leaveCurrentRoom = async (targetScreen = 'portal') => {
    const currentRoomId = room?.id;
    if (currentRoomId && currentRoomId !== 'solo') {
      try {
        await updateRoomState(currentRoomId, { status: 'ended' });
      } catch (e) {
        console.warn("Could not close room before leaving", e);
      }
    }
    localStorage.removeItem('disney_room_id');
    localStorage.removeItem('disney_player_id');
    setRoom(null);
    setPlayers([]);
    setScoreHistory([]);
    setLocalPlayer(null);
    setScreen(targetScreen);
  };

  // Real-time subscription
  useEffect(() => {
    if (!room?.id) return;

    const handleUpdate = async () => {
      try {
        const { room: r, players: p, scoreHistory: sh } = await fetchRoomData(room.id);
        setRoom(r);
        setPlayers(p);
        setScoreHistory(sh);

        if (r.current_task_state?.stagePause) {
          setStagePause(true);
        } else {
          setStagePause(false);
        }

        if (r.status === 'ended' && screen !== 'scores' && screen !== 'scorelog') {
          setScreen('end');
        } else if (r.status === 'playing' && screen === 'lobby') {
          setScreen('game');
        }
      } catch (e) {
        console.error("Realtime sync failed", e);
      }
    };

    const unsubscribe = subscribeToRoom(room.id, handleUpdate);
    return () => unsubscribe();
  }, [room?.id, screen]);

  // Realtime attack countdown (only executed by the room host to avoid conflicts)
  useEffect(() => {
    const attack = room?.current_task_state?.activeAttack;
    if (!attack || attack.timer <= 0) return;

    const isHost = isRoomHost();
    if (!isHost) return;

    const interval = setInterval(async () => {
      const currentTimer = room.current_task_state.activeAttack.timer;
      if (currentTimer <= 1) {
        clearInterval(interval);
        await executeActiveAttack();
      } else {
        await updateRoomState(room.id, {
          current_task_state: {
            ...room.current_task_state,
            activeAttack: {
              ...room.current_task_state.activeAttack,
              timer: currentTimer - 1
            }
          }
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [room?.current_task_state?.activeAttack?.timer, room?.current_task_state?.activeAttack?.targetId, players, localPlayer]);

  // Synchronize local quiz/whoami/fact answer states with DB for all players to see selections
  useEffect(() => {
    const isLocked = room?.current_task_state?.quizLocked || false;
    const selAns = room?.current_task_state?.selectedAnswer !== undefined ? room.current_task_state.selectedAnswer : null;
    
    // Sync Quiz
    setQuizLocked(isLocked);
    setQuizSelectedAnswer(selAns);

    // Sync Who am I
    setWhoamiLocked(isLocked);
    setWhoamiSelected(selAns);

    // Sync Fact or Fabel
    setFactLocked(isLocked);
    setFactSelected(selAns);
  }, [room?.current_task_state?.quizLocked, room?.current_task_state?.selectedAnswer]);

  // Auto-advance quiz after answer is selected (3-second delay)
  useEffect(() => {
    const isLocked = room?.current_task_state?.quizLocked;
    const currentTask = getCurrentTask();
    if (!isLocked || !currentTask) return;

    const isAutoAdvanceType = ['quiz', 'whoami', 'fact', 'emoji'].includes(currentTask.type);
    if (!isAutoAdvanceType) return;

    const isHost = isRoomHost();
    if (!isHost) return;

    const timeout = setTimeout(async () => {
      await handleFinishTask();
    }, 3000);

    return () => clearTimeout(timeout);
  }, [room?.current_task_state?.quizLocked, room?.id, players[0]?.id]);

  // Real-time Group Timer Synchronization Hook
  useEffect(() => {
    const timerStartedAt = room?.current_task_state?.timerStartedAt;
    const timerDuration = room?.current_task_state?.timerDuration;

    if (!timerStartedAt || !timerDuration) {
      setSecondsLeft(0);
      setTimerRunning(false);
      return;
    }

    const elapsed = Math.floor((Date.now() - new Date(timerStartedAt).getTime()) / 1000);
    const initialLeft = Math.max(0, timerDuration - elapsed);

    setSecondsLeft(initialLeft);
    setTimerRunning(initialLeft > 0);

    if (initialLeft <= 0) return;

    const interval = setInterval(() => {
      const currentElapsed = Math.floor((Date.now() - new Date(timerStartedAt).getTime()) / 1000);
      const left = Math.max(0, timerDuration - currentElapsed);
      setSecondsLeft(left);
      if (left <= 0) {
        setTimerRunning(false);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [room?.current_task_state?.timerStartedAt, room?.current_task_state?.timerDuration]);

  // Touch scroll prevention listener for Pictionary
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const prevent = (e) => e.preventDefault();
    svg.addEventListener('touchstart', prevent, { passive: false });
    svg.addEventListener('touchmove', prevent, { passive: false });
    return () => {
      svg.removeEventListener('touchstart', prevent);
      svg.removeEventListener('touchmove', prevent);
    };
  }, [svgRef.current, screen, room?.current_task_id]);

  const toggleSound = () => {
    const newVal = !sound;
    setSound(newVal);
    localStorage.setItem('disney_sound_enabled', String(newVal));
  };

  const isGroupOnly = () => {
    if (room?.game_mode === "Samen") return true;
    const cats = room?.current_task_state?.enabledCategories || [];
    return cats.length === 1 && cats[0] === "Samen";
  };
  const completedRounds = () => room?.round || 0;
  const getCurrentTask = () => {
    if (!room?.current_task_id) return null;
    if (room.current_task_id === 'quiz-choice') {
      return { id: "quiz-choice", cat: "Quiz", type: "quizChoice", title: "Kies je niveau", text: "Kies voor 1, 2 of 3 sterren.", points: 0 };
    }
    if (room.current_task_id === 'solo-sudoku') {
      const sudokuTitle = room.current_task_state?.sudokuSize === 6 ? "Tinker Bell Sudoku" : "Zazu's Sudoku";
      return { 
        id: "solo-sudoku", 
        cat: sudokuTitle,
        type: "sudoku",
        title: sudokuTitle,
        text: "Vul elk leeg vakje met het juiste Disney-symbool. Ieder symbool mag per rij, kolom en blok maar één keer voorkomen."
      };
    }
    if (room.game_mode === 'arcade-mastermind') {
      const task = DEFAULT_TASKS.find(t => t.id === room.current_task_id) || {};
      return {
        ...task,
        id: room.current_task_id,
        cat: "Yzma's Poison Struggle",
        type: "mastermind",
        title: "Yzma's Poison Struggle"
      };
    }
    if (room.current_task_id?.startsWith('solo-arcade-') || room.current_task_id?.startsWith('duel-arcade-')) {
      const isSolo = room.current_task_id.startsWith('solo-arcade-');
      const gameId = isSolo 
        ? room.current_task_id.replace('solo-arcade-', '') 
        : room.current_task_id.replace('duel-arcade-', '');
      const titles = {
        othello: "Ursula's Spiegelstrijd",
        dotsboxes: "Rapunzel's Torenkamers",
        colorlines: "Inside Out Kleurenchaos",
        abalone: "Louisa's Power Push",
        piratesplank: "Black Pearl's Plank",
        yahtzee: "Goofy's Geluksworp",
        qwixx: "Mike's Wazowski-Board",
        mastermind: "Yzma's Poison Struggle",
        tictactinker: "Tic Tac Tinker Bell",
        sudoku9: "Zazu's Sudoku"
      };
      return {
        id: room.current_task_id,
        cat: "Duel Arena",
        type: "arcade-game",
        gameId,
        mode: isSolo ? "solo" : "duel",
        title: titles[gameId] || "Mini-Game",
        text: "Laat de strijd beginnen!"
      };
    }
    return DEFAULT_TASKS.find(t => t.id === room.current_task_id) || customTasks.find(t => t.id === room.current_task_id) || null;
  };

  // Reset task-specific states on task change
  useEffect(() => {
    setWhoamiRevealed(1);
    setWhoamiSelected(null);
    setWhoamiLocked(false);
    setFactSelected(null);
    setFactLocked(false);
    setQuizSelectedAnswer(null);
    setQuizPendingIndex(null);
    setQuizLocked(false);
    setDiaryChar('');
    setDiaryMovie('');
    setLocalEstimate('');
    setDrawingPoints([]);
    setIsDrawing(false);

    // Reset Mastermind states
    setMmGuesses([]);
    setMmSolved(false);
    setMmFailed(false);
    setMmPointsEarned(0);
    setMmGameStarted(false);
    setMmActiveSlot(0);
    
    const task = getCurrentTask();
    if (task && task.type === 'mastermind') {
      const displayLength = room?.current_task_state?.codeLength || 5;
      setMmCurrentGuess(Array(displayLength).fill(0));
    } else {
      setMmCurrentGuess([0, 0, 0, 0, 0]);
    }
  }, [room?.current_task_id]);

  const selectNextTask = async (currentRoom, currentPlayers, forcePersonal = false) => {
    const usedTasks = currentRoom.current_task_state?.usedTasks || [];
    const taskHistory = currentRoom.current_task_state?.taskHistory || [];
    const enabledCats = currentRoom.current_task_state?.enabledCategories || ["Disney Dagboek", "Pictionary", "Inschattingsvragen", "Dilemma", "Emoji Quiz", "Wie ben ik?", "Feit of Fabel", "Quiz", "Samen"];
    const isBonusRound = ((currentRoom.round || 0) + 1) % 4 === 0;
    const automaticBonusChoices = isBonusRound
      ? Object.fromEntries(currentPlayers.map(player => [player.id, 'normal']))
      : {};

    const activeTasks = DEFAULT_TASKS.filter(t => 
      t.active !== false && 
      t.type !== 'mastermind' &&
      (currentRoom.game_mode === 'mix' || t.cat === currentRoom.game_mode) &&
      enabledCats.includes(t.cat)
    );
    
    if (!activeTasks.length) {
      alert("Geen opdrachten beschikbaar voor de gekozen categorieën.");
      return;
    }

    const categoryHistory = currentRoom.current_task_state?.categoryHistory || [];
    const recentCategories = categoryHistory.slice(-4);
    let eligibleCategories = currentRoom.game_mode === 'mix'
      ? enabledCats.filter(category => category === 'Quiz' || activeTasks.some(task => task.cat === category))
      : [currentRoom.game_mode];
    if (eligibleCategories.length > 1 && currentRoom.current_task_state?.lastCat) {
      eligibleCategories = eligibleCategories.filter(category => category !== currentRoom.current_task_state.lastCat);
    }
    if (recentCategories.filter(category => category === 'Quiz').length >= 2 && eligibleCategories.length > 1) {
      eligibleCategories = eligibleCategories.filter(category => category !== 'Quiz');
    }
    const categoryCounts = Object.fromEntries(enabledCats.map(category => [
      category,
      categoryHistory.filter(usedCategory => usedCategory === category).length
    ]));
    const lowestCategoryCount = Math.min(...eligibleCategories.map(category => categoryCounts[category] || 0));
    const balancedCategories = eligibleCategories.filter(category => (categoryCounts[category] || 0) === lowestCategoryCount);
    const selectedCategory = balancedCategories[Math.floor(Math.random() * balancedCategories.length)] || eligibleCategories[0];

    if (selectedCategory === "Quiz") {
      // Direct choice of quiz difficulty
      await updateRoomState(currentRoom.id, {
        current_task_id: 'quiz-choice',
        current_task_state: {
          ...currentRoom.current_task_state,
          categoryHistory: [...categoryHistory, 'Quiz'],
          lastCat: 'Quiz',
          stagePause: false,
          roundPhase: 'difficulty',
          bonusRound: isBonusRound,
          doubleWishChoices: automaticBonusChoices
        }
      });
      return;
    }

    let pool = activeTasks.filter(task => task.cat === selectedCategory);
    if (currentRoom.game_mode === "mix" && forcePersonal) {
      pool = pool.filter(t => t.type !== "group");
    }

    const player = currentPlayers[currentRoom.current_player_index];
    const unused = pool.filter(t => !usedTasks.includes(t.id));
    const wasSeen = (tid) => taskHistory.some(h => h.taskId === tid);
    const wasSeenByPlayer = (tid, pid) => taskHistory.some(h => h.taskId === tid && h.playerId === pid);

    const neverSeen = list => list.filter(t => !wasSeen(t.id));
    const notForPlayer = list => currentRoom.game_mode === "Samen" ? list : list.filter(t => !wasSeenByPlayer(t.id, player.id));

    const stages = [
      neverSeen(unused),
      notForPlayer(unused),
      unused,
      notForPlayer(pool),
      pool
    ];

    let candidates = stages.find(list => list.length) || pool;
    
    if (currentRoom.game_mode === "mix" && currentRoom.current_task_state?.lastCat) {
      const varied = candidates.filter(t => t.cat !== currentRoom.current_task_state.lastCat);
      if (varied.length) candidates = varied;
    }

    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    if (!selected) return;

    const newUsed = [...usedTasks];
    if (!newUsed.includes(selected.id)) newUsed.push(selected.id);

    const isGroup = selected.type === "group";
    const newHistory = [...taskHistory, {
      taskId: selected.id,
      playerId: isGroup ? null : player?.id,
      playerName: isGroup ? "Samen" : player?.name,
      shownAt: new Date().toISOString()
    }];

    await updateRoomState(currentRoom.id, {
      current_task_id: selected.id,
      current_task_state: {
        ...currentRoom.current_task_state,
        usedTasks: newUsed,
        taskHistory: newHistory,
        categoryHistory: [...categoryHistory, selected.cat],
        lastCat: selected.cat,
        stagePause: false,
        part: selected.type === 'diary' ? 1 : undefined,
        answers: selected.type === 'diary' ? {} : undefined,
        lines: selected.type === 'draw' ? [] : undefined,
        pictionaryGuesses: selected.type === 'draw' ? {} : undefined,
        estimate: undefined,
        estimates: {},
        votes: (selected.type === 'dilemma' || selected.type === 'estimate') ? {} : undefined,
        tinkActive: false,
        hyperdriveActive: false,
        timerStartedAt: null,
        timerDuration: null,
        quizLocked: false,
        selectedAnswer: undefined,
        quizAnswers: {},
        quizAwarded: {},
        genericAnswers: {},
        genericAwarded: {},
        hintLevel: 1,
        hostReviews: {},
        bonusRound: isBonusRound,
        roundPhase: 'announcement',
        doubleWishChoices: automaticBonusChoices
      }
    });
  };

  const handleCreateRoom = async () => {
    const profileName = activeProfileName || playerNameInput.trim();
    if (!profileName) {
      setError("Voer een naam in om te kunnen starten.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const mode = (selectedCats.length === 1 && selectedCats[0] === "Samen") ? "Samen" : "mix";
      const totalRounds = roundsPerPlayer;
      const { room: r, player: p } = await createRoom(mode, 1, roundsPerPlayer, profileName);
      const facilitator = roadHostRole === 'facilitator' ? { id: p.id, name: p.name } : null;
      const initialTaskState = {
        ...(r.current_task_state || {}),
        facilitator,
        hostRole: roadHostRole
      };
      await updateRoomState(r.id, { total_rounds: totalRounds, current_task_state: initialTaskState });
      r.total_rounds = totalRounds;
      r.current_task_state = initialTaskState;

      if (facilitator) {
        const { error: removeHostError } = await supabase.from('players').delete().eq('id', p.id);
        if (removeHostError) throw removeHostError;
      }

      setRoom(r);
      setPlayers(facilitator ? [] : [p]);
      setLocalPlayer(p);
      
      localStorage.setItem('disney_room_id', r.id);
      localStorage.setItem('disney_player_id', p.id);
      localStorage.setItem('disney_player_name', p.name);

      setScreen('lobby');
    } catch (e) {
      setError("Kamer aanmaken mislukt: " + (e.message || e.toString() || "Onbekende fout"));
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    const profileName = activeProfileName || playerNameInput.trim();
    if (!roomCodeInput.trim() || !profileName) {
      setError("Voer zowel de kamercode als je naam in.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { room: r, player: p } = await joinRoom(roomCodeInput, profileName);
      setRoom(r);
      setLocalPlayer(p);

      localStorage.setItem('disney_room_id', r.id);
      localStorage.setItem('disney_player_id', p.id);
      localStorage.setItem('disney_player_name', p.name);

      const { players: list, scoreHistory: sh } = await fetchRoomData(r.id);
      setPlayers(list);
      setScoreHistory(sh);

      if (r.status === 'lobby') {
        setScreen('lobby');
      } else {
        setScreen('game');
      }
    } catch (e) {
      setError(e.message || "Deelnemen mislukt.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (players.length < 1) {
      alert("Er is minimaal 1 speler nodig om te starten.");
      return;
    }
    const arcadeMaxPlayers = room?.current_task_state?.arcadeMaxPlayers;
    if (room?.game_mode?.startsWith('arcade-') && arcadeMaxPlayers && players.length > arcadeMaxPlayers) {
      alert(`Dit Arena-spel is geschikt voor maximaal ${arcadeMaxPlayers} speler${arcadeMaxPlayers === 1 ? '' : 's'}.`);
      return;
    }
    setLoading(true);
    try {
      if (room?.game_mode?.startsWith('arcade-')) {
        await updateRoomState(room.id, {
          status: 'playing',
          current_player_index: 0,
          current_task_state: {
            ...(room.current_task_state || {})
          }
        });
        setLoading(false);
        return;
      }
      const startingIndex = 0;
      const totalRounds = room.rounds_per_player;

      await updateRoomState(room.id, {
        status: 'playing',
        current_player_index: startingIndex,
        round: 0,
        total_rounds: totalRounds,
        current_task_state: {
          ...room.current_task_state,
          player_hands: {},
          doubleWishUsed: {},
          doubleWishChoices: {},
          enabledCategories: selectedCats
        }
      });

      const { room: updatedRoom } = await fetchRoomData(room.id);
      setRoom(updatedRoom);

      await selectNextTask(updatedRoom, players);
      const { room: readyRoom, players: readyPlayers } = await fetchRoomData(room.id);
      setRoom(readyRoom);
      setPlayers(readyPlayers);
      setScreen('game');
    } catch (e) {
      console.error("Game start failed", e);
    } finally {
      setLoading(false);
    }
  };

  const handleChooseDifficulty = async (difficulty) => {
    const active = DEFAULT_TASKS.filter(t => t.active !== false && t.type === 'quiz' && t.difficulty === difficulty);
    const usedTasks = room.current_task_state?.usedTasks || [];
    const unused = active.filter(t => !usedTasks.includes(t.id));
    const candidates = unused.length ? unused : active;
    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    
    if (!selected) {
      alert("Geen quizvragen gevonden voor dit niveau. Selecteer een andere moeilijkheid.");
      return;
    }

    const points = { easy: 1, medium: 2, hard: 3 }[difficulty];
    const newUsed = [...usedTasks];
    if (!newUsed.includes(selected.id)) newUsed.push(selected.id);

    await updateRoomState(room.id, {
      current_task_id: selected.id,
      current_task_state: {
        ...room.current_task_state,
        usedTasks: newUsed,
        quizPoints: points,
        quizDifficulty: difficulty,
        quizLocked: false,
        selectedAnswer: undefined,
        quizAnswers: {},
        quizAwarded: {},
        genericAnswers: {},
        genericAwarded: {},
        hintLevel: 1,
        hostReviews: {},
        roundPhase: 'announcement',
        doubleWishChoices: room.current_task_state?.bonusRound
          ? Object.fromEntries(players.map(player => [player.id, 'normal']))
          : {}
      }
    });
  };

  const getRoundMultiplier = (playerId, state = room?.current_task_state) => (
    state?.bonusRound || state?.doubleWishChoices?.[playerId] === 'double' ? 2 : 1
  );

  const handleDoubleWishChoice = async (choice) => {
    if (isFacilitatorHost()) return;
    if (!localPlayer?.id || !room?.id) return;
    const { room: freshRoom } = await fetchRoomData(room.id);
    const freshState = freshRoom.current_task_state || {};
    const choices = { ...(freshState.doubleWishChoices || {}) };
    if (choices[localPlayer.id]) return;
    const used = { ...(freshState.doubleWishUsed || {}) };
    const selectedChoice = choice === 'double' && !used[localPlayer.id] ? 'double' : 'normal';
    choices[localPlayer.id] = selectedChoice;
    if (selectedChoice === 'double') used[localPlayer.id] = true;
    await updateRoomState(room.id, {
      current_task_state: {
        ...freshState,
        doubleWishChoices: choices,
        doubleWishUsed: used
      }
    });
  };

  const handleRevealRound = async () => {
    if (!room?.id || !isRoomHost()) return;
    await updateRoomState(room.id, {
      current_task_state: {
        ...room.current_task_state,
        roundPhase: 'playing'
      }
    });
  };

  const handleAnswerQuiz = async (answerIndex, correctAnswerIndex, points) => {
    if (isFacilitatorHost()) return;
    if (room.current_task_state?.quizLocked) return;
    if (!localPlayer?.id) return;

    const { room: freshRoom, players: freshPlayers } = await fetchRoomData(room.id);
    const freshState = freshRoom.current_task_state || {};
    if (freshState.quizLocked) return;

    const quizAnswers = { ...(freshState.quizAnswers || {}) };
    if (quizAnswers[localPlayer.id] !== undefined) return;

    quizAnswers[localPlayer.id] = answerIndex;

    const isCorrect = answerIndex === correctAnswerIndex;
    const ptsToAward = points * getRoundMultiplier(localPlayer.id, freshState);
    const quizAwarded = { ...(freshState.quizAwarded || {}) };

    if (isCorrect && !quizAwarded[localPlayer.id]) {
      await addPlayerScore(
        room.id, 
        freshPlayers.find(p => p.id === localPlayer.id) || localPlayer, 
        ptsToAward, 
        `Quiz ${room.current_task_state.quizDifficulty || 'makkelijk'}: ${getCurrentTask()?.text}`,
        'knowledge',
        getCurrentTask()
      );
      quizAwarded[localPlayer.id] = true;
    }

    const allAnswered = freshPlayers.every(p => quizAnswers[p.id] !== undefined);

    await updateRoomState(room.id, {
      current_task_state: {
        ...freshState,
        quizAnswers,
        quizAwarded,
        quizLocked: allAnswered,
        selectedAnswer: allAnswered ? answerIndex : undefined
      }
    });
  };

  const handleFinishTask = async () => {
    setQuizLocked(false);
    setQuizSelectedAnswer(null);
    setLocalEstimate('');

    if (room?.id === 'solo') {
      if (!soloLoggedRef.current) {
        logSoloAttempt(0);
        soloLoggedRef.current = true;
      }
      const isArenaGame = room.game_mode?.startsWith('arcade-');
      if (isArenaGame) clearArenaSave(room.game_mode.replace('arcade-', ''));
      const targetScreen = isArenaGame ? 'arcade_select' : 'solo_select';
      setRoom(null);
      setScreen(targetScreen);
      return;
    }

    if (room?.game_mode?.startsWith('arcade-')) {
      clearArenaSave(room.game_mode.replace('arcade-', ''));
      await updateRoomState(room.id, {
        status: 'ended'
      });
      setScreen('end');
      return;
    }

    const currentTask = getCurrentTask();

    const wasGroup = currentTask?.type === "group";
    const nextRound = (room.round || 0) + 1;

    if (nextRound >= room.total_rounds) {
      await updateRoomState(room.id, {
        status: 'ended',
        round: nextRound
      });
      setScreen('end');
      return;
    }

    const pauseInterval = isGroupOnly() ? 5 : 6;
    const triggerPause = nextRound > 0 && nextRound % pauseInterval === 0;

    let nextPlayerIndex = room.current_player_index;
    if (!wasGroup) {
      let candidateNextIdx = (room.current_player_index + 1) % players.length;
      const candidatePlayer = players[candidateNextIdx];
      const frozenPlayers = room.current_task_state?.frozenPlayers || {};

      if (frozenPlayers[candidatePlayer.id]) {
        frozenPlayers[candidatePlayer.id] = false;
        candidateNextIdx = (candidateNextIdx + 1) % players.length;
      }
      nextPlayerIndex = candidateNextIdx;
    }

    await updateRoomState(room.id, {
      round: nextRound,
      current_player_index: nextPlayerIndex,
      current_task_state: {
        ...room.current_task_state,
        frozenPlayers: room.current_task_state?.frozenPlayers || {},
        stagePause: triggerPause,
        timerStartedAt: null,
        timerDuration: null
      }
    });

    if (triggerPause) {
      setStagePause(true);
      return;
    }

    const { room: r, players: p } = await fetchRoomData(room.id);
    setRoom(r);
    setPlayers(p);

    await selectNextTask(r, p, wasGroup && room.game_mode === 'mix');
  };

  const handleSkipTask = async (neverShowAgain = false) => {
    setQuizLocked(false);
    setQuizSelectedAnswer(null);
    setLocalEstimate('');

    if (room?.id === 'solo') {
      if (!soloLoggedRef.current) {
        logSoloAttempt(0, "Opdracht overgeslagen");
        soloLoggedRef.current = true;
      }
      const targetScreen = room.game_mode?.startsWith('arcade-') ? 'arcade_select' : 'solo_select';
      setRoom(null);
      setScreen(targetScreen);
      return;
    }

    if (neverShowAgain && room.current_task_id) {
      const deactivated = room.current_task_state?.deactivated || [];
      deactivated.push(room.current_task_id);
      await updateRoomState(room.id, {
        current_task_state: { ...room.current_task_state, deactivated }
      });
    }

    const { room: r, players: p } = await fetchRoomData(room.id);
    await selectNextTask(r, p);
  };

  const handleScoreAward = async (playerIndex, points, type) => {
    const targetPlayer = players[playerIndex];
    const ptsToAward = points * getRoundMultiplier(targetPlayer?.id);

    await addPlayerScore(
      room.id,
      targetPlayer,
      ptsToAward,
      `${getCurrentTask()?.cat}: ${getCurrentTask()?.title || getCurrentTask()?.text}`,
      type === 'creative' ? 'creative' : 'general',
      getCurrentTask()
    );
    await handleFinishTask();
  };

  const handleGroupScoreAward = async (points) => {
    await Promise.all(players.map(p => 
      addPlayerScore(
        room.id,
        p,
        points * getRoundMultiplier(p.id),
        `Gezamenlijke missie: ${getCurrentTask()?.text}`,
        'general',
        getCurrentTask()
      )
    ));
    await handleFinishTask();
  };

  const handleStartGroupTimer = async (duration = 45) => {
    if (!room?.id || room.id === 'solo') return;
    await updateRoomState(room.id, {
      current_task_state: {
        ...room.current_task_state,
        timerStartedAt: new Date().toISOString(),
        timerDuration: duration
      }
    });
  };

  const handleContinueStage = async () => {
    setStagePause(false);
    await updateRoomState(room.id, {
      current_task_state: {
        ...room.current_task_state,
        stagePause: false
      }
    });

    const { room: r, players: p } = await fetchRoomData(room.id);
    setRoom(r);
    setPlayers(p);
    await selectNextTask(r, p);
  };

  const handleNewGameStart = async () => {
    await leaveCurrentRoom('portal');
  };

  const handleAddTask = () => {
    const text = document.getElementById("newText")?.value?.trim();
    const cat = document.getElementById("newCat")?.value;
    if (!text) return;

    const newTask = {
      id: "custom-" + Date.now(),
      cat,
      type: "vote",
      title: "Eigen opdracht",
      text,
      points: 2,
      active: true
    };

    setCustomTasks(prev => [newTask, ...prev]);
    alert("Opdracht toegevoegd!");
    document.getElementById("newText").value = "";
  };

  // Force Sync/Resynchronise Connection Action
  const handleForceSync = async () => {
    setLoading(true);
    try {
      const { room: r, players: p, scoreHistory: sh } = await fetchRoomData(room.id);
      setRoom(r);
      setPlayers(p);
      setScoreHistory(sh);
      
      // reset local locks
      setQuizLocked(false);
      setQuizSelectedAnswer(null);
      setWhoamiLocked(false);
      setWhoamiSelected(null);
      setFactLocked(false);
      setFactSelected(null);
      setLocalEstimate('');

      if (r.status === 'lobby') setScreen('lobby');
      else if (r.status === 'playing') setScreen('game');
      else if (r.status === 'ended') setScreen('end');
    } catch (e) {
      console.error("Force sync failed:", e);
    } finally {
      setLoading(false);
    }
  };

  // --- NEW INTERACTIVE HANDLERS ---

  // Pictionary Drawing Canvas
  const handleSvgPointerDown = (e, isMyTurn) => {
    if (!isMyTurn) return;
    setIsDrawing(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 400;
    const y = ((e.clientY - rect.top) / rect.height) * 300;
    setDrawingPoints([{ x, y }]);
  };

  const handleSvgPointerMove = (e, isMyTurn) => {
    if (!isDrawing || !isMyTurn) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 400;
    const y = ((e.clientY - rect.top) / rect.height) * 300;
    setDrawingPoints(prev => [...prev, { x, y }]);
  };

  const handleSvgPointerUp = async (isMyTurn) => {
    if (!isDrawing || !isMyTurn) return;
    setIsDrawing(false);
    if (drawingPoints.length < 2) return;
    const newLine = { points: drawingPoints, color: '#ffd45c', width: 4 };
    const updatedLines = [...(room.current_task_state.lines || []), newLine];
    
    await updateRoomState(room.id, {
      current_task_state: {
        ...room.current_task_state,
        lines: updatedLines
      }
    });
    setDrawingPoints([]);
  };

  const handleClearDrawing = async () => {
    await updateRoomState(room.id, {
      current_task_state: {
        ...room.current_task_state,
        lines: []
      }
    });
  };

  const handleUndoDrawing = async () => {
    const lines = [...(room.current_task_state.lines || [])];
    if (lines.length > 0) {
      lines.pop();
      await updateRoomState(room.id, {
        current_task_state: {
          ...room.current_task_state,
          lines
        }
      });
    }
  };

  const handlePictionaryGuessed = async (playerIndex) => {
    const drawer = players[room.current_player_index];
    const guesser = players[playerIndex];
    
    await addPlayerScore(room.id, guesser, 2 * getRoundMultiplier(guesser.id), "Pictionary: woord correct geraden!", "creative");
    await addPlayerScore(room.id, drawer, 2 * getRoundMultiplier(drawer.id), "Pictionary: succesvol getekend!", "creative");
    await handleFinishTask();
  };

  // Dilemma
  const handleVoteDilemma = async (option) => {
    if (isFacilitatorHost()) return;
    const votes = room.current_task_state.votes || {};
    votes[localPlayer.id] = option;
    await updateRoomState(room.id, {
      current_task_state: {
        ...room.current_task_state,
        votes
      }
    });
  };

  const handleResolveDilemma = async (t) => {
    const votes = room.current_task_state.votes || {};
    const countA = Object.values(votes).filter(v => v === 'A').length;
    const countB = Object.values(votes).filter(v => v === 'B').length;
    
    let winner = 'tie';
    if (countA > countB) winner = 'A';
    if (countB > countA) winner = 'B';

    await Promise.all(players.map(p => {
      const pVote = votes[p.id];
      if (winner === 'tie' || pVote === winner) {
        return addPlayerScore(room.id, p, getRoundMultiplier(p.id), `Dilemma: gestemd met de meerderheid`, 'general');
      }
      return Promise.resolve();
    }));

    await handleFinishTask();
  };

  // Inschattingsvragen
  const handleSendEstimate = async () => {
    if (isFacilitatorHost()) return;
    const val = Math.round(Number(localEstimate));
    if (isNaN(val)) return;
    const { room: freshRoom } = await fetchRoomData(room.id);
    const freshState = freshRoom.current_task_state || {};
    const estimates = { ...(freshState.estimates || {}) };
    if (estimates[localPlayer.id] !== undefined) return;
    estimates[localPlayer.id] = val;
    await updateRoomState(room.id, {
      current_task_state: {
        ...freshState,
        estimates
      }
    });
    setLocalEstimate('');
  };

  const handleVoteEstimate = async (direction) => {
    const votes = room.current_task_state.votes || {};
    votes[localPlayer.id] = direction;
    await updateRoomState(room.id, {
      current_task_state: {
        ...room.current_task_state,
        votes
      }
    });
  };

  const handleResolveEstimate = async (t) => {
    const correct = t.correct_value;
    const estimates = room.current_task_state.estimates || {};
    const distances = players
      .filter(p => estimates[p.id] !== undefined)
      .map(p => ({ player: p, distance: Math.abs(Number(estimates[p.id]) - correct) }));
    const bestDistance = distances.length ? Math.min(...distances.map(item => item.distance)) : null;
    await Promise.all(distances
      .filter(item => item.distance === bestDistance)
      .map(({ player }) => addPlayerScore(
        room.id,
        player,
        2 * getRoundMultiplier(player.id),
        `Inschattingsvraag: dichtst bij ${correct} ${t.unit}`,
        'knowledge'
      )));

    await handleFinishTask();
  };

  const handleSubmitPictionaryGuess = async (t) => {
    if (isFacilitatorHost()) return;
    const typed = localEstimate.trim();
    if (!typed || !localPlayer?.id) return;
    const { room: freshRoom, players: freshPlayers } = await fetchRoomData(room.id);
    const freshState = freshRoom.current_task_state || {};
    const guesses = { ...(freshState.pictionaryGuesses || {}) };
    if (guesses[localPlayer.id]) return;
    const correct = match(typed, [t.text]);
    guesses[localPlayer.id] = { text: typed, correct };
    if (correct) {
      await addPlayerScore(
        room.id,
        freshPlayers.find(p => p.id === localPlayer.id) || localPlayer,
        2 * getRoundMultiplier(localPlayer.id, freshState),
        'Pictionary: tekening correct geraden',
        'creative'
      );
    }
    await updateRoomState(room.id, {
      current_task_state: { ...freshState, pictionaryGuesses: guesses }
    });
    setLocalEstimate('');
  };

  const handleResolvePictionary = async () => {
    const drawer = players[room.current_player_index];
    const guesses = room.current_task_state?.pictionaryGuesses || {};
    const reviews = room.current_task_state?.hostReviews || {};
    const task = getCurrentTask();
    const hasCorrectGuess = Object.entries(guesses).some(([playerId, guess]) => {
      const review = reviews[`${task?.id || room.current_task_id}:${playerId}`];
      return review?.correct ?? guess?.correct;
    });
    if (drawer && hasCorrectGuess) {
      await addPlayerScore(
        room.id,
        drawer,
        2 * getRoundMultiplier(drawer.id),
        'Pictionary: tekening succesvol geraden',
        'creative'
      );
    }
    await handleFinishTask();
  };

  // Disney Dagboek
  const handleSubmitDiaryPart = async (partNum) => {
    if (isFacilitatorHost()) return;
    const answers = room.current_task_state.answers || {};
    const pAns = answers[localPlayer.id] || {};
    pAns[`part${partNum}`] = { char: diaryChar.trim(), movie: diaryMovie.trim() };
    answers[localPlayer.id] = pAns;
    
    await updateRoomState(room.id, {
      current_task_state: {
        ...room.current_task_state,
        answers
      }
    });
    
    setDiaryChar('');
    setDiaryMovie('');
  };

  const handleNextDiaryPart = async (nextPart) => {
    await updateRoomState(room.id, {
      current_task_state: {
        ...room.current_task_state,
        part: nextPart
      }
    });
  };

  const handleResolveDiary = async (t) => {
    const answers = room.current_task_state.answers || {};
    const reviews = room.current_task_state.hostReviews || {};

    await Promise.all(players.map(p => {
      const pAns = answers[p.id] || {};
      let score = 0;

      ['part1', 'part2', 'part3'].forEach(pk => {
        const entry = pAns[pk];
        if (entry) {
          const charCorrect = match(entry.char, [t.character_nl, t.character_en, ...(t.character_aliases || [])]);
          const movieCorrect = match(entry.movie, [t.movie_nl, t.movie_en, ...(t.movie_aliases || [])]);
          const review = reviews[`${t.id || room.current_task_id}:${p.id}:${pk}`];
          if (review?.correct ?? (charCorrect && movieCorrect)) score++;
        }
      });

      if (score > 0) {
        return addPlayerScore(room.id, p, score * getRoundMultiplier(p.id), `Disney Dagboek: ${score} beurt(en) correct geraden`, 'knowledge');
      }
      return Promise.resolve();
    }));

    await handleFinishTask();
  };

  // Mastermind (Code Breaker)
  const handleMmSubmitGuess = () => {
    const feedback = checkGuess(mmCurrentGuess, mmCode);
    const updatedGuesses = [...mmGuesses, { guess: [...mmCurrentGuess], ...feedback }];
    setMmGuesses(updatedGuesses);
    
    if (feedback.black === mmCode.length) {
      setMmSolved(true);
      const rating = getMmRating(updatedGuesses.length, mmCode.length, mmMaxTurns);
      const basePts = rating.points;
      const pts = basePts * getRoundMultiplier(localPlayer?.id);
      setMmPointsEarned(pts);
    } else if (updatedGuesses.length >= mmMaxTurns) {
      setMmFailed(true);
    }
  };

  const handleMmFinish = async (pts) => {
    if (pts > 0) {
      await addPlayerScore(room.id, localPlayer, pts, `Mastermind gekraakt in ${mmGuesses.length} beurten`, 'knowledge');
    }
    await handleFinishTask();
  };

  // Wie ben ik
  const handleWhoamiAnswer = async (idx, t) => {
    if (isFacilitatorHost()) return;
    if (!localPlayer?.id) return;
    const { room: freshRoom, players: freshPlayers } = await fetchRoomData(room.id);
    const freshState = freshRoom.current_task_state || {};
    const genericAnswers = { ...(freshState.genericAnswers || {}) };
    if (genericAnswers[localPlayer.id] !== undefined) return;
    genericAnswers[localPlayer.id] = idx;
    const correct = idx === t.correct;
    const hintLevel = freshState.hintLevel || 1;
    const genericAwarded = { ...(freshState.genericAwarded || {}) };
    if (correct && !genericAwarded[localPlayer.id]) {
      const basePts = hintLevel === 1 ? 3 : hintLevel === 2 ? 2 : 1;
      const pts = basePts * getRoundMultiplier(localPlayer.id, freshState);
      await addPlayerScore(room.id, freshPlayers.find(p => p.id === localPlayer.id) || localPlayer, pts, `Hint Quest: correct geraden met ${hintLevel} hint(s)`, 'knowledge');
      genericAwarded[localPlayer.id] = true;
    }
    const allAnswered = freshPlayers.every(p => genericAnswers[p.id] !== undefined);
    await updateRoomState(room.id, {
      current_task_state: {
        ...freshState,
        genericAnswers,
        genericAwarded,
        quizLocked: allAnswered
      }
    });
  };

  const handleRevealWhoamiHint = async (level) => {
    if (!isRoomHost()) return;
    await updateRoomState(room.id, {
      current_task_state: { ...room.current_task_state, hintLevel: level }
    });
  };

  // Feit of Fabel
  const handleFactAnswer = async (isTrue, t) => {
    if (isFacilitatorHost()) return;
    if (!localPlayer?.id) return;
    const { room: freshRoom, players: freshPlayers } = await fetchRoomData(room.id);
    const freshState = freshRoom.current_task_state || {};
    const genericAnswers = { ...(freshState.genericAnswers || {}) };
    if (genericAnswers[localPlayer.id] !== undefined) return;
    genericAnswers[localPlayer.id] = isTrue;
    const correct = isTrue === t.correct;
    const genericAwarded = { ...(freshState.genericAwarded || {}) };
    if (correct && !genericAwarded[localPlayer.id]) {
      const pts = 2 * getRoundMultiplier(localPlayer.id, freshState);
      await addPlayerScore(room.id, freshPlayers.find(p => p.id === localPlayer.id) || localPlayer, pts, `Feit of Fabel: stelling correct beoordeeld`, 'knowledge');
      genericAwarded[localPlayer.id] = true;
    }
    const allAnswered = freshPlayers.every(p => genericAnswers[p.id] !== undefined);
    await updateRoomState(room.id, {
      current_task_state: {
        ...freshState,
        genericAnswers,
        genericAwarded,
        quizLocked: allAnswered
      }
    });
  };

  // Emoji Quiz text submission
  const handleEmojiTextAnswer = async (t) => {
    if (isFacilitatorHost()) return;
    const typed = localEstimate.trim();
    if (!typed || !localPlayer?.id) return;
    const { room: freshRoom, players: freshPlayers } = await fetchRoomData(room.id);
    const freshState = freshRoom.current_task_state || {};
    const genericAnswers = { ...(freshState.genericAnswers || {}) };
    if (genericAnswers[localPlayer.id] !== undefined) return;
    genericAnswers[localPlayer.id] = typed;
    setQuizSelectedAnswer(typed);
    const isCorrect = match(typed, [t.movie_nl, t.movie_en, ...(t.movie_aliases || [])]);
    const genericAwarded = { ...(freshState.genericAwarded || {}) };
    if (isCorrect && !genericAwarded[localPlayer.id]) {
      const pts = 2 * getRoundMultiplier(localPlayer.id, freshState);
      await addPlayerScore(room.id, freshPlayers.find(p => p.id === localPlayer.id) || localPlayer, pts, `Emoji Quiz: correct geraden`, 'knowledge');
      genericAwarded[localPlayer.id] = true;
    }
    const allAnswered = freshPlayers.every(p => genericAnswers[p.id] !== undefined);
    await updateRoomState(room.id, {
      current_task_state: {
        ...freshState,
        genericAnswers,
        genericAwarded,
        quizLocked: allAnswered
      }
    });
    setLocalEstimate('');
  };

  // --- POWER CARDS PLAY LOGIC ---
  const handlePlayCard = async (cardKey, targetPlayerId = null) => {
    const hands = { ...(room.current_task_state.player_hands || {}) };
    let myHand = [...(hands[localPlayer.id] || [])];

    const idx = myHand.indexOf(cardKey);
    if (idx !== -1) {
      myHand.splice(idx, 1);
    }
    hands[localPlayer.id] = myHand;

    const newHistory = [
      ...(room.current_task_state.cardHistory || []),
      {
        card: cardKey,
        playedBy: localPlayer.name,
        target: targetPlayerId ? players.find(p => p.id === targetPlayerId)?.name : null,
        time: new Date().toISOString()
      }
    ];

    if (cardKey === 'fastpass') {
      await updateRoomState(room.id, {
        current_task_state: { ...room.current_task_state, player_hands: hands, cardHistory: newHistory }
      });
      await selectNextTask(room, players);
    } else if (cardKey === 'hyperdrive') {
      await updateRoomState(room.id, {
        current_task_state: { ...room.current_task_state, player_hands: hands, cardHistory: newHistory, hyperdriveActive: true }
      });
    } else if (cardKey === 'tink') {
      await updateRoomState(room.id, {
        current_task_state: { ...room.current_task_state, player_hands: hands, cardHistory: newHistory, tinkActive: true }
      });
    } else if (cardKey === 'time') {
      // Modify DB timestamps to add 30s to coop timer
      if (room.current_task_state.timerStartedAt) {
        const prevDuration = room.current_task_state.timerDuration || 45;
        await updateRoomState(room.id, {
          current_task_state: { 
            ...room.current_task_state, 
            player_hands: hands, 
            cardHistory: newHistory,
            timerDuration: prevDuration + 30 
          }
        });
      } else {
        await updateRoomState(room.id, {
          current_task_state: { ...room.current_task_state, player_hands: hands, cardHistory: newHistory }
        });
      }
    } else if (cardKey === 'wish') {
      const cardKeys = Object.keys(POWER_CARDS);
      for (let i = 0; i < 2; i++) {
        myHand.push(cardKeys[Math.floor(Math.random() * cardKeys.length)]);
      }
      hands[localPlayer.id] = myHand;
      await updateRoomState(room.id, {
        current_task_state: { ...room.current_task_state, player_hands: hands, cardHistory: newHistory }
      });
    } else if (cardKey === 'shortcut') {
      await updateRoomState(room.id, {
        current_task_state: { ...room.current_task_state, player_hands: hands, cardHistory: newHistory }
      });
      await selectNextTask(room, players);
    } else if (cardKey === 'elsa') {
      // Pauses timer for local players
      await updateRoomState(room.id, {
        current_task_state: { ...room.current_task_state, player_hands: hands, cardHistory: newHistory }
      });
    } else if (cardKey === 'kaahypnose') {
      if (room.current_task_state.timerStartedAt) {
        const prevDuration = room.current_task_state.timerDuration || 45;
        await updateRoomState(room.id, {
          current_task_state: { 
            ...room.current_task_state, 
            player_hands: hands, 
            cardHistory: newHistory,
            timerDuration: Math.max(5, Math.round(prevDuration / 2)) 
          }
        });
      } else {
        await updateRoomState(room.id, {
          current_task_state: { ...room.current_task_state, player_hands: hands, cardHistory: newHistory }
        });
      }
    }

    setZoomedCardKey(null);
    setCardFlipped(false);
  };

  const handlePlayAttackCard = async (cardKey, targetPlayerId) => {
    const hands = { ...(room.current_task_state.player_hands || {}) };
    let myHand = [...(hands[localPlayer.id] || [])];

    const idx = myHand.indexOf(cardKey);
    if (idx !== -1) {
      myHand.splice(idx, 1);
    }
    hands[localPlayer.id] = myHand;

    const newHistory = [
      ...(room.current_task_state.cardHistory || []),
      {
        card: cardKey,
        playedBy: localPlayer.name,
        target: players.find(p => p.id === targetPlayerId)?.name,
        time: new Date().toISOString()
      }
    ];

    await updateRoomState(room.id, {
      current_task_state: {
        ...room.current_task_state,
        player_hands: hands,
        cardHistory: newHistory,
        activeAttack: {
          card: cardKey,
          attackerId: localPlayer.id,
          targetId: targetPlayerId,
          timer: 6
        }
      }
    });

    setZoomedCardKey(null);
    setCardFlipped(false);
    setStrafTargetMode(null);
  };

  const handleDefendShield = async () => {
    const hands = { ...(room.current_task_state.player_hands || {}) };
    let myHand = [...(hands[localPlayer.id] || [])];

    const idx = myHand.indexOf('shield');
    if (idx !== -1) {
      myHand.splice(idx, 1);
    }
    hands[localPlayer.id] = myHand;

    const newHistory = [
      ...(room.current_task_state.cardHistory || []),
      {
        card: 'shield',
        playedBy: localPlayer.name,
        target: 'aanval geblokkeerd',
        time: new Date().toISOString()
      }
    ];

    await updateRoomState(room.id, {
      current_task_state: {
        ...room.current_task_state,
        player_hands: hands,
        activeAttack: null,
        cardHistory: newHistory
      }
    });
    setZoomedCardKey(null);
    setCardFlipped(false);
  };

  const handleDefendSpiegel = async () => {
    const hands = { ...(room.current_task_state.player_hands || {}) };
    let myHand = [...(hands[localPlayer.id] || [])];

    const idx = myHand.indexOf('spiegel');
    if (idx !== -1) {
      myHand.splice(idx, 1);
    }
    hands[localPlayer.id] = myHand;

    const newHistory = [
      ...(room.current_task_state.cardHistory || []),
      {
        card: 'spiegel',
        playedBy: localPlayer.name,
        target: 'aanval teruggekaatst',
        time: new Date().toISOString()
      }
    ];

    const currentAttack = room.current_task_state.activeAttack;
    await updateRoomState(room.id, {
      current_task_state: {
        ...room.current_task_state,
        player_hands: hands,
        activeAttack: {
          ...currentAttack,
          attackerId: localPlayer.id,
          targetId: currentAttack.attackerId,
          timer: 6
        },
        cardHistory: newHistory
      }
    });
    setZoomedCardKey(null);
    setCardFlipped(false);
  };

  const executeActiveAttack = async () => {
    const attack = room.current_task_state.activeAttack;
    const hands = { ...(room.current_task_state.player_hands || {}) };

    if (attack.card === 'autopech') {
      const frozen = { ...(room.current_task_state.frozenPlayers || {}) };
      frozen[attack.targetId] = true;
      await updateRoomState(room.id, {
        current_task_state: {
          ...room.current_task_state,
          frozenPlayers: frozen,
          activeAttack: null
        }
      });
    } else if (attack.card === 'apple') {
      const target = players.find(p => p.id === attack.targetId);
      const attacker = players.find(p => p.id === attack.attackerId);
      if (target && target.score > 0) {
        await addPlayerScore(room.id, target, -1, `Giftige Appel gespeeld door ${attacker?.name}`, 'general');
        if (attacker) {
          await addPlayerScore(room.id, attacker, 1, `Giftige Appel gestolen van ${target?.name}`, 'general');
        }
      }
      await updateRoomState(room.id, {
        current_task_state: {
          ...room.current_task_state,
          activeAttack: null
        }
      });
    } else if (attack.card === 'abu') {
      const targetHand = [...(hands[attack.targetId] || [])];
      const attackerHand = [...(hands[attack.attackerId] || [])];
      if (targetHand.length > 0) {
        const rIdx = Math.floor(Math.random() * targetHand.length);
        const stolen = targetHand.splice(rIdx, 1)[0];
        attackerHand.push(stolen);
        
        const newHands = {
          ...hands,
          [attack.targetId]: targetHand,
          [attack.attackerId]: attackerHand
        };
        await updateRoomState(room.id, {
          current_task_state: {
            ...room.current_task_state,
            player_hands: newHands,
            activeAttack: null
          }
        });
      } else {
        await updateRoomState(room.id, {
          current_task_state: {
            ...room.current_task_state,
            activeAttack: null
          }
        });
      }
    } else if (attack.card === 'kuzco') {
      const targetHand = [...(hands[attack.targetId] || [])];
      const attackerHand = [...(hands[attack.attackerId] || [])];
      
      const newHands = {
        ...hands,
        [attack.targetId]: attackerHand,
        [attack.attackerId]: targetHand
      };
      await updateRoomState(room.id, {
        current_task_state: {
          ...room.current_task_state,
          player_hands: newHands,
          activeAttack: null
        }
      });
    } else {
      await updateRoomState(room.id, {
        current_task_state: {
          ...room.current_task_state,
          activeAttack: null
        }
      });
    }
  };

  const handleCancelActiveAttack = async () => {
    if (!room) return;
    await updateRoomState(room.id, {
      current_task_state: {
        ...room.current_task_state,
        activeAttack: null
      }
    });
  };

  const handleHardRefresh = async () => {
    const shouldRefresh = window.confirm(
      'De game wordt volledig ververst. Je profiel, Coco Coins en scores blijven bewaard, maar een open kamer moet je daarna opnieuw openen.'
    );
    if (!shouldRefresh) return;

    setLoading(true);
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(registration => registration.update()));
      }

      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
      }
    } finally {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set('refresh', Date.now().toString());
      window.location.replace(nextUrl.toString());
    }
  };

  const handleOpenProfileManagement = () => {
    setSelectedPortalGame(null);
    setShowPortalShop(false);
    setActiveProfileName('');
    setPlayerNameInput('');
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
    localStorage.removeItem('disney_player_name');
  };

  // --- RENDERING HELPERS ---

  const handleGlobalHeaderBack = () => {
    if (screen === 'arcade_select' && selectedArcadeGame) {
      setSelectedArcadeGame(null);
      return;
    }
    if (screen === 'portal') {
      if (showPortalShop) {
        setShowPortalShop(false);
        return;
      }
      if (selectedPortalGame) {
        setSelectedPortalGame(null);
        return;
      }
      handleOpenProfileManagement();
      return;
    }

    if (screen === 'game' && room) {
      if (stagePause) {
        setScreen('scores');
        return;
      }
      if (room.id === 'solo') {
        const targetScreen = room.game_mode?.startsWith('arcade-') ? 'arcade_select' : 'solo_select';
        if (!room.game_mode?.startsWith('arcade-') && !soloLoggedRef.current) {
          logSoloAttempt(0, "Opdracht verlaten");
          soloLoggedRef.current = true;
        }
        setRoom(null);
        setScreen(targetScreen);
        return;
      }
      if (room.game_mode?.startsWith('arcade-')) {
        if (!window.confirm('Spel bewaren en teruggaan naar de Duel Arena? Je kunt dit duel later hervatten.')) return;
        localStorage.removeItem('disney_room_id');
        localStorage.removeItem('disney_player_id');
        setRoom(null);
        setPlayers([]);
        setScoreHistory([]);
        setLocalPlayer(null);
        setScreen('arcade_select');
        return;
      }
      setScoreReturnScreen('game');
      setScreen('scores');
      return;
    }

    if (screen === 'lobby' || screen === 'end') {
      handleNewGameStart();
      return;
    }
    if (screen === 'scores') {
      setScreen(scoreReturnScreen);
      return;
    }
    if (screen === 'scorelog' || screen === 'manage') {
      setScreen('scores');
      return;
    }

    setSelectedPortalGame(null);
    setShowPortalShop(false);
    setScreen('portal');
  };

  const openCoinViewer = () => {
    setCoinFlipped(false);
    setCoinPopupOpen(true);
  };

  useEffect(() => {
    if (!activeProfileName) return;
    const params = new URLSearchParams(window.location.search);
    const requestedAction = ['profile', 'coin', 'log'].find(action => params.get(action) === '1');
    if (!requestedAction) return;
    if (requestedAction === 'profile') openProfileAppearance(activeProfileName);
    if (requestedAction === 'coin') openCoinViewer();
    if (requestedAction === 'log') {
      setLogProfileName(activeProfileName);
      setOpenLedgerSection(null);
      setLogPopupOpen(true);
    }
    params.delete(requestedAction);
    const query = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
  }, [activeProfileName]);

  const renderAppHeader = () => {
    const key = getCollectorKey(activeProfileName);
    const balance = starBank[key] || 0;
    const profilePreference = getProfilePreference(activeProfileName);
    const profileAvatar = DISNEY_PROFILE_AVATARS.find(avatar => avatar.id === profilePreference?.avatar);
    const profileColor = DISNEY_PROFILE_COLORS.find(color => color.id === profilePreference?.color)?.hex || 'var(--gold)';

    return (
      <header className="topbar global-app-header">
        <div className="global-app-header-actions">
          <div className="global-profile-pill">
            <button
              type="button"
              className="global-profile-segment global-profile-name-segment"
              onClick={() => openProfileAppearance(activeProfileName)}
              title="Wijzig avatar en spelerskleur"
            >
              {profileAvatar && <img className="global-profile-avatar" src={assetPath(profileAvatar.image)} alt="" style={{ borderColor: profileColor }} />}
              <span className="global-profile-name">{activeProfileName}</span>
            </button>
            <span className="global-profile-divider" aria-hidden="true">·</span>
            <button type="button" className="global-profile-segment global-profile-balance-segment" onClick={openCoinViewer} aria-label={`Bekijk Coco Coin. Saldo: ${balance}`}>
              <span>{balance}</span><CocoCoinIcon size={20} />
            </button>
            <span className="global-profile-divider" aria-hidden="true">·</span>
            <button
              type="button"
              className="global-profile-segment global-log-anchor"
              onClick={() => {
                setLogProfileName(activeProfileName);
                setOpenLedgerSection(null);
                setLogPopupOpen(true);
              }}
              aria-label="Open Captain's Log"
            >⚓</button>
          </div>
          <button className="iconbtn" onClick={toggleThemeMode} aria-label={themeMode === 'day' ? 'Nachtstand inschakelen' : 'Dagstand inschakelen'}>
            {themeMode === 'day' ? "🌙" : "☀️"}
          </button>
          <button className="iconbtn" onClick={handleGlobalHeaderBack} aria-label="Terug">
            ←
          </button>
        </div>
      </header>
    );
  };

  const renderPortalDestinationHero = ({
    image,
    imageAlt,
    badge,
    title,
    accentTitle,
    description,
    onBack,
    theme = 'gold',
    imageClass = ''
  }) => (
    <section className={`card hero portal-destination-hero portal-destination-${theme}`}>
      <button
        type="button"
        className={`portal-destination-mark ${imageClass}`.trim()}
        onClick={onBack}
        aria-label="Terug naar Portal"
      >
        <img src={assetPath(image)} alt={imageAlt} />
      </button>
      <div className="badge">{badge}</div>
      <h1><span>{title}</span> <span className="portal-destination-accent">{accentTitle}</span></h1>
      <p>{description}</p>
    </section>
  );

  const renderScoreBar = () => {
    return (
      <div className="scorebar">
        {players.map(p => {
          const isFrozen = room?.current_task_state?.frozenPlayers?.[p.id];
          return (
            <div key={p.id} className="scorepill" style={{ border: isFrozen ? '1.5px solid var(--danger)' : undefined }}>
              <b>{p.name} {isFrozen ? "❄️" : ""}</b>
              <span>{p.score} ★</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderRouteProgressRoad = () => {
    if (room?.id === 'solo') return null;
    if (room?.game_mode?.startsWith('arcade-')) return null;
    if (!room?.total_rounds) return null;
    const pct = Math.min(100, Math.round((room.round / room.total_rounds) * 100));
    const stations = [
      { pct: 0, label: "Start", icon: "🔑" },
      { pct: 25, label: "Grens", icon: "🛂" },
      { pct: 50, label: "Parijs", icon: "🗼" },
      { pct: 75, label: "Sfeer", icon: "✨" },
      { pct: 100, label: "Park", icon: "🏰" }
    ];

    return (
      <div className="road-progress-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)' }}>
          <span>Etappe Routekaart</span>
          <strong>{pct}% voltooid ({room.round}/{room.total_rounds} rondes)</strong>
        </div>
        
        <div className="road-strip">
          <div className="road-dashed"></div>
          {stations.map((s, idx) => (
            <div 
              key={idx}
              className={`road-station ${pct >= s.pct ? 'passed' : ''}`}
              style={{ left: `${s.pct}%` }}
              title={s.label}
            >
              {s.icon}
            </div>
          ))}
          <div className="road-car" style={{ left: `${pct}%` }}>
            🚗💨
          </div>
        </div>
      </div>
    );
  };

  const getHostReviewKey = (task, playerId, state = room?.current_task_state) => (
    `${task.id || room?.current_task_id}:${playerId}${task.type === 'diary' ? `:part${state?.part || 1}` : ''}`
  );

  const handleHostReviewAnswer = async (task, player, response, desiredCorrect) => {
    if (!isFacilitatorHost() || !response || response.correct === null || response.correct === undefined) return;
    const { room: freshRoom, players: freshPlayers } = await fetchRoomData(room.id);
    const freshState = freshRoom.current_task_state || {};
    const reviewKey = getHostReviewKey(task, player.id, freshState);
    const reviews = { ...(freshState.hostReviews || {}) };
    const currentCorrect = reviews[reviewKey]?.correct ?? response.correct;
    if (currentCorrect === desiredCorrect) return;

    if (task.type !== 'diary') {
      const basePoints = task.type === 'quiz' ? (freshState.quizPoints || 1)
        : task.type === 'whoami' ? ((freshState.hintLevel || 1) === 1 ? 3 : (freshState.hintLevel || 1) === 2 ? 2 : 1)
        : 2;
      const points = basePoints * getRoundMultiplier(player.id, freshState);
      const delta = desiredCorrect ? points : -points;
      const freshPlayer = freshPlayers.find(item => item.id === player.id) || player;
      await addPlayerScore(
        room.id,
        freshPlayer,
        delta,
        `Spelleidercorrectie: ${task.title || task.cat} als ${desiredCorrect ? 'goed' : 'fout'} beoordeeld`,
        task.type === 'draw' ? 'creative' : 'knowledge',
        task
      );
    }

    reviews[reviewKey] = {
      correct: desiredCorrect,
      reviewedAt: new Date().toISOString(),
      reviewedBy: localPlayer?.name || 'Spelleider'
    };
    const { room: latestRoom } = await fetchRoomData(room.id);
    await updateRoomState(room.id, {
      current_task_state: {
        ...(latestRoom.current_task_state || {}),
        hostReviews: reviews
      }
    });
  };

  const renderFacilitatorDashboard = (task) => {
    if (!isFacilitatorHost() || room?.current_task_state?.roundPhase !== 'playing') return null;
    const state = room.current_task_state || {};
    const diaryPart = state.part || 1;
    const solution = task.type === 'quiz' ? task.answers?.[task.correct]
      : task.type === 'whoami' ? task.answers?.[task.correct]
      : task.type === 'fact' ? (task.correct ? 'FEIT' : 'FABEL')
      : task.type === 'emoji' ? `${task.movie_nl} / ${task.movie_en}`
      : task.type === 'diary' ? `${task.character_nl} · ${task.movie_nl}`
      : task.type === 'estimate' ? `${task.correct_value} ${task.unit}`
      : task.type === 'draw' ? task.text
      : null;
    const responseFor = (player) => {
      if (task.type === 'quiz') {
        const index = state.quizAnswers?.[player.id];
        return index === undefined ? null : { text: task.answers?.[index], correct: index === task.correct };
      }
      if (task.type === 'whoami') {
        const index = state.genericAnswers?.[player.id];
        return index === undefined ? null : { text: task.answers?.[index], correct: index === task.correct };
      }
      if (task.type === 'fact') {
        const answer = state.genericAnswers?.[player.id];
        return answer === undefined ? null : { text: answer ? 'FEIT' : 'FABEL', correct: answer === task.correct };
      }
      if (task.type === 'emoji') {
        const answer = state.genericAnswers?.[player.id];
        return answer === undefined ? null : { text: answer, correct: match(answer, [task.movie_nl, task.movie_en, ...(task.movie_aliases || [])]) };
      }
      if (task.type === 'diary') {
        const answer = state.answers?.[player.id]?.[`part${diaryPart}`];
        if (!answer) return null;
        return {
          text: `${answer.char} · ${answer.movie}`,
          correct: match(answer.char, [task.character_nl, task.character_en, ...(task.character_aliases || [])]) && match(answer.movie, [task.movie_nl, task.movie_en, ...(task.movie_aliases || [])])
        };
      }
      if (task.type === 'estimate') {
        const answer = state.estimates?.[player.id];
        return answer === undefined ? null : { text: `${answer} ${task.unit}`, correct: null };
      }
      if (task.type === 'dilemma') {
        const answer = state.votes?.[player.id];
        return answer === undefined ? null : { text: answer === 'A' ? task.optionA : task.optionB, correct: null };
      }
      if (task.type === 'draw') {
        if (player.id === players[room.current_player_index]?.id) return { text: 'Tekent momenteel', correct: null };
        const answer = state.pictionaryGuesses?.[player.id];
        return answer ? { text: answer.text, correct: answer.correct } : null;
      }
      return null;
    };
    return (
      <div className="notice" style={{ marginTop: '14px', borderColor: 'var(--gold)', background: '#10213e' }}>
        <strong style={{ display: 'block', color: 'var(--gold)', marginBottom: '8px' }}>👑 Spelleideroverzicht</strong>
        {solution && <p style={{ margin: '0 0 10px' }}><strong>Juiste antwoord:</strong> {solution}</p>}
        <div className="players">
          {players.map(player => {
            const response = responseFor(player);
            const review = state.hostReviews?.[getHostReviewKey(task, player.id, state)];
            const effectiveCorrect = review?.correct ?? response?.correct;
            const color = effectiveCorrect === true ? 'var(--ok)' : effectiveCorrect === false ? 'var(--danger)' : 'var(--muted)';
            return (
              <div key={player.id} className="playerline" style={{ marginBottom: '5px' }}>
                <span>{player.name}</span>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ color, display: 'block' }}>{response ? response.text : 'Nog aan het nadenken…'}</strong>
                  {response && response.correct !== null && response.correct !== undefined && (
                    <span style={{ display: 'inline-flex', gap: '5px', marginTop: '5px' }}>
                      <button
                        type="button"
                        className={`btn mini ${effectiveCorrect === true ? 'ok' : 'ghost'}`}
                        onClick={() => handleHostReviewAnswer(task, player, response, true)}
                      >
                        ✓ Goed
                      </button>
                      <button
                        type="button"
                        className={`btn mini ${effectiveCorrect === false ? 'danger' : 'ghost'}`}
                        onClick={() => handleHostReviewAnswer(task, player, response, false)}
                      >
                        ✕ Fout
                      </button>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="app">
      {/* 3D Styles Injection */}
      <style>{`
        .road-progress-container {
          background: rgba(21, 49, 95, 0.45);
          border: 1px solid #31517e;
          border-radius: 20px;
          padding: 12px 16px;
          margin-bottom: 16px;
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(12px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }
        .road-strip {
          height: 4px;
          background: #2b4974;
          border-radius: 99px;
          position: relative;
          margin: 18px 0 10px;
        }
        .road-dashed {
          position: absolute;
          top: 1px;
          left: 0;
          width: 100%;
          height: 2px;
          border-top: 1.5px dashed rgba(255,255,255,0.4);
        }
        .road-station {
          position: absolute;
          top: -12px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #0a1c3c;
          border: 2px solid #2b4974;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          cursor: pointer;
          transform: translateX(-50%);
          transition: all 0.3s;
          z-index: 10;
        }
        .road-station.passed {
          border-color: var(--gold);
          background: #173664;
          box-shadow: 0 0 10px rgba(255, 212, 92, 0.4);
        }
        .road-car {
          position: absolute;
          top: -16px;
          font-size: 20px;
          transform: translateX(-50%);
          transition: left 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          z-index: 20;
          animation: car-wobble 0.6s infinite alternate ease-in-out;
        }
        @keyframes car-wobble {
          from { transform: translateX(-50%) translateY(0) rotate(-1deg); }
          to { transform: translateX(-50%) translateY(-2px) rotate(1deg); }
        }
        .cards-hud {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-top: 18px;
          padding: 12px;
          background: rgba(21, 49, 95, 0.3);
          border: 1.5px dashed #2b4974;
          border-radius: 20px;
        }
        .mini-card-btn {
          width: 62px;
          height: 86px;
          border-radius: 12px;
          background: linear-gradient(135deg, #173564, #08162f);
          border: 1.5px solid #31517e;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .mini-card-btn:hover {
          transform: translateY(-6px) scale(1.05);
          border-color: var(--gold);
          box-shadow: 0 8px 16px rgba(255, 212, 92, 0.25);
        }
        .card-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          z-index: 999;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .card-3d-wrapper {
          width: 280px;
          height: 400px;
          perspective: 1000px;
        }
        .card-3d {
          width: 100%;
          height: 100%;
          position: relative;
          transform-style: preserve-3d;
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card-3d.flipped {
          transform: rotateY(180deg);
        }
        .card-front, .card-back {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          border-radius: 24px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 15px 35px rgba(0,0,0,0.5);
          border: 2px solid rgba(255,255,255,0.1);
        }
        .card-front {
          background: linear-gradient(135deg, #173664, #08162f);
          color: white;
        }
        .card-back {
          background: linear-gradient(135deg, #0e2447, #061126);
          transform: rotateY(180deg);
          border-color: var(--gold);
          color: #f8fbff;
        }
        .confetti-piece {
          position: fixed;
          width: 10px;
          height: 10px;
          animation: fall 3s infinite linear;
          z-index: 9999;
          top: -10px;
          border-radius: 20%;
        }
        @keyframes fall {
          0% { top: -10px; transform: translateX(0) rotate(0deg); }
          100% { top: 100vh; transform: translateX(100px) rotate(360deg); opacity: 0; }
        }
        .attack-notification {
          position: fixed;
          top: 20px;
          left: 5%;
          width: 90%;
          background: #4a101d;
          border: 2px solid var(--danger);
          border-radius: 16px;
          padding: 14px;
          color: white;
          z-index: 1000;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          animation: pulse-red 1.5s infinite alternate;
        }
        @keyframes pulse-red {
          from { box-shadow: 0 0 10px #ff7b8b55; }
          to { box-shadow: 0 0 25px #ff7b8bda; }
        }
        @keyframes glow-defense {
          from { 
            box-shadow: 0 4px 12px rgba(0,0,0,0.3), 0 0 5px rgba(255, 212, 92, 0.4); 
            border-color: #31517e; 
          }
          to { 
            box-shadow: 0 4px 12px rgba(0,0,0,0.3), 0 0 22px #ffd45c, inset 0 0 10px #ffd45c; 
            border-color: #ffd45c; 
            transform: translateY(-4px) scale(1.03);
          }
        }
        .glow-defense {
          animation: glow-defense 0.8s infinite alternate ease-in-out !important;
          border-color: #ffd45c !important;
        }
      `}</style>

      {/* A shared atmosphere makes day and night visually distinct on every route. */}
      {activeProfileName && (
        <div className={`theme-atmosphere theme-atmosphere-${themeMode}`} aria-hidden="true">
          {themeMode === 'night' ? (
            <>
              <div className="theme-moon"></div>
              {Array.from({ length: 28 }).map((_, i) => (
                <i
                  key={i}
                  className="theme-star"
                  style={{
                    top: `${(i * 37 + 7) % 88}%`,
                    left: `${(i * 61 + 13) % 97}%`,
                    animationDelay: `${(i % 7) * -0.37}s`,
                    animationDuration: `${1.8 + (i % 5) * 0.45}s`
                  }}
                />
              ))}
              <i className="theme-shooting-star theme-shooting-star-one"></i>
              <i className="theme-shooting-star theme-shooting-star-two"></i>
            </>
          ) : (
            <>
              <div className="theme-sun"></div>
              <i className="theme-cloud theme-cloud-one"></i>
              <i className="theme-cloud theme-cloud-two"></i>
              <i className="theme-cloud theme-cloud-three"></i>
            </>
          )}
        </div>
      )}

      {/* RENDER ACTIVE MULTIPLAYER ATTACK OVERLAY */}
      {room?.current_task_state?.activeAttack && (
        (() => {
          const attack = room.current_task_state.activeAttack;
          const attacker = players.find(p => p.id === attack.attackerId);
          const isMeTarget = attack.targetId === localPlayer?.id;
          const cardInfo = POWER_CARDS[attack.card];

          if (isMeTarget) {
            return (
              <div className="attack-notification">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '24px' }}>⚠️</span>
                    <div style={{ textAlign: 'left' }}>
                      <strong style={{ display: 'block', color: '#ff7b8b', fontSize: '14px' }}>GEVAAR!</strong>
                      <span style={{ fontSize: '13px' }}><strong>{attacker?.name}</strong> speelt <strong>{cardInfo?.name}</strong> op jou!</span>
                    </div>
                  </div>
                  <div className="timer" style={{ borderColor: 'var(--danger)', width: '42px', height: '42px', fontSize: '16px', margin: 0 }}>
                    {attack.timer}s
                  </div>
                </div>
                <p className="small" style={{ margin: '8px 0 0 0', color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>
                  Tik op een oplichtende verdedigingskaart in je hand om te blokkeren of te spiegelen!
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                  <button className="btn danger mini" onClick={handleCancelActiveAttack}>
                    Duel Overslaan / Annuleren 🚫
                  </button>
                </div>
              </div>
            );
          } else {
            const targetPlayerName = players.find(p => p.id === attack.targetId)?.name || "iemand";
            return (
              <div className="card-modal-overlay">
                <div className="card" style={{ width: '310px', textAlign: 'center', borderColor: 'var(--line)' }}>
                  <span style={{ fontSize: '38px' }}>🪄</span>
                  <h3>Magisch Duel</h3>
                  <p><strong>{attacker?.name}</strong> valt <strong>{targetPlayerName}</strong> aan met <strong>{cardInfo?.name}</strong>!</p>
                  <p className="small" style={{ marginBottom: '14px' }}>Wachten op reactie... ({attack.timer}s)</p>
                  <button className="btn secondary mini full" onClick={handleCancelActiveAttack}>
                    Duel Overslaan / Annuleren 🚫
                  </button>
                </div>
              </div>
            );
          }
        })()
      )}

      {/* RENDER TARGET SELECT MODAL FOR ATTACK CARDS */}
      {strafTargetMode && (
        <div className="card-modal-overlay">
          <div className="card" style={{ width: '300px' }}>
            <h3>Kies een speler</h3>
            <p>Op wie wil je {POWER_CARDS[strafTargetMode]?.name} spelen?</p>
            <div className="answers" style={{ marginTop: '14px' }}>
              {players.filter(p => p.id !== localPlayer.id).length === 0 ? (
                <div className="notice danger" style={{ margin: '10px 0', textAlign: 'center' }}>
                  Er zijn geen andere spelers om aan te vallen!
                </div>
              ) : (
                players
                  .filter(p => p.id !== localPlayer.id)
                  .map(p => (
                    <button 
                      key={p.id} 
                      className="answer"
                      onClick={() => handlePlayAttackCard(strafTargetMode, p.id)}
                    >
                      🎯 {p.name}
                    </button>
                  ))
              )}
              <button className="btn ghost full" style={{ marginTop: '8px' }} onClick={() => setStrafTargetMode(null)}>
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENDER 3D FLIP ZOOM MODAL FOR ACTIVE HAND CARDS */}
      {zoomedCardKey && (
        (() => {
          const card = POWER_CARDS[zoomedCardKey];
          return (
            <div className="card-modal-overlay">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <p className="small" style={{ color: 'var(--muted)' }}>Tik op de kaart om hem om te draaien!</p>
                
                <div className="card-3d-wrapper" onClick={() => setCardFlipped(prev => !prev)}>
                  <div className={`card-3d ${cardFlipped ? 'flipped' : ''}`}>
                    {/* Front: themed illustration & Title */}
                    <div className="card-front">
                      <div style={{ fontSize: '72px', margin: '40px 0 20px 0', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}>{card.icon}</div>
                      <h2 style={{ fontSize: '28px', color: 'var(--gold)', margin: 0 }}>{card.name}</h2>
                      <span className="badge">Disney Power-up</span>
                    </div>

                    {/* Back: details & action only */}
                    <div className="card-back">
                      <div style={{ pointerEvents: 'none' }}>
                        <h3 style={{ margin: '0 0 10px 0', color: 'var(--gold)', fontSize: '24px' }}>Uitleg</h3>
                        <hr style={{ margin: '8px 0' }} />
                        <p style={{ fontSize: '15px', lineHeight: '1.4', margin: '14px 0 0 0' }}>{card.desc}</p>
                      </div>
                      
                      <div className="answers" style={{ width: '100%' }} onClick={e => e.stopPropagation() /* stop flip bubble on buttons click */}>
                        {(() => {
                          const activeAttack = room?.current_task_state?.activeAttack;
                          const isMeTarget = activeAttack && activeAttack.targetId === localPlayer?.id;
                          const isDefending = isMeTarget && (zoomedCardKey === 'shield' || zoomedCardKey === 'spiegel');

                          if (isDefending) {
                            return (
                              <button 
                                className="btn ok full"
                                onClick={() => {
                                  if (zoomedCardKey === 'shield') handleDefendShield();
                                  if (zoomedCardKey === 'spiegel') handleDefendSpiegel();
                                }}
                              >
                                {zoomedCardKey === 'shield' ? "Zet Magische Bumper in 🛡️" : "Zet Magische Spiegel in 🎭"}
                              </button>
                            );
                          }

                          if (card.type === 'attack') {
                            return (
                              <button 
                                className="btn primary full"
                                onClick={() => {
                                  if (card.selectTarget) {
                                    setStrafTargetMode(zoomedCardKey);
                                    setZoomedCardKey(null);
                                  } else {
                                    handlePlayCard(zoomedCardKey);
                                  }
                                }}
                              >
                                Speel kaart 🎯
                              </button>
                            );
                          }

                          if (card.type !== 'defense') {
                            const isTurnRestrictive = ['fastpass', 'hyperdrive', 'tink', 'shortcut'].includes(zoomedCardKey);
                            const isMyTurn = room?.current_player_index === players.findIndex(p => p.id === localPlayer.id);
                            return (
                              <button 
                                className="btn primary full"
                                disabled={isTurnRestrictive && !isMyTurn}
                                onClick={() => handlePlayCard(zoomedCardKey)}
                              >
                                Speel kaart ➔
                              </button>
                            );
                          }

                          return null;
                        })()}
                        <button className="btn ghost full" onClick={() => {
                          setZoomedCardKey(null);
                          setCardFlipped(false);
                        }}>
                          Sluiten
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="timer" style={{ borderWidth: '4px', width: '60px', height: '60px', fontSize: '16px' }}>🧙‍♂️</div>
          <p>Laden...</p>
        </div>
      )}

      {logPopupOpen && logProfileName && (
        <div
          className="captains-log-modal"
          onClick={() => setLogPopupOpen(false)}
        >
          <div className="captains-log-paper player-dashboard" onClick={(e) => e.stopPropagation()}>
            <div className="captains-log-header">
              <h2 className="captains-log-title">Spelersoverzicht</h2>
              <p className="captains-log-subtitle">Alle avonturen en Coco Coins van {logProfileName}</p>
            </div>

            <div className="captains-log-content">
              {(() => {
                const rawEntries = getOrGenerateCaptainsLog(logProfileName);
                const profileKey = getCollectorKey(logProfileName);
                const ledgerOpening = rawEntries.find(entry => entry.ledgerOpening);
                const ledgerStartedAt = ledgerOpening ? new Date(ledgerOpening.timestamp || 0).getTime() : null;
                const entries = ledgerOpening ? [
                  ledgerOpening,
                  ...rawEntries.filter(entry => !entry.ledgerOpening && new Date(entry.timestamp || 0).getTime() > ledgerStartedAt)
                ] : rawEntries;
                const storedGames = soloHistory.filter(item => {
                  if (item.profileKey) return item.profileKey === profileKey;
                  if (item.profileName) return getCollectorKey(item.profileName) === profileKey;
                  return false;
                });
                const inferCompletedGame = entry => {
                  const description = String(entry.description || '');
                  let gameName = '';
                  let details = description;
                  if (/^McQueen's Road Race afgerond/i.test(description)) gameName = "McQueen's Road Race";
                  else if (/^Mickey's Music Match afgerond/i.test(description)) gameName = "Mickey's Music Match";
                  else {
                    const aliases = [
                      [/Othello/i, 'Othello'],
                      [/Rapunzel|Kamertje verhuren/i, "Rapunzel's Torenkamers"],
                      [/Inside Out Kleurenchaos|Color Lines/i, 'Inside Out Kleurenchaos'],
                      [/Ricochet Shot/i, 'Ricochet Shot'],
                      [/Curling Duel/i, 'Curling Duel'],
                      [/Louisa's Power Push|Marble Push|Abalone/i, "Louisa's Power Push"],
                      [/Black Pearl's Plank/i, "Black Pearl's Plank"],
                      [/Goofy's Geluksworp/i, "Goofy's Geluksworp"],
                      [/Mike's Wazowski-Board|Qwixx/i, "Mike's Wazowski-Board"],
                      [/Yzma's Poison Struggle/i, "Yzma's Poison Struggle"],
                      [/Tic Tac Tinker Bell/i, 'Tic Tac Tinker Bell'],
                      [/Zazu's Sudoku/i, "Zazu's Sudoku"]
                    ];
                    gameName = aliases.find(([pattern]) => pattern.test(description))?.[1] || '';
                    if (!gameName || !/gewonnen|verloren|gelijkspel|opgelost|gemist|gezonken|verzameld|afgerond/i.test(description)) return null;
                  }
                  details = description.replace(/^[^:]+:\s*/, '') || description;
                  return {
                    profileName: logProfileName,
                    profileKey,
                    category: gameName.includes('Road Race') ? 'road-race' : gameName.includes('Music Match') ? 'music-match' : 'arena',
                    gameType: gameName,
                    date: entry.timestamp,
                    score: Math.max(0, Number(entry.amount) || 0),
                    details,
                    inferred: true
                  };
                };
                const inferredGames = rawEntries.map(inferCompletedGame).filter(Boolean).filter(inferred => !storedGames.some(stored => (
                  stored.gameType === inferred.gameType
                  && (stored.details === inferred.details || Math.abs(new Date(stored.date || 0) - new Date(inferred.date || 0)) < 120000)
                )));
                const games = [...storedGames, ...inferredGames];
                const classifyResult = item => {
                  const text = `${item.details || ''}`.toLowerCase();
                  if (/gelijk|draw/.test(text)) return 'draw';
                  if (/verloren|verlies|niet gekraakt|niet opgelost|gemist|gezonken|overgeslagen|plaats\s+[2-9]/.test(text)) return 'loss';
                  if (/gewonnen|winst|wint|opgelost|gekraakt|plaats\s+1/.test(text)) return 'win';
                  return Number(item.score) > 0 ? 'win' : 'loss';
                };
                const gameResults = games.map(item => ({ ...item, result: classifyResult(item) }));
                const sortedGames = [...gameResults].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
                const resultLabels = {
                  win: 'Gewonnen',
                  draw: 'Gelijk',
                  loss: 'Verloren'
                };
                const totalWins = gameResults.filter(item => item.result === 'win').length;
                const totalDraws = gameResults.filter(item => item.result === 'draw').length;
                const totalLosses = gameResults.filter(item => item.result === 'loss').length;
                const earned = entries.filter(entry => entry.type === 'earn' && (entry.ledgerOpening || Number(entry.amount) > 0));
                const spent = entries.filter(entry => entry.type === 'spend' || Number(entry.amount) < 0);
                const earnedTotal = earned.reduce((sum, entry) => sum + Math.abs(Number(entry.amount) || 0), 0);
                const spentTotal = spent.reduce((sum, entry) => sum + Math.abs(Number(entry.amount) || 0), 0);
                const renderMutations = list => list.length ? [...list].reverse().map((entry, idx) => (
                  <div key={`${entry.timestamp}-${idx}`} className="dashboard-mutation">
                    <span><strong>{entry.description}</strong><small>{entry.ledgerOpening ? 'Beginstand van het nieuwe mutatieoverzicht' : new Date(entry.timestamp).toLocaleString('nl-NL')}</small></span>
                    <b className={entry.type === 'spend' || Number(entry.amount) < 0 ? 'spend' : 'earn'}>{entry.type === 'spend' || Number(entry.amount) < 0 ? '−' : '+'}{Math.abs(Number(entry.amount) || 0)}</b>
                  </div>
                )) : <p className="small">Nog geen mutaties.</p>;
                return (
                  <>
                    <div className="dashboard-summary">
                      <div><strong>{games.length}</strong><span>gespeeld</span></div>
                      <div><strong>{totalWins}</strong><span>gewonnen</span></div>
                      <div><strong>{totalDraws}</strong><span>gelijk</span></div>
                      <div><strong>{totalLosses}</strong><span>verloren</span></div>
                    </div>
                    <h3>Gespeelde spellen</h3>
                    {sortedGames.length ? <div className="dashboard-games" aria-label="Gespeelde spellen, nieuwste eerst">{sortedGames.map((game, index) => (
                      <div key={`${game.date || 'game'}-${game.gameType || 'onbekend'}-${index}`}>
                        <strong>{game.gameType || 'Onbekend spel'}</strong>
                        <span className={`dashboard-game-result ${game.result}`}>{resultLabels[game.result]}</span>
                        <small>{game.date ? new Date(game.date).toLocaleString('nl-NL') : 'Datum onbekend'}</small>
                      </div>
                    ))}</div> : <p className="small">Nog geen spellen geregistreerd voor dit profiel.</p>}
                    <h3>Coco Coins</h3>
                    <section className={`dashboard-ledger ${openLedgerSection === 'earned' ? 'is-open' : ''}`}>
                      <button type="button" className="dashboard-ledger-summary" aria-expanded={openLedgerSection === 'earned'} onClick={() => setOpenLedgerSection(current => current === 'earned' ? null : 'earned')}>
                        <span>Verdiende coins</span><strong>+{earnedTotal}<span aria-hidden="true">⌄</span></strong>
                      </button>
                      {openLedgerSection === 'earned' && <div className="dashboard-ledger-list">{renderMutations(earned)}</div>}
                    </section>
                    <section className={`dashboard-ledger ${openLedgerSection === 'spent' ? 'is-open' : ''}`}>
                      <button type="button" className="dashboard-ledger-summary" aria-expanded={openLedgerSection === 'spent'} onClick={() => setOpenLedgerSection(current => current === 'spent' ? null : 'spent')}>
                        <span>Uitgegeven coins</span><strong>−{spentTotal}<span aria-hidden="true">⌄</span></strong>
                      </button>
                      {openLedgerSection === 'spent' && <div className="dashboard-ledger-list">{renderMutations(spent)}</div>}
                    </section>
                  </>
                );
              })()}
            </div>

            <button
              type="button"
              className="captains-log-close-btn"
              onClick={() => setLogPopupOpen(false)}
            >
              Overzicht sluiten
            </button>
          </div>
        </div>
      )}

      {coinPopupOpen && (
        <div
          className="collection-popup-backdrop"
          onClick={() => setCoinPopupOpen(false)}
        >
          <div className="collection-popup-card coin-popup-card" onClick={(e) => e.stopPropagation()}>
            <button
              className="collection-popup-close"
              onClick={() => setCoinPopupOpen(false)}
              aria-label="Sluiten"
            >
              ×
            </button>
            <div className="coin-flip-stage">
              <button
                type="button"
                className={`coin-flip-inner ${coinFlipped ? 'is-flipped' : ''}`}
                onClick={() => setCoinFlipped(prev => !prev)}
                aria-label={coinFlipped ? 'Bekijk voorkant van Coco Coin' : 'Bekijk achterkant van Coco Coin'}
              >
                <span className="coin-flip-face coin-flip-front">
                  <img src={assetPath('collectables/coco-coin-front.png')} alt="Voorkant van de Coco Coin" />
                </span>
                <span className="coin-flip-face coin-flip-back">
                  <img src={assetPath('collectables/coco-coin-back.png')} alt="Achterkant van de Coco Coin" />
                </span>
              </button>
            </div>
            <div className="badge" style={{ alignSelf: 'center', marginBottom: '8px' }}>Coco Coin</div>
            <h2>De munt van Coco</h2>
            <p>Klik op de munt om hem om te draaien.</p>
          </div>
        </div>
      )}

      {!loading && !activeProfileName && !cocoProfilesReady && (
        <div className="portal-container">
          <section className="card" style={{ maxWidth: '560px', margin: '40px auto 0', textAlign: 'center' }}>
            <CocoCoinIcon size={64} />
            <h2 style={{ margin: '14px 0 8px' }}>Disney-profielen laden</h2>
            <p style={{ color: 'var(--muted)', margin: 0 }}>Je Coco Coins en Disney Collection worden veilig gesynchroniseerd.</p>
          </section>
        </div>
      )}

      {!loading && !activeProfileName && cocoProfilesReady && (
        <div className="portal-container">
          <section className="card" style={{ maxWidth: '560px', margin: '40px auto 0' }}>
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                <CocoCoinIcon size={74} onInspect={openCoinViewer} />
              </div>
              <h1 style={{ margin: '0 0 8px' }}>Kies je Disney-profiel</h1>
              <p style={{ color: 'var(--muted)', margin: 0 }}>
                Je Coco Coins, badges en spelersnaam worden aan dit profiel gekoppeld.
              </p>
            </div>

            <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
              {getDisplayShopPlayers().map(name => {
                const key = getCollectorKey(name);
                const balance = starBank[key] || 0;
                const ownedCount = Object.values(badgeCollections[key] || {}).reduce((sum, count) => sum + (Number(count) || 0), 0);
                const preference = profilePreferences[key];
                const avatar = DISNEY_PROFILE_AVATARS.find(item => item.id === preference?.avatar);
                const color = DISNEY_PROFILE_COLORS.find(item => item.id === preference?.color)?.hex || 'var(--gold)';
                return (
                  <button
                    key={name}
                    type="button"
                    className="versioncard"
                    onClick={() => activateCocoProfile(name)}
                  >
                    {avatar
                      ? <img src={assetPath(avatar.image)} alt="" style={{ width: '48px', height: '48px', objectFit: 'contain', border: `3px solid ${color}`, borderRadius: '50%', background: '#06152d' }} />
                      : <span style={{ fontSize: '26px', fontWeight: 900, color }}>{name.slice(0, 1).toUpperCase()}</span>}
                    <span>
                      <strong>{name}</strong>
                      <small>{formatCocoCoins(balance)} · {ownedCount} badge{ownedCount === 1 ? '' : 's'}</small>
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ padding: '12px', marginBottom: '12px', background: '#061225', border: '1px solid var(--line)', borderRadius: '10px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold' }}>Profiel beheren</label>
              <select
                value={shopPlayerName}
                onChange={(e) => setShopPlayerName(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box' }}
              >
                {getDisplayShopPlayers().map(name => <option key={name} value={name}>{name}</option>)}
              </select>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                <button type="button" className="btn mini secondary" onClick={handleRenameShopProfile}>Naam wijzigen</button>
                <button type="button" className="btn mini secondary" onClick={handleDeleteShopProfile}>Verwijderen</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
              <input
                type="text"
                value={startupProfileName}
                onChange={(e) => setStartupProfileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateStartupProfile();
                }}
                placeholder="Nieuw profiel"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
              <button
                type="button"
                className="btn primary"
                onClick={handleCreateStartupProfile}
              >
                Aanmaken
              </button>
            </div>
            <button
              type="button"
              className="btn secondary full"
              onClick={handleHardRefresh}
              style={{ marginTop: '10px' }}
            >
              ⟳ Game volledig verversen
            </button>
          </section>
        </div>
      )}

      {!loading && activeProfileName && (
        <>
          {renderAppHeader()}
          {profileSetupOpen && (
            <div className="profile-appearance-backdrop" role="dialog" aria-modal="true" aria-labelledby="profile-appearance-title">
              <section className="profile-appearance-dialog">
                <h2 id="profile-appearance-title">Jouw Disney-profiel</h2>
                <p>Kies de avatar en spelerskleur die in alle spellen bij {activeProfileName} horen.</p>
                <h3>Spelerskleur</h3>
                <div className="profile-color-grid">
                  {getAvailableProfileColors(activeProfileName).map(color => (
                    <button
                      key={color.id}
                      type="button"
                      className={`profile-color-choice ${profileDraftColor === color.id ? 'selected' : ''}`}
                      style={{ '--profile-choice-color': color.hex }}
                      onClick={() => setProfileDraftColor(color.id)}
                      aria-pressed={profileDraftColor === color.id}
                    >
                      <span aria-hidden="true" />{color.name}
                    </button>
                  ))}
                </div>
                <h3>Avatar</h3>
                <div className="profile-avatar-grid">
                  {DISNEY_PROFILE_AVATARS.map(avatar => (
                    <button
                      key={avatar.id}
                      type="button"
                      className={`profile-avatar-choice ${profileDraftAvatar === avatar.id ? 'selected' : ''}`}
                      onClick={() => setProfileDraftAvatar(avatar.id)}
                      aria-pressed={profileDraftAvatar === avatar.id}
                      title={avatar.name}
                    >
                      <img src={assetPath(avatar.image)} alt={avatar.name} />
                      <span>{avatar.name}</span>
                    </button>
                  ))}
                </div>
                <button type="button" className="btn primary full" onClick={saveProfileAppearance}>Profiel opslaan</button>
              </section>
            </div>
          )}
          {selectedCollectionItem && (
            <div
              className="collection-popup-backdrop"
              onClick={() => { setSelectedCollectionItem(null); setSelectedCollectionFlipped(false); }}
            >
              <div className="collection-popup-card" onClick={(e) => e.stopPropagation()}>
                <button
                  className="collection-popup-close"
                  onClick={() => { setSelectedCollectionItem(null); setSelectedCollectionFlipped(false); }}
                  aria-label="Sluiten"
                >
                  ×
                </button>
                {selectedCollectionItem.backImage ? (
                  <div className={`collectable-flip-stage ${selectedCollectionFlipped ? 'is-flipped' : ''}`}>
                    <button
                      type="button"
                      className="collectable-flip-inner"
                      onClick={() => setSelectedCollectionFlipped(prev => !prev)}
                      aria-label={selectedCollectionFlipped ? `Bekijk voorkant van ${selectedCollectionItem.name}` : `Bekijk achterkant van ${selectedCollectionItem.name}`}
                    >
                      <span className="collectable-flip-face collectable-flip-front">
                        <img src={assetPath(selectedCollectionItem.image)} alt={`Voorkant van ${selectedCollectionItem.name}`} />
                      </span>
                      <span className="collectable-flip-face collectable-flip-back">
                        <img src={assetPath(selectedCollectionItem.backImage)} alt={`Achterkant van ${selectedCollectionItem.name}`} />
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="collection-popup-visual">
                    {renderCollectableVisual(selectedCollectionItem, 'collection-popup-image')}
                  </div>
                )}
                <div className="badge" style={{ alignSelf: 'center', marginBottom: '8px' }}>
                  Disney Collection
                </div>
                <h2>{selectedCollectionItem.name}</h2>
                <p>{selectedCollectionItem.backImage ? 'Klik op het logo om de voor- en achterkant te bekijken.' : selectedCollectionItem.desc}</p>
                <div className="collection-popup-price">
                  <CocoCoinIcon size={28} />
                  <span>{formatCocoCoins(selectedCollectionItem.cost)}</span>
                </div>
              </div>
            </div>
          )}

          {/* SCREEN: PORTAL */}
          {screen === 'portal' && (
            <div className={`portal-container ${showPortalShop ? 'portal-destination-page' : ''}`} onClick={() => setSelectedPortalGame(null)}>
              {!showPortalShop && (
                <>
              <div className="portal-header">
                <div className="portal-logo-glow"></div>
                <h1 className="portal-title">Disney Game Portal</h1>
                <p className="portal-subtitle">Kies een interactief multiplayer spel voor in de auto of thuis. Iedereen speelt op zijn eigen telefoon!</p>
              </div>

              <div className="portal-grid">
                {/* Game 1: McQueen's Road Race */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedPortalGame === 'road_quest') {
                      setScreen('home');
                    } else {
                      setSelectedPortalGame('road_quest');
                    }
                  }}
                  className={`portal-card road-quest-card ${selectedPortalGame === 'road_quest' ? 'selected-glow' : ''}`}
                  style={selectedPortalGame === 'road_quest' ? { border: '3.5px solid var(--gold)', boxShadow: '0 0 25px rgba(255, 212, 92, 0.75)', transform: 'scale(1.03)', transition: 'all 0.25s ease' } : { transition: 'all 0.25s ease' }}
                  role="button" 
                  tabIndex={0}
                >
                  <div className="portal-card-header">
                    <div className="portal-card-media portal-glow-quest">
                      <img src={assetPath("portal/Lightning_mc_queen.png")} className="portal-media-img" alt="Lightning McQueen" />
                    </div>
                    <span className="portal-card-badge">Aanbevolen</span>
                  </div>
                  <div className="portal-card-body">
                    <h3>McQueen's Road Race</h3>
                    <p>De ultieme roadtrip game voor onderweg naar Disneyland Parijs! Test je kennis met quizzen, maak moeilijke keuzes en werk samen aan magische opdrachten.</p>
                  </div>
                  <div className="portal-card-footer">
                    <span className="btn-play">
                      {selectedPortalGame === 'road_quest' ? 'Klik nogmaals om te starten ➔' : 'Selecteer Race ➔'}
                    </span>
                  </div>
                </div>

                {/* Game 2: Mickey's Music Match */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedPortalGame === 'music_match') {
                      window.location.href = room?.code
                        ? `./music/index.html?room=${room.code}&v=78`
                        : './music/index.html?v=78';
                    } else {
                      setSelectedPortalGame('music_match');
                    }
                  }}
                  className={`portal-card music-quiz-card ${selectedPortalGame === 'music_match' ? 'selected-glow' : ''}`}
                  style={selectedPortalGame === 'music_match' ? { border: '3.5px solid #ff7b8b', boxShadow: '0 0 25px rgba(255, 123, 139, 0.75)', transform: 'scale(1.03)', transition: 'all 0.25s ease' } : { transition: 'all 0.25s ease' }}
                  role="button" 
                  tabIndex={0}
                >
                  <div className="portal-card-header">
                    <div className="portal-card-media portal-glow-music">
                      <img src={assetPath("portal/mickey_singing.png")} className="portal-media-img" alt="Mickey Singing" />
                    </div>
                    <span className="portal-card-badge music">Hitster Editie</span>
                  </div>
                  <div className="portal-card-body">
                    <h3>Mickey's Music Match</h3>
                    <p style={{ color: 'var(--gold)', fontSize: '12px', marginTop: '-4px' }}>Origineel: Disney Music Quiz</p>
                    <p>Dé interactieve muziekquiz met 300 betoverende Disney en Pixar songs. Open de originele soundtracktrack in Spotify, raad de film, titel, het jaartal of de uitvoerder en verover de troon!</p>
                  </div>
                  <div className="portal-card-footer">
                    <span className="btn-play music">
                      {selectedPortalGame === 'music_match' ? 'Klik nogmaals om te starten ➔' : 'Selecteer Quiz ➔'}
                    </span>
                  </div>
                </div>

                {/* Game 3: Hercules' Duel Arena */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedPortalGame === 'duel_arena') {
                      setScreen('arcade_select');
                    } else {
                      setSelectedPortalGame('duel_arena');
                    }
                  }}
                  className={`portal-card duel-arena-card ${selectedPortalGame === 'duel_arena' ? 'selected-glow' : ''}`}
                  style={selectedPortalGame === 'duel_arena' ? { border: '3.5px solid #bd53ed', boxShadow: '0 0 25px rgba(189, 83, 237, 0.75)', transform: 'scale(1.03)', transition: 'all 0.25s ease' } : { transition: 'all 0.25s ease' }}
                  role="button" 
                  tabIndex={0}
                >
                  <div className="portal-card-header">
                    <div className="portal-card-media portal-glow-duel">
                      <img src={assetPath("portal/Hercules.png")} className="portal-media-img" alt="Hercules" />
                    </div>
                    <span className="portal-card-badge arcade">10 Spellen</span>
                  </div>
                  <div className="portal-card-body">
                    <h3>Hercules' Duel Arena</h3>
                    <p style={{ color: '#bd53ed', fontSize: '12px', marginTop: '-4px' }}>Origineel: Disney Duel Arena</p>
                    <p>Daag jezelf uit in Disney-themed bord-, actie- en woordspellen tegen een computer-tegenstander, of speel een realtime duel op je eigen telefoon!</p>
                  </div>
                  <div className="portal-card-footer">
                    <span className="btn-play arcade">
                      {selectedPortalGame === 'duel_arena' ? 'Klik nogmaals om te starten ➔' : 'Selecteer Arena ➔'}
                    </span>
                  </div>
                </div>

                {/* Game 4: Miguel's Market */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedPortalGame === 'coin_shop') {
                      setSelectedPortalGame(null);
                      setShowPortalShop(true);
                    } else {
                      setSelectedPortalGame('coin_shop');
                    }
                  }}
                  className={`portal-card coin-shop-card ${selectedPortalGame === 'coin_shop' ? 'selected-glow' : ''}`}
                  style={selectedPortalGame === 'coin_shop' ? { border: '3.5px solid #ff9800', boxShadow: '0 0 25px rgba(255, 152, 0, 0.75)', transform: 'scale(1.03)', transition: 'all 0.25s ease' } : { transition: 'all 0.25s ease' }}
                  role="button" 
                  tabIndex={0}
                >
                  <div className="portal-card-header">
                    <div className="portal-card-media portal-glow-shop">
                      <img src={assetPath("portal/miguel-market.png")} className="portal-media-img" alt="Miguel speelt gitaar" />
                    </div>
                    <span className="portal-card-badge shop">Badgemarkt</span>
                  </div>
                  <div className="portal-card-body">
                    <h3>Miguel's Market</h3>
                    <p style={{ color: '#ff9800', fontSize: '12px', marginTop: '-4px' }}>Koop, verzamel en ruil badges</p>
                    <p>Open verrassingspakjes, verzamel badges uit beide Disney-parken en ontdek ieder uur een nieuw ruilaanbod van Miguel.</p>
                  </div>
                  <div className="portal-card-footer">
                    <span className="btn-play shop">
                      {selectedPortalGame === 'coin_shop' ? 'Klik nogmaals om te openen ➔' : 'Selecteer Markt ➔'}
                    </span>
                  </div>
                </div>

              </div>

                </>
              )}

              {showPortalShop && (
                <>
                  {renderPortalDestinationHero({
                    image: 'portal/miguel-market.png',
                    imageAlt: "Miguel's Market",
                    badge: 'Disney Badge Collection',
                    title: "Miguel's",
                    accentTitle: 'Market',
                    description: 'Koop verrassingspakjes, ruil met Miguel en maak je badgecollectie compleet.',
                    onBack: () => {
                      setSelectedPortalGame(null);
                      setShowPortalShop(false);
                    },
                    theme: 'shop',
                    imageClass: 'portal-mark-coco'
                  })}
                  {(() => {
                    const activeName = activeProfileName || shopPlayerName.trim() || 'Speler 1';
                    const activeKey = getCollectorKey(activeName);
                    return (
                      <MiguelMarket
                        activeName={activeName}
                        balance={starBank[activeKey] || 0}
                        ownedBadges={badgeCollections[activeKey] || {}}
                        ownedAchievements={badgeAchievements[activeKey] || {}}
                        achievementCelebration={getAchievement(achievementQueue[0])}
                        badgeMarket={badgeMarket}
                        badgeMarketNow={badgeMarketNow}
                        tradeOfferIndex={marketTradeOfferIndex}
                        sellOpen={badgeSellOpen}
                        openedPack={openedBadgePack}
                        onOpenPack={handleOpenBadgePack}
                        onChooseTrade={setMarketTradeOfferIndex}
                        onTrade={handleTradeBadge}
                        onOpenSell={() => setBadgeSellOpen(true)}
                        onCloseSell={() => setBadgeSellOpen(false)}
                        onSell={handleSellBadge}
                        onClosePack={() => setOpenedBadgePack(null)}
                        onCloseAchievement={() => setAchievementQueue(current => current.slice(1))}
                        onInspectCoin={openCoinViewer}
                      />
                    );
                  })()}
                </>
              )}

              {ENABLE_LEGACY_SHOP && showPortalShop && (
                <>
              {renderPortalDestinationHero({
                image: 'portal/miguel-market.png',
                imageAlt: "Miguel's Market",
                badge: 'Disney Badge Collection',
                title: "Miguel's",
                accentTitle: 'Market',
                description: 'Koop verrassingspakjes, ruil met Miguel en maak je badgecollectie compleet.',
                onBack: () => {
                  setSelectedPortalGame(null);
                  setShowPortalShop(false);
                },
                theme: 'shop',
                imageClass: 'portal-mark-coco'
              })}
              {(() => {
                const shopNames = getDisplayShopPlayers();
                const activeName = activeProfileName || shopPlayerName.trim() || shopNames[0] || 'Speler 1';
                const activeKey = getCollectorKey(activeName);
                const balance = starBank[activeKey] || 0;
                const owned = collections[activeKey] || [];
                const donationTargets = shopNames.filter(name => getCollectorKey(name) !== activeKey);
                const selectedDonationTarget = donationTargetName || donationTargets[0] || '';
                return (
                  <section className="card portal-shop-content">
                    <div className="portal-shop-heading">
                      <div>
                        <span className="portal-section-kicker">Jouw Disney-profiel</span>
                        <h2>Shop voor {activeName}</h2>
                        <p>Bekijk je saldo, deel Coco Coins en breid je persoonlijke collection uit.</p>
                      </div>
                      <div className="portal-shop-balance" aria-label={`${formatCocoCoins(balance)} beschikbaar`}>
                        <CocoCoinIcon size={30} />
                        <strong>{balance}</strong>
                      </div>
                    </div>

                    <div className="shop-donation-panel">
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold' }}>Coco Coins doneren aan</label>
                        <select
                          value={selectedDonationTarget}
                          onChange={(e) => setDonationTargetName(e.target.value)}
                          disabled={donationTargets.length === 0}
                          style={{ width: '100%', boxSizing: 'border-box' }}
                        >
                          {donationTargets.map(name => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold' }}>Aantal</label>
                        <input
                          type="number"
                          min="1"
                          max={balance}
                          value={donationAmount}
                          onChange={(e) => setDonationAmount(e.target.value)}
                          placeholder="0"
                          style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn mini primary"
                        disabled={donationTargets.length === 0 || balance <= 0}
                        onClick={handleDonateCoins}
                        style={{ padding: '10px 11px', fontSize: '11px' }}
                      >
                        Doneer
                      </button>
                    </div>

                    <div className="shop-product-grid">
                      {DISNEY_SHOP_ITEMS.map(item => {
                        const itemOwned = owned.includes(item.id);
                        const exclusiveOwner = exclusiveClaims[item.id];
                        const lockedByOther = item.type === 'exclusive' && exclusiveOwner && exclusiveOwner !== activeKey;
                        const canBuy = !itemOwned && !lockedByOther && balance >= item.cost;
                        return (
                          <div key={item.id} className="shop-product-card">
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                              <span className="shop-item-visual">
                                {renderCollectableVisual(item, 'shop-item-image')}
                              </span>
                              <div style={{ minWidth: 0 }}>
                                <strong style={{ display: 'block', fontSize: '13px' }}>{item.name}</strong>
                                <span style={{ color: item.type === 'exclusive' ? 'var(--gold)' : 'var(--muted)', fontSize: '10px' }}>
                                  {item.type === 'exclusive' ? 'Exclusief' : 'Voor iedereen'} · {formatCocoCoins(item.cost)}
                                </span>
                              </div>
                            </div>
                            <p style={{ color: 'var(--muted)', fontSize: '11px', minHeight: '30px', margin: '0 0 8px' }}>{item.desc}</p>
                            <button
                              className={`btn mini ${itemOwned || canBuy ? 'primary' : 'secondary'}`}
                              disabled={!itemOwned && !canBuy}
                              onClick={() => {
                                if (itemOwned) {
                                  setSelectedCollectionFlipped(false);
                                  setSelectedCollectionItem(item);
                                  return;
                                }
                                handleBuyShopItem(item);
                              }}
                              style={{ width: '100%', padding: '7px 6px', fontSize: '11px' }}
                            >
                              {itemOwned ? 'In Collection' : lockedByOther ? 'Al geclaimd' : balance < item.cost ? 'Te weinig Coco Coins' : 'Kopen'}
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ marginTop: '12px', padding: '10px', background: '#061225', border: '1px solid var(--line)', borderRadius: '10px' }}>
                      <strong style={{ display: 'block', marginBottom: '6px', color: 'var(--gold)' }}>Disney Collection van {activeName}</strong>
                      {owned.length === 0 ? (
                        <span style={{ color: 'var(--muted)', fontSize: '12px' }}>Nog leeg. Speel games om Coco Coins te verdienen en koop je eerste item.</span>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {owned.map(itemId => {
                            const item = DISNEY_SHOP_ITEMS.find(shopItem => shopItem.id === itemId);
                            return item ? (
                              <button
                                key={item.id}
                                type="button"
                                className="badge collection-item-button"
                                onClick={() => { setSelectedCollectionFlipped(false); setSelectedCollectionItem(item); }}
                                style={{ background: '#10264c', color: '#fff' }}
                              >
                                {renderCollectableVisual(item, 'collection-badge-image')} {item.name}
                              </button>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                  </section>
                );
              })()}
                </>
              )}

              {!showPortalShop && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px' }}>
                  <button
                    type="button"
                    className="btn secondary full"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedPortalGame === 'hard_refresh') {
                        handleHardRefresh();
                      } else {
                        setSelectedPortalGame('hard_refresh');
                      }
                    }}
                    style={selectedPortalGame === 'hard_refresh'
                      ? { borderColor: '#ff6a6a', boxShadow: '0 0 20px rgba(255, 66, 66, 0.85)', background: '#4b1824' }
                      : { borderColor: '#a83e4c', boxShadow: '0 0 12px rgba(255, 66, 66, 0.45)' }}
                  >
                    {selectedPortalGame === 'hard_refresh' ? 'Nogmaals: volledig verversen' : '⟳ Game volledig verversen'}
                  </button>
                  <button
                    type="button"
                    className="btn secondary full"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedPortalGame === 'profile_management') {
                        handleOpenProfileManagement();
                      } else {
                        setSelectedPortalGame('profile_management');
                      }
                    }}
                    style={selectedPortalGame === 'profile_management'
                      ? { borderColor: '#50e889', boxShadow: '0 0 20px rgba(80, 232, 137, 0.85)', background: '#123d2a' }
                      : { borderColor: '#319b5e', boxShadow: '0 0 12px rgba(80, 232, 137, 0.45)' }}
                  >
                    {selectedPortalGame === 'profile_management' ? 'Nogmaals: open profielbeheer' : 'Profielbeheer'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SCREEN: ARCADE SELECT */}
          {screen === 'arcade_select' && (
            <div>
              {renderPortalDestinationHero({
                image: 'portal/Hercules.png',
                imageAlt: "Hercules' Duel Arena",
                badge: '10 Disney Duelspellen',
                title: "Hercules'",
                accentTitle: 'Duel Arena',
                description: 'Kies een solo-uitdaging of speel een realtime duel op je eigen telefoon.',
                onBack: () => {
                  setSelectedPortalGame(null);
                  setScreen('portal');
                },
                theme: 'duel',
                imageClass: 'portal-mark-hercules'
              })}

              <section className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '2px 0 16px' }}>
                  <span style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, transparent, #bd53ed)' }} />
                  <h2 className="sectiontitle" style={{ margin: 0, color: 'var(--gold)', fontSize: '21px', whiteSpace: 'nowrap' }}>Arena Spellen</h2>
                  <span style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, #bd53ed, transparent)' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '14px' }}>
                  {ARENA_GAMES.map(game => {
                    const isSelected = selectedArcadeGame === game.id;
                    return (
                      <button
                        type="button"
                        key={game.id}
                        disabled={game.comingSoon}
                        aria-pressed={isSelected}
                        aria-label={`${game.name}. ${game.desc}`}
                        onClick={() => {
                          if (game.comingSoon) return;
                          if (isSelected) {
                            setArcadeOptionsOpen(true);
                          } else {
                            setSelectedArcadeGame(game.id);
                            setArcadePlayMode(null);
                            setArcadeOptionsOpen(false);
                          }
                        }}
                        className={`category-item ${isSelected ? 'checked' : ''}`}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: '16px 12px',
                          textAlign: 'center',
                          cursor: game.comingSoon ? 'default' : 'pointer',
                          borderRadius: '12px',
                          background: isSelected ? '#122d56' : '#081730',
                          border: isSelected ? '2px solid var(--gold)' : '2px solid var(--line)',
                          opacity: game.comingSoon ? 0.65 : 1,
                          transition: 'all 0.15s ease',
                          width: '100%',
                          font: 'inherit',
                          color: 'inherit'
                        }}
                      >
                        {game.image ? (
                          <img src={game.image} alt="" style={{ width: '64px', height: '64px', objectFit: 'contain', marginBottom: '8px' }} />
                        ) : (
                          <span style={{ fontSize: '32px', marginBottom: '8px' }}>{game.icon}</span>
                        )}
                        <strong style={{ fontSize: '15px', color: '#fff', marginBottom: '4px' }}>{game.name}</strong>
                        <span style={{ fontSize: '10px', color: game.comingSoon ? 'var(--muted)' : getArenaGame(game.id)?.maxPlayers === 4 ? 'var(--ok)' : 'var(--gold)', fontWeight: 'bold', marginBottom: '5px' }}>
                          {game.comingSoon ? 'binnenkort' : getArenaGame(game.id)?.maxPlayers === 1 ? 'solo' : getArenaGame(game.id)?.maxPlayers === 4 ? 'max 4 spelers' : '2 spelers'}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: '1.3' }}>{game.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {selectedArcadeGame && arcadeOptionsOpen && (
                <div
                  role="presentation"
                  onClick={() => {
                    setArcadeOptionsOpen(false);
                    setArcadePlayMode(null);
                  }}
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 1200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '18px',
                    background: 'rgba(2, 8, 20, 0.72)'
                  }}
                >
                <section
                  className="card animate-fade-in"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Spelopties"
                  onClick={(event) => event.stopPropagation()}
                  style={{ width: 'min(520px, 100%)', maxHeight: '84dvh', overflowY: 'auto', margin: 0 }}
                >
                  <h2 className="sectiontitle">Spelopties</h2>
                  <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '15px' }}>
                    Geselecteerd spel: <strong>{
                      {
                        othello: "Ursula's Spiegelstrijd",
                        dotsboxes: "Rapunzel's Torenkamers",
                        colorlines: "Inside Out Kleurenchaos",
                        abalone: "Louisa's Power Push",
                        piratesplank: "Black Pearl's Plank",
                        yahtzee: "Goofy's Geluksworp",
                        qwixx: "Mike's Wazowski-Board",
                        mastermind: "Yzma's Poison Struggle",
                        tictactinker: "Tic Tac Tinker Bell",
                        sudoku9: "Zazu's Sudoku"
                      }[selectedArcadeGame]
                    }</strong>
                  </p>
                  <p className="small" style={{ marginTop: '-8px', marginBottom: '15px', color: 'var(--gold)' }}>
                    {getArenaGame(selectedArcadeGame)?.maxPlayers === 1
                      ? 'Solo spel'
                      : getArenaGame(selectedArcadeGame)?.maxPlayers === 4
                        ? 'Deze Arena-kamer ondersteunt maximaal 4 spelers.'
                        : 'Dit spel is ontworpen voor 2 spelers.'}
                  </p>
                  {getArenaSave(selectedArcadeGame) && (
                    <button type="button" className="btn secondary full" onClick={() => handleResumeArenaSave(selectedArcadeGame)} style={{ marginBottom: '12px' }}>
                      Hervat opgeslagen spel · {new Date(getArenaSave(selectedArcadeGame).savedAt).toLocaleString('nl-NL')}
                    </button>
                  )}

                  {getArenaGame(selectedArcadeGame)?.maxPlayers === 1 ? (
                    <button
                      className="btn primary full"
                      onClick={() => handleStartArcadeSolo(selectedArcadeGame)}
                    >
                      Speel Solo (Start)
                    </button>
                  ) : (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                        <button
                          type="button"
                          onClick={() => setArcadePlayMode('solo')}
                          aria-pressed={arcadePlayMode === 'solo'}
                          title="Speel tegen Prince Ali Ababwa"
                          style={{
                            minHeight: '164px',
                            padding: '12px 8px',
                            display: 'grid',
                            gridTemplateRows: '100px auto',
                            alignItems: 'center',
                            justifyItems: 'center',
                            gap: '8px',
                            borderRadius: '14px',
                            background: arcadePlayMode === 'solo' ? '#39245e' : '#071a35',
                            border: arcadePlayMode === 'solo' ? '2px solid #d689ff' : '1px solid var(--line)',
                            boxShadow: arcadePlayMode === 'solo' ? '0 0 20px rgba(214, 137, 255, 0.42)' : 'none',
                            color: '#fff'
                          }}
                        >
                          <img src={assetPath('arena/games/prince ali.png')} alt="Prince Ali Ababwa" style={{ width: '100%', height: '100px', objectFit: 'contain', filter: 'drop-shadow(0 5px 8px rgba(0, 0, 0, 0.35))' }} />
                          <span style={{ fontSize: '13px', fontWeight: 900, lineHeight: 1.25, textAlign: 'center' }}>
                            Tegen Prince <span style={{ color: '#ff5bcb', textShadow: '0 0 8px rgba(255, 91, 203, 0.85)' }}>A</span>l<span style={{ color: '#ff5bcb', textShadow: '0 0 8px rgba(255, 91, 203, 0.85)' }}>i</span> Ababwa
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setArcadePlayMode('duel')}
                          aria-pressed={arcadePlayMode === 'duel'}
                          title="Start een realtime duel"
                          style={{
                            minHeight: '164px',
                            padding: '12px 8px',
                            display: 'grid',
                            gridTemplateRows: '100px auto',
                            alignItems: 'center',
                            justifyItems: 'center',
                            gap: '8px',
                            borderRadius: '14px',
                            background: arcadePlayMode === 'duel' ? '#5b2437' : '#071a35',
                            border: arcadePlayMode === 'duel' ? '2px solid #ff7b8b' : '1px solid var(--line)',
                            boxShadow: arcadePlayMode === 'duel' ? '0 0 18px rgba(255, 123, 139, 0.28)' : 'none',
                            color: '#fff'
                          }}
                        >
                          <img src={assetPath('arena/games/Sword.png')} alt="Zwaard" style={{ width: '100%', height: '100px', objectFit: 'contain', filter: 'drop-shadow(0 5px 8px rgba(0, 0, 0, 0.35))' }} />
                          <span style={{ fontSize: '13px', fontWeight: 900, lineHeight: 1.25, textAlign: 'center' }}>Realtime Duel</span>
                        </button>
                      </div>

                      {arcadePlayMode === 'solo' && (
                        <div className="animate-fade-in">
                          {hasArenaAi(selectedArcadeGame) && (
                            <div style={{ background: '#07152c', border: '1px solid var(--line)', borderRadius: '12px', padding: '12px', marginBottom: '12px' }}>
                              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold', color: 'var(--gold)' }}>AI-niveau tegenstander</label>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                {[
                                  { id: 'easy', label: 'Rustig' },
                                  { id: 'normal', label: 'Normaal' },
                                  { id: 'hard', label: 'Slim' }
                                ].map(level => (
                                  <button
                                    key={level.id}
                                    className={`btn mini ${aiLevel === level.id ? 'primary' : 'secondary'}`}
                                    onClick={() => {
                                      setAiLevel(level.id);
                                      localStorage.setItem('disney_ai_level', level.id);
                                    }}
                                    style={{ padding: '9px 6px', fontSize: '12px' }}
                                  >
                                    {level.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          {selectedArcadeGame === 'piratesplank' && (
                            <div style={{ background: '#07152c', border: '1px solid var(--line)', borderRadius: '12px', padding: '12px', marginBottom: '12px' }}>
                              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 'bold', color: 'var(--gold)' }}>Moeilijkheid Black Pearl</label>
                              <div style={{ color: 'var(--muted)', fontSize: '11px', marginBottom: '9px' }}>Bepaalt de lengte, hints, kosten en het aantal strikes.</div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                {[
                                  { id: 'easy', label: 'Rustig' },
                                  { id: 'normal', label: 'Normaal' },
                                  { id: 'hard', label: 'Uitdagend' }
                                ].map(level => (
                                  <button
                                    key={level.id}
                                    className={`btn mini ${piratesDifficulty === level.id ? 'primary' : 'secondary'}`}
                                    onClick={() => {
                                      setPiratesDifficulty(level.id);
                                      localStorage.setItem('disney_pirates_difficulty', level.id);
                                    }}
                                    style={{ padding: '9px 4px', fontSize: '12px' }}
                                  >
                                    {level.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          <button
                            className="btn primary full"
                            onClick={() => handleStartArcadeSolo(selectedArcadeGame)}
                          >
                            Start Solo Game
                          </button>
                        </div>
                      )}

                      {arcadePlayMode === 'duel' && (
                        <div className="animate-fade-in" style={{ background: '#07152c', padding: '16px', borderRadius: '12px', border: '1px solid var(--line)' }}>
                          {selectedArcadeGame === 'piratesplank' && (
                            <div style={{ marginBottom: '14px' }}>
                              <label style={{ display: 'block', marginBottom: '7px', fontSize: '13px', fontWeight: 'bold', color: 'var(--gold)' }}>Moeilijkheid Black Pearl</label>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '7px' }}>
                                {[['easy', 'Rustig'], ['normal', 'Normaal'], ['hard', 'Uitdagend']].map(([id, label]) => (
                                  <button key={id} className={`btn mini ${piratesDifficulty === id ? 'primary' : 'secondary'}`} onClick={() => setPiratesDifficulty(id)} style={{ padding: '8px 3px', fontSize: '11px' }}>{label}</button>
                                ))}
                              </div>
                            </div>
                          )}
                          <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: 'var(--gold)' }}>⚔️ Duel Lobby</h3>
                          <p className="small" style={{ marginTop: 0 }}>
                            {getArenaGame(selectedArcadeGame)?.maxPlayers === 4
                              ? 'Deze kamer laat maximaal 4 spelers toe.'
                              : 'Dit spel is ontworpen als 1-tegen-1 en laat maximaal 2 spelers toe.'}
                          </p>
                          <button
                            className="btn primary full"
                            onClick={() => handleCreateArcadeDuel(selectedArcadeGame)}
                            style={{ marginBottom: '15px' }}
                          >
                            Creëer een Duel Kamer (Host)
                          </button>

                          <div style={{ borderTop: '1px solid var(--line)', paddingTop: '15px', marginTop: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold' }}>Of neem deel via een kamercode:</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <input
                                type="text"
                                placeholder="CODE..."
                                value={roomCodeInput}
                                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                                style={{ flexGrow: 1, padding: '10px', textTransform: 'uppercase', boxSizing: 'border-box', fontFamily: 'Outfit, Inter, sans-serif' }}
                              />
                              <button
                                className="btn primary"
                                onClick={handleJoinRoom}
                              >
                                Join
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </section>
                </div>
              )}

              {false && (
                <>
              {/* Dedicated Arcade history log */}
              <section className="card" style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h2 className="sectiontitle" style={{ margin: 0 }}>📊 Geschiedenis Arena</h2>
                  {soloHistory.filter(isArenaHistoryItem).length > 0 && (
                    <button 
                      className="btn secondary mini" 
                      onClick={() => {
                        if (confirm("Weet je zeker dat je alle geschiedenis van de arena wilt wissen?")) {
                          const updated = soloHistory.filter(h => !isArenaHistoryItem(h));
                          setSoloHistory(updated);
                          localStorage.setItem('disney_solo_history', JSON.stringify(updated));
                        }
                      }}
                      style={{ padding: '2px 8px', fontSize: '10px' }}
                    >
                      Wis Arena
                    </button>
                  )}
                </div>

                <div style={{ maxHeight: '200px', overflowY: 'auto', gap: '8px', display: 'flex', flexDirection: 'column' }}>
                  {(() => {
                    const arenaLogs = soloHistory.filter(isArenaHistoryItem);
                    if (arenaLogs.length === 0) {
                      return <p style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center' }}>Nog geen arena spellen gespeeld.</p>;
                    }
                    return arenaLogs.map((log, idx) => {
                      const dateObj = new Date(log.date);
                      const timeStr = `${String(dateObj.getDate()).padStart(2, '0')}-${String(dateObj.getMonth() + 1).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
                      return (
                        <div key={idx} style={{ padding: '8px 12px', background: '#081730', border: '1px solid var(--line)', borderRadius: '8px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong>{log.details}</strong>
                            <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>{timeStr}</div>
                          </div>
                          <div style={{ color: 'var(--gold)', fontWeight: 'bold' }}>+{log.score ?? log.stars ?? 0} ★</div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </section>
                </>
              )}
            </div>
          )}

          {/* SCREEN: SOLO SELECT */}
          {screen === 'solo_select' && (
            <div>
              <section className="card">
                <h2 className="sectiontitle">🎮 Kies een Speltype</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '12px', marginTop: '14px' }}>
                  {[
                    { cat: "Yzma's Poison Struggle", icon: "🧠", name: "Yzma's Poison Struggle", desc: "Origineel: Mastermind. Kleurcode kraken (4, 5 of 6 stippen)", active: true },
                    { cat: "Zazu's Sudoku", icon: "🏰", name: "Zazu's Sudoku", desc: "Origineel: Sudoku 9x9. Klassiek raster met 9 symbolen.", active: true },
                    { cat: "Disney Dagboek", icon: "📔", name: "Disney Dagboek (Geheim)", desc: "Binnenkort beschikbaar", active: false }
                  ].map(game => (
                    <button
                      key={game.cat}
                      disabled={!game.active}
                      onClick={() => handleStartSoloGame(game.cat)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '16px',
                        background: '#091c38',
                        border: '1px solid var(--line)',
                        borderRadius: '16px',
                        cursor: game.active ? 'pointer' : 'default',
                        opacity: game.active ? 1 : 0.5,
                        width: '100%',
                        textAlign: 'left',
                        transition: 'all 0.15s ease'
                      }}
                      className="solo-game-card"
                    >
                      <span style={{ fontSize: '32px' }}>{game.icon}</span>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff', display: 'block' }}>{game.name}</span>
                        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{game.desc}</span>
                      </div>
                      {game.active && <span style={{ color: 'var(--gold)', fontSize: '18px' }}>➔</span>}
                    </button>
                  ))}
                </div>
              </section>

              <section className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h2 className="sectiontitle" style={{ margin: 0 }}>📜 Solo Geschiedenis</h2>
                  {soloHistory.filter(h => !isArenaHistoryItem(h)).length > 0 && (
                    <button 
                      className="btn secondary mini" 
                      onClick={() => {
                        if (confirm("Weet je zeker dat je alle geschiedenis wilt wissen?")) {
                          const updated = soloHistory.filter(isArenaHistoryItem);
                          setSoloHistory(updated);
                          localStorage.setItem('disney_solo_history', JSON.stringify(updated));
                        }
                      }}
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                    >
                      Wis alles
                    </button>
                  )}
                </div>
                
                {soloHistory.filter(h => !isArenaHistoryItem(h)).length === 0 ? (
                  <div className="center" style={{ padding: '20px 0', color: 'var(--muted)', fontSize: '14px' }}>
                    Je hebt nog geen solo spelletjes gespeeld. Start hierboven een spel!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                    {soloHistory.filter(h => !isArenaHistoryItem(h)).map((item, idx) => {
                      const dateObj = new Date(item.date);
                      const timeStr = `${String(dateObj.getDate()).padStart(2, '0')}-${String(dateObj.getMonth() + 1).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
                      return (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#091c38', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--line)' }}>
                          <div>
                            <strong style={{ fontSize: '14px', display: 'block', color: '#fff' }}>{item.gameType}</strong>
                            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{timeStr} · {item.details}</span>
                          </div>
                          <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--gold)' }}>
                            +{item.score} ★
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* SCREEN: HOME */}
          {screen === 'home' && (
            <div>
              {renderPortalDestinationHero({
                image: 'portal/Lightning_mc_queen.png',
                imageAlt: "McQueen's Road Race",
                badge: 'Multiplayer Edition · Real-time',
                title: "McQueen's",
                accentTitle: 'Road Race',
                description: 'Speel samen op je eigen telefoon tijdens de rit naar Disneyland Parijs!',
                onBack: () => {
                  setSelectedPortalGame(null);
                  setScreen('portal');
                },
                theme: 'gold',
                imageClass: 'portal-mark-mcqueen'
              })}

              <section className="card road-hostcard">
                <h2 className="sectiontitle">Spel organiseren</h2>
                <p>Jij maakt een nieuwe kamer aan en bepaalt daarna de spelonderdelen.</p>
                <button className="btn primary full" onClick={() => setScreen('setup')}>Nieuwe Kamer starten</button>
              </section>

              <section className="card">
                <h2 className="sectiontitle">Meedoen</h2>
                <div className="field">
                  <label htmlFor="joinCode">Kamercode</label>
                  <input 
                    id="joinCode" 
                    placeholder="Vul de 4-letterige code in"
                    value={roomCodeInput} 
                    onChange={e => setRoomCodeInput(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="field">
                  <label htmlFor="joinName">Jouw Naam</label>
                  <input 
                    id="joinName" 
                    placeholder="Bijv. Mickey"
                    value={activeProfileName || playerNameInput} 
                    readOnly={!!activeProfileName}
                    onChange={e => setPlayerNameInput(e.target.value)}
                  />
                </div>

                {error && <p style={{ color: 'var(--danger)', fontSize: '13px' }}>⚠️ {error}</p>}

                <button className="btn primary full" style={{ marginTop: '20px' }} onClick={handleJoinRoom}>Deelnemen</button>
              </section>

            </div>
          )}

          {/* SCREEN: SETUP */}
          {screen === 'setup' && (
            <div>
              <section className="card">
                <h2 className="sectiontitle">1. Kies de spelonderdelen</h2>
                <div className="category-grid">
                  {["Disney Dagboek", "Pictionary", "Inschattingsvragen", "Dilemma", "Emoji Quiz", "Wie ben ik?", "Feit of Fabel", "Quiz", "Samen"].map(cat => {
                    const checked = selectedCats.includes(cat);
                    return (
                      <label key={cat} className={`category-item ${checked ? 'checked' : ''}`}>
                        <input 
                          type="checkbox" 
                          checked={checked} 
                          onChange={() => {
                            if (checked) {
                              if (selectedCats.length > 1) {
                                setSelectedCats(selectedCats.filter(c => c !== cat));
                              } else {
                                alert("Kies tenminste één categorie.");
                              }
                            } else {
                              setSelectedCats([...selectedCats, cat]);
                            }
                          }}
                        />
                        {cat}
                      </label>
                    );
                  })}
                </div>
              </section>

              <section className="card">
                <h2 className="sectiontitle">2. Slimme opdrachtenmix</h2>
                <div className="notice">Road Race kiest uit de volledige database. Ongebruikte opdrachten komen eerst, dezelfde categorie verschijnt nooit direct opnieuw en quizvragen worden automatisch afgewisseld.</div>
              </section>

              <section className="card">
                <h2 className="sectiontitle">3. Spelers en lengte</h2>
                <div className="field">
                  <label>Rol van de organisator</label>
                  <div className="answers">
                    <button
                      type="button"
                      className={`answer ${roadHostRole === 'player' ? 'selected' : ''}`}
                      aria-pressed={roadHostRole === 'player'}
                      onClick={() => setRoadHostRole('player')}
                      style={roadHostRole === 'player' ? { borderColor: 'var(--gold)' } : undefined}
                    >
                      <strong>Ik speel zelf mee</strong><br />
                      <span className="small">Je bent organisator én gewone speler en kunt sterren en Coco Coins verdienen.</span>
                    </button>
                    <button
                      type="button"
                      className={`answer ${roadHostRole === 'facilitator' ? 'selected' : ''}`}
                      aria-pressed={roadHostRole === 'facilitator'}
                      onClick={() => setRoadHostRole('facilitator')}
                      style={roadHostRole === 'facilitator' ? { borderColor: 'var(--gold)' } : undefined}
                    >
                      <strong>Ik ben alleen spelleider</strong><br />
                      <span className="small">Je beheert vragen en uitslagen, maar telt niet mee als speler.</span>
                    </button>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="hostName">Naam organisator</label>
                  <input 
                    id="hostName" 
                    placeholder="Bijv. Donald" 
                    value={activeProfileName || playerNameInput} 
                    readOnly={!!activeProfileName}
                    onChange={e => setPlayerNameInput(e.target.value)}
                  />
                </div>
                
                <div className="field">
                  <label htmlFor="rounds">Opdrachtlengte</label>
                  <select 
                    id="rounds" 
                    value={roundsPerPlayer}
                    onChange={e => setRoundsPerPlayer(Number(e.target.value))}
                  >
                    <option value={3}>3 gezamenlijke rondes</option>
                    <option value={5}>5 gezamenlijke rondes</option>
                    <option value={10}>10 gezamenlijke rondes</option>
                    <option value={15}>15 gezamenlijke rondes</option>
                  </select>
                </div>

                {error && <p style={{ color: 'var(--danger)', fontSize: '13px' }}>⚠️ {error}</p>}

                <div className="btnrow one" style={{ marginTop: '20px' }}>
                  <button className="btn primary" onClick={handleCreateRoom}>Kamer aanmaken</button>
                </div>
              </section>
            </div>
          )}

          {/* SCREEN: LOBBY */}
          {screen === 'lobby' && (
            <div>
              <section className="card hero">
                <div className="badge">Kamer Code</div>
                <h1 style={{ fontSize: '64px', margin: '10px 0', letterSpacing: '4px', color: 'var(--gold)', fontFamily: 'Outfit, Inter, sans-serif' }}>{room?.code}</h1>
                <p>Vertel de anderen in de auto om deze code in te voeren op hun telefoon.</p>
              </section>

              <section className="card">
                <h2 className="sectiontitle">Deelnemers ({players.length})</h2>
                {room?.current_task_state?.facilitator && (
                  <div className="notice" style={{ marginBottom: '12px' }}>
                    <strong>👑 Spelleider: {room.current_task_state.facilitator.name}</strong><br />
                    Deze organisator speelt niet mee en telt niet mee voor antwoorden, scores of beloningen.
                  </div>
                )}
                {room?.game_mode?.startsWith('arcade-') && (
                  <p className="small" style={{ marginTop: '-4px' }}>
                    {getArenaGame(room.current_task_state?.arcadeGameId)?.name || 'Arena spel'}:
                    {' '}maximaal {room.current_task_state?.arcadeMaxPlayers || 2} spelers.
                  </p>
                )}
                <div className="players">
                  {players.map((p, idx) => (
                    <div key={p.id} className="playerline" style={{ padding: '10px', background: '#081a37', border: '1px solid var(--line)', borderRadius: '10px' }}>
                      <strong>{p.name} {!room?.current_task_state?.facilitator && idx === 0 ? "👑" : ""}</strong>
                    </div>
                  ))}
                </div>

                {isRoomHost() ? (
                  <div className="btnrow one" style={{ marginTop: '20px' }}>
                    <button
                      className="btn primary"
                      disabled={players.length < 1 || (room?.game_mode?.startsWith('arcade-') && room.current_task_state?.arcadeMaxPlayers && players.length > room.current_task_state.arcadeMaxPlayers)}
                      onClick={handleStartGame}
                    >
                      Spel Starten ({players.length} spelers)
                    </button>
                  </div>
                ) : (
                  <div className="notice" style={{ marginTop: '20px', textAlign: 'center' }}>
                    Wachten op de host 👑 om het spel te starten...
                  </div>
                )}
              </section>
            </div>
          )}

          {/* SCREEN: GAME */}
          {screen === 'game' && room && (
            <div>
              {stagePause ? (
                // ETAPPE VOLTOOID PAUSE VIEW
                <div>
                  {renderScoreBar()}
                  <section className="card hero" style={{ padding: '30px 10px' }}>
                    <div className="bigicon">🛣️</div>
                    <div className="badge">Pauzemoment</div>
                    <h1 style={{ fontSize: '32px', margin: '10px 0' }}>Etappe Pauze</h1>
                    <p>Even rust. Tijd voor snacks of een plaspauze! Klik hieronder als iedereen er weer klaar voor is.</p>
                    
                    {isRoomHost() ? (
                      <div className="btnrow one">
                        <button className="btn primary" onClick={handleContinueStage}>Volgende Etappe</button>
                      </div>
                    ) : (
                      <p className="small">De host kan de volgende etappe starten.</p>
                    )}
                  </section>
                </div>
              ) : (
                // ACTIVE GAME VIEW
                <div>
                  {!room.game_mode?.startsWith('arcade-') && renderScoreBar()}

                  <div className="routecaption">
                    {room.id === 'solo' 
                      ? (room.game_mode?.startsWith('arcade-') ? `Solo Spel · Duel Arena` : `Solo Spel · ${getCurrentTask()?.cat || "Quest Solo"}`)
                      : (
                        <span>
                          Kamer: <span style={{ fontFamily: 'Outfit, Inter, sans-serif', fontWeight: 'bold' }}>{room.code}</span> · Mode: {room.game_mode?.startsWith('arcade-') ? "Duel Arena" : GAME_MODES.find(m => m.id === room.game_mode)?.name}
                        </span>
                      )
                    }
                  </div>

                  {room.id !== 'solo' && room.game_mode?.startsWith('arcade-') && (
                    <div className="btnrow one" style={{ margin: '10px 0 14px' }}>
                      <button className="btn danger" onClick={() => leaveCurrentRoom('arcade_select')}>
                        Kamer verlaten en nieuw Arena-spel kiezen
                      </button>
                    </div>
                  )}

                  {/* Render animated road progress */}
                  {renderRouteProgressRoad()}

                  {getCurrentTask() ? (
                    (() => {
                      const t = getCurrentTask();
                      const activePlayer = players[room.current_player_index];
                      const isMyTurn = activePlayer?.id === localPlayer?.id;
                      const isHost = isRoomHost();
                      const canControlTurnTask = isMyTurn || isHost;
                      const difficultyLabel = t.difficulty ? { easy: "Makkelijk", medium: "Medium", hard: "Moeilijk" }[t.difficulty] : "";
                      const isSoloAiGame = t.type === 'arcade-game' && t.mode === 'solo' && hasArenaAi(t.gameId);
                      const isRoundAnnouncement = !room.game_mode?.startsWith('arcade-') && room.current_task_state?.roundPhase === 'announcement';
                      const aiLevelNumber = { easy: 1, normal: 2, hard: 3 }[room.current_task_state?.aiLevel || aiLevel] || 2;
                      const pointsText = t.type === "quizChoice"
                        ? "Kies je niveau"
                        : isSoloAiGame
                          ? `LEVEL ${aiLevelNumber}`
                          : `${t.points || 1} ster${(t.points || 1) > 1 ? "ren" : ""}`;
                      const badgeText = `${t.cat}${difficultyLabel ? " · " + difficultyLabel : ""} · ${pointsText}${room.current_task_state?.bonusRound ? ' · BONUS ×2' : ''}`;

                      return (
                        <section className={`card task${t.type === 'arcade-game' && t.gameId === 'qwixx' ? ' task-qwixx' : ''}`}>
                          {t.type === "arcade-game" ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                              <div className="badge">{badgeText}</div>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', minWidth: 0 }}>
                                {players.map((player, playerIndex) => {
                                  const projectedQwixxStars = t.gameId === 'qwixx' && arenaToolbar?.gameId === 'qwixx'
                                    ? arenaToolbar.projectedStars?.[playerIndex]
                                    : null;
                                  const projectedQwixxCoins = t.gameId === 'qwixx' && arenaToolbar?.gameId === 'qwixx'
                                    ? arenaToolbar.projectedCoins?.[playerIndex]
                                    : null;
                                  const displayedStars = projectedQwixxStars ?? (player.score || 0);
                                  const displayedCoins = projectedQwixxCoins ?? displayedStars;
                                  return (
                                    <div key={player.id} title={projectedQwixxStars !== null ? 'Beloning als Qwixx nu eindigt' : undefined} className="arena-live-reward">
                                      <b style={{ display: 'block', maxWidth: '88px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '11px' }}>{player.name}</b>
                                      <span className="arena-live-reward-line">
                                        <strong>{displayedStars} ★</strong>
                                        <span>=</span>
                                        <strong>{displayedCoins}</strong>
                                        <CocoCoinIcon size={13} onInspect={openCoinViewer} />
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="badge">{badgeText}</div>
                          )}
                          {room.game_mode?.startsWith('arcade-') ? (
                            <div className="turn">
                              Aan de beurt: <strong>{activePlayer?.name} {isMyTurn ? "(Jij!)" : ""}</strong>
                            </div>
                          ) : (
                            <div className="turn">
                              <strong>Ronde {(room.round || 0) + 1} van {room.total_rounds}</strong> · iedereen speelt mee
                            </div>
                          )}

                          {isRoundAnnouncement && (() => {
                            const wishChoices = room.current_task_state?.doubleWishChoices || {};
                            const wishUsed = room.current_task_state?.doubleWishUsed || {};
                            const myWishChoice = wishChoices[localPlayer?.id];
                            const allPlayersChose = players.length > 0 && players.every(player => wishChoices[player.id]);
                            const canUseWish = !wishUsed[localPlayer?.id];
                            const facilitatorView = isFacilitatorHost();
                            const bonusRound = !!room.current_task_state?.bonusRound;
                            return (
                              <div className={`round-announcement ${bonusRound ? 'road-bonus-announcement' : ''}`}>
                                <div className="bigicon" aria-hidden="true">{bonusRound ? '🎆' : '✨'}</div>
                                <div className="badge">{bonusRound ? 'Disney Parade Bonus' : 'Volgende ronde'}</div>
                                <h2>{t.cat || t.title}</h2>
                                <p>{bonusRound ? 'Verrassing! Deze ronde telt automatisch dubbel voor iedereen. Persoonlijke wensen blijven veilig bewaard.' : facilitatorView ? 'De spelers kiezen nu of zij hun eenmalige verdubbelaar inzetten.' : 'Iedereen krijgt dezelfde opdracht. Kies nu of je jouw eenmalige verdubbelaar inzet.'}</p>
                                {bonusRound ? (
                                  <div className="notice green" style={{ marginTop: '14px' }}>🎉 Alle verdiende punten ×2</div>
                                ) : facilitatorView ? (
                                  <div className="notice" style={{ marginTop: '14px' }}>Spelleiderweergave · je telt niet mee als speler.</div>
                                ) : !myWishChoice ? (
                                  <div className="btnrow one" style={{ marginTop: '16px' }}>
                                    {canUseWish && (
                                      <button className="btn primary" onClick={() => handleDoubleWishChoice('double')}>
                                        ✨ Wens op een Ster inzetten · dubbele punten
                                      </button>
                                    )}
                                    <button className="btn secondary" onClick={() => handleDoubleWishChoice('normal')}>
                                      Bewaar mijn wens
                                    </button>
                                  </div>
                                ) : (
                                  <div className="notice green" style={{ marginTop: '14px' }}>
                                    {myWishChoice === 'double' ? 'Jouw Wens op een Ster staat aan: deze ronde telt dubbel.' : 'Keuze opgeslagen: je bewaart jouw Wens op een Ster.'}
                                  </div>
                                )}
                                <p className="small" style={{ marginTop: '12px' }}>
                                  {Object.keys(wishChoices).length}/{players.length} spelers zijn klaar.
                                </p>
                                {allPlayersChose && isHost ? (
                                  <button className="btn primary full" onClick={handleRevealRound}>Toon de opdracht</button>
                                ) : allPlayersChose ? (
                                  <div className="notice">De host toont zo de opdracht.</div>
                                ) : null}
                              </div>
                            );
                          })()}

                          <h2 style={isRoundAnnouncement ? { display: 'none' } : undefined}>{t.title}</h2>
                          <div className="prompt" style={isRoundAnnouncement ? { display: 'none' } : undefined}>{t.text}</div>
                          {!isRoundAnnouncement && room.current_task_state?.bonusRound && (
                            <div className="notice green" style={{ marginTop: '12px', textAlign: 'center' }}>🎆 Disney Parade Bonus actief · alle verdiende punten ×2</div>
                          )}
                          {!isRoundAnnouncement && renderFacilitatorDashboard(t)}

                           <div className={t.type === 'arcade-game' && t.gameId === 'qwixx' ? 'task-game-content task-game-content-qwixx' : 'task-game-content'} style={{ marginTop: '20px', ...(isRoundAnnouncement ? { display: 'none' } : {}) }}>
                            {/* -1. DISNEY DUEL ARENA */}
                            {t.type === "arcade-game" && (() => {
                              const isTinkerGame = t.gameId === 'tictactinker';
                              const isTallArenaGame = t.gameId === 'piratesplank' || t.gameId === 'yahtzee';
                              const arenaGameName = getArenaGame(t.gameId)?.name || 'Speelveld';
                              const standardArenaToolbar = (
                                <div className="arena-external-rules-row">
                                  <strong>{arenaGameName}</strong>
                                  <MiniGameRulesButton gameId={t.gameId} mode={t.mode} compact />
                                </div>
                              );
                              const tinkerToolbar = isTinkerGame && arenaToolbar?.gameId === 'tictactinker' ? (
                                <div style={{ position: 'relative', minHeight: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <div style={{ position: 'absolute', left: 0 }}>
                                    <MiniGameRulesButton gameId="tictactinker" mode={t.mode} compact />
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', paddingLeft: '28px', color: 'var(--muted)', fontSize: '13px', fontWeight: 850, whiteSpace: 'nowrap' }}>
                                    <span style={{ color: arenaToolbar.playerColors[0] }}>X {arenaToolbar.playerNames[0]} {arenaToolbar.boardScores[0]}</span>
                                    <span style={{ color: arenaToolbar.playerColors[1] }}>O {arenaToolbar.playerNames[1]} {arenaToolbar.boardScores[1]}</span>
                                    <span style={{ color: arenaToolbar.myTurn ? 'var(--gold)' : 'var(--muted)' }}>{arenaToolbar.turnText}</span>
                                  </div>
                                </div>
                              ) : null;
                              const tinkerFooter = isTinkerGame && arenaToolbar?.gameId === 'tictactinker' ? (
                                <div>
                                  <span style={{ color: arenaToolbar.myTurn ? 'var(--gold)' : 'var(--muted)', fontSize: '13px', fontWeight: 850 }}>
                                    {arenaToolbar.boardMessage}
                                  </span>
                                  {arenaToolbar.finished && (
                                    <button className="btn primary full" onClick={arenaToolbar.finishGame} style={{ marginTop: '10px' }}>
                                      Voltooien & score bepalen
                                    </button>
                                  )}
                                </div>
                              ) : null;

                              return (
                              <GameZoomContainer
                                maxHeight={isTinkerGame ? '520px' : isTallArenaGame ? '620px' : '560px'}
                                aspectRatio={isTinkerGame ? '1 / 1' : isTallArenaGame ? '2 / 3' : '3 / 4'}
                                fluid={t.gameId === 'qwixx'}
                                fitContent={!isTinkerGame}
                                resetKey={t.gameId}
                                label={getArenaGame(t.gameId)?.name || 'Speelveld'}
                                toolbarContent={tinkerToolbar || standardArenaToolbar}
                                footerContent={tinkerFooter}
                              >
                                <MiniGameRenderer
                                  gameId={t.gameId}
                                  mode={t.mode}
                                  room={room}
                                  localPlayer={localPlayer}
                                  players={players}
                                  updateRoomState={updateRoomState}
                                  showRules={false}
                                  onToolbarChange={isTinkerGame || t.gameId === 'qwixx' ? setArenaToolbar : undefined}
                                onFinish={async (score, detail) => {
                                    const usesDirectReward = t.gameId === 'ricochet' || t.gameId === 'qwixx' || t.gameId === 'piratesplank';
                                    const coinsEarned = usesDirectReward ? score : (score === 3 ? 2 : (score === 2 ? 1 : 0));
                                    const gameTitle = getArenaGame(t.gameId)?.name || "Arena Game";

                                    if (room.id === 'solo') {
                                      logSoloAttempt(coinsEarned, detail, true);
                                      soloLoggedRef.current = true;
                                    } else {
                                      await addPlayerScore(room.id, localPlayer, coinsEarned, `${gameTitle}: ${detail}`, 'knowledge');
                                      const completedAt = new Date().toISOString();
                                      const profileName = localPlayer?.name || activeProfileName || 'Speler';
                                      const historyEntry = {
                                        profileName,
                                        profileKey: getCollectorKey(profileName),
                                        category: 'arena',
                                        gameType: gameTitle,
                                        date: completedAt,
                                        score: coinsEarned,
                                        details: detail
                                      };
                                      setSoloHistory(previous => {
                                        const alreadyRecorded = previous.some(item => (
                                          item.profileKey === historyEntry.profileKey
                                          && item.gameType === historyEntry.gameType
                                          && item.details === historyEntry.details
                                          && Math.abs(new Date(item.date || 0) - new Date(completedAt)) < 120000
                                        ));
                                        if (alreadyRecorded) return previous;
                                        const next = [historyEntry, ...previous];
                                        localStorage.setItem('disney_solo_history', JSON.stringify(next));
                                        return next;
                                      });
                                    }
                                    handleFinishTask();
                                  }}
                                />
                              </GameZoomContainer>
                              );
                            })()}

                            {/* 0. DISNEY SUDOKU */}
                            {t.type === "sudoku" && (
                              <div>
                                {sudokuSolved ? (
                                  <div className="center" style={{ padding: '20px 10px' }}>
                                    <div style={{ fontSize: '64px', margin: '20px 0', animation: 'bounce 1s infinite' }}>🏰</div>
                                    <h2 style={{ color: 'var(--gold)', fontSize: '28px', marginBottom: '10px' }}>Sudoku Opgelost!</h2>
                                    <p style={{ color: '#fff', fontSize: '15px', marginBottom: '20px', maxWidth: '300px', margin: '0 auto 20px' }}>
                                      {sudokuSolvedStats}
                                    </p>
                                    <button 
                                      className="btn primary full" 
                                      onClick={handleFinishTask}
                                    >
                                      Beëindig & incasseer ★
                                    </button>
                                  </div>
                                ) : (
                                  <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '13px', color: 'var(--muted)' }}>
                                      <span>Tijd verstreken: {Math.floor((Date.now() - sudokuStartTime) / 1000)}s</span>
                                      <span>Hints gebruikt: {sudokuHintsUsed} (-{sudokuHintsUsed} ster{sudokuHintsUsed === 1 ? '' : 'ren'})</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginBottom: '10px' }}>
                                      <button className="btn secondary mini" onClick={handleSudokuHint}>
                                        Hint (-1 ster)
                                      </button>
                                    </div>

                                    {/* The Sudoku Grid wrapped in GameZoomContainer */}
                                    <GameZoomContainer
                                      maxHeight="min(65dvh, 520px)"
                                      maxWidth="min(100%, 65dvh, 520px)"
                                      aspectRatio="1 / 1"
                                      resetKey={`${sudokuSize}-${sudokuStartTime}`}
                                      label={t.title || "Zazu's Sudoku"}
                                    >
                                      <div 
                                        style={{ 
                                          display: 'grid', 
                                          gridTemplateColumns: `repeat(${sudokuSize}, 1fr)`, 
                                          gridTemplateRows: `repeat(${sudokuSize}, 1fr)`,
                                          gap: '4px', 
                                          background: '#041026', 
                                          padding: '8px', 
                                          borderRadius: '16px', 
                                          boxSizing: 'border-box',
                                          width: '100%',
                                          height: '100%'
                                        }}
                                      >
                                        {sudokuGrid.map((row, rIdx) => 
                                          row.map((cell, cIdx) => {
                                            const isClue = sudokuClues[rIdx]?.[cIdx];
                                            const isSelected = sudokuSelectedCell?.row === rIdx && sudokuSelectedCell?.col === cIdx;
                                            const hasError = sudokuErrors.some(err => err.r === rIdx && err.c === cIdx);
                                            const borderStyles = getCellBorderStyles(rIdx, cIdx, sudokuSize, isSelected, hasError);

                                            return (
                                              <button
                                                type="button"
                                                key={`${rIdx}-${cIdx}`}
                                                disabled={isClue}
                                                aria-label={`Rij ${rIdx + 1}, kolom ${cIdx + 1}: ${cell || 'leeg'}${isClue ? ' (gegeven)' : ''}`}
                                                onClick={() => {
                                                  if (isClue) return;
                                                  setSudokuSelectedCell({ row: rIdx, col: cIdx });
                                                }}
                                                style={{
                                                  aspectRatio: '1',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  fontSize: sudokuSize === 6 ? '34px' : '26px',
                                                  borderRadius: '8px',
                                                  cursor: isClue ? 'not-allowed' : 'pointer',
                                                  userSelect: 'none',
                                                  transition: 'background 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                                                  background: isClue 
                                                    ? 'rgba(255, 212, 92, 0.06)' 
                                                    : isSelected 
                                                      ? 'rgba(255, 212, 92, 0.15)' 
                                                      : '#091c38',
                                                  boxShadow: isSelected 
                                                    ? '0 0 10px rgba(255, 212, 92, 0.4)' 
                                                    : hasError 
                                                      ? '0 0 8px rgba(255, 100, 100, 0.4)' 
                                                      : 'none',
                                                  color: isClue ? 'var(--gold)' : '#fff',
                                                  fontWeight: isClue ? 'bold' : 'normal',
                                                  padding: 0,
                                                  ...borderStyles
                                                }}
                                              >
                                                {cell || ""}
                                              </button>
                                            );
                                          })
                                        )}
                                      </div>
                                    </GameZoomContainer>
                                    {/* Palette selector */}
                                    <div style={{ marginTop: '20px' }}>
                                      <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--muted)', marginBottom: '10px' }}>
                                        {sudokuSelectedCell 
                                          ? "Kies een symbool voor het geselecteerde vakje:" 
                                          : "Klik op een leeg vakje om een symbool te plaatsen"
                                        }
                                      </p>

                                      <div 
                                        style={{ 
                                          display: 'flex', 
                                          justifyContent: 'center', 
                                          gap: '8px', 
                                          flexWrap: 'wrap', 
                                          maxWidth: '360px', 
                                          margin: '0 auto' 
                                        }}
                                      >
                                        {(sudokuSize === 6 ? EMOJIS_6X6 : EMOJIS_9X9).map(emoji => (
                                          <button
                                            key={emoji}
                                            disabled={!sudokuSelectedCell}
                                            onClick={() => {
                                              if (!sudokuSelectedCell) return;
                                              const { row, col } = sudokuSelectedCell;
                                              const newGrid = sudokuGrid.map(gridRow => [...gridRow]);
                                              newGrid[row][col] = emoji;
                                              setSudokuGrid(newGrid);

                                              const newConflicts = checkSudokuConflicts(newGrid, sudokuSize);
                                              setSudokuErrors(newConflicts);
                                              finishSudokuIfSolved(newGrid, sudokuHintsUsed);
                                            }}
                                            style={{
                                              width: '44px',
                                              height: '44px',
                                              fontSize: '20px',
                                              borderRadius: '10px',
                                              background: '#091c38',
                                              border: '1px solid var(--line)',
                                              cursor: sudokuSelectedCell ? 'pointer' : 'not-allowed',
                                              opacity: sudokuSelectedCell ? 1 : 0.4,
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              transition: 'all 0.15s ease'
                                            }}
                                            className="sudoku-palette-btn"
                                          >
                                            {emoji}
                                          </button>
                                        ))}

                                        <button
                                          disabled={!sudokuSelectedCell}
                                          onClick={() => {
                                            if (!sudokuSelectedCell) return;
                                            const { row, col } = sudokuSelectedCell;
                                            const newGrid = sudokuGrid.map(gridRow => [...gridRow]);
                                            newGrid[row][col] = null;
                                            setSudokuGrid(newGrid);

                                            const newConflicts = checkSudokuConflicts(newGrid, sudokuSize);
                                            setSudokuErrors(newConflicts);
                                          }}
                                          style={{
                                            padding: '0 12px',
                                            height: '44px',
                                            fontSize: '13px',
                                            borderRadius: '10px',
                                            background: '#5a1d1d',
                                            border: '1px solid var(--danger)',
                                            color: '#fff',
                                            cursor: sudokuSelectedCell ? 'pointer' : 'not-allowed',
                                            opacity: sudokuSelectedCell ? 1 : 0.4,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 'bold'
                                          }}
                                        >
                                          Wis
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 1. QUIZ LEVEL CHOICE */}
                            {t.type === "quizChoice" && (
                              <div>
                                {canControlTurnTask ? (
                                  <div className="answers">
                                    <button className="answer" onClick={() => handleChooseDifficulty('easy')}>
                                      <strong>Makkelijk · 1 ster</strong><br />
                                      <span className="small">Toegankelijke quizvraag</span>
                                    </button>
                                    <button className="answer" onClick={() => handleChooseDifficulty('medium')}>
                                      <strong>Medium · 2 sterren</strong><br />
                                      <span className="small">Middelkennis Disney</span>
                                    </button>
                                    <button className="answer" onClick={() => handleChooseDifficulty('hard')}>
                                      <strong>Moeilijk · 3 sterren</strong><br />
                                      <span className="small">Voor de echte Disney-expert!</span>
                                    </button>
                                  </div>
                                ) : (
                                  <div className="center">Wachten tot {activePlayer?.name} of de host de moeilijkheidsgraad kiest...</div>
                                )}
                              </div>
                            )}

                            {/* 2. TRADITIONAL QUIZ */}
                            {t.type === "quiz" && (
                              (() => {
                                const quizAnswers = room.current_task_state?.quizAnswers || {};
                                const myQuizAnswer = quizAnswers[localPlayer?.id];
                                const answeredCount = players.filter(p => quizAnswers[p.id] !== undefined).length;
                                const allAnswered = players.length > 0 && answeredCount >= players.length;

                                return (
                                  <div>
                                    <div className="notice" style={{ background: '#0a2042', marginBottom: '12px' }}>
                                      Iedereen kiest eerst een antwoord en bevestigt daarna bewust de keuze.
                                      <strong style={{ display: 'block', marginTop: '4px' }}>{answeredCount}/{players.length} spelers hebben geantwoord.</strong>
                                    </div>
                                    {!isFacilitatorHost() && <div className="answers">
                                      {t.answers.map((ans, idx) => {
                                        const isTinkActive = room.current_task_state?.tinkActive;
                                        const isIncorrectOption = idx !== t.correct;
                                        const shouldHide = isTinkActive && isIncorrectOption && (idx === (t.correct + 1) % 4 || idx === (t.correct + 2) % 4);

                                        if (shouldHide) return null;

                                        let btnClass = "answer";
                                        if (idx === quizPendingIndex && myQuizAnswer === undefined) btnClass += " selected";
                                        if (quizLocked || allAnswered) {
                                          if (idx === t.correct) btnClass += " correct";
                                          else if (idx === myQuizAnswer) btnClass += " wrong";
                                        }
                                        return (
                                          <button
                                            key={idx}
                                            className={btnClass}
                                            disabled={quizLocked || myQuizAnswer !== undefined}
                                            aria-pressed={idx === quizPendingIndex}
                                            onClick={() => setQuizPendingIndex(idx)}
                                            style={idx === quizPendingIndex && myQuizAnswer === undefined ? { borderColor: 'var(--gold)', boxShadow: '0 0 0 2px rgba(255, 212, 92, .28)' } : undefined}
                                          >
                                            {ans}
                                          </button>
                                        );
                                      })}
                                    </div>}
                                    {!isFacilitatorHost() && myQuizAnswer === undefined && quizPendingIndex !== null && (
                                      <div className="notice" style={{ marginTop: '12px' }}>
                                        <strong>Gekozen antwoord:</strong> {t.answers[quizPendingIndex]}
                                        <div className="btnrow one" style={{ marginTop: '10px' }}>
                                          <button
                                            className="btn primary"
                                            onClick={() => handleAnswerQuiz(quizPendingIndex, t.correct, room.current_task_state.quizPoints || 1)}
                                          >
                                            Antwoord bevestigen
                                          </button>
                                          <button className="btn secondary" onClick={() => setQuizPendingIndex(null)}>
                                            Andere keuze
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                    {myQuizAnswer !== undefined && !quizLocked && (
                                      <div className="notice green" style={{ marginTop: '12px' }}>
                                        Antwoord opgeslagen. Wachten op de rest...
                                      </div>
                                    )}
                                    {quizLocked && isRoomHost() && (
                                      <div style={{ marginTop: '12px' }}>
                                        <button className="btn primary full" onClick={handleFinishTask}>
                                          Volgende opdracht
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()
                            )}

                            {/* 3. DISNEY DAGBOEK */}
                            {t.type === "diary" && (() => {
                              const activePart = room.current_task_state.part || 1;
                              const diaryAnswers = room.current_task_state.answers || {};
                              const myAnswers = diaryAnswers[localPlayer.id] || {};
                              const alreadySubmittedThisPart = !!myAnswers[`part${activePart}`];
                              const allSubmitted = players.every(p => diaryAnswers[p.id]?.[`part${activePart}`]);
                              const submittedCount = players.filter(p => diaryAnswers[p.id]?.[`part${activePart}`]).length;
                              const fragment = activePart === 1 ? t.part1 : activePart === 2 ? t.part2 : t.part3;

                              return (
                                <div>
                                  <div className="notice" style={{ background: '#0a1c3c' }}>
                                    <strong>Hint {activePart} van 3</strong> · iedereen ziet dezelfde hint en antwoordt op het eigen scherm.
                                  </div>
                                  <div style={{ padding: '14px', background: '#091c38', borderRadius: '12px', marginBottom: '14px', border: '1px solid var(--line)' }}>
                                    <p style={{ margin: 0, fontStyle: 'italic', fontSize: '16px', lineHeight: '1.5' }}>{fragment}</p>
                                  </div>

                                  {isFacilitatorHost() ? (
                                    <div className="notice">Wachten op de antwoorden van de spelers: {submittedCount}/{players.length} klaar.</div>
                                  ) : alreadySubmittedThisPart ? (
                                    <div className="notice green">
                                      Antwoord voor hint {activePart} opgeslagen. {submittedCount}/{players.length} spelers zijn klaar.
                                    </div>
                                  ) : (
                                    <div>
                                      <div className="field">
                                        <label>Welk personage?</label>
                                        <input placeholder="Vul het personage in" value={diaryChar} onChange={e => setDiaryChar(e.target.value)} />
                                      </div>
                                      <div className="field">
                                        <label>Welke film?</label>
                                        <input placeholder="Vul de film in" value={diaryMovie} onChange={e => setDiaryMovie(e.target.value)} />
                                      </div>
                                      <button className="btn primary full" disabled={!diaryChar.trim() || !diaryMovie.trim()} onClick={() => handleSubmitDiaryPart(activePart)}>
                                        Antwoord bevestigen
                                      </button>
                                    </div>
                                  )}

                                  {isHost && (
                                    <div className="btnrow one" style={{ marginTop: '12px' }}>
                                      {activePart < 3 ? (
                                        <button className="btn primary" disabled={!allSubmitted} onClick={() => handleNextDiaryPart(activePart + 1)}>
                                          Toon hint {activePart + 1}
                                        </button>
                                      ) : (
                                        <button className="btn primary" disabled={!allSubmitted} onClick={() => handleResolveDiary(t)}>
                                          Toon uitslag
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* 4. PICTIONARY */}
                            {t.type === "draw" && (() => {
                              const guesses = room.current_task_state?.pictionaryGuesses || {};
                              const guessers = players.filter(p => p.id !== activePlayer?.id);
                              const allGuessed = guessers.length === 0 || guessers.every(p => guesses[p.id]);
                              const myGuess = guesses[localPlayer?.id];
                              return (
                                <div>
                                  {isMyTurn ? (
                                    // Drawer UI
                                    <div>
                                      <div className="notice" style={{ background: '#12362a', borderColor: '#225e4c', color: '#e6fffa' }}>
                                        <strong>Jij bent de tekenaar! 🎨</strong> Teken het woord hieronder op het canvas. De anderen zien het live!
                                        <h3 style={{ fontSize: '24px', margin: '8px 0 0 0', color: 'var(--gold)' }}>{t.text}</h3>
                                      </div>
                                      
                                      <svg 
                                        ref={svgRef}
                                        viewBox="0 0 400 300" 
                                        className="drawing-canvas" 
                                        onPointerDown={(e) => handleSvgPointerDown(e, true)}
                                        onPointerMove={(e) => handleSvgPointerMove(e, true)}
                                        onPointerUp={() => handleSvgPointerUp(true)}
                                        style={{ touchAction: 'none', background: '#051126', border: '2px solid var(--line)', borderRadius: '16px', width: '100%', height: '260px' }}
                                      >
                                        {(room.current_task_state.lines || []).map((line, idx) => (
                                          <path 
                                            key={idx}
                                            d={`M ${line.points.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                                            fill="none"
                                            stroke={line.color}
                                            strokeWidth={line.width}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                        ))}
                                        {drawingPoints.length > 1 && (
                                          <path 
                                            d={`M ${drawingPoints.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                                            fill="none"
                                            stroke="#ffd45c"
                                            strokeWidth={4}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                        )}
                                      </svg>

                                      <div className="btnrow" style={{ marginTop: '10px' }}>
                                        <button className="btn secondary" onClick={handleUndoDrawing}>↩️ Undo</button>
                                        <button className="btn danger" onClick={handleClearDrawing}>Wis alles</button>
                                      </div>

                                      <div style={{ marginTop: '18px' }}>
                                        <label>Antwoorden ({Object.keys(guesses).length}/{guessers.length})</label>
                                        {guessers.map(p => (
                                          <div key={p.id} className="playerline" style={{ marginBottom: '5px' }}>
                                            <span>{p.name}</span>
                                            <strong style={{ color: guesses[p.id] ? (guesses[p.id].correct ? 'var(--ok)' : 'var(--danger)') : 'var(--muted)' }}>
                                              {guesses[p.id] ? `${guesses[p.id].text} ${guesses[p.id].correct ? '✓' : '✕'}` : 'Tekening bekijken…'}
                                            </strong>
                                          </div>
                                        ))}
                                        <button className="btn primary full" disabled={!allGuessed} onClick={handleResolvePictionary} style={{ marginTop: '10px' }}>
                                          Uitslag tonen en doorgaan
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    // Guesser UI
                                    <div>
                                      <div className="notice" style={{ background: '#0a1c3c' }}>
                                        <strong>Raad wat {activePlayer?.name} tekent! 🎨</strong> Vul je antwoord op je eigen scherm in.
                                      </div>

                                      <svg 
                                        viewBox="0 0 400 300" 
                                        className="drawing-canvas" 
                                        style={{ background: '#051126', border: '2px solid var(--line)', borderRadius: '16px', width: '100%', height: '260px' }}
                                      >
                                        {(room.current_task_state.lines || []).map((line, idx) => (
                                          <path 
                                            key={idx}
                                            d={`M ${line.points.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                                            fill="none"
                                            stroke={line.color}
                                            strokeWidth={line.width}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                        ))}
                                      </svg>
                                      {isFacilitatorHost() ? (
                                        <div className="notice" style={{ marginTop: '12px' }}>
                                          {Object.keys(guesses).length}/{guessers.length} spelers hebben geantwoord.
                                          {allGuessed && (
                                            <button className="btn primary full" style={{ marginTop: '10px' }} onClick={handleResolvePictionary}>
                                              Uitslag tonen en doorgaan
                                            </button>
                                          )}
                                        </div>
                                      ) : myGuess ? (
                                        <div className="notice green" style={{ marginTop: '12px' }}>
                                          Antwoord opgeslagen. Wachten op de andere spelers…
                                        </div>
                                      ) : (
                                        <div style={{ marginTop: '12px' }}>
                                          <div className="field">
                                            <label>Wat wordt er getekend?</label>
                                            <input value={localEstimate} onChange={e => setLocalEstimate(e.target.value)} placeholder="Vul je antwoord in" />
                                          </div>
                                          <button className="btn primary full" disabled={!localEstimate.trim()} onClick={() => handleSubmitPictionaryGuess(t)}>
                                            Antwoord bevestigen
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* 5. INSCHATTINGSVRAGEN */}
                            {t.type === "estimate" && (() => {
                              const estimates = room.current_task_state.estimates || {};
                              const myEstimate = estimates[localPlayer.id];
                              const allEstimated = players.length > 0 && players.every(p => estimates[p.id] !== undefined);
                              const submittedCount = players.filter(p => estimates[p.id] !== undefined).length;
                              return (
                                <div>
                                  <div className="notice" style={{ background: '#0a2042' }}>
                                    Iedereen maakt tegelijk een eigen schatting. Wie het dichtst bij het juiste antwoord zit, verdient 2 sterren. Gedeelde eerste plaats betekent gedeelde winst.
                                  </div>
                                  {isFacilitatorHost() ? (
                                    <div className="notice">Wachten op de schattingen: {submittedCount}/{players.length} spelers zijn klaar.</div>
                                  ) : myEstimate === undefined ? (
                                    <div>
                                      <div className="field">
                                        <label>Jouw schatting ({t.unit})</label>
                                        <input type="number" inputMode="numeric" placeholder="Vul een getal in" value={localEstimate} onChange={e => setLocalEstimate(e.target.value)} />
                                      </div>
                                      <button className="btn primary full" disabled={!localEstimate} onClick={handleSendEstimate}>
                                        Schatting bevestigen
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="notice green">
                                      Jouw schatting: <strong>{myEstimate} {t.unit}</strong>. {submittedCount}/{players.length} spelers zijn klaar.
                                    </div>
                                  )}
                                  {allEstimated && (
                                    <div style={{ marginTop: '14px' }}>
                                      <div className="notice" style={{ background: '#0c2145' }}>
                                        Juiste antwoord: <strong>{t.correct_value} {t.unit}</strong>
                                      </div>
                                      <div className="players" style={{ marginBottom: '12px' }}>
                                        {players.map(p => (
                                          <div key={p.id} className="playerline">
                                            <span>{p.name}</span><strong>{estimates[p.id]} {t.unit}</strong>
                                          </div>
                                        ))}
                                      </div>
                                      {isHost && (
                                        <button className="btn primary full" onClick={() => handleResolveEstimate(t)}>
                                          Winnaar bepalen en doorgaan
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* 6. DILEMMA */}
                            {t.type === "dilemma" && (() => {
                              const votes = room.current_task_state.votes || {};
                              const myVote = votes[localPlayer.id];
                              const allVoted = players.every(p => votes[p.id]);

                              const countA = Object.values(votes).filter(v => v === 'A').length;
                              const countB = Object.values(votes).filter(v => v === 'B').length;
                              const total = countA + countB || 1;
                              const pctA = Math.round((countA / total) * 100);
                              const pctB = Math.round((countB / total) * 100);

                              return (
                                <div>
                                  {!allVoted ? (
                                    <div>
                                      {isFacilitatorHost() ? (
                                        <div className="notice">Wachten tot alle spelers hun keuze hebben bevestigd.</div>
                                      ) : myVote ? (
                                        <div className="notice green">
                                          Je hebt gestemd op: <strong>{myVote === 'A' ? t.optionA : t.optionB}</strong>. Wachten op de rest...
                                        </div>
                                      ) : (
                                        <div className="answers">
                                          <button className="answer" onClick={() => handleVoteDilemma('A')}>
                                            🔴 {t.optionA}
                                          </button>
                                          <button className="answer" onClick={() => handleVoteDilemma('B')}>
                                            🔵 {t.optionB}
                                          </button>
                                        </div>
                                      )}
                                      
                                      <div style={{ marginTop: '16px' }}>
                                        <strong style={{ fontSize: '13px' }}>Wie heeft er gestemd:</strong>
                                        {players.map(p => (
                                          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#07152d', borderRadius: '8px', marginBottom: '4px', fontSize: '13px' }}>
                                            <span>{p.name}</span>
                                            <span style={{ color: votes[p.id] ? 'var(--ok)' : 'var(--danger)' }}>
                                              {votes[p.id] ? 'Gestemd ✓' : 'Nadenken... ⏳'}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <h3>De groepsmening:</h3>
                                      <div style={{ margin: '18px 0' }}>
                                        <div style={{ marginBottom: '12px' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
                                            <span>🔴 {t.optionA}</span>
                                            <strong>{pctA}% ({countA} stemmen)</strong>
                                          </div>
                                          <div style={{ height: '16px', background: '#0a1c3c', borderRadius: '8px', overflow: 'hidden' }}>
                                            <div style={{ width: `${pctA}%`, height: '100%', background: '#ff7b8b' }}></div>
                                          </div>
                                        </div>
                                        <div>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
                                            <span>🔵 {t.optionB}</span>
                                            <strong>{pctB}% ({countB} stemmen)</strong>
                                          </div>
                                          <div style={{ height: '16px', background: '#0a1c3c', borderRadius: '8px', overflow: 'hidden' }}>
                                            <div style={{ width: `${pctB}%`, height: '100%', background: '#65d9a3' }}></div>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="notice" style={{ background: '#0a2042' }}>
                                        De meerderheid wint +1 ster! Bij een gelijke stand krijgt iedereen +1 ster.
                                      </div>

                                      {isHost && (
                                        <button className="btn primary full" onClick={() => handleResolveDilemma(t)}>
                                          Sterren toekennen & doorgaan
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* 7. EMOJI QUIZ (Converted from MC to typing input for adult difficulty) */}
                            {t.type === "emoji" && (() => {
                              const genericAnswers = room.current_task_state?.genericAnswers || {};
                              const myAnswer = genericAnswers[localPlayer?.id];
                              const allAnswered = players.length > 0 && players.every(p => genericAnswers[p.id] !== undefined);
                              return (
                              <div>
                                <div className="center" style={{ fontSize: '48px', margin: '20px 0', letterSpacing: '4px', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.3))' }}>
                                  {t.text}
                                </div>
                                
                                {allAnswered ? (
                                  <div className="notice" style={{ background: isFacilitatorHost() ? '#10213e' : match(myAnswer, [t.movie_nl, t.movie_en, ...(t.movie_aliases || [])]) ? '#123d2b' : '#3d121c' }}>
                                    <strong>
                                      {isFacilitatorHost() ? 'Alle spelers hebben geantwoord.' : match(myAnswer, [t.movie_nl, t.movie_en, ...(t.movie_aliases || [])]) ? 'Correct! 🎉' : 'Helaas! 💔'}
                                    </strong>
                                    {!isFacilitatorHost() && <p>Jouw antwoord: <em>{myAnswer || "Geen"}</em></p>}
                                    <p style={{ marginTop: '10px' }}><strong>Oplossing:</strong> {t.movie_nl} / {t.movie_en}</p>
                                    
                                    {isHost && (
                                      <button className="btn primary full" style={{ marginTop: '14px' }} onClick={handleFinishTask}>
                                        Volgende opdracht
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div>
                                    {isFacilitatorHost() ? (
                                      <div className="notice">Wachten op de antwoorden van de spelers…</div>
                                    ) : myAnswer === undefined ? (
                                      <div>
                                        <div className="field">
                                          <label>Welke Disney film wordt hier uitgebeeld?</label>
                                          <input 
                                            placeholder="Bijv. Belle en het Beest" 
                                            value={localEstimate} 
                                            onChange={e => setLocalEstimate(e.target.value)} 
                                          />
                                        </div>
                                        <button 
                                          className="btn primary full" 
                                          disabled={!localEstimate.trim()} 
                                          onClick={() => handleEmojiTextAnswer(t)}
                                        >
                                          Antwoord bevestigen
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="notice green">Antwoord opgeslagen. Wachten op de rest…</div>
                                    )}
                                  </div>
                                )}
                              </div>
                              );
                            })()}

                            {/* 8. WIE BEN IK (HINT QUEST) */}
                            {t.type === "whoami" && (() => {
                              const hintLevel = room.current_task_state?.hintLevel || 1;
                              const genericAnswers = room.current_task_state?.genericAnswers || {};
                              const myAnswer = genericAnswers[localPlayer?.id];
                              const allAnswered = players.length > 0 && players.every(p => genericAnswers[p.id] !== undefined);
                              return (
                                <div>
                                  <div style={{ padding: '12px', background: '#091c38', borderRadius: '12px', marginBottom: '14px', border: '1px solid var(--line)' }}>
                                    <div style={{ marginBottom: '8px' }}>
                                      <strong style={{ color: 'var(--gold)', display: 'block', fontSize: '13px' }}>Hint 1 (Gratis):</strong>
                                      <span style={{ fontSize: '15px' }}>{t.hint1}</span>
                                    </div>
                                    {hintLevel >= 2 && (
                                      <div style={{ marginTop: '12px', borderTop: '1px solid var(--line)', paddingTop: '8px' }}>
                                        <strong style={{ color: 'var(--gold)', display: 'block', fontSize: '13px' }}>Hint 2 (Kosten: -1 punt):</strong>
                                        <span style={{ fontSize: '15px' }}>{t.hint2}</span>
                                      </div>
                                    )}
                                    {hintLevel >= 3 && (
                                      <div style={{ marginTop: '12px', borderTop: '1px solid var(--line)', paddingTop: '8px' }}>
                                        <strong style={{ color: 'var(--gold)', display: 'block', fontSize: '13px' }}>Hint 3 (Kosten: -2 punten):</strong>
                                        <span style={{ fontSize: '15px' }}>{t.hint3}</span>
                                      </div>
                                    )}
                                  </div>

                                  {!allAnswered && isHost && (
                                    <div className="btnrow" style={{ marginBottom: '14px' }}>
                                      <button className="btn secondary mini" disabled={hintLevel >= 2} onClick={() => handleRevealWhoamiHint(2)}>
                                        Onthul Hint 2
                                      </button>
                                      <button className="btn secondary mini" disabled={hintLevel < 2 || hintLevel >= 3} onClick={() => handleRevealWhoamiHint(3)}>
                                        Onthul Hint 3
                                      </button>
                                    </div>
                                  )}

                                  {!isFacilitatorHost() && <div className="answers">
                                    {t.answers.map((ans, idx) => {
                                      let btnClass = "answer";
                                      if (allAnswered) {
                                        if (idx === t.correct) btnClass += " correct";
                                        else if (idx === myAnswer) btnClass += " wrong";
                                      }
                                      if (!allAnswered && idx === whoamiSelected) btnClass += " selected";
                                      return (
                                        <button 
                                          key={idx}
                                          className={btnClass}
                                          disabled={allAnswered || myAnswer !== undefined}
                                          aria-pressed={idx === whoamiSelected}
                                          onClick={() => setWhoamiSelected(idx)}
                                          style={!allAnswered && idx === whoamiSelected ? { borderColor: 'var(--gold)', boxShadow: '0 0 0 2px rgba(255, 212, 92, .28)' } : undefined}
                                        >
                                          {ans}
                                        </button>
                                      );
                                    })}
                                  </div>}
                                  {!isFacilitatorHost() && myAnswer === undefined && whoamiSelected !== null && !allAnswered && (
                                    <div className="notice" style={{ marginTop: '12px' }}>
                                      <strong>Gekozen antwoord:</strong> {t.answers[whoamiSelected]}
                                      <button className="btn primary full" style={{ marginTop: '10px' }} onClick={() => handleWhoamiAnswer(whoamiSelected, t)}>
                                        Antwoord bevestigen
                                      </button>
                                    </div>
                                  )}
                                  {myAnswer !== undefined && !allAnswered && (
                                    <div className="notice green" style={{ marginTop: '12px' }}>Antwoord opgeslagen. Wachten op de rest…</div>
                                  )}
                                  {allAnswered && isHost && (
                                    <div style={{ marginTop: '12px' }}>
                                      <button className="btn primary full" onClick={handleFinishTask}>
                                        Volgende opdracht
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* 9. DISNEY MASTERMIND (Code Breaker) */}
                            {t.type === "mastermind" && (() => {
                              const allColors = [
                                { label: 'Mickey', emoji: 'R', color: '#e60012', text: '#fff' },
                                { label: 'Stitch', emoji: 'B', color: '#0066ff', text: '#fff' },
                                { label: 'Simba', emoji: 'G', color: '#ffd400', text: '#111' },
                                { label: 'Buzz', emoji: 'Gr', color: '#00a650', text: '#fff' },
                                { label: 'Ursula', emoji: 'P', color: '#7d2cff', text: '#fff' },
                                { label: 'Tigger', emoji: 'O', color: '#ff7a00', text: '#111' },
                                { label: 'Ariel', emoji: 'C', color: '#00c2d1', text: '#111' },
                                { label: 'Elsa', emoji: 'W', color: '#ffffff', text: '#111' }
                              ];
                              const colors = allColors.slice(0, mmColorCount);
                              const paletteColumns = mmColorCount === 4 ? 4 : mmColorCount === 5 ? 3 : mmColorCount === 6 ? 3 : 4;

                              const isMyTurn = room?.current_player_index === players.findIndex(p => p.id === localPlayer.id);

                              if (!isMyTurn) {
                                const displayLength = room.current_task_state?.codeLength || 5;
                                return (
                                  <div className="center">
                                    Wachten tot {activePlayer?.name} de Mastermind kleurcode kraakt... ⏳
                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '16px' }}>
                                      {Array.from({ length: displayLength }).map((_, i) => (
                                        <div key={i} style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#10264f', border: '1.5px solid var(--line)' }}></div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              }

                              if (!mmGameStarted) {
                                return (
                                  <div style={{ padding: '10px' }}>
                                    <h3 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '20px' }}>⚙️ Mastermind Instellingen</h3>
                                    
                                    <div style={{ marginBottom: '20px' }}>
                                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '15px', fontWeight: 'bold' }}>Aantal stippen (code lengte):</label>
                                      <div style={{ display: 'flex', gap: '10px' }}>
                                        {[4, 5, 6].map(len => (
                                          <button 
                                            key={len} 
                                            className={`btn ${mmCodeLength === len ? 'primary' : 'secondary'}`} 
                                            style={{ flex: 1, padding: '12px 10px', fontSize: '15px' }}
                                            onClick={() => setMmCodeLength(len)}
                                          >
                                            {len} Stippen
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    <div style={{ marginBottom: '20px' }}>
                                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '15px', fontWeight: 'bold' }}>Aantal kleuren:</label>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                                        {[4, 5, 6, 7, 8].map(count => (
                                          <button
                                            key={count}
                                            className={`btn ${mmColorCount === count ? 'primary' : 'secondary'}`}
                                            style={{ padding: '10px 6px', fontSize: '14px' }}
                                            onClick={() => setMmColorCount(count)}
                                          >
                                            {count}
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    <div style={{ marginBottom: '25px' }}>
                                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '15px', fontWeight: 'bold' }}>Aantal beurten:</label>
                                      <div style={{ display: 'flex', gap: '10px' }}>
                                        {[8, 10, 12].map(turns => (
                                          <button 
                                            key={turns} 
                                            className={`btn ${mmMaxTurns === turns ? 'primary' : 'secondary'}`} 
                                            style={{ flex: 1, padding: '12px 10px', fontSize: '15px' }}
                                            onClick={() => setMmMaxTurns(turns)}
                                          >
                                            {turns} beurten
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    <button 
                                      className="btn primary full" 
                                      style={{ padding: '14px', fontSize: '16px' }}
                                      onClick={async () => {
                                        const code = [];
                                        for (let i = 0; i < mmCodeLength; i++) {
                                          code.push(Math.floor(Math.random() * colors.length));
                                        }
                                        setMmCode(code);
                                        setMmCurrentGuess(Array(mmCodeLength).fill(-1));
                                        setMmGuesses([]);
                                        setMmActiveSlot(0);
                                        setMmGameStarted(true);
                                        setMmSolved(false);
                                        setMmFailed(false);
                                        
                                        // Sync configuration to database so other players know code length
                                        await updateRoomState(room.id, {
                                          current_task_state: {
                                            ...room.current_task_state,
                                            codeLength: mmCodeLength,
                                            colorCount: mmColorCount
                                          }
                                        });
                                      }}
                                    >
                                      Start Code Breaker 🎮
                                    </button>
                                  </div>
                                );
                              }

                              const rating = getMmRating(mmGuesses.length, mmCode.length, mmMaxTurns);
                              const isGuessComplete = mmCurrentGuess.every(val => val !== -1);

                              return (
                                <GameZoomContainer maxHeight="520px" aspectRatio="3 / 4" resetKey={`${mmCodeLength}-${mmMaxTurns}`} label="Yzma's Poison Struggle">
                                  <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', overflowY: 'auto', padding: '8px' }}>
                                    <div className="notice" style={{ background: '#0a1c3c', fontSize: '13px', lineHeight: '1.4' }}>
                                      💡 Tik op de Disney-figuren onderaan om de stippen van links naar rechts te vullen. Klik op een stip om die positie handmatig aan te passen.
                                    </div>

                                    {/* GUESS HISTORY */}
                                    <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
                                      {mmGuesses.map((g, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#091c38', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--line)' }}>
                                          <span style={{ fontSize: '13px', minWidth: '55px', color: 'var(--muted)', fontWeight: 'bold' }}>Rij {idx+1}:</span>
                                          <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
                                            {g.guess.map((cIdx, i) => (
                                              <div key={i} style={{ width: '22px', height: '22px', borderRadius: '50%', background: colors[cIdx].color, border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                                                {colors[cIdx].emoji}
                                              </div>
                                            ))}
                                          </div>
                                          
                                          {/* Large High Contrast Pegs & Text */}
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '135px', justifyContent: 'flex-end' }}>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                              {Array.from({ length: g.black }).map((_, i) => (
                                                <div key={i} style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#000000', border: '2px solid #ffffff', boxShadow: '0 0 3px rgba(255,255,255,0.6)' }} title="Goed"></div>
                                              ))}
                                              {Array.from({ length: g.white }).map((_, i) => (
                                                <div key={i} style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#ffffff', border: '2px solid #000000', boxShadow: '0 0 3px rgba(0,0,0,0.6)' }} title="Bijna goed"></div>
                                              ))}
                                            </div>
                                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--gold)', minWidth: '65px', textAlign: 'right' }}>
                                              {g.black} Goed, {g.white} Kleur
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>

                                    {/* SOLVED STATE */}
                                    {mmSolved && (
                                      <div className="notice green" style={{ padding: '20px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎉 Gekruist!</div>
                                        <p style={{ margin: '8px 0', fontSize: '15px' }}>
                                          Je hebt de code gekraakt in <strong>{mmGuesses.length}</strong> beurten!
                                        </p>
                                        <div className="badge" style={{ background: 'var(--gold)', color: '#000', marginBottom: '15px', fontSize: '14px', fontWeight: 'bold', padding: '6px 12px' }}>
                                          Beoordeling: {rating.label} (+{mmPointsEarned} ★)
                                        </div>
                                        <button className="btn primary full" onClick={() => handleMmFinish(mmPointsEarned)}>
                                          Beëindig & incasseer
                                        </button>
                                      </div>
                                    )}

                                    {/* FAILED STATE */}
                                    {mmFailed && (
                                      <div className="notice danger" style={{ padding: '20px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>💀 Helaas!</div>
                                        <p style={{ margin: '8px 0', fontSize: '15px' }}>De beurten zijn op. De geheime code was:</p>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', margin: '14px 0' }}>
                                          {mmCode.map((cIdx, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: colors[cIdx].color, fontSize: '20px', border: '1.5px solid rgba(255,255,255,0.4)' }} title={colors[cIdx].label}>
                                              {colors[cIdx].emoji}
                                            </div>
                                          ))}
                                        </div>
                                        <button className="btn primary full" onClick={() => handleMmFinish(0)}>
                                          Volgende opdracht
                                        </button>
                                      </div>
                                    )}

                                    {/* INTERACTIVE PLAY INTERFACE */}
                                    {!mmSolved && !mmFailed && (
                                      <div>
                                        {/* CURRENT ROW SLOTS */}
                                        <div style={{ background: '#091c38', padding: '16px', borderRadius: '16px', border: '1px solid var(--line)', marginBottom: '14px' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            <span style={{ fontSize: '15px', fontWeight: 'bold' }}>Jouw poging:</span>
                                            <span style={{ fontSize: '12px', color: 'var(--gold)', fontWeight: 'bold' }}>Positie {mmActiveSlot + 1} geselecteerd</span>
                                          </div>
                                          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                            {mmCurrentGuess.map((cIdx, idx) => {
                                              const isActive = mmActiveSlot === idx;
                                              const hasValue = cIdx !== -1;
                                              return (
                                                <button
                                                  key={idx}
                                                  onClick={() => setMmActiveSlot(idx)}
                                                  style={{
                                                    width: '46px',
                                                    height: '46px',
                                                    borderRadius: '50%',
                                                    background: hasValue ? colors[cIdx].color : 'transparent',
                                                    border: isActive ? '3px solid var(--gold)' : '2px dashed var(--line)',
                                                    boxShadow: isActive ? '0 0 10px var(--gold)' : 'none',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '22px',
                                                    transition: 'all 0.15s ease'
                                                  }}
                                                >
                                                  {hasValue ? colors[cIdx].emoji : ''}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>

                                        {/* PUSH BUTTONS PALETTE */}
                                        <div style={{ background: '#091c38', padding: '16px', borderRadius: '16px', border: '1px solid var(--line)', marginBottom: '14px' }}>
                                          <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center', color: 'var(--muted)' }}>
                                            TIK EEN FIGUUR OM IN TE VULLEN
                                          </div>
                                          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${paletteColumns}, 1fr)`, gap: '10px' }}>
                                            {colors.map((c, i) => (
                                              <button
                                                key={i}
                                                onClick={() => {
                                                  const newGuess = [...mmCurrentGuess];
                                                  newGuess[mmActiveSlot] = i;
                                                  setMmCurrentGuess(newGuess);
                                                  // Find next slot (looping)
                                                  setMmActiveSlot((mmActiveSlot + 1) % mmCodeLength);
                                                }}
                                                style={{
                                                  display: 'flex',
                                                  flexDirection: 'column',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  padding: '10px 4px',
                                                  borderRadius: '12px',
                                                  background: c.color,
                                                  color: c.text,
                                                  border: '2px solid rgba(255,255,255,0.55)',
                                                  cursor: 'pointer',
                                                  transition: 'all 0.15s ease'
                                                }}
                                                className="color-btn"
                                              >
                                                <span style={{ fontSize: '18px', marginBottom: '4px', fontWeight: 900 }}>{c.emoji}</span>
                                                <span style={{ fontSize: '11px', color: c.text, fontWeight: 'bold', opacity: 0.95 }}>{c.label}</span>
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                        
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                          <button 
                                            className="btn secondary" 
                                            onClick={() => {
                                              setMmCurrentGuess(Array(mmCodeLength).fill(-1));
                                              setMmActiveSlot(0);
                                            }}
                                            style={{ flex: 1, padding: '14px', fontSize: '15px' }}
                                          >
                                            Wis rij 🔄
                                          </button>
                                          <button 
                                            className="btn primary" 
                                            disabled={!isGuessComplete}
                                            onClick={handleMmSubmitGuess}
                                            style={{ flex: 2, padding: '14px', fontSize: '15px' }}
                                          >
                                            Check ({mmGuesses.length + 1}/{mmMaxTurns})
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </GameZoomContainer>
                              );
                            })()}

                            {/* 10. FEIT OF FABEL */}
                            {t.type === "fact" && (() => {
                              const genericAnswers = room.current_task_state?.genericAnswers || {};
                              const myAnswer = genericAnswers[localPlayer?.id];
                              const allAnswered = players.length > 0 && players.every(p => genericAnswers[p.id] !== undefined);
                              return (
                              <div>
                                {allAnswered ? (
                                  <div className="notice" style={{ background: isFacilitatorHost() ? '#10213e' : myAnswer === t.correct ? '#174f43' : '#5b2437', borderColor: isFacilitatorHost() ? 'var(--gold)' : myAnswer === t.correct ? '#58d4a4' : '#ff7b8b' }}>
                                    <strong style={{ display: 'block', fontSize: '18px', marginBottom: '6px' }}>
                                      {isFacilitatorHost() ? 'Alle spelers hebben geantwoord.' : myAnswer === t.correct ? 'Correct! 🎉' : 'Helaas! 💔'} Het antwoord is {t.correct ? 'FEIT' : 'FABEL'}.
                                    </strong>
                                    <p style={{ margin: 0, fontSize: '15px', lineHeight: '1.4' }}>{t.explanation}</p>
                                    
                                    {isHost && (
                                      <button className="btn primary full" style={{ marginTop: '14px' }} onClick={handleFinishTask}>
                                        Volgende opdracht
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div>
                                    {isFacilitatorHost() ? (
                                      <div className="notice">Wachten op de keuzes van de spelers…</div>
                                    ) : myAnswer === undefined ? (
                                      <>
                                        <div className="btnrow">
                                          <button className={`btn ${factSelected === true ? 'primary' : 'ok'}`} aria-pressed={factSelected === true} onClick={() => setFactSelected(true)}>
                                            🟩 FEIT (Echt waar)
                                          </button>
                                          <button className={`btn ${factSelected === false ? 'primary' : 'danger'}`} aria-pressed={factSelected === false} onClick={() => setFactSelected(false)}>
                                            🟥 FABEL (Niet waar)
                                          </button>
                                        </div>
                                        {factSelected !== null && (
                                          <div className="notice" style={{ marginTop: '12px' }}>
                                            Je kiest <strong>{factSelected ? 'FEIT' : 'FABEL'}</strong>.
                                            <button className="btn primary full" style={{ marginTop: '10px' }} onClick={() => handleFactAnswer(factSelected, t)}>
                                              Keuze bevestigen
                                            </button>
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <div className="notice green">Keuze opgeslagen. Wachten op de rest…</div>
                                    )}
                                  </div>
                                )}
                              </div>
                              );
                            })()}

                            {/* 11. SAMEN (COOP timer synced in real-time) */}
                            {t.type === "group" && (
                              <div>
                                {t.seconds && (
                                  <div id="timerArea" style={{ textAlign: 'center', marginBottom: '12px' }}>
                                    <div className={`timer ${secondsLeft <= 10 ? 'low' : ''}`}>{secondsLeft || t.seconds}</div>
                                    {isRoomHost() && !timerRunning && (
                                      <button className="btn secondary" onClick={() => handleStartGroupTimer(t.seconds)}>
                                        {room.current_task_state?.timerStartedAt ? 'Start timer opnieuw' : 'Start timer'}
                                      </button>
                                    )}
                                    {!isRoomHost() && !timerRunning && (
                                      <p className="small">De host kan de timer starten.</p>
                                    )}
                                  </div>
                                )}
                                
                                {isRoomHost() && (
                                  <div className="btnrow" style={{ marginTop: '12px' }}>
                                    <button className="btn ok" onClick={() => handleGroupScoreAward(t.points || 1)}>
                                      Missie geslaagd (+{t.points || 1} ★ elk)
                                    </button>
                                    <button className="btn ghost" onClick={handleFinishTask}>
                                      Niet gehaald
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <hr />
                          <div className="btnrow one">
                            {isMyTurn && t.type !== "quizChoice" && (
                              <button className="btn ghost" onClick={() => handleSkipTask(false)}>
                                ↪️ Overslaan
                              </button>
                            )}
                          </div>
                          {isMyTurn && t.type !== "quizChoice" && t.type !== "arcade-game" && (
                            <div className="btnrow one" style={{ marginTop: '10px' }}>
                              <button className="btn danger" onClick={() => handleSkipTask(true)}>
                                👎 Nooit meer tonen
                              </button>
                            </div>
                          )}
                        </section>
                      );
                    })()
                  ) : (
                    <section className="card center">
                      <p>Klaarmaken van de volgende opdracht...</p>
                      {isRoomHost() && (
                        <button className="btn primary" onClick={() => selectNextTask(room, players)}>
                          Opdracht Laden
                        </button>
                      )}
                    </section>
                  )}

                  {/* Player's card hand tray */}
                  {(() => {
                    if (!room.current_task_state?.roadRacePowerCardsEnabled) return null;
                    if (players.length <= 1) return null;
                    const myHand = room.current_task_state?.player_hands?.[localPlayer.id] || [];
                    if (!myHand.length) return null;

                    const activeAttack = room?.current_task_state?.activeAttack;
                    const isMeTarget = activeAttack && activeAttack.targetId === localPlayer?.id;

                    return (
                      <div className="card" style={{ marginTop: '16px', padding: '12px' }}>
                        <strong style={{ fontSize: '13px', display: 'block', marginBottom: '8px', color: 'var(--gold)' }}>Je actieve handkaarten:</strong>
                        <div className="cards-hud" style={{ padding: '4px', background: 'transparent', border: 'none', marginTop: 0 }}>
                           {myHand.map((cardKey, idx) => {
                             const card = POWER_CARDS[cardKey];
                             const isDefenseGlow = isMeTarget && (cardKey === 'shield' || cardKey === 'spiegel');

                             return (
                               <div 
                                 key={idx} 
                                 className={`mini-card-btn ${isDefenseGlow ? 'glow-defense' : ''}`}
                                 onClick={() => {
                                   setZoomedCardKey(cardKey);
                                   setCardFlipped(false);
                                 }}
                               >
                                 <span style={{ fontSize: '28px' }}>{card?.icon}</span>
                                 <span style={{ fontSize: '9px', fontWeight: '900', color: 'var(--muted)', marginTop: '4px' }}>
                                   {card?.name.split(" ")[0]}
                                 </span>
                               </div>
                             );
                           })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* SCREEN: SCORES */}
          {screen === 'scores' && (
            <div>
              {/* breaking news trivia banner */}
              {(() => {
                const newsIndex = (room?.round || 0) % MAGIC_NEWS.length;
                const newsItem = MAGIC_NEWS[newsIndex];
                return (
                  <div className="breaking-news" style={{
                    background: '#8f3a52',
                    border: '1.5px solid #ff7b8b',
                    borderRadius: '16px',
                    padding: '12px 16px',
                    marginBottom: '16px',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '24px' }}>📰</span>
                    <div style={{ textAlign: 'left' }}>
                      <strong style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#ffcdcf', marginBottom: '2px' }}>MAGISCH NIEUWS</strong>
                      <span style={{ fontSize: '14px', lineHeight: '1.3', color: '#fff' }}>{newsItem}</span>
                    </div>
                  </div>
                );
              })()}

              <section className="card">
                <h2 className="sectiontitle">Stand na {room?.round || 0} rondes</h2>
                <div className="medals">
                  {[...players]
                    .sort((a, b) => b.score - a.score)
                    .map(p => (
                      <div key={p.id} className="medal">
                        <div>
                          <span style={{ fontSize: '24px', marginRight: '10px' }}>
                            {getRankMedal(getCompetitionRank(p, players))}
                          </span>
                          <span className="name">{p.name}</span>
                        </div>
                        <div className="pts" style={{ textAlign: 'right' }}>{p.score} ★<small style={{ display: 'block', color: 'var(--muted)', fontSize: '10px' }}>{getRoadRaceReward(p, players)} Coco Coins</small></div>
                      </div>
                    ))
                  }
                </div>
              </section>

              <section className="card">
                <div className="btnrow one" style={{ marginTop: '9px' }}>
                  <button className="btn primary" onClick={() => setScreen(scoreReturnScreen)}>
                    Terug naar het spel
                  </button>
                </div>
                <div className="btnrow one" style={{ marginTop: '9px' }}>
                  <button className="btn secondary" onClick={() => setScreen('scorelog')}>
                    🧾 Scoreverloop aanpassen
                  </button>
                </div>
                <div className="btnrow one" style={{ marginTop: '9px' }}>
                  <button className="btn ghost" onClick={() => setScreen('manage')}>
                    ⚙️ Opdrachten beheren
                  </button>
                </div>
                <div className="btnrow one" style={{ marginTop: '9px' }}>
                  <button className="btn danger" onClick={handleNewGameStart}>
                    🚪 Spel verlaten / Reset
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* SCREEN: SCORELOG */}
          {screen === 'scorelog' && (
            <div>
              {renderScoreBar()}
              <section className="card">
                <h2 className="sectiontitle">Snelle correctie</h2>
                <div className="quickscorelist">
                  {players.map(p => (
                    <div key={p.id} className="quickscore">
                      <div>
                        <strong>{p.name}</strong>
                        <span>{p.score} ★</span>
                      </div>
                      <div>
                        <button className="btn ghost mini scorefix" onClick={() => adjustScoreEntry(room.id, { player_id: p.id, delta: -1, bucket: 'general' }, -1)}>-1</button>
                        <button className="btn ghost mini scorefix" onClick={() => adjustScoreEntry(room.id, { player_id: p.id, delta: 1, bucket: 'general' }, 1)}>+1</button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="card">
                <h2 className="sectiontitle">Geschiedenis</h2>
                {scoreHistory.length ? (
                  <div className="historylist">
                    {scoreHistory.map(entry => (
                      <div key={entry.id} className="historyitem">
                        <div className="historymain">
                          <div>
                            <strong>{entry.player_name}</strong>
                            <span className={`delta ${entry.delta < 0 ? 'negative' : 'positive'}`}>
                              {entry.delta > 0 ? "+" : ""}{entry.delta}
                            </span>
                          </div>
                          <p>{entry.reason}</p>
                        </div>
                        <div className="historyactions">
                          <button className="btn danger mini" onClick={() => removeScoreEntry(room.id, entry)}>
                            Verwijderen
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="small">Geen scorewijzigingen gevonden.</p>
                )}
              </section>
            </div>
          )}

          {/* SCREEN: END */}
          {screen === 'end' && room && (
            <div>
              {/* Render confetti overlay */}
              {Array.from({ length: 20 }).map((_, i) => (
                <div 
                  key={i} 
                  className="confetti-piece"
                  style={{
                    left: `${Math.random() * 100}%`,
                    background: ['#ff7b8b', '#ffd45c', '#74d7ff', '#65d9a3'][Math.floor(Math.random() * 4)],
                    animationDelay: `${Math.random() * 3}s`,
                    animationDuration: `${2 + Math.random() * 2}s`
                  }}
                ></div>
              ))}

              <section className="card hero">
                <div className="bigicon">🎇🏰🎇</div>
                <div className="badge">De magie is bereikt</div>
                <h1>Road Race Voltooid!</h1>
                <p>Jullie zijn aangekomen op jullie bestemming!</p>
              </section>

              <section className="card">
                <h2 className="sectiontitle font-bold">Einduitslag</h2>
                <div className="medals">
                  {[...players]
                    .sort((a, b) => b.score - a.score)
                    .map(p => {
                      const rank = getCompetitionRank(p, players);
                      const titles = [
                        "De Hercules van de Road Race 🏆",
                        "De Buzz Lightyear van de Bijna-Winst 🚀",
                        "De Pain & Panic-combi van de Achterhoede 😈",
                        "De Sidekick 🦌"
                      ];
                      return (
                        <div key={p.id} className="medal" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontWeight: 'bold' }}>
                            <span>{getRankMedal(rank)} {p.name}</span>
                            <span>{p.score} ★</span>
                          </div>
                          <small style={{ color: 'var(--gold)', marginTop: '4px' }}>{rank === 1 ? titles[0] : rank === 2 ? titles[1] : rank === 3 ? titles[2] : titles[3]}</small>
                          <small style={{ color: 'var(--muted)', marginTop: '3px' }}>Beloning: {getRoadRaceReward(p, players)} Coco Coins</small>
                        </div>
                      );
                    })
                  }
                </div>
              </section>

              <section className="card">
                <div className="btnrow one">
                  <button className="btn primary" onClick={handleNewGameStart}>
                    Nieuw Spel Starten
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* SCREEN: VERSION INFO */}
          {screen === 'versioninfo' && (
            <div>
              <section className="card">
                <div className="badge">McQueen's Road Race · Premium Editie</div>
                <h2 className="sectiontitle" style={{ marginTop: '14px' }}>Nieuw en aangepast</h2>
                <div className="versionchanges">
                  <div className="versionchange">
                    <span>🎮</span>
                    <div>
                      <strong>10 Interactieve Speltypes</strong>
                      <p>Weg met passief luisteren of uitbeelden. Speel Pictionary (realtime tekenen), Inschattingsvragen, Dilemma's en het sfeervolle Disney Dagboek!</p>
                    </div>
                  </div>
                  <div className="versionchange">
                    <span>🎟️</span>
                    <div>
                      <strong>Wilde Ritten Powerups (14 kaarten)</strong>
                      <p>Gebruik fastpasses, steel sterren, of verdedig je met schilden en spiegels in 3D flip-kaarten!</p>
                    </div>
                  </div>
                  <div className="versionchange">
                    <span>🚗</span>
                    <div>
                      <strong>Geanimeerde Etappe Routekaart</strong>
                      <p>Een live geanimeerd autootje rijdt langs de etappes van je trip naarmate je beurten vordert!</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* SCREEN: MANAGE TASKS */}
          {screen === 'manage' && (
            <div>
              <section className="card">
                <h2 className="sectiontitle">Eigen opdracht toevoegen</h2>
                <div className="field">
                  <label htmlFor="newCat">Categorie</label>
                  <select id="newCat">
                    <option value="Dilemma">Dilemma</option>
                    <option value="Creatief">Creatief</option>
                    <option value="Onderweg">Onderweg</option>
                    <option value="Verboden woorden">Verboden woorden</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="newText">Opdracht</label>
                  <textarea id="newText" placeholder="Typ hier je eigen opdracht..."></textarea>
                </div>
                <button className="btn primary" style={{ width: '100%' }} onClick={handleAddTask}>
                  Toevoegen
                </button>
              </section>

              <section className="card">
                <h2 className="sectiontitle">Alle opdrachten</h2>
                <div className="field">
                  <input 
                    placeholder="Zoek opdracht..." 
                    value={taskSearch} 
                    onChange={e => setTaskSearch(e.target.value)}
                  />
                </div>
                <div className="list">
                  {DEFAULT_TASKS
                    .filter(t => (t.cat + " " + (t.title || "")).toLowerCase().includes(taskSearch.toLowerCase()))
                    .slice(0, 10)
                    .map(t => (
                      <div key={t.id} className="taskitem">
                        <b>{t.cat}</b>
                        <p>{t.title || ""}</p>
                      </div>
                    ))
                  }
                  {customTasks
                    .filter(t => (t.cat + " " + (t.title || "")).toLowerCase().includes(taskSearch.toLowerCase()))
                    .map(t => (
                      <div key={t.id} className="taskitem" style={{ borderColor: 'var(--gold)' }}>
                        <b>{t.cat} (Aangepast)</b>
                        <p>{t.title || ""}</p>
                      </div>
                    ))
                  }
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
