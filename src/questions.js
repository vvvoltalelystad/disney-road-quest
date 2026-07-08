// Highly challenging Disney Road Quest questions for adult Disney experts.
// Focuses on mainstream/famous movies, but with challenging, poetic details.

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
    part1: "Ik leefde ooit in het koninklijk paleis, maar werd verbannen naar de diepste, donkerste krochten van de oceaan. Mijn twee trouwe glibberige spionnen, Flotsam en Jetsam, houden me op de hoogte van alle roddels.",
    part2: "Een jonge prinses wilde dolgraag benen om een menselijke prins te ontmoeten. Ik liet haar een contract tekenen met haar eigen bloed, waarmee ze haar stem aan mij overdroeg.",
    part3: "Onder de naam Vanessa en met haar stem in een gouden schelp om mijn nek probeerde ik de prins te verleiden, totdat ik veranderde in een reusachtig zeemonster en werd doorboord door de boegspriet van een schip.",
    character: "Ursula",
    movie: "The Little Mermaid",
    character_aliases: ["ursula"],
    movie_aliases: ["the little mermaid", "de kleine zeemeermin"]
  },
  {
    id: "diary-04",
    cat: "Disney Dagboek",
    type: "diary",
    title: "Geheim Dagboek",
    part1: "Ik was de eerste in de lijn van opvolging, totdat die pluizige kleine welp werd geboren. Mijn litteken herinnert me dagelijks aan mijn misplaatste recht op de troon.",
    part2: "Ik verzamelde een leger van hongerige hyena's op het olifantenkerkhof en beloofde hen dat ze nooit meer honger zouden lijden als ze mij hielpen om mijn broer en zijn zoon te elimineren.",
    part3: "Nadat ik mijn broer in de kloof liet vallen, nam ik de heerschappij over het trotse land over, totdat mijn neef terugkeerde en me van de Koningsrots wierp, waarna mijn eigen hyena's me verslonden.",
    character: "Scar",
    movie: "The Lion King",
    character_aliases: ["scar"],
    movie_aliases: ["the lion king", "de leeuwenkoning"]
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
    part1: "Al achttien jaar zit ik opgesloten in een verborgen toren in het woud, met een kameleon als enige metgezel. Mijn zogenaamde moeder vertelt me dat de buitenwereld te gevaarlijk is.",
    part2: "Een knappe dief genaamd Flynn Rider brak in via mijn raam om te schuilen. Ik sloeg hem bewusteloos met een zware koekenpan en verstopte zijn gestolen tiara.",
    part3: "Ik dwong hem om me mee te nemen om de zwevende lichtjes te zien die elk jaar op mijn verjaardag aan de hemel verschijnen, om er uiteindelijk achter te komen dat ik de verloren prinses ben.",
    character: "Rapunzel",
    movie: "Tangled",
    character_aliases: ["rapunzel"],
    movie_aliases: ["tangled", "rapunzel"]
  },
  {
    id: "diary-07",
    cat: "Disney Dagboek",
    type: "diary",
    title: "Geheim Dagboek",
    part1: "Ik ben al jaren de favoriet van de jongen, de onbetwiste leider van de groep die op zijn bed woont. Er zit een trekkoord in mijn rug en mijn laars draagt zijn naam.",
    part2: "Alles veranderde toen er voor zijn verjaardag een glanzende ruimte-actiefiguur arriveerde die echt geloofde dat hij kon vliegen. In een vlaag van jaloezie stootte ik hem per ongeluk uit het raam.",
    part3: "Samen moesten we ontsnappen uit het huis van de sadistische buurjongen Sid, om uiteindelijk met een vuurwerkraket terug te vliegen naar de verhuiswagen van Andy.",
    character: "Woody",
    movie: "Toy Story",
    character_aliases: ["woody", "sheriff woody"],
    movie_aliases: ["toy story"]
  },
  {
    id: "diary-08",
    cat: "Disney Dagboek",
    type: "diary",
    title: "Geheim Dagboek",
    part1: "Ik ben de meest gevierde jager van dit kleine, provinciale Franse dorpje. Mijn muren hangen vol met geweien en de lokale bevolking zingt liederen over mijn dikke nek en brede schouders.",
    part2: "Ik kon het niet verdragen dat de meest belezen meid van het dorp mij afwees voor een harig monster in een kasteel. Ik smeedde een plan om haar vader op te sluiten in het gesticht om haar te dwingen met mij te trouwen.",
    part3: "Ik leidde een boze menigte met fakkels en hooivorken naar het kasteel om het beest te doden, maar gleed uiteindelijk uit en stortte in de afgrond vanaf het dak.",
    character: "Gaston",
    movie: "Beauty and the Beast",
    character_aliases: ["gaston"],
    movie_aliases: ["beauty and the beast", "belle en het beest"]
  },

  // --- CATEGORY: PICTIONARY (type: 'draw') ---
  { id: "draw-01", cat: "Pictionary", type: "draw", title: "Teken het", text: "Glazen muiltje", points: 2 },
  { id: "draw-02", cat: "Pictionary", type: "draw", title: "Teken het", text: "De theepot Mevrouw Tuit", points: 2 },
  { id: "draw-03", cat: "Pictionary", type: "draw", title: "Teken het", text: "De Muren van Agrabah", points: 2 },
  { id: "draw-04", cat: "Pictionary", type: "draw", title: "Teken het", text: "Vliegend tapijt", points: 2 },
  { id: "draw-05", cat: "Pictionary", type: "draw", title: "Teken het", text: "De spinnende tol van Maleficent", points: 2 },
  { id: "draw-06", cat: "Pictionary", type: "draw", title: "Teken het", text: "De giftige appel", points: 2 },
  { id: "draw-07", cat: "Pictionary", type: "draw", title: "Teken het", text: "De roos in de glazen stolp", points: 2 },
  { id: "draw-08", cat: "Pictionary", type: "draw", title: "Teken het", text: "Het ijskasteel van Elsa", points: 2 },
  { id: "draw-09", cat: "Pictionary", type: "draw", title: "Teken het", text: "De glazen bol van Madame Leota", points: 2 },
  { id: "draw-10", cat: "Pictionary", type: "draw", title: "Teken het", text: "De magische vishaak van Maui", points: 2 },
  { id: "draw-11", cat: "Pictionary", type: "draw", title: "Teken het", text: "Het haar van Rapunzel", points: 2 },
  { id: "draw-12", cat: "Pictionary", type: "draw", title: "Teken het", text: "De koperen vogelkooi van Jafar", points: 2 },

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
  {
    id: "estimate-07",
    cat: "Inschattingsvragen",
    type: "estimate",
    title: "Hoeveel is het?",
    text: "Hoeveel meter hoog is de attractie Hollywood Tower Hotel (Tower of Terror) in het Walt Disney Studios Park in Parijs?",
    correct_value: 56,
    unit: "meter",
    points: 2
  },
  {
    id: "estimate-08",
    cat: "Inschattingsvragen",
    type: "estimate",
    title: "Hoeveel is het?",
    text: "Hoeveel skeletten van echte mensen werden er oorspronkelijk gebruikt bij de opening van Pirates of the Caribbean in Disneyland California in 1967?",
    correct_value: 13,
    unit: "skeletten",
    points: 2
  },
  {
    id: "estimate-09",
    cat: "Inschattingsvragen",
    type: "estimate",
    title: "Hoeveel is het?",
    text: "Hoeveel verschillende riddershelmen sieren de muren van de ridderzaal in het kasteel van Doornroosje in Parijs?",
    correct_value: 10,
    unit: "riddershelmen",
    points: 2
  },
  {
    id: "estimate-10",
    cat: "Inschattingsvragen",
    type: "estimate",
    title: "Hoeveel is het?",
    text: "Hoeveel meter lang is de totale track van Big Thunder Mountain in Disneyland Paris?",
    correct_value: 1500,
    unit: "meter",
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
  {
    id: "dilemma-05",
    cat: "Dilemma",
    type: "dilemma",
    title: "Kies je kant",
    text: "In welke attractie in Disneyland Paris breng je liever 4 uur achter elkaar door?",
    optionA: "Phantom Manor (in het donker)",
    optionB: "it's a small world (met het nummer continu op herhaling)",
    points: 1
  },
  {
    id: "dilemma-06",
    cat: "Dilemma",
    type: "dilemma",
    title: "Kies je kant",
    text: "Met welke Disney-animator uit het verleden zou je liever een uur dineren?",
    optionA: "Marc Davis (ontwerper van Maleficent en Ursula)",
    optionB: "Eyvind Earle (artistiek ontwerper van Sleeping Beauty)",
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
  {
    id: "emoji-06",
    cat: "Emoji Quiz",
    type: "emoji",
    title: "Raad de Emojis",
    text: "👩‍🦰🏹🐻🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    answers: ["Brave", "Robin Hood", "Brother Bear", "The Fox and the Hound"],
    correct: 0,
    points: 2
  },
  {
    id: "emoji-07",
    cat: "Emoji Quiz",
    type: "emoji",
    title: "Raad de Emojis",
    text: "👽🌺🏝️🎸",
    answers: ["Lilo & Stitch", "Moana", "Finding Nemo", "Tarzan"],
    correct: 0,
    points: 2
  },
  {
    id: "emoji-08",
    cat: "Emoji Quiz",
    type: "emoji",
    title: "Raad de Emojis",
    text: "👑🐷🍎🧙‍♀️",
    answers: ["Snow White", "Cinderella", "Tangled", "The Black Cauldron"],
    correct: 0,
    points: 2
  },
  {
    id: "emoji-09",
    cat: "Emoji Quiz",
    type: "emoji",
    title: "Raad de Emojis",
    text: "🎪🐘🎈🦅",
    answers: ["Dumbo", "Tarzan", "The Jungle Book", "The Lion King"],
    correct: 0,
    points: 2
  },
  {
    id: "emoji-10",
    cat: "Emoji Quiz",
    type: "emoji",
    title: "Raad de Emojis",
    text: "🚂🐘🪵🤥",
    answers: ["Pinocchio", "Dumbo", "Peter Pan", "Alice in Wonderland"],
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
  {
    id: "whoami-04",
    cat: "Wie ben ik?",
    type: "whoami",
    title: "Hint Quest",
    hint1: "Mijn uiterlijk is gebaseerd op een traditionele sneeuwpop, maar ik heb takken als armen en een tandenknarsende glimlach.",
    hint2: "Ik zong enthousiast over hoe geweldig het zou zijn om de zomer te ervaren, zonder te beseffen dat ik dan smelt.",
    hint3: "Ik ben gecreëerd door Elsa en word in de film vergezeld door Anna, Kristoff en Sven.",
    answers: ["Lumiere", "Mushu", "Olaf", "Winnie"],
    correct: 2,
    points: 3
  },
  {
    id: "whoami-05",
    cat: "Wie ben ik?",
    type: "whoami",
    title: "Hint Quest",
    hint1: "Ik ben de enige in mijn Franse dorpje die blauwe kleding draagt, wat symbool staat voor hoe anders ik ben.",
    hint2: "Ik ruil mijn eigen vrijheid om het leven van mijn vader Maurice te redden uit de donkere kerker van een kasteel.",
    hint3: "Ik word verliefd op een harig, nors monster en verbreek daarmee de betovering.",
    answers: ["Aurora", "Cinderella", "Belle", "Sneeuwwitje"],
    correct: 2,
    points: 3
  },
  {
    id: "whoami-06",
    cat: "Wie ben ik?",
    type: "whoami",
    title: "Hint Quest",
    hint1: "Mijn zwarte manen en sluwe blik werden geïnspireerd door acteur Jeremy Irons en de toneelrol Claudius uit Hamlet.",
    hint2: "Ik zong het lied 'Be Prepared' om een gewelddadige staatsgreep te plannen met een leger hyena's.",
    hint3: "Ik vermoordde Mufasa door hem van de klif in de kudde gnoes te duwen en gaf Simba de schuld.",
    answers: ["Mufasa", "Scar", "Kovu", "Shere Khan"],
    correct: 1,
    points: 3
  },
  {
    id: "whoami-07",
    cat: "Wie ben ik?",
    type: "whoami",
    title: "Hint Quest",
    hint1: "Mijn naam is geïnspireerd op Apollo 11 astronaut Buzz Aldrin.",
    hint2: "Ik dacht oorspronkelijk dat ik een echte Space Ranger was van Star Command, tot ik een tv-commercial van mezelf zag.",
    hint3: "Mijn vaste kreet is 'To infinity and beyond!' en ik ben de beste vriend van sheriff Woody.",
    answers: ["Woody", "Buzz Lightyear", "Rex", "Slinky"],
    correct: 1,
    points: 3
  },
  {
    id: "whoami-08",
    cat: "Wie ben ik?",
    type: "whoami",
    title: "Hint Quest",
    hint1: "Mijn uiterlijk is getekend door animator Marc Davis, die mijn wilde bewegingen baseerde op actrice Mary Wickes.",
    hint2: "Ik rook uit een lange rode sigarettenhouder en rijd in een panter-achtige vintage auto.",
    hint3: "Ik wil een bontjas maken van de huiden van 99 gevlekte puppy's.",
    answers: ["Cruella de Vil", "Ursula", "Maleficent", "Boze Stiefmoeder"],
    correct: 0,
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
  {
    id: "fact-05",
    cat: "Feit of Fabel",
    type: "fact",
    title: "Echt of nep?",
    text: "De animatiefilm 'Bambi' was zo realistisch dat Walt Disney twee levende herten in de studio liet rondlopen zodat de animators hun anatomie konden bestuderen.",
    correct: true,
    explanation: "Feit! Twee herten genaamd Bambi en Faline leefden een tijd in de studio.",
    points: 2
  },
  {
    id: "fact-06",
    cat: "Feit of Fabel",
    type: "fact",
    title: "Echt of nep?",
    text: "In de attractie Pirates of the Caribbean in Disneyland Paris is de volgorde van de scènes bewust omgedraaid vergeleken met de Amerikaanse parken, waardoor je eerst de plunderingen ziet en daarna pas de skeletten.",
    correct: false,
    explanation: "Fabel! In Parijs begin je juist bij het fort en de skeletten, en ga je pas aan het einde terug in de tijd naar de plunderingen.",
    points: 2
  },
  {
    id: "fact-07",
    cat: "Feit of Fabel",
    type: "fact",
    title: "Echt of nep?",
    text: "De iconische stem van Stitch wordt in de originele Engelse versie ingesproken door Chris Sanders, de regisseur van de film zelf.",
    correct: true,
    explanation: "Feit! Chris Sanders schreef en regisseerde de film en sprak zelf de stem in.",
    points: 2
  },
  {
    id: "fact-08",
    cat: "Feit of Fabel",
    type: "fact",
    title: "Echt of nep?",
    text: "De film 'Sleeping Beauty' (Doornroosje) uit 1959 was zo duur om te maken dat het bijna leidde tot het faillissement van de Walt Disney Studios.",
    correct: true,
    explanation: "Feit! De film had een destijds astronomisch budget van 6 miljoen dollar en stelde teleur aan de kassa.",
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
  {
    id: "quiz-03",
    cat: "Quiz",
    type: "quiz",
    difficulty: "hard",
    title: "Moeilijke vraag",
    text: "Welke Disney-animator creëerde het uiterlijk van Maleficent en baseerde haar kleding op een middeleeuws schilderij?",
    answers: ["Marc Davis", "Eyvind Earle", "Milt Kahl", "Ollie Johnston"],
    correct: 0,
    points: 3
  },
  {
    id: "quiz-04",
    cat: "Quiz",
    type: "quiz",
    difficulty: "hard",
    title: "Moeilijke vraag",
    text: "Wat is de naam van de fictieve spoorwegmaatschappij die rijdt in Big Thunder Mountain in Disneyland Paris?",
    answers: ["Thunder Mesa Mining Co.", "Western Pacific Railroad", "Parisian Steam Transport", "Santa Fe Railway"],
    correct: 0,
    points: 3
  },
  {
    id: "quiz-05",
    cat: "Quiz",
    type: "quiz",
    difficulty: "hard",
    title: "Moeilijke vraag",
    text: "Welke Pixar-film was de allereerste die een PG-rating kreeg in de Verenigde Staten?",
    answers: ["The Incredibles", "Toy Story", "Monsters Inc.", "Finding Nemo"],
    correct: 0,
    points: 3
  },
  {
    id: "quiz-06",
    cat: "Quiz",
    type: "quiz",
    difficulty: "hard",
    title: "Moeilijke vraag",
    text: "Hoe heet het schip van Kapitein Haak in Peter Pan?",
    answers: ["The Jolly Roger", "The Black Pearl", "The Sea Witch", "The Chimera"],
    correct: 0,
    points: 3
  },
  {
    id: "quiz-07",
    cat: "Quiz",
    type: "quiz",
    difficulty: "hard",
    title: "Moeilijke vraag",
    text: "In welke bekende klassieke Disney-film horen we het nummer 'Love is a Song'?",
    answers: ["Bambi", "Cinderella", "Dumbo", "Pinocchio"],
    correct: 0,
    points: 3
  },
  {
    id: "quiz-08",
    cat: "Quiz",
    type: "quiz",
    difficulty: "hard",
    title: "Moeilijke vraag",
    text: "Welk Disney-karakter heeft het minst aantal spreekregels in een hoofdrol?",
    answers: ["Dumbo", "Aurora", "Gideon", "Wall-E"],
    correct: 1,
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
  },
  {
    id: "group-03",
    cat: "Samen",
    type: "group",
    title: "Groepsmissie",
    text: "Noem samen binnen 45 seconden tien verschillende Disney-liedjes die niet uit The Lion King of Frozen komen.",
    seconds: 45,
    points: 1
  },
  {
    id: "group-04",
    cat: "Samen",
    type: "group",
    title: "Groepsmissie",
    text: "Noem binnen 30 seconden vijf verschillende attracties in Disneyland Paris die een fastpass- of premier access-ingang hebben.",
    seconds: 30,
    points: 1
  }
];

export const PRONUNCIATION_MAP = []; // Cleaned up
