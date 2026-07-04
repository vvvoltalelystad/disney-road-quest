# Disney Music Quest Multiplayer – installatie

Deze versie is een aparte multiplayer-webapp voor **Wendy, Remi en Taran**.  
Iedere speler opent dezelfde Netlify-site op de eigen telefoon.

## Wat werkt al

- spelkamer aanmaken met een zescijferige/lettercode;
- deelnemen via code of gedeelde link;
- live zien wie online is;
- exact drie spelers;
- één speler claimt de afspeelbeurt;
- de claimknop wordt direct bij de andere spelers geblokkeerd;
- alleen de claimant kan bevestigen: **De song wordt afgespeeld**;
- pas daarna worden de antwoordvelden op alle telefoons geopend;
- live zien wie wel en niet geantwoord heeft;
- onthullen zodra alle drie antwoorden binnen zijn;
- automatische beoordeling met tolerantie voor kleine typefouten;
- iedere speler controleert en bevestigt de eigen punten;
- andere spelers zien wie punten heeft gekregen;
- iedere speler rondt de ronde zelf af;
- pas als iedereen klaar is verschijnt de tussenstand;
- de spelleider start daarna de volgende song;
- Spotify-codeafbeelding óf automatisch gegenereerde QR-code van een Spotify-link;
- beheerpagina voor Song 01 t/m Song 60.

## Stap 1 – Supabase-project maken

1. Maak een gratis Supabase-project.
2. Open **Authentication → Providers → Anonymous Sign-Ins** en schakel anoniem in.
3. Open **SQL Editor**.
4. Open `supabase_setup.sql`.
5. Vervang bovenin `CHANGE-ME-4827` door een eigen beheer-PIN.
6. Voer het volledige SQL-bestand uit.

## Stap 2 – Projectgegevens invullen

Open in Supabase:

**Project Settings → Data API / API**

Kopieer:

- Project URL;
- public anon key / publishable key.

Open daarna `config.js` en vervang:

```js
SUPABASE_URL: "VUL_HIER_JE_SUPABASE_PROJECT_URL_IN",
SUPABASE_ANON_KEY: "VUL_HIER_JE_SUPABASE_ANON_KEY_IN",
```

Gebruik hier alleen de publieke anon/publishable key, nooit de service-role key.

## Stap 3 – Naar Netlify uploaden

1. Pak het ZIP-bestand uit.
2. Open je Netlify-project of maak een nieuwe site.
3. Sleep **de volledige uitgepakte map** naar de deployzone.
4. Open de nieuwe `netlify.app`-link op de drie telefoons.

## Stap 4 – Songs instellen

Open in de app **Songbeheer** en voer je beheer-PIN in.

Per song vul je in:

- officiële titel;
- film;
- filmjaar;
- uitvoerder;
- Spotify-deellink;
- eventueel URL van een echte Spotify-codeafbeelding;
- Nederlandse/Engelse alternatieve antwoorden;
- vinkje om de song te activeren.

Wanneer alleen een Spotify-deellink is ingevuld, maakt de app automatisch een gewone QR-code.  
Die kan met een aparte telefoon worden gescand en opent het nummer in Spotify.

## Playlistvolgorde

Maak in Spotify één privéplaylist met exact dezelfde volgorde als in de app:

- Song 01 = eerste nummer in de playlist;
- Song 02 = tweede nummer;
- enzovoort.

De echte Spotify-titel blijft in Spotify zichtbaar. Gebruik daarom bij voorkeur een apart afspeeltoestel.

## Testprocedure

1. Open de app op drie verschillende telefoons.
2. Maak op één telefoon een kamer.
3. Laat de andere twee deelnemen.
4. Controleer of alle drie als online verschijnen.
5. Start een game van vijf songs.
6. Test expres dat twee spelers tegelijk op **Ik speel deze song af** drukken.
7. Er mag maar één claim worden geaccepteerd.
8. Test een typefout en wijzig de voorgestelde punten.
9. Controleer of de tussenstand pas verschijnt nadat iedereen de ronde heeft afgerond.

## Belangrijk

Deze multiplayer-app heeft tijdens het spelen internet nodig. De muziek zelf kan vooraf in Spotify worden gedownload.
