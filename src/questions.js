// Highly challenging Disney Road Quest questions for Disney experts.

export const MAGIC_NEWS = [
  "Magisch Nieuws: Wist je dat de draak onder het kasteel van Disneyland Paris de grootste audio-animatronic is die Disney ooit heeft gebouwd? Hij is 24 meter lang en weegt meer dan 2.000 kilo!",
  "Magisch Nieuws: Wist je dat het kasteel van Doornroosje in Parijs roze is geverfd omdat de ontwerpers wisten dat de Noord-Europese lucht vaak grijs is? De roze kleur zorgt ervoor dat het kasteel er altijd zonnig en sprookjesachtig uitziet.",
  "Magisch Nieuws: Wist je dat Disneyland Paris bewust op het noorden is gericht? Hierdoor staat de zon nooit direct achter het kasteel, waardoor bezoekers op elk moment van de dag foto's kunnen maken zonder tegenlicht.",
  "Magisch Nieuws: Wist je dat er onder Disneyland Paris een enorm netwerk van gangen (utilidors) ligt? Hierdoor kunnen medewerkers en Disney-figuren zich onopgemerkt verplaatsen zonder de sfeer in de themalanden te verstoren.",
  "Magisch Nieuws: Wist je dat de iconische roep van de gnoes-stampede in The Lion King eigenlijk bestaat uit een mix van brullende leeuwen en het geluid van op hol geslagen vrachtwagens?",
  "Magisch Nieuws: Wist je dat het nummer 'Part of Your World' uit The Little Mermaid bijna uit de film was geknipt omdat Jeffrey Katzenberg dacht dat kinderen het saai zouden vinden?",
  "Magisch Nieuws: Wist je dat er in Phantom Manor een portret hangt dat verandert naargelang je positie? Dit klassieke effect is gemaakt met behulp van linzen-lenzen (lenticular print)."
];

