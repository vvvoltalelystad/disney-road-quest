# Toekomstig spelersoverzicht

Deze pagina vervangt later Captain's Log en wordt per Disney-profiel opgebouwd.

## 1. Spelstatistieken

Per spel wordt getoond:

- aantal keer gespeeld;
- aantal keer gewonnen;
- aantal keer gelijkgespeeld;
- aantal keer verloren;
- eventueel beste score en laatst gespeeld.

De totalen staan op één regel per spel en zijn uitklapbaar voor afzonderlijke gespeelde partijen.

## 2. Coco Coin-overzicht

Onder de spelstatistieken komen drie exact uitgelijnde regels:

1. Verdiende Coco Coins — totaal van alle positieve mutaties;
2. Uitgegeven Coco Coins — totaal van alle negatieve mutaties;
3. Huidig saldo — verdiend minus uitgegeven, met een duidelijke scheidingslijn erboven.

`Verdiende Coco Coins` en `Uitgegeven Coco Coins` worden uitklapbare onderdelen. Na openen verschijnt de volledige mutatiehistorie van uitsluitend die categorie, nieuwste mutatie bovenaan.

## 3. Gegevensmodel

Iedere speluitslag krijgt minimaal:

- `profileKey`
- `gameId`
- `playedAt`
- `outcome`: `win`, `draw`, `loss` of `completed`
- `score`
- `opponents`
- `roomId`

Iedere Coco Coin-mutatie krijgt minimaal:

- `id`
- `profileKey`
- `createdAt`
- `amount`
- `direction`: `earned` of `spent`
- `sourceType`: spel, badgepakje, verkoop, donatie, ruil of correctie
- `gameId` indien van toepassing
- `description`
- `balanceAfter`

## 4. Migratie

De bestaande Captain's Log-mutaties worden bij invoering behouden en omgezet naar `earned` en `spent`. Er mogen bij de migratie geen Coco Coins, transacties of saldi verdwijnen.

Dit document beschrijft alleen de toekomstige uitbreiding; de huidige Captain's Log blijft voorlopig actief.
