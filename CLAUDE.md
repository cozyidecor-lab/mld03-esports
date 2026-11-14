# MLD 03 Esports website: notes for Claude

Live at https://www.mld03-esports.store (GitHub Pages, publishes from `main`).
Plain static site: no build step. Edit files, commit, push to `main`; live within ~2 minutes.
The owner is not technical: explain in simple words, never delete existing stats.

## Where things live
- `js/data.js`: ALL stats. `window.MLD_DATA` = `players` (career totals), `log` (one row per player per
  tournament: `[season, type, player, team, goals, rating]`), `trophies` (`[season, type, player, role, note]`),
  `awards` (per-tour Golden Boot/Ball), `seasonAwards` (season-wide), `finals` (Team Tour champ/runner rosters),
  `ballon`, `dorNominees`. Types: `T` Team Tour, `A` Solo Authentic, `D` Solo Dream Team, `C` Co-op.
- `js/app.js`: pages, menu, profiles, trophies, photos (`DEFAULT_FACE`), sounds (`AUDIO`). Phone/hardware BACK button steps
  back one level (game → card/roast → profile sheet → search overlay → menu → page → home → exit) via a single history guard + `popstate`
  + `closeTopOverlay()` reading live UI (no per-open pushState; on-screen close buttons stay in sync automatically).
