# Reguliere badgeafbeeldingen

De 76 badgeposities zijn al aan vaste bestandsnamen gekoppeld. Zolang een bestand ontbreekt toont de app automatisch de huidige luxe placeholder.

## Nieuwe versies aanleveren

Zet bij een bijgewerkte badge `_2`, `_3`, enzovoort achter het volgnummer óf achter de volledige badgenaam. De import kiest per badge altijd het hoogste versienummer, ongeacht de wijzigingsdatum. Een bestand zonder numeriek achtervoegsel geldt als versie 1.

Voorbeelden:

- `adventure common-1.png` — versie 1
- `adventure common-1_2.png` — versie 2 en vervangt versie 1
- `adventure common-1_3.png` — versie 3 en vervangt alle eerdere versies
- `adventure common-1.png — World Premiere Entrance_4.png` — versie 4 en wordt eveneens correct herkend

De lange omschrijving na de eerste `.png` mag blijven staan. Voer `powershell -ExecutionPolicy Bypass -File scripts/import-badges.ps1` uit om steeds de nieuwste bestanden te selecteren, optimaliseren en onder hun vaste app-naam te plaatsen.

De importer accepteert zowel een spatie als een koppelteken rond categorie en volgnummer. De huidige doorlopende Legendary-reeks wordt ook ondersteund: `disneyland-legendary 1` t/m `4` gaat naar Disneyland Park en `5` t/m `8` wordt automatisch Disney Adventure World 1 t/m 4. Na iedere import wordt gecontroleerd of alle 76 vaste posities aanwezig zijn; bij een ontbrekende badge stopt het script met een duidelijke melding.

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