export const DEFAULT_TASKS = [
  // --- CATEGORY: DISNEY DAGBOEK (type: 'diary') ---
  {
    id: "diary-01",
    cat: "Disney Dagboek",
    type: "diary",
    title: "Geheim Dagboek",
    part1: "De geur van verbrande soep en koud water hangt in de lucht. Ik zit verscholen onder een warme, witte stoffen koepel, omringd door het kletterende geluid van koper en schreeuwende stemmen. Mijn handen trillen, maar mijn zintuigen vertellen me precies welke kruiden er ontbreken in de pan onder mij.",
    part2: "Ik bestuur de armen van een onhandige jongen door aan zijn haren te trekken. Samen vormen we een vreemd duo dat de culinaire wereld van deze stad probeert te veroveren, al mag niemand weten wie het echte brein achter de gerechten is.",
    part3: "Hoewel ik een klein knaagdier ben dat niet thuishoort in het chique Parijse restaurant van de beroemde overleden chef-kok Gusteau, bewijs ik dat iedereen kan koken.",
    character: "Remy",
    movie: "Ratatouille",
    character_aliases: ["remy", "remi"],
    movie_aliases: ["ratatouille"]
  },
  {
    id: "diary-02",
    cat: "Disney Dagboek",
    type: "diary",
    title: "Geheim Dagboek",
    part1: "Ik zweef boven een kolkende rivier van zielen, omringd door vlammen die van kleur veranderen naargelang mijn humeur. Die drie grijze zussen vertelden me dat de planeten gunstig zullen staan, maar dat die jonge sterke jongen roet in het eten kan gooien.",
    part2: "Ik stuurde mijn twee onhandige helpers, Pain en Panic, om hem als baby te ontdoen van zijn onsterfelijkheid. Ze faalden jammerlijk. Nu probeer ik hem te chanteren via een deal met een meisje genaamd Megara.",
    part3: "Mijn plan om de Titanen te bevrijden en de heerser van de Olympus omver te werpen mislukt volledig als hij zijn onsterfelijkheid terugverdient door Megara te redden uit de rivier van de dood.",
    character: "Hades",
    movie: "Hercules",
    character_aliases: ["hades"],
    movie_aliases: ["hercules", "herkules"]
  },
  {
    id: "diary-03",
    cat: "Disney Dagboek",
    type: "diary",
    title: "Geheim Dagboek",
    part1: "Ik zit op de troon waar ik al jaren recht op denk te hebben, maar die arrogante snotneus ontsloeg me zojuist als zijn adviseur. Mijn geheime laboratorium onder het paleis is de enige plek waar ik mijn wraak kan smeden met mijn gigantische gespierde assistent.",
    part2: "Het plan was simpel: vergif in zijn drankje gieten. Maar mijn assistent verwisselde de flesjes en nu is de keizer veranderd in een pratende lama. We goouden hem in een zak op de kar van een boer.",
    part3: "Samen met Kronk probeer ik hem op te sporen in het oerwoud en de boer Pacha uit te schakelen voordat hij zijn menselijke gedaante teruggekregen heeft.",
    character: "Yzma",
    movie: "The Emperor's New Groove",
    character_aliases: ["yzma", "ysma"],
    movie_aliases: ["the emperor's new groove", "keizer kuzco", "kuzco"]
  },
  {
    id: "diary-04",
    cat: "Disney Dagboek",
    type: "diary",
    title: "Geheim Dagboek",
    part1: "Elke nacht stijgt de rook op uit mijn haard en staar ik naar het vuur dat me kwelt. Ik ben een man van rechtvaardigheid en de wet, maar die zigeunerin met haar groene ogen en dansende passen bezorgt me gevoelens die ik niet kan beheersen.",
    part2: "Ik hield een misvormde jongen opgesloten in de klokkentoren van de kathedraal en vertelde hem dat de wereld buiten koud en wreed is. Nu ontsnapte hij om haar te helpen.",
    part3: "Ik eis dat ze de mijne wordt, of anders zal ze branden op de brandstapel voor de poorten van de Notre Dame.",
    character: "Frollo",
    movie: "The Hunchback of Notre Dame",
    character_aliases: ["frollo", "rechter frollo", "judge frollo"],
    movie_aliases: ["the hunchback of notre dame", "de klokkenluider van de notre dame", "de klokkenluider van notre dame"]
  },
  {
    id: "diary-05",
    cat: "Disney Dagboek",
    type: "diary",
    title: "Geheim Dagboek",
    part1: "Het tikkende geluid bezorgt me de koude rillingen. Telkens als ik dat geluid hoor, weet ik dat die monsterlijke reptielachtige schaduw in het water dichterbij komt, wachtend op de rest van mijn maaltijd.",
    part2: "Die vliegende jongen sneed mijn hand af en voerde het aan het reptiel. Nu draag ik een metalen prothese aan mijn linkerarm en leid ik mijn bemanning, met meneer Smee aan mijn zijde, om wraak te nemen.",
    part3: "Ik ontvoerde Wendy en de Verloren Jongens naar mijn schip Jolly Roger in Neverland om hem in de val te lokken.",
    character: "Kapitein Haak",
    movie: "Peter Pan",
    character_aliases: ["kapitein haak", "haak", "captain hook"],
    movie_aliases: ["peter pan"]
  },
  {
    id: "diary-06",
    cat: "Disney Dagboek",
    type: "diary",
    title: "Geheim Dagboek",
    part1: "De aarde is stil en bedekt met bergen van samengeperst vuil. Mijn enige metgezel is een kleine kakkerlak die me overal volgt. Elke dag sorteer en pers ik afval, totdat er plotseling een gigantisch wit ruimteschip landt.",
    part2: "Er stapt een strakke, glanzende witte sonde uit die zoekt naar biologisch leven. Ik laat haar mijn verzameling zien, inclusief een klein groen plantje dat ik in een oude laars heb gevonden.",
    part3: "Als ze het plantje inneemt en in slaapstand gaat, volg ik haar tot in het heelal, helemaal naar het gigantische ruimteschip Axiom waar de luie mensheid woont.",
    character: "WALL-E",
    movie: "WALL-E",
    character_aliases: ["wall-e", "walle"],
    movie_aliases: ["wall-e", "walle"]
  },

  // --- CATEGORY: PICTIONARY (type: 'draw') ---
  { id: "draw-01", cat: "Pictionary", type: "draw", title: "Teken het", text: "Glazen muiltje", points: 2 },
  { id: "draw-02", cat: "Pictionary", type: "draw", title: "Teken het", text: "Madame Medusa", points: 2 },
  { id: "draw-03", cat: "Pictionary", type: "draw", title: "Teken het", text: "De Muren van Agrabah", points: 2 },
  { id: "draw-04", cat: "Pictionary", type: "draw", title: "Teken het", text: "Vliegend tapijt", points: 2 },
  { id: "draw-05", cat: "Pictionary", type: "draw", title: "Teken het", text: "De spinnende tol van Maleficent", points: 2 },
  { id: "draw-06", cat: "Pictionary", type: "draw", title: "Teken het", text: "De giftige appel", points: 2 },
  { id: "draw-07", cat: "Pictionary", type: "draw", title: "Teken het", text: "De roos in de glazen stolp", points: 2 },
  { id: "draw-08", cat: "Pictionary", type: "draw", title: "Teken het", text: "De klokkentoren van Notre Dame", points: 2 },

  // --- CATEGORY: INSCHATTINGSVRAGEN (type: 'estimate') ---
  {
    id: "estimate-01",
    cat: "Inschattingsvragen",
    type: "estimate",
    title: "Hoeveel is het?",
    text: "Hoeveel kilo weegt de mechanische draak onder het kasteel in Disneyland Paris?",
    correct_value: 2000,
    unit: "kilo",
    points: 2
  },
  {
    id: "estimate-02",
    cat: "Inschattingsvragen",
    type: "estimate",
    title: "Hoeveel is het?",
    text: "In welk jaar opende de attractie 'Space Mountain: De la Terre à la Lune' voor het eerst in Disneyland Paris?",
    correct_value: 1995,
    unit: "jaar",
    points: 2
  },
  {
    id: "estimate-03",
    cat: "Inschattingsvragen",
    type: "estimate",
    title: "Hoeveel is het?",
    text: "Hoeveel meter hoog is het kasteel van Doornroosje (Le Château de la Belle au Bois Dormant) in Disneyland Paris?",
    correct_value: 45,
    unit: "meter",
    points: 2
  },
  {
    id: "estimate-04",
    cat: "Inschattingsvragen",
    type: "estimate",
    title: "Hoeveel is het?",
    text: "Hoeveel spoken wonen er volgens de legende in Phantom Manor in Disneyland Paris?",
    correct_value: 999,
    unit: "spoken",
    points: 2
  },
  {
    id: "estimate-05",
    cat: "Inschattingsvragen",
    type: "estimate",
    title: "Hoeveel is het?",
    text: "Hoeveel minuten duurt de film 'Fantasia' uit 1940 oorspronkelijk?",
    correct_value: 126,
    unit: "minuten",
    points: 2
  },
  {
    id: "estimate-06",
    cat: "Inschattingsvragen",
    type: "estimate",
    title: "Hoeveel is het?",
    text: "Hoeveel eieren eet Gaston per dag als volwassen man om zo groot te worden?",
    correct_value: 60,
    unit: "eieren",
    points: 2
  },

  // --- CATEGORY: DILEMMA (type: 'dilemma') ---
  {
    id: "dilemma-01",
    cat: "Dilemma",
    type: "dilemma",
    title: "Kies je kant",
    text: "Welke magische eigenschap zou je liever een dag bezitten?",
    optionA: "Vliegen als Peter Pan",
    optionB: "Supersterk zijn als Hercules",
    points: 1
  },
  {
    id: "dilemma-02",
    cat: "Dilemma",
    type: "dilemma",
    title: "Kies je kant",
    text: "Met wie zou je liever een week lang vastzitten in de auto naar Parijs?",
    optionA: "Donald Duck (die constant klaagt)",
    optionB: "Olaf (die non-stop zingt en knuffelt)",
    points: 1
  },
  {
    id: "dilemma-03",
    cat: "Dilemma",
    type: "dilemma",
    title: "Kies je kant",
    text: "Welk restaurant zou je liever openen in het park?",
    optionA: "Een chique bistro met chef-kok Remy",
    optionB: "Een gezellig bayou-paleis met Tiana",
    points: 1
  },
  {
    id: "dilemma-04",
    cat: "Dilemma",
    type: "dilemma",
    title: "Kies je kant",
    text: "Als je één Disney-schurk als buurman moet kiezen, wie veroorzaakt de minste overlast?",
    optionA: "Hades (gezellig en warm)",
    optionB: "Kapitein Haak (houdt van rust en structuur)",
    points: 1
  },

  // --- CATEGORY: EMOJI QUIZ (type: 'emoji') ---
  {
    id: "emoji-01",
    cat: "Emoji Quiz",
    type: "emoji",
    title: "Raad de Emojis",
    text: "🥀👹🕯️⏰",
    answers: ["Sleeping Beauty", "Beauty and the Beast", "Aladdin", "Snow White"],
    correct: 1,
    points: 2
  },
  {
    id: "emoji-02",
    cat: "Emoji Quiz",
    type: "emoji",
    title: "Raad de Emojis",
    text: "🎈🏠👴👦",
    answers: ["WALL-E", "Up", "Coco", "Toy Story"],
    correct: 1,
    points: 2
  },
  {
    id: "emoji-03",
    cat: "Emoji Quiz",
    type: "emoji",
    title: "Raad de Emojis",
    text: "🐭🍜👨‍🍳🇫🇷",
    answers: ["Ratatouille", "Monsters Inc.", "Luca", "Soul"],
    correct: 0,
    points: 2
  },
  {
    id: "emoji-04",
    cat: "Emoji Quiz",
    type: "emoji",
    title: "Raad de Emojis",
    text: "🎸💀🕯️🇲🇽",
    answers: ["Encanto", "Coco", "The Emperor's New Groove", "Brave"],
    correct: 1,
    points: 2
  },
  {
    id: "emoji-05",
    cat: "Emoji Quiz",
    type: "emoji",
    title: "Raad de Emojis",
    text: "🧚‍♂️🏴‍☠️🐊⏱️",
    answers: ["Peter Pan", "Pirates of the Caribbean", "Treasure Planet", "Hercules"],
    correct: 0,
    points: 2
  },

  // --- CATEGORY: WIE BEN IK? (type: 'whoami') ---
  {
    id: "whoami-01",
    cat: "Wie ben ik?",
    type: "whoami",
    title: "Hint Quest",
    hint1: "Ik ben ontworpen door animator Marc Davis en mijn uiterlijk is gebaseerd op een vampier-achtige octopus.",
    hint2: "Ik neem een menselijke gedaante aan onder de naam Vanessa om een prins te misleiden.",
    hint3: "Ik ben de zeeheks die de stem van de kleine zeemeermin Ariel steelt.",
    answers: ["Maleficent", "Ursula", "Cruella de Vil", "Yzma"],
    correct: 1,
    points: 3
  },
  {
    id: "whoami-02",
    cat: "Wie ben ik?",
    type: "whoami",
    title: "Hint Quest",
    hint1: "Mijn originele stemacteur was Robin Williams en ik zat 10.000 jaar lang opgesloten in een krappe behuizing.",
    hint2: "Ik zing het nummer 'Friend Like Me' en kan de gekste gedaantes aannemen.",
    hint3: "Ik help een straatrat om een prins te worden en zijn droommeisje Jasmine te veroveren.",
    answers: ["Lumiere", "Mushu", "De Geest (Genie)", "Olaf"],
    correct: 2,
    points: 3
  },
  {
    id: "whoami-03",
    cat: "Wie ben ik?",
    type: "whoami",
    title: "Hint Quest",
    hint1: "Ik ben gebaseerd op een echt historisch figuur uit de Powhatan-stam en mijn naam betekent 'speels'.",
    hint2: "Ik zing over de kleuren van de wind en praat met een oude wijze boom genaamd Grootmoeder Wilg.",
    hint3: "Ik word verliefd op de Engelse kolonist John Smith.",
    answers: ["Mulan", "Tiana", "Pocahontas", "Moana"],
    correct: 2,
    points: 3
  },

  // --- CATEGORY: MASTERMIND (type: 'mastermind') ---
  {
    id: "mastermind-01",
    cat: "Disney Mastermind",
    type: "mastermind",
    title: "Code Breaker",
    text: "Kraak de geheime code van Disney-figuren in zo min mogelijk beurten!",
    points: 3
  },

  // --- CATEGORY: FEIT OF FABEL (type: 'fact') ---
  {
    id: "fact-01",
    cat: "Feit of Fabel",
    type: "fact",
    title: "Echt of nep?",
    text: "De stem van Boo in Monsters Inc. werd ingesproken door een peuter die de microfoon overal in de studio volgde omdat ze niet stil kon zitten.",
    correct: true,
    explanation: "Klopt! Mary Gibbs was zo jong dat ze niet stil kon zitten bij de microfoon, dus namen ze haar spelenderwijs op.",
    points: 2
  },
  {
    id: "fact-02",
    cat: "Feit of Fabel",
    type: "fact",
    title: "Echt of nep?",
    text: "Walt Disney was zo bang voor muizen dat hij oorspronkelijk weigerde om Mickey Mouse te tekenen.",
    correct: false,
    explanation: "Fabel! Hij had tamme muizen op zijn kantoor en was er dol op.",
    points: 2
  },
  {
    id: "fact-03",
    cat: "Feit of Fabel",
    type: "fact",
    title: "Echt of nep?",
    text: "De kasteelgracht in Disneyland Paris bevat speciale kleurstoffen om het water een magische groenblauwe tint te geven die past bij het sprookjesthema.",
    correct: true,
    explanation: "Feit! Disney gebruikt biologisch afbreekbare kleurstof om het water te kleuren en reflecties van de onderwatertechniek te camoufleren.",
    points: 2
  },
  {
    id: "fact-04",
    cat: "Feit of Fabel",
    type: "fact",
    title: "Echt of nep?",
    text: "Het iconische kasteel van Doornroosje in Disneyland Paris is roze geverfd omdat het in het vaak grijze Europese klimaat beter afsteekt.",
    correct: true,
    explanation: "Feit! Dit was een bewuste keuze van Imagineer Tony Baxter.",
    points: 2
  },

  // --- CATEGORY: QUIZ (type: 'quiz') ---
  {
    id: "quiz-01",
    cat: "Quiz",
    type: "quiz",
    difficulty: "hard",
    title: "Moeilijke vraag",
    text: "Hoe heet de tovenaar van Mickey in het segment 'The Sorcerer's Apprentice' uit Fantasia?",
    answers: ["Merlin", "Yen Sid", "Mim", "Chernabog"],
    correct: 1,
    points: 3
  },
  {
    id: "quiz-02",
    cat: "Quiz",
    type: "quiz",
    difficulty: "hard",
    title: "Moeilijke vraag",
    text: "Hoe heet de walvis uit Pinocchio?",
    answers: ["Monstro", "Bruto", "Leviathan", "Nero"],
    correct: 0,
    points: 3
  },

  // --- CATEGORY: SAMEN (type: 'group') ---
  {
    id: "group-01",
    cat: "Samen",
    type: "group",
    title: "Groepsmissie",
    text: "Noem samen binnen 45 seconden twaalf verschillende Disney- of Pixarfilms.",
    seconds: 45,
    points: 1
  },
  {
    id: "group-02",
    cat: "Samen",
    type: "group",
    title: "Groepsmissie",
    text: "Noem om de beurt een Disneypersonage. Wie langer dan drie seconden stilvalt, ligt eruit. Halen jullie samen twintig namen?",
    seconds: 60,
    points: 1
  }
];

export const PRONUNCIATION_MAP = []; // Cleaned up
