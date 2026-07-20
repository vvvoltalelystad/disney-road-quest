# Reguliere badgeafbeeldingen

De 76 badgeposities zijn al aan vaste bestandsnamen gekoppeld. Zolang een bestand ontbreekt toont de app automatisch de huidige luxe placeholder.

## Nieuwe versies aanleveren

Zet bij een bijgewerkte badge `_2`, `_3`, enzovoort direct achter het volgnummer. De import kiest per badge altijd het hoogste versienummer. Een bestand zonder achtervoegsel geldt als versie 1.

Voorbeelden:

- `adventure common-1.png` — versie 1
- `adventure common-1_2.png` — versie 2 en vervangt versie 1
- `adventure common-1_3.png` — versie 3 en vervangt alle eerdere versies

De lange omschrijving na de eerste `.png` mag blijven staan. Voer `powershell -ExecutionPolicy Bypass -File scripts/import-badges.ps1` uit om steeds de nieuwste bestanden te selecteren, optimaliseren en onder hun vaste app-naam te plaatsen.

Bestandsopbouw:

`[park]-[categorie]-[volgnummer].png`

Park:

- `disneyland` — Disneyland Park
- `adventure` — Disney Adventure World

Categorie en aantallen per park:

- `common-1.png` t/m `common-12.png`
- `uncommon-1.png` t/m `uncommon-8.png`
- `rare-1.png` t/m `rare-8.png`
- `epic-1.png` t/m `epic-6.png`
- `legendary-1.png` t/m `legendary-4.png`

Voorbeelden:

- `disneyland-common-1.png` — Main Street Station
- `disneyland-legendary-4.png` — Disneyland Park Icon
- `adventure-common-1.png` — World Premiere Entrance
- `adventure-legendary-4.png` — Disney Adventure World Icon

Aanbevolen formaat: 1200 × 1200 pixels, PNG. De volledige afbeelding wordt proportioneel in het vierkante badgevak geplaatst.