- `js/compare.js`: MLD Index (sets every player's all-time rank `crk`), Compare page.
  Also the all-time tier (S 60+, A 45+, B 30+, C 15+, D below, by MLD Index), shown only on the profile.
- `js/goat.js`: MLD GOAT page. `js/tours.js`: tournament archive (`PHOTOS` for winner photos). Standings sorted by RATING (goals tiebreak); seasons newest-first. Each tour's winner card shows ITS OWN trophy via `cupOf(ty)` (Team→#t-team, Dream→#t-dream, Authentic→#t-auth, Co-op→#t-coop), not the team cup.
- Player search is ONE top overlay (`#searchov` in index.html), opened by the header search icon (`data-search`); the old "Find a player" box at the bottom of Home was removed. Input is pinned at the top with results (`#gres`, `renderGlobal`) scrolling below so the phone keyboard never covers them (overlay height tracks `visualViewport`). It always opens empty and clears on close/select (`openSearch`/`closeSearch` in app.js); opening any player calls `closeSearch()`. The random-player dice lives in this overlay.
- Tournament trophy icons (`#t-team/#t-dream/#t-auth/#t-coop` SVG symbols in `index.html`) are transparent photo cut-outs of the real MLD champion trophies in `images/trophies/` (`team-tour.webp`, `dream-trophy.webp`, `authentic-trophy.webp`, `coop-trophy.webp`). One symbol feeds the menu, home season tiles, tournament cards and profile trophy chips. If the owner sends a nicer trophy photo, just replace the matching `.webp` (keep it a trimmed transparent cut-out).
- `js/form.js`: form indicators, computed automatically from `log` (last 3 tournaments, field-position by goals+rating).
  Plus a small finish bonus (`RESULT_BONUS` from `trophies`: champion +0.10, runner-up +0.06, 3rd/4th/5th +0.03/0.02/0.01)
  so a finalist edges a non-finalist with slightly better raw stats. Form badge only; does NOT affect MLD Index/tiers.
- `js/players.js`: MLD Database page (menu: between Home and Compare; joined order by default; founder WaCky; `JOINED_IN` corrections).
- `js/funfacts.js`: Fun Facts page (menu → Extras) + "Did you know?" card on Home. Every fact (records, roasts,
  loyalty, weird) is computed from `data.js`, so new tournaments update it automatically; no manual edits needed.
  Icon: `images/fun-facts.jpg`. Roasts stay about football stats only.
- `js/card.js`: downloadable MLD player card (button on every profile). Canvas 1080×1350, colour = tier,
  big number = MLD Index; all from data, nothing to update by hand.
- `js/home.js`: Season progress at the TOP of Home (edit `SEASON_NOW` tour `stage`: index, 'done' or null; Authentic uses
  UCL stages League → Play-offs → R16 → QF → SF → Final with match-share weights), 🎲 random
  player button, copy-profile-link (links look like `/?p=Name`), toast. S-tier profiles get `.sheet.stier` gold styling.
- `js/roast.js`: 🔥 Roast button on profiles; ~27 stat-based roast templates (conditions on data.js), each tap a new one, Share.
- `js/birthday.js`: `BIRTHDAYS={Name:'MM-DD'}` (16 players so far; owner sends more). On the day: Home banner at top,
  confetti, wishes counter (`bday/{name}/{year}` in Firebase), share, tap-to-play music-box tune, 🎂 on profile.
  No "upcoming birthdays" list (owner said no).
- `js/ach-engine.js` + `js/achievements.js`: 73 achievements (49 + 16 per-format wins: 1/2/3/5 × Team Tour, Authentic, Dream Team, Co-op + 8 Manager) (menu → Hall of fame → Achievements; summary on every profile;
  admin table with `?admin=1`). Engine replays every completed tournament in order and unlocks the first time a condition
  is met (stamp = that tournament), so unlocks are permanent and recalc on data fixes. Co-op: counts for appearances/
  wins/runner-ups, never goals/ratings/awards. Rating = career score (Top Ratings formula). Season-level ones need the
  season final (S1–12 always; S13+ once `seasonAwards` has the season). d'Or editions: `editions` in evaluate (1st = S1–12).
  Co-op line-ups: `MLD_DATA.coop` [season, team, p1, p2] (end of data.js); only names in the database count.
  Managers exist ONLY from Season 12 on (S1–11 had none). Only winning managers are recorded so far (Manager Trophy / finals.mg);
  Full S12 + S13 manager lists are in data.js (`MLD_DATA.managers`, appended at the end of the file). Owner may send full lists → add
  `managers:[[season,'Team','Name'],...]` to MLD_DATA; engine uses it for appearances and finals automatically.
  Tests: run the scenario script idea in the engine comments (all 14 owner scenarios passed).
- `js/mates.js`: Teammates section on profiles (Team Tour teammates, titles together, best partnership).
- App install: `manifest.webmanifest`, `sw.js` (network-first, offline fallback), `js/pwa.js` (menu install button),
  icons `images/app-icon-*.png`, `images/apple-touch-icon.png`.
- `js/flick-engine.js` + `js/flick.js`: the only mini game, MLD Football Flick (turn-based, carrom-style).
  Played upright (no rotation); pitch 640×1180 grass with a thin red/white edge; goal = confetti poppers + cheer.
  Engine = deterministic physics (+ − × ÷ √ only, fixed steps) and the medium computer AI; same flick from same
  positions → identical result on every phone. Firebase paths under `ff/`: `players` (profile, PIN hash, w/l/m/cur/best),
  `names` (unique names), `invites` (30 s, transaction join), `rooms` (private codes), `matches` (one transaction per
  turn: checks turn number + side + positions, stores flick + before/after state), `mping` (presence), `results`
  (public results for weekly/monthly boards), `live` (matches in progress: menu badge "N matches live", Live now list on
  Mini Games, Watch), `spec/{mid}/{dev}` (spectators → 👁 N for players), `aim/{mid}` (player's aim line, sent ~8/s only
  while someone watches). Invites = small pills at the top (max 2); they also fire a PHONE notification via the service worker
  (free, no server: only while the site is open in the background; permission asked on first tap; tap the notification → `/?ffjoin=<id>`
  auto-joins; sw.js has `notificationclick`). A new live match shows a 5 s floating "Live now · Watch"
  toast (#fkLiveToast) on every page; tap = spectate. Profiles link to an MLD database player (`players/{id}/mld`, picked while
  typing the name, or asked once for older profiles); that player's photo is drawn on all 4 of their discs. Clock/turn timers use Firebase server time. CSS classes use the `fk`
  prefix (Fun Facts owns `ff*` classes). `js/net.js`: shared Firebase connection (likes + game).
  Rules: `firebase-rules.json` (owner pastes them in the Firebase console). Old games (One Touch Football, Flick,
  Turbo) and the PIN lock were removed.

## Adding a finished tournament (the usual job)
0. S14 Solo Authentic DONE (winner T-REX, runner-up Cijin; Golden Boot T-REX & Rasim tie, Golden Ball T-REX; 75 players,
   36 new added incl T-REX, Hudaifa, Sheheel, Akmar). Poster at images/tournaments/s14-solo-authentic-champion-trex.jpg
   (tours.js A:14 + top of Home). S14 Authentic log rows have no club except T-REX=Juventus (owner can send clubs later).
   PENDING: S14 Co-op/Dream Team/Team Tour still to come; add season-wide awards (seasonAwards) only when ALL four finish.
   Co-op S13 new players still only in Co-op (no individual stats): Najil, Rizan (NOT Razin), Flento, Mandhuu (Co-op "Adarsh",
   renamed; NOT the existing Adarsh). Co-op "Sahad" = Goal Wol ve; Karthik = Karthik G. Pranav S2: Italy row is Pranav, France
   row is an unknown other Pranav (owner: leave both).
1. ADD rows; never remove old ones. Append `log` rows for every player, add `trophies` (Player Trophy /
   Runner-up / Manager Trophy / places), `awards` row (Golden Boot & Ball for that tour), and for Team Tour a
   `finals` entry `{s, champ, runner, cp:[...], rp:[...], mg:[...]}`.
2. Recompute each affected player's totals in `players` from `log` + `trophies`:
   `g` goals, `t` tournaments, `r` avg rating (all), `rt`/`rd`/`ra` per type, `pt` titles, `ru` runner-ups,
   `mt` manager titles, `cs = r * ln(1 + t)`. New players get a new entry.
3. Use existing spellings of names; check for duplicates (past merges: Adil→Eleven,
   Junaid (Solo Dream Team)→Junaid Ansari; plain "Junaid" (S6) is a different person).
4. Season order is always: Authentic → Co-op → Dream Team → Team Tour.
5. When a season ends, add `seasonAwards` (season-wide Golden Boot/Ball) if given.
6. Test locally (`python3 -m http.server`, open in Playwright, check no errors), then commit and push to `main`.
