import React, { useState, useEffect, useRef } from 'react';
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

const GAME_VERSIONS = [
  { id: 1, name: "Sterrenroute", icon: "✨" },
  { id: 2, name: "Avonturenroute", icon: "🧭" },
  { id: 3, name: "Fantasieroute", icon: "🏰" },
  { id: 4, name: "Magische route", icon: "🎆" },
  { id: 5, name: "Pioniersroute", icon: "🤠" },
  { id: 6, name: "Toekomstroute", icon: "🚀" },
  { id: 7, name: "Sprookjesroute", icon: "👑" },
  { id: 8, name: "Hollywoodroute", icon: "🎬" }
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
const ACTIVE_PROFILE_KEY = 'disney_active_profile';
const COCO_PROFILE_STORE_CODE = 'COCO-PROFILES-V1';
const BADGE_COLLECTION_KEY = 'disney_badge_collections';
const BADGE_MARKET_KEY = 'disney_badge_market';
const BADGE_PACK_COST = 5;
const BADGE_SELL_VALUE = 2;
const ENABLE_LEGACY_SHOP = false;

const BADGE_RARITIES = [
  { id: 'common', name: 'Common', subtitle: 'De eerste stap van ieder Disney-avontuur', perPark: 12, frame: 'badges/frames/common-silver.png' },
  { id: 'uncommon', name: 'Uncommon', subtitle: 'Bijzondere herinneringen uit beide parken', perPark: 8, frame: 'badges/frames/uncommon-green.png' },
  { id: 'rare', name: 'Rare', subtitle: 'Voor verzamelaars met oog voor magie', perPark: 8, frame: 'badges/frames/rare-blue.png' },
  { id: 'epic', name: 'Epic', subtitle: 'Iconische belevenissen in een exclusieve uitvoering', perPark: 6, frame: 'badges/frames/epic-purple.png' },
  { id: 'legendary', name: 'Legendary', subtitle: 'De kroonjuwelen van de Disney-collectie', perPark: 4, frame: 'badges/frames/legendary-gold.png' }
];

const BADGE_NAMES = {
  disneyland: {
    common: ['Main Street Station', 'Town Square', 'Horse-Drawn Tram', 'Casey’s Corner', 'Liberty Arcade', 'Discovery Arcade', 'Sleeping Beauty Castle', 'La Carrousel de Lancelot', 'Alice’s Curious Labyrinth', 'Mad Hatter’s Tea Cups', 'Le Pays des Contes de Fées', 'It’s a Small World'],
    uncommon: ['Pirates’ Beach', 'Adventure Isle', 'Swiss Family Treehouse', 'Frontierland Depot', 'Thunder Mesa', 'Phantom Manor', 'Orbitron', 'Autopia'],
    rare: ['Peter Pan’s Flight', 'Pirates of the Caribbean', 'Star Tours', 'Buzz Lightyear Laser Blast', 'Mickey’s PhilharMagic', 'Big Thunder Mountain', 'Indiana Jones Temple', 'Dragon’s Lair'],
    epic: ['Disney Stars on Parade', 'Disney Tales of Magic', 'Meet Mickey Mouse', 'Princess Pavilion', 'Star Wars Hyperspace Mountain', 'Castle Dream'],
    legendary: ['Disneyland Hotel', 'Walt & Mickey', 'Sleeping Beauty Castle Gold', 'Disneyland Park Icon']
  },
  adventure: {
    common: ['Front Lot', 'Studio Theater', 'Toon Studio', 'World Premiere Plaza', 'Animation Celebration', 'Cars Road Trip', 'Toy Story Playland', 'Slinky Dog Zigzag Spin', 'Cars Quatre Roues Rallye', 'Flying Carpets over Agrabah', 'Stitch Live!', 'Studio D'],
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
      number: index + 1
    }))
  )
);

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
      className={`disney-badge-art rarity-${badge.rarity} park-${badge.park}${compact ? ' is-compact' : ''}`}
      aria-label={`${badge.name}, ${badge.rarityName}, ${badge.parkName}`}
    >
      <span className="disney-badge-rim" />
      <span className="disney-badge-park">{badge.parkShort}</span>
      <strong>{initials}</strong>
      <span className="disney-badge-spark">✦</span>
      {count > 1 && <span className="disney-badge-count">×{count}</span>}
    </div>
  );
}

