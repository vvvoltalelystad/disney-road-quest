# Disney Road Quest - Multiplayer Edition 🚗✨

Dit is een real-time multiplayer-versie van **Disney Road Quest (Versie 8)**, herbouwd met **Vite + React** en **Supabase Realtime**.

In plaats van één telefoon door te geven in de auto, kan iedereen nu op zijn eigen telefoon spelen!

---

## 🛠️ Installatie & Setup

### 1. Supabase Database opzetten
Je hebt een Supabase-account nodig om het spel live te synchroniseren.
1. Log in op het [Supabase Dashboard](https://supabase.com).
2. Maak een nieuw project aan (gratis).
3. Ga in het linkermenu naar de **SQL Editor** en klik op **New Query**.
4. Kopieer de inhoud van het bestand `supabase_setup.sql` uit dit project en plak dit in de SQL Editor.
5. Klik rechtsonder op **Run**. Dit maakt de benodigde tabellen (`rooms`, `players`, `score_history`) aan en activeert de real-time synchronisatie.

### 2. Inloggegevens koppelen (.env)
1. Ga in Supabase naar **Project Settings** > **API**.
2. Kopieer je **Project URL** and de public **anon API Key**.
3. Maak in deze projectmap een nieuw bestand aan genaamd `.env` (of kopieer `.env.example`).
4. Plak de waarden in het bestand:
   ```env
   VITE_SUPABASE_URL=https://jouw-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=jouw-anon-public-api-key
   ```

### 3. Lokaal starten
Zodra de dependencies zijn geïnstalleerd, start je de lokale server:
```bash
npm run dev
```
Open de getoonde link (meestal `http://localhost:5173`) in je browser. Je kunt meerdere tabbladen openen om de multiplayer-verbinding te testen!

---

## 🚀 De App Hosten (Gratis)

Omdat de app volledig static is (de database-verbinding loopt direct via de browser naar Supabase), kun je de app gratis hosten.

### Optie 1: GitHub Pages (Aanbevolen, Geen limieten)
1. Maak een nieuwe repository aan op GitHub (bijv. `disney-road-quest`).
2. Koppel deze lokale map aan je GitHub repo en push je code.
3. Installeer het `gh-pages` pakket:
   ```bash
   npm install gh-pages --save-dev
   ```
4. Voeg de volgende scripts toe aan je `package.json`:
   ```json
   "predeploy": "npm run build",
   "deploy": "gh-pages -d dist"
   ```
5. Voeg je homepage toe aan `package.json`:
   ```json
   "homepage": "https://<jouw-github-gebruikersnaam>.github.io/disney-road-quest"
   ```
6. Run `npm run deploy` om je site direct gratis online te zetten!

### Optie 2: Netlify (Via Git of handmatige upload)
* Koppel je GitHub repository in Netlify als een nieuwe site.
* **Build command**: `npm run build`
* **Publish directory**: `dist`
* Netlify bouwt en host je app automatisch.