function MiguelMarket({
  activeName, balance, ownedBadges, badgeMarket, badgeMarketNow,
  tradeOfferIndex, sellOpen, openedPack,
  onOpenPack, onChooseTrade, onTrade, onOpenSell, onCloseSell, onSell, onClosePack, onInspectCoin
}) {
  const uniqueOwned = Object.values(ownedBadges).filter(count => Number(count) > 0).length;
  const totalOwned = Object.values(ownedBadges).reduce((sum, count) => sum + (Number(count) || 0), 0);
  const secondsUntilRefresh = Math.max(0, Math.ceil((((badgeMarket.hour + 1) * 3600000) - badgeMarketNow) / 1000));
  const refreshTime = `${String(Math.floor(secondsUntilRefresh / 60)).padStart(2, '0')}:${String(secondsUntilRefresh % 60).padStart(2, '0')}`;
  const sellableBadges = BADGE_DEFINITIONS.filter(badge => ownedBadges[badge.id] > 0);
  const offeredBadge = tradeOfferIndex === null ? null : getBadge(badgeMarket.offers[tradeOfferIndex]);

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
                        <div key={badge.id} className={`badge-jewel-slot${count ? ' is-owned' : ' is-empty'}`}>
                          <div className="badge-recess">
                            {count > 0
                              ? <BadgeArtwork badge={badge} count={count} />
                              : <img className="badge-empty-frame" src={assetPath(rarity.frame)} alt="" aria-hidden="true" />}
                          </div>
                          <div className="badge-nameplate"><strong>{badge.name}</strong><span>{count ? `${badge.rarityName} · ×${count}` : 'Nog niet verzameld'}</span></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>
          );
        })}
      </div>

      {tradeOfferIndex !== null && (
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
        </div>
      )}

      {sellOpen && (
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
        </div>
      )}

      {openedPack && (
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
        </div>
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
  const [screen, setScreen] = useState('portal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [localPlayer, setLocalPlayer] = useState(null);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [activeProfileName, setActiveProfileName] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('portal') !== '1') return '';
    return localStorage.getItem(ACTIVE_PROFILE_KEY) || localStorage.getItem('disney_player_name') || '';
  });
  const [logPopupOpen, setLogPopupOpen] = useState(false);
  const [logProfileName, setLogProfileName] = useState('');
  const [selectedPortalGame, setSelectedPortalGame] = useState(null);
  const [showPortalShop, setShowPortalShop] = useState(false);
  const [playerNameInput, setPlayerNameInput] = useState(() => localStorage.getItem(ACTIVE_PROFILE_KEY) || localStorage.getItem('disney_player_name') || '');

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [screen, showPortalShop]);

  const [setupMode, setSetupMode] = useState('mix');
  const [setupVersion, setSetupVersion] = useState(1);
  const [roundsPerPlayer, setRoundsPerPlayer] = useState(10);
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
  const soloLoggedRef = useRef(false);

  // Arcade Arena states
  const [selectedArcadeGame, setSelectedArcadeGame] = useState(null);
  const [arcadePlayMode, setArcadePlayMode] = useState(null); // 'solo' or 'duel'
  const [arcadeOptionsOpen, setArcadeOptionsOpen] = useState(false);
  const [arcadeLobbyCode, setArcadeLobbyCode] = useState('');
  const [arenaToolbar, setArenaToolbar] = useState(null);

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

    const loadSharedProfiles = async () => {
      const localProfiles = uniqueProfileNames(cocoProfiles);
      const localState = {
        coco_profiles: localProfiles,
        coco_bank: starBank,
        coco_collections: collections,
        coco_exclusive_claims: exclusiveClaims,
        coco_badge_collections: badgeCollections,
        coco_badge_market: badgeMarket,
        coco_profile_store_version: 2,
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
        const mergedBank = migrateLocalState ? mergeBank(remoteState.coco_bank, starBank) : (remoteState.coco_bank || {});
        const mergedCollections = migrateLocalState ? mergeCollections(remoteState.coco_collections, collections) : (remoteState.coco_collections || {});
        const mergedClaims = migrateLocalState
          ? { ...(exclusiveClaims || {}), ...(remoteState.coco_exclusive_claims || {}) }
          : (remoteState.coco_exclusive_claims || {});
        const mergedBadgeCollections = migrateLocalState
          ? mergeBadgeCollections(remoteState.coco_badge_collections, badgeCollections)
          : (remoteState.coco_badge_collections || {});
        const remoteMarket = remoteState.coco_badge_market;
        const mergedBadgeMarket = remoteMarket?.hour === getMarketHour() && Array.isArray(remoteMarket.offers) && remoteMarket.offers.length === 3
          ? remoteMarket
          : createHourlyBadgeMarket();
        const mergedState = {
          coco_profiles: mergedProfiles,
          coco_bank: mergedBank,
          coco_collections: mergedCollections,
          coco_exclusive_claims: mergedClaims,
          coco_badge_collections: mergedBadgeCollections,
          coco_badge_market: mergedBadgeMarket,
          coco_profile_store_version: 2,
          updated_at: new Date().toISOString()
        };

        if (!cancelled) {
          cocoProfileStoreIdRef.current = store?.id || null;
          setCocoProfiles(mergedProfiles);
          setStarBank(mergedBank);
          setCollections(mergedCollections);
          setExclusiveClaims(mergedClaims);
          setBadgeCollections(mergedBadgeCollections);
          setBadgeMarket(mergedBadgeMarket);
          localStorage.setItem(COCO_PROFILES_KEY, JSON.stringify(mergedProfiles));
          localStorage.setItem(COCO_BANK_KEY, JSON.stringify(mergedBank));
          localStorage.setItem('disney_collections', JSON.stringify(mergedCollections));
          localStorage.setItem('disney_exclusive_claims', JSON.stringify(mergedClaims));
          localStorage.setItem(BADGE_COLLECTION_KEY, JSON.stringify(mergedBadgeCollections));
          localStorage.setItem(BADGE_MARKET_KEY, JSON.stringify(mergedBadgeMarket));
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
            coco_bank: starBank,
            coco_collections: collections,
            coco_exclusive_claims: exclusiveClaims,
            coco_badge_collections: badgeCollections,
            coco_badge_market: badgeMarket,
            coco_profile_store_version: 2,
            updated_at: new Date().toISOString()
          }
        })
        .eq('id', cocoProfileStoreIdRef.current)
        .then(({ error }) => {
          if (error) console.warn('Coco-profielen konden niet worden opgeslagen.', error);
        });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [badgeCollections, badgeMarket, cocoProfiles, cocoProfilesReady, collections, exclusiveClaims, starBank]);

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
    const logs = JSON.parse(localStorage.getItem('disney_captains_log') || '{}');
    if (!logs[profileName]) logs[profileName] = [];
    
    logs[profileName].push({
      timestamp: new Date().toISOString(),
      amount,
      type,
      description,
      balanceAfter
    });
    
    localStorage.setItem('disney_captains_log', JSON.stringify(logs));
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

  const handleRenameShopProfile = () => {
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

    persistCocoProfiles(cocoProfiles.map(name => getCollectorKey(name) === oldKey ? nextName : name));

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

      setStarBank(nextBank);
      setCollections(nextCollections);
      setExclusiveClaims(nextClaims);
      setBadgeCollections(nextBadgeCollections);
      localStorage.setItem(COCO_BANK_KEY, JSON.stringify(nextBank));
      localStorage.setItem('disney_collections', JSON.stringify(nextCollections));
      localStorage.setItem('disney_exclusive_claims', JSON.stringify(nextClaims));
      localStorage.setItem(BADGE_COLLECTION_KEY, JSON.stringify(nextBadgeCollections));
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
  };

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
    delete nextBank[currentKey];
    delete nextCollections[currentKey];
    delete nextBadgeCollections[currentKey];

    const nextClaims = Object.fromEntries(
      Object.entries(exclusiveClaims).filter(([, ownerKey]) => ownerKey !== currentKey)
    );

    setStarBank(nextBank);
    setCollections(nextCollections);
    setExclusiveClaims(nextClaims);
    setBadgeCollections(nextBadgeCollections);
    setShopPlayerName(nextName);
    setActiveProfileName(keepProfileChooserOpen ? '' : nextName);
    setPlayerNameInput(nextName);
    setDonationTargetName('');
    localStorage.setItem(COCO_BANK_KEY, JSON.stringify(nextBank));
    localStorage.setItem('disney_collections', JSON.stringify(nextCollections));
    localStorage.setItem('disney_exclusive_claims', JSON.stringify(nextClaims));
    localStorage.setItem(BADGE_COLLECTION_KEY, JSON.stringify(nextBadgeCollections));
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
  const [themeMode, setThemeMode] = useState('day'); // 'day' or 'night'
  const [zoomedCardKey, setZoomedCardKey] = useState(null); // card key like 'fastpass' or null
  const [cardFlipped, setCardFlipped] = useState(false); // boolean flip
  const [strafTargetMode, setStrafTargetMode] = useState(null); // card key if selecting target player

  // Session recovery
  useEffect(() => {
    async function recoverSession() {
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
    if (activeProfileName && themeMode === 'night') {
      document.body.classList.add('night-theme');
    } else {
      document.body.classList.remove('night-theme');
    }
    return () => {
      document.body.classList.remove('night-theme');
    };
  }, [themeMode, activeProfileName]);

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

    const isHost = players[0]?.id === localPlayer?.id;
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

    const isHost = players[0]?.id === localPlayer?.id;
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
      return { 
        id: "solo-sudoku", 
        cat: room.current_task_state?.sudokuSize === 6 ? "Tinker Bell Sudoku" : "Zazu's Sudoku",
        type: "sudoku" 
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

  const taskDeck = (task) => {
    if (!task || String(task.id).startsWith("custom-")) return room?.game_version || 1;
    const match = String(task.id).match(/\d+/);
    const number = match ? Number(match[0]) : 1;
    return ((number - 1) % 8) + 1;
  };

  const selectNextTask = async (currentRoom, currentPlayers, forcePersonal = false) => {
    const usedTasks = currentRoom.current_task_state?.usedTasks || [];
    const taskHistory = currentRoom.current_task_state?.taskHistory || [];
    const enabledCats = currentRoom.current_task_state?.enabledCategories || ["Disney Dagboek", "Pictionary", "Inschattingsvragen", "Dilemma", "Emoji Quiz", "Wie ben ik?", "Feit of Fabel", "Quiz", "Samen"];

    const activeTasks = DEFAULT_TASKS.filter(t => 
      t.active !== false && 
      (currentRoom.game_mode === 'mix' || t.cat === currentRoom.game_mode) &&
      enabledCats.includes(t.cat)
    );
    
    if (!activeTasks.length) {
      alert("Geen opdrachten beschikbaar voor de gekozen categorieën.");
      return;
    }

    if (currentRoom.game_mode === "Quiz" || (currentRoom.game_mode === "mix" && enabledCats.includes("Quiz") && Math.random() < 0.25)) {
      // Direct choice of quiz difficulty
      await updateRoomState(currentRoom.id, {
        current_task_id: 'quiz-choice',
        current_task_state: { ...currentRoom.current_task_state, stagePause: false }
      });
      return;
    }

    let pool = activeTasks;
    if (currentRoom.game_mode === "mix" && forcePersonal) {
      pool = pool.filter(t => t.type !== "group");
    }

    const player = currentPlayers[currentRoom.current_player_index];
    const unused = pool.filter(t => !usedTasks.includes(t.id));
    const primary = pool.filter(t => taskDeck(t) === currentRoom.game_version);
    const primaryUnused = primary.filter(t => !usedTasks.includes(t.id));

    const wasSeen = (tid) => taskHistory.some(h => h.taskId === tid);
    const wasSeenByPlayer = (tid, pid) => taskHistory.some(h => h.taskId === tid && h.playerId === pid);

    const neverSeen = list => list.filter(t => !wasSeen(t.id));
    const notForPlayer = list => currentRoom.game_mode === "Samen" ? list : list.filter(t => !wasSeenByPlayer(t.id, player.id));

    const stages = [
      neverSeen(primaryUnused),
      neverSeen(unused),
      notForPlayer(primaryUnused),
      notForPlayer(unused),
      primaryUnused,
      unused,
      notForPlayer(primary),
      notForPlayer(pool),
      primary,
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
        lastCat: selected.cat,
        stagePause: false,
        part: selected.type === 'diary' ? 1 : undefined,
        answers: selected.type === 'diary' ? {} : undefined,
        lines: selected.type === 'draw' ? [] : undefined,
        estimate: undefined,
        votes: (selected.type === 'dilemma' || selected.type === 'estimate') ? {} : undefined,
        tinkActive: false,
        hyperdriveActive: false,
        timerStartedAt: null,
        timerDuration: null,
        quizLocked: false,
        selectedAnswer: undefined,
        quizAnswers: {},
        quizAwarded: {}
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
      const totalRounds = mode === 'Samen' ? roundsPerPlayer : roundsPerPlayer * 4;
      const { room: r, player: p } = await createRoom(mode, setupVersion, roundsPerPlayer, profileName);
      
      await updateRoomState(r.id, { total_rounds: totalRounds });
      r.total_rounds = totalRounds;

      setRoom(r);
      setPlayers([p]);
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
      const startingIndex = Math.floor(Math.random() * players.length);
      const totalRounds = isGroupOnly() ? room.rounds_per_player : room.rounds_per_player * players.length;

      // Initialize card hands for all players
      const startHands = {};
      players.forEach(p => {
        const cardKeys = Object.keys(POWER_CARDS);
        const hand = [];
        for (let i = 0; i < 3; i++) {
          const rKey = cardKeys[Math.floor(Math.random() * cardKeys.length)];
          hand.push(rKey);
        }
        startHands[p.id] = hand;
      });

      await updateRoomState(room.id, {
        status: 'playing',
        current_player_index: startingIndex,
        round: 0,
        total_rounds: totalRounds,
        current_task_state: {
          ...room.current_task_state,
          player_hands: startHands,
          enabledCategories: selectedCats
        }
      });

      const { room: updatedRoom } = await fetchRoomData(room.id);
      setRoom(updatedRoom);

      await selectNextTask(updatedRoom, players);
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
        quizAwarded: {}
      }
    });
  };

  const handleAnswerQuiz = async (answerIndex, correctAnswerIndex, points) => {
    if (room.current_task_state?.quizLocked) return;
    if (!localPlayer?.id) return;

    const { room: freshRoom, players: freshPlayers } = await fetchRoomData(room.id);
    const freshState = freshRoom.current_task_state || {};
    if (freshState.quizLocked) return;

    const quizAnswers = { ...(freshState.quizAnswers || {}) };
    if (quizAnswers[localPlayer.id] !== undefined) return;

    quizAnswers[localPlayer.id] = answerIndex;

    const isCorrect = answerIndex === correctAnswerIndex;
    const ptsToAward = room.current_task_state?.hyperdriveActive ? points * 2 : points;
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
      const targetScreen = room.game_mode?.startsWith('arcade-') ? 'arcade_select' : 'solo_select';
      setRoom(null);
      setScreen(targetScreen);
      return;
    }

    if (room?.game_mode?.startsWith('arcade-')) {
      await updateRoomState(room.id, {
        status: 'ended'
      });
      setScreen('end');
      return;
    }

    const currentTask = getCurrentTask();

    if (currentTask?.type === "quiz") {
      await updateRoomState(room.id, {
        current_task_state: {
          ...room.current_task_state,
          quizLocked: false,
          selectedAnswer: undefined,
          quizAnswers: {},
          quizAwarded: {},
          timerStartedAt: null,
          timerDuration: null
        }
      });

      const { room: r, players: p } = await fetchRoomData(room.id);
      setRoom(r);
      setPlayers(p);
      await selectNextTask(r, p);
      return;
    }

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
    const ptsToAward = (room.current_player_index === playerIndex && room.current_task_state?.hyperdriveActive) ? points * 2 : points;

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
        points,
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
    
    await addPlayerScore(room.id, guesser, 2, "Pictionary: woord correct geraden!", "creative");
    await addPlayerScore(room.id, drawer, 2, "Pictionary: succesvol getekend!", "creative");
    await handleFinishTask();
  };

  // Dilemma
  const handleVoteDilemma = async (option) => {
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
        return addPlayerScore(room.id, p, 1, `Dilemma: gestemd met de meerderheid`, 'general');
      }
      return Promise.resolve();
    }));

    await handleFinishTask();
  };

  // Inschattingsvragen
  const handleSendEstimate = async () => {
    const val = Math.round(Number(localEstimate));
    if (isNaN(val)) return;
    await updateRoomState(room.id, {
      current_task_state: {
        ...room.current_task_state,
        estimate: val,
        votes: {}
      }
    });
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
    const estimate = room.current_task_state.estimate;
    const votes = room.current_task_state.votes || {};
    const activePlayer = players[room.current_player_index];

    const isHigher = correct > estimate;
    const otherPlayers = players.filter(p => p.id !== activePlayer?.id);
    const wrongVotes = otherPlayers.filter(p => {
      const vote = votes[p.id];
      const voteCorrect = (vote === 'higher' && isHigher) || (vote === 'lower' && !isHigher);
      return vote && !voteCorrect;
    });

    if (activePlayer && wrongVotes.length > 0) {
      const bonus = wrongVotes.length === otherPlayers.length ? 1 : 0;
      const basePts = wrongVotes.length + bonus;
      const pts = room.current_task_state?.hyperdriveActive ? basePts * 2 : basePts;
      await addPlayerScore(
        room.id,
        activePlayer,
        pts,
        `Inschatting: ${wrongVotes.length} speler(s) verkeerd gestuurd${bonus ? ' + bonus' : ''} (${correct})`,
        'knowledge'
      );
    }

    await handleFinishTask();
  };

  // Disney Dagboek
  const handleSubmitDiaryPart = async (partNum) => {
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
    const activePlayer = players[room.current_player_index];

    await Promise.all(players.map(p => {
      if (p.id === activePlayer.id) return Promise.resolve();
      const pAns = answers[p.id] || {};
      let score = 0;

      ['part1', 'part2', 'part3'].forEach(pk => {
        const entry = pAns[pk];
        if (entry) {
          const charCorrect = match(entry.char, [t.character_nl, t.character_en, ...(t.character_aliases || [])]);
          const movieCorrect = match(entry.movie, [t.movie_nl, t.movie_en, ...(t.movie_aliases || [])]);
          if (charCorrect && movieCorrect) score++;
        }
      });

      if (score > 0) {
        return addPlayerScore(room.id, p, score, `Disney Dagboek: ${score} beurt(en) correct geraden`, 'knowledge');
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
      const pts = room.current_task_state?.hyperdriveActive ? basePts * 2 : basePts;
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
    if (room.current_task_state?.quizLocked) return;

    const isHost = players[0]?.id === localPlayer?.id;
    const isMyTurn = players[room.current_player_index]?.id === localPlayer?.id;
    if (!isMyTurn && !isHost) return;

    const correct = idx === t.correct;
    const activePlayer = players[room.current_player_index];
    if (correct && activePlayer) {
      const basePts = whoamiRevealed === 1 ? 3 : whoamiRevealed === 2 ? 2 : 1;
      const pts = room.current_task_state?.hyperdriveActive ? basePts * 2 : basePts;
      await addPlayerScore(room.id, activePlayer, pts, `Hint Quest: correct geraden met ${whoamiRevealed} hint(s)`, 'knowledge');
    }

    await updateRoomState(room.id, {
      current_task_state: {
        ...room.current_task_state,
        quizLocked: true,
        selectedAnswer: idx
      }
    });
  };

  // Feit of Fabel
  const handleFactAnswer = async (isTrue, t) => {
    if (room.current_task_state?.quizLocked) return;

    const isHost = players[0]?.id === localPlayer?.id;
    const isMyTurn = players[room.current_player_index]?.id === localPlayer?.id;
    if (!isMyTurn && !isHost) return;

    const correct = isTrue === t.correct;
    const activePlayer = players[room.current_player_index];
    if (correct && activePlayer) {
      const pts = room.current_task_state?.hyperdriveActive ? 4 : 2;
      await addPlayerScore(room.id, activePlayer, pts, `Feit of Fabel: stelling correct beoordeeld`, 'knowledge');
    }

    await updateRoomState(room.id, {
      current_task_state: {
        ...room.current_task_state,
        quizLocked: true,
        selectedAnswer: isTrue
      }
    });
  };

  // Emoji Quiz text submission
  const handleEmojiTextAnswer = async (t) => {
    if (quizLocked) return;
    const isHost = players[0]?.id === localPlayer?.id;
    const isMyTurn = players[room.current_player_index]?.id === localPlayer?.id;
    if (!isMyTurn && !isHost) return;

    setQuizLocked(true);
    const typed = localEstimate.trim();
    setQuizSelectedAnswer(typed);

    const isCorrect = match(typed, [t.movie_nl, t.movie_en, ...(t.movie_aliases || [])]);
    if (isCorrect) {
      const pts = room.current_task_state?.hyperdriveActive ? 4 : 2;
      const activePlayer = players[room.current_player_index] || localPlayer;
      await addPlayerScore(room.id, activePlayer, pts, `Emoji Quiz: correct geraden`, 'knowledge');
    }

    await updateRoomState(room.id, {
      current_task_state: {
        ...room.current_task_state,
        quizLocked: true,
        selectedAnswer: typed
      }
    });
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
        if (!soloLoggedRef.current) {
          logSoloAttempt(0, "Opdracht verlaten");
          soloLoggedRef.current = true;
        }
        const targetScreen = room.game_mode?.startsWith('arcade-') ? 'arcade_select' : 'solo_select';
        setRoom(null);
        setScreen(targetScreen);
        return;
      }
      if (room.game_mode?.startsWith('arcade-')) {
        leaveCurrentRoom('arcade_select');
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

  const renderAppHeader = () => {
    const key = getCollectorKey(activeProfileName);
    const balance = starBank[key] || 0;

    return (
      <header className="topbar global-app-header">
        <div className="global-app-header-actions">
          <div className="global-profile-pill">
            <button
              type="button"
              className="global-profile-segment global-profile-name-segment"
              onClick={() => {
                setLogProfileName(activeProfileName);
                setLogPopupOpen(true);
              }}
              title="Open Captain's Log"
            >
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
                setLogPopupOpen(true);
              }}
              aria-label="Open Captain's Log"
            >⚓</button>
          </div>
          <button className="iconbtn" onClick={() => setThemeMode(prev => prev === 'day' ? 'night' : 'day')} aria-label={themeMode === 'day' ? 'Nachtstand inschakelen' : 'Dagstand inschakelen'}>
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
          <strong>{pct}% voltooid ({room.round}/{room.total_rounds} beurten)</strong>
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

  return (
    <div className="app">
      {/* 3D Styles Injection */}
      <style>{`
        .star-bg {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 1;
          pointer-events: none;
          background: transparent;
          overflow: hidden;
        }
        .star {
          position: absolute;
          width: 2px;
          height: 2px;
          background: white;
          border-radius: 50%;
          opacity: 0.8;
          animation: twinkle 2s infinite ease-in-out;
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; transform: scale(1.3); }
        }
        .shooting-star {
          position: absolute;
          width: 80px;
          height: 1.5px;
          background: linear-gradient(90deg, white, transparent);
          animation: shoot 5s infinite linear;
          opacity: 0;
        }
        @keyframes shoot {
          0% { transform: translate(-100px, -100px) rotate(35deg); opacity: 1; }
          15%, 100% { transform: translate(500px, 500px) rotate(35deg); opacity: 0; }
        }
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

      {/* Render Night theme animated stars overlays */}
      {screen === 'game' && themeMode === 'night' && (
        <div className="star-bg">
          {Array.from({ length: 15 }).map((_, i) => (
            <div 
              key={i} 
              className="star" 
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1.5 + Math.random() * 2.5}s`
              }}
            ></div>
          ))}
          <div className="shooting-star" style={{ top: '20%', left: '10%' }}></div>
          <div className="shooting-star" style={{ top: '60%', left: '40%', animationDelay: '3s' }}></div>
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
          <div className="captains-log-paper" onClick={(e) => e.stopPropagation()}>
            <div className="captains-log-header">
              <h2 className="captains-log-title">⚓ Captain's Log ⚓</h2>
              <p className="captains-log-subtitle">Scheepsjournaal van Kapitein {logProfileName}</p>
            </div>

            <div className="captains-log-content">
              {(() => {
                const entries = getOrGenerateCaptainsLog(logProfileName);
                if (entries.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '30px 10px', fontStyle: 'italic', color: '#8d6e63' }}>
                      Geen aantekeningen in het logboek gevonden voor dit profiel.
                    </div>
                  );
                }
                return [...entries].reverse().map((entry, idx) => {
                  const dateStr = new Date(entry.timestamp).toLocaleString('nl-NL', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  const isEarn = entry.type === 'earn';
                  const coinClass = isEarn ? 'captains-log-coins earn' : 'captains-log-coins spend';
                  const displayAmount = isEarn 
                    ? `+${Math.abs(entry.amount)}` 
                    : `-${Math.abs(entry.amount)}`;
                  
                  return (
                    <div key={idx} className="captains-log-row">
                      <div style={{ paddingRight: '12px' }}>
                        <div className="captains-log-desc">{entry.description}</div>
                        <div className="captains-log-meta">{dateStr}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className={coinClass}>{displayAmount} 🪙</div>
                        <div style={{ fontSize: '11px', color: '#8d6e63', marginTop: '2px' }}>
                          Saldo: {entry.balanceAfter} 🪙
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <button
              type="button"
              className="captains-log-close-btn"
              onClick={() => setLogPopupOpen(false)}
            >
              Logboek Sluiten
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
                return (
                  <button
                    key={name}
                    type="button"
                    className="versioncard"
                    onClick={() => activateCocoProfile(name)}
                  >
                    <span style={{ fontSize: '26px', fontWeight: 900, color: 'var(--gold)' }}>{name.slice(0, 1).toUpperCase()}</span>
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
                        ? `./music/index.html?room=${room.code}&v=74`
                        : './music/index.html?v=74';
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
                    <p>Dé interactieve muziekquiz met 150 betoverende Disney en Pixar songs. Scan scancodes met Spotify, raad de film, het jaartal of de uitvoerder en verover de troon!</p>
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
                      <div
                        key={game.id}
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
                          transition: 'all 0.15s ease'
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
                      </div>
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
                <h2 className="sectiontitle">2. Kies een spelversie</h2>
                <div className="versiongrid">
                  {GAME_VERSIONS.map(v => (
                    <button 
                      key={v.id} 
                      type="button" 
                      className={`versioncard ${setupVersion === v.id ? "selected" : ""}`}
                      onClick={() => setSetupVersion(v.id)}
                    >
                      <span className="versionicon">{v.icon}</span>
                      <span><strong>Game {v.id} · {v.name}</strong></span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="card">
                <h2 className="sectiontitle">3. Spelers en lengte</h2>
                <div className="field">
                  <label htmlFor="hostName">Jouw Naam (Host)</label>
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
                    <option value={3}>3 beurten p.p.</option>
                    <option value={5}>5 beurten p.p.</option>
                    <option value={10}>10 beurten p.p.</option>
                    <option value={15}>15 beurten p.p.</option>
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
                {room?.game_mode?.startsWith('arcade-') && (
                  <p className="small" style={{ marginTop: '-4px' }}>
                    {getArenaGame(room.current_task_state?.arcadeGameId)?.name || 'Arena spel'}:
                    {' '}maximaal {room.current_task_state?.arcadeMaxPlayers || 2} spelers.
                  </p>
                )}
                <div className="players">
                  {players.map((p, idx) => (
                    <div key={p.id} className="playerline" style={{ padding: '10px', background: '#081a37', border: '1px solid var(--line)', borderRadius: '10px' }}>
                      <strong>{p.name} {idx === 0 ? "👑" : ""}</strong>
                    </div>
                  ))}
                </div>

                {players.length > 0 && players[0].id === localPlayer?.id ? (
                  <div className="btnrow one" style={{ marginTop: '20px' }}>
                    <button
                      className="btn primary"
                      disabled={room?.game_mode?.startsWith('arcade-') && room.current_task_state?.arcadeMaxPlayers && players.length > room.current_task_state.arcadeMaxPlayers}
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
                    
                    {players[0]?.id === localPlayer?.id ? (
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
                      const isHost = players[0]?.id === localPlayer?.id;
                      const canControlTurnTask = isMyTurn || isHost;
                      const difficultyLabel = t.difficulty ? { easy: "Makkelijk", medium: "Medium", hard: "Moeilijk" }[t.difficulty] : "";
                      const isSoloAiGame = t.type === 'arcade-game' && t.mode === 'solo' && hasArenaAi(t.gameId);
                      const aiLevelNumber = { easy: 1, normal: 2, hard: 3 }[room.current_task_state?.aiLevel || aiLevel] || 2;
                      const pointsText = t.type === "quizChoice"
                        ? "Kies je niveau"
                        : isSoloAiGame
                          ? `LEVEL ${aiLevelNumber}`
                          : `${t.points || 1} ster${(t.points || 1) > 1 ? "ren" : ""}`;
                      const badgeText = `${t.cat}${difficultyLabel ? " · " + difficultyLabel : ""} · ${pointsText}`;

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
                          {t.type === "group" ? (
                            <div className="turn"><strong>Gezamenlijke opdracht</strong> · iedereen helpt mee!</div>
                          ) : (
                            <div className="turn">
                              Aan de beurt: <strong>{activePlayer?.name} {isMyTurn ? "(Jij!)" : ""}</strong>
                            </div>
                          )}
                          <h2>{t.title}</h2>
                          <div className="prompt">{t.text}</div>

                           <div className={t.type === 'arcade-game' && t.gameId === 'qwixx' ? 'task-game-content task-game-content-qwixx' : 'task-game-content'} style={{ marginTop: '20px' }}>
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
                                    const usesDirectReward = t.gameId === 'ricochet' || t.gameId === 'qwixx';
                                    const coinsEarned = usesDirectReward ? score : (score === 3 ? 2 : (score === 2 ? 1 : 0));
                                    const gameTitle = {
                                      othello: "Othello",
                                      dotsboxes: "Rapunzel's Torenkamers",
                                      colorlines: "Color Lines",
                                      ricochet: "Ricochet Shot",
                                      curling: "Curling Duel",
                                      abalone: "Marble Push (Abalone)",
                                      tictactinker: "Tic Tac Tinker Bell"
                                    }[t.gameId] || "Arena Game";

                                    if (room.id === 'solo') {
                                      logSoloAttempt(coinsEarned, detail, true);
                                      soloLoggedRef.current = true;
                                    } else {
                                      await addPlayerScore(room.id, localPlayer, coinsEarned, `${gameTitle}: ${detail}`, 'knowledge');
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
                                      label="Zazu's Sudoku"
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
                                              <div
                                                key={`${rIdx}-${cIdx}`}
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
                                                  ...borderStyles
                                                }}
                                              >
                                                {cell || ""}
                                              </div>
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
                                      Groepsquiz: iedereen antwoordt zelf. Deze vraag telt niet als beurt.
                                      <strong style={{ display: 'block', marginTop: '4px' }}>{answeredCount}/{players.length} spelers hebben geantwoord.</strong>
                                    </div>
                                    <div className="answers">
                                      {t.answers.map((ans, idx) => {
                                        const isTinkActive = room.current_task_state?.tinkActive;
                                        const isIncorrectOption = idx !== t.correct;
                                        const shouldHide = isTinkActive && isIncorrectOption && (idx === (t.correct + 1) % 4 || idx === (t.correct + 2) % 4);

                                        if (shouldHide) return null;

                                        let btnClass = "answer";
                                        if (quizLocked || allAnswered) {
                                          if (idx === t.correct) btnClass += " correct";
                                          else if (idx === myQuizAnswer) btnClass += " wrong";
                                        }
                                        return (
                                          <button
                                            key={idx}
                                            className={btnClass}
                                            disabled={quizLocked || myQuizAnswer !== undefined}
                                            onClick={() => handleAnswerQuiz(idx, t.correct, room.current_task_state.quizPoints || 1)}
                                          >
                                            {ans}
                                          </button>
                                        );
                                      })}
                                    </div>
                                    {myQuizAnswer !== undefined && !quizLocked && (
                                      <div className="notice green" style={{ marginTop: '12px' }}>
                                        Antwoord opgeslagen. Wachten op de rest...
                                      </div>
                                    )}
                                    {quizLocked && players[0]?.id === localPlayer?.id && (
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
                              
                              if (isMyTurn) {
                                // Voorlezer View
                                const allSubmitted = players
                                  .filter(p => p.id !== localPlayer.id)
                                  .every(p => diaryAnswers[p.id]?.[`part${activePart}`]);

                                return (
                                  <div>
                                    <div className="notice" style={{ background: '#0a2042', borderColor: '#214d8f' }}>
                                      <strong>Jij bent de voorlezer! 📖</strong> Lees het actieve deel hieronder luid en duidelijk voor aan de auto.
                                    </div>
                                    <div style={{ padding: '12px', background: '#091c38', borderRadius: '12px', marginBottom: '14px', border: '1px solid var(--line)' }}>
                                      <strong style={{ color: 'var(--gold)', display: 'block', marginBottom: '5px' }}>Deel {activePart} (Voorlezer-scherm):</strong>
                                      <p style={{ margin: 0, fontStyle: 'italic', fontSize: '15px', lineHeight: '1.4' }}>
                                        {activePart === 1 ? t.part1 : activePart === 2 ? t.part2 : t.part3}
                                      </p>
                                    </div>

                                    <div style={{ marginBottom: '14px' }}>
                                      <strong style={{ fontSize: '13px', display: 'block', marginBottom: '6px' }}>Status antwoorden (Ronde {activePart}):</strong>
                                      {players.filter(p => p.id !== localPlayer.id).map(p => {
                                        const submitted = !!diaryAnswers[p.id]?.[`part${activePart}`];
                                        const ansText = diaryAnswers[p.id]?.[`part${activePart}`];
                                        return (
                                          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#07152d', borderRadius: '8px', marginBottom: '4px', fontSize: '13px' }}>
                                            <span>{p.name}</span>
                                            <span style={{ color: submitted ? 'var(--ok)' : 'var(--danger)' }}>
                                              {submitted ? `Klaar (${ansText.char} · ${ansText.movie})` : 'Nadenken... ⏳'}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    <div className="notice" style={{ background: '#091c38', borderColor: 'var(--line)', fontSize: '13px' }}>
                                      <strong>Oplossing:</strong> {t.character_nl} / {t.character_en} ({t.movie_nl} / {t.movie_en})
                                    </div>

                                    <div className="btnrow stack" style={{ marginTop: '10px' }}>
                                      {activePart < 3 ? (
                                        <button className="btn primary" disabled={!allSubmitted} onClick={() => handleNextDiaryPart(activePart + 1)}>
                                          Volgend deel voorlezen ➔
                                        </button>
                                      ) : (
                                        <button className="btn primary" disabled={!allSubmitted} onClick={() => handleResolveDiary(t)}>
                                          Antwoorden evalueren & beëindigen
                                        </button>
                                      )}
                                      <button className="btn secondary" onClick={() => handleSkipTask(false)}>Overslaan</button>
                                    </div>
                                  </div>
                                );
                              } else {
                                // Guesser View - Meeleesscherm text is completely REMOVED to avoid spoiling!
                                const myAnswers = diaryAnswers[localPlayer.id] || {};
                                const alreadySubmittedThisPart = !!myAnswers[`part${activePart}`];

                                return (
                                  <div>
                                    <div className="notice" style={{ background: '#0a1c3c' }}>
                                      <strong>Luister naar {activePlayer?.name}! 👂</strong> Hij/zij leest een geheim dagboekfragment voor. Raad welk karakter vertelt en uit welke film het komt!
                                    </div>

                                    {alreadySubmittedThisPart ? (
                                      <div className="notice green">
                                        Je hebt je antwoord voor deel {activePart} ingediend. Wacht tot de voorlezer doorgaat...
                                      </div>
                                    ) : (
                                      <div>
                                        <div className="field">
                                          <label>Welk Karakter?</label>
                                          <input placeholder="Bijv. Remy of Aladdin" value={diaryChar} onChange={e => setDiaryChar(e.target.value)} />
                                        </div>
                                        <div className="field">
                                          <label>Welke Film?</label>
                                          <input placeholder="Bijv. Ratatouille of Aladdin" value={diaryMovie} onChange={e => setDiaryMovie(e.target.value)} />
                                        </div>
                                        <button className="btn primary full" disabled={!diaryChar.trim() || !diaryMovie.trim()} onClick={() => handleSubmitDiaryPart(activePart)}>
                                          Bevestig antwoord voor deel {activePart}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                            })()}

                            {/* 4. PICTIONARY */}
                            {t.type === "draw" && (() => {
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
                                        <label>Wie heeft het geraden?</label>
                                        <div className="answers">
                                          {players.map((p, idx) => (
                                            p.id !== localPlayer.id && (
                                              <button key={p.id} className="answer" onClick={() => handlePictionaryGuessed(idx)}>
                                                ⭐ {p.name}
                                              </button>
                                            )
                                          ))}
                                          <button className="btn danger full" onClick={handleFinishTask} style={{ marginTop: '8px' }}>
                                            Niemand heeft het geraden
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    // Guesser UI
                                    <div>
                                      <div className="notice" style={{ background: '#0a1c3c' }}>
                                        <strong>Raad wat {activePlayer?.name} tekent! 🎨</strong> Roep het antwoord in de auto zodra je het weet!
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
                                      <div className="center" style={{ marginTop: '12px', color: 'var(--muted)' }}>
                                        Tekening synchroniseert live... ⏳
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* 5. INSCHATTINGSVRAGEN */}
                            {t.type === "estimate" && (() => {
                              const estimate = room.current_task_state.estimate;
                              const votes = room.current_task_state.votes || {};
                              
                              if (isMyTurn) {
                                const hasEstimated = estimate !== undefined;
                                const allVoted = players
                                  .filter(p => p.id !== localPlayer.id)
                                  .every(p => votes[p.id]);

                                return (
                                  <div>
                                    {!hasEstimated ? (
                                      <div>
                                        <div className="field">
                                          <label>Jouw Schatting ({t.unit}):</label>
                                          <input type="number" placeholder={`Bijv. 1500`} value={localEstimate} onChange={e => setLocalEstimate(e.target.value)} />
                                        </div>
                                        <button className="btn primary full" disabled={!localEstimate} onClick={handleSendEstimate}>
                                          Schatting verzenden
                                        </button>
                                      </div>
                                    ) : (
                                      <div>
                                        <div className="notice green">
                                          Jouw schatting: <strong>{estimate} {t.unit}</strong>.
                                        </div>
                                        <div className="notice" style={{ background: '#0a2042' }}>
                                          Jij krijgt 1 ster voor elke medespeler die hoger/lager verkeerd kiest.
                                          Kiest iedereen verkeerd, dan krijg je 1 bonusster.
                                        </div>
                                        
                                        <div style={{ marginBottom: '14px' }}>
                                          <label>Hoger of Lager stemmen:</label>
                                          {players.filter(p => p.id !== localPlayer.id).map(p => {
                                            const v = votes[p.id];
                                            return (
                                              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#07152d', borderRadius: '8px', marginBottom: '4px', fontSize: '13px' }}>
                                                <span>{p.name}</span>
                                                <span style={{ color: v ? 'var(--ok)' : 'var(--danger)' }}>
                                                  {v ? (v === 'higher' ? 'Hoger ⬆️' : 'Lager ⬇️') : 'Stemmen... ⏳'}
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>

                                        <div className="notice" style={{ background: '#0c2145' }}>
                                          Het juiste antwoord is: <strong>{t.correct_value} {t.unit}</strong>
                                        </div>

                                        <button className="btn primary full" disabled={!allVoted} onClick={() => handleResolveEstimate(t)}>
                                          Puntentelling valideren & doorgaan
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              } else {
                                const hasEstimated = estimate !== undefined;
                                const myVote = votes[localPlayer.id];

                                return (
                                  <div>
                                    {!hasEstimated ? (
                                      <div className="center">Wachten tot {activePlayer?.name} zijn/haar schatting indient...</div>
                                    ) : (
                                      <div>
                                        <div className="notice">
                                          {activePlayer?.name} schat: <strong style={{ fontSize: '22px', display: 'block', margin: '4px 0' }}>{estimate} {t.unit}</strong>
                                        </div>
                                        
                                        {myVote ? (
                                          <div className="notice green">
                                            Je hebt gestemd: <strong>{myVote === 'higher' ? 'Hoger ⬆️' : 'Lager ⬇️'}</strong>. Wachten tot iedereen gestemd heeft...
                                          </div>
                                        ) : (
                                          <div>
                                            <p className="center">Is het werkelijke antwoord hoger of lager?</p>
                                            <div className="btnrow" style={{ marginTop: '12px' }}>
                                              <button className="btn primary" onClick={() => handleVoteEstimate('higher')}>Hoger ⬆️</button>
                                              <button className="btn secondary" onClick={() => handleVoteEstimate('lower')}>Lager ⬇️</button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
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
                                      {myVote ? (
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

                                      {isMyTurn && (
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
                            {t.type === "emoji" && (
                              <div>
                                <div className="center" style={{ fontSize: '48px', margin: '20px 0', letterSpacing: '4px', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.3))' }}>
                                  {t.text}
                                </div>
                                
                                {quizLocked ? (
                                  <div className="notice" style={{ background: match(quizSelectedAnswer, [t.movie_nl, t.movie_en, ...(t.movie_aliases || [])]) ? '#123d2b' : '#3d121c' }}>
                                    <strong>
                                      {match(quizSelectedAnswer, [t.movie_nl, t.movie_en, ...(t.movie_aliases || [])]) ? 'Correct! 🎉' : 'Helaas! 💔'}
                                    </strong>
                                    <p>Jouw antwoord: <em>{quizSelectedAnswer || "Geen"}</em></p>
                                    <p style={{ marginTop: '10px' }}><strong>Oplossing:</strong> {t.movie_nl} / {t.movie_en}</p>
                                    
                                    {canControlTurnTask && (
                                      <button className="btn primary full" style={{ marginTop: '14px' }} onClick={handleFinishTask}>
                                        Volgende opdracht
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div>
                                    {canControlTurnTask ? (
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
                                      <div className="center">Wachten tot {activePlayer?.name} de emojis raadt... ⏳</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 8. WIE BEN IK (HINT QUEST) */}
                            {t.type === "whoami" && (() => {
                              return (
                                <div>
                                  <div style={{ padding: '12px', background: '#091c38', borderRadius: '12px', marginBottom: '14px', border: '1px solid var(--line)' }}>
                                    <div style={{ marginBottom: '8px' }}>
                                      <strong style={{ color: 'var(--gold)', display: 'block', fontSize: '13px' }}>Hint 1 (Gratis):</strong>
                                      <span style={{ fontSize: '15px' }}>{t.hint1}</span>
                                    </div>
                                    {whoamiRevealed >= 2 && (
                                      <div style={{ marginTop: '12px', borderTop: '1px solid var(--line)', paddingTop: '8px' }}>
                                        <strong style={{ color: 'var(--gold)', display: 'block', fontSize: '13px' }}>Hint 2 (Kosten: -1 punt):</strong>
                                        <span style={{ fontSize: '15px' }}>{t.hint2}</span>
                                      </div>
                                    )}
                                    {whoamiRevealed >= 3 && (
                                      <div style={{ marginTop: '12px', borderTop: '1px solid var(--line)', paddingTop: '8px' }}>
                                        <strong style={{ color: 'var(--gold)', display: 'block', fontSize: '13px' }}>Hint 3 (Kosten: -2 punten):</strong>
                                        <span style={{ fontSize: '15px' }}>{t.hint3}</span>
                                      </div>
                                    )}
                                  </div>

                                  {!whoamiLocked && canControlTurnTask && (
                                    <div className="btnrow" style={{ marginBottom: '14px' }}>
                                      <button className="btn secondary mini" disabled={whoamiRevealed >= 2} onClick={() => setWhoamiRevealed(2)}>
                                        Onthul Hint 2
                                      </button>
                                      <button className="btn secondary mini" disabled={whoamiRevealed < 2 || whoamiRevealed >= 3} onClick={() => setWhoamiRevealed(3)}>
                                        Onthul Hint 3
                                      </button>
                                    </div>
                                  )}

                                  <div className="answers">
                                    {t.answers.map((ans, idx) => {
                                      let btnClass = "answer";
                                      if (whoamiLocked) {
                                        if (idx === t.correct) btnClass += " correct";
                                        else if (idx === whoamiSelected) btnClass += " wrong";
                                      }
                                      return (
                                        <button 
                                          key={idx}
                                          className={btnClass}
                                          disabled={whoamiLocked || !canControlTurnTask}
                                          onClick={() => handleWhoamiAnswer(idx, t)}
                                        >
                                          {ans}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  {whoamiLocked && canControlTurnTask && (
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
                            {t.type === "fact" && (
                              <div>
                                {factLocked ? (
                                  <div className="notice" style={{ background: factSelected === t.correct ? '#174f43' : '#5b2437', borderColor: factSelected === t.correct ? '#58d4a4' : '#ff7b8b' }}>
                                    <strong style={{ display: 'block', fontSize: '18px', marginBottom: '6px' }}>
                                      {factSelected === t.correct ? 'Correct! 🎉 Feit.' : 'Helaas! 💔 Fabel.'}
                                    </strong>
                                    <p style={{ margin: 0, fontSize: '15px', lineHeight: '1.4' }}>{t.explanation}</p>
                                    
                                    {canControlTurnTask && (
                                      <button className="btn primary full" style={{ marginTop: '14px' }} onClick={handleFinishTask}>
                                        Volgende opdracht
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="btnrow">
                                    <button className="btn ok" disabled={!canControlTurnTask} onClick={() => handleFactAnswer(true, t)}>
                                      🟩 FEIT (Echt waar)
                                    </button>
                                    <button className="btn danger" disabled={!canControlTurnTask} onClick={() => handleFactAnswer(false, t)}>
                                      🟥 FABEL (Niet waar)
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 11. SAMEN (COOP timer synced in real-time) */}
                            {t.type === "group" && (
                              <div>
                                {t.seconds && (
                                  <div id="timerArea" style={{ textAlign: 'center', marginBottom: '12px' }}>
                                    <div className={`timer ${secondsLeft <= 10 ? 'low' : ''}`}>{secondsLeft || t.seconds}</div>
                                    {players[0]?.id === localPlayer?.id && !timerRunning && (
                                      <button className="btn secondary" onClick={() => handleStartGroupTimer(t.seconds)}>
                                        {room.current_task_state?.timerStartedAt ? 'Start timer opnieuw' : 'Start timer'}
                                      </button>
                                    )}
                                    {players[0]?.id !== localPlayer?.id && !timerRunning && (
                                      <p className="small">De host kan de timer starten.</p>
                                    )}
                                  </div>
                                )}
                                
                                {players[0]?.id === localPlayer?.id && (
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
                      {players[0]?.id === localPlayer?.id && (
                        <button className="btn primary" onClick={() => selectNextTask(room, players)}>
                          Opdracht Laden
                        </button>
                      )}
                    </section>
                  )}

                  {/* Player's card hand tray */}
                  {(() => {
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
                <h2 className="sectiontitle">Stand na {room?.round || 0} beurten</h2>
                <div className="medals">
                  {[...players]
                    .sort((a, b) => b.score - a.score)
                    .map((p, idx) => (
                      <div key={p.id} className="medal">
                        <div>
                          <span style={{ fontSize: '24px', marginRight: '10px' }}>
                            {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "🎖️"}
                          </span>
                          <span className="name">{p.name}</span>
                        </div>
                        <div className="pts">{p.score} ★</div>
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
                    .map((p, idx) => {
                      const titles = [
                        "De Hercules van de Road Race 🏆",
                        "De Buzz Lightyear van de Bijna-Winst 🚀",
                        "De Pain & Panic-combi van de Achterhoede 😈",
                        "De Sidekick 🦌"
                      ];
                      return (
                        <div key={p.id} className="medal" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontWeight: 'bold' }}>
                            <span>{idx + 1}. {p.name}</span>
                            <span>{p.score} ★</span>
                          </div>
                          <small style={{ color: 'var(--gold)', marginTop: '4px' }}>{titles[idx] || titles[3]}</small>
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
