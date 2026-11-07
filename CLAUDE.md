# MLD 03 Esports website: notes for Claude

Live at https://www.mld03-esports.store (GitHub Pages, publishes from `main`).
Plain static site: no build step. Edit files, commit, push to `main`; live within ~2 minutes.
The owner is not technical: explain in simple words, never delete existing stats.

## Where things live
- `js/data.js`: ALL stats. `window.MLD_DATA` = `players` (career totals), `log` (one row per player per
  tournament: `[season, type, player, team, goals, rating]`), `trophies` (`[season, type, player, role, note]`),
  `awards` (per-tour Golden Boot/Ball), `seasonAwards` (season-wide), `finals` (Team Tour champ/runner rosters),
  `ballon`, `dorNominees`. Types: `T` Team Tour, `A` Solo Authentic, `D` Solo Dream Team, `C` Co-op.
- `js/app.js`: pages, menu, profiles, trophies, photos (`DEFAULT_FACE`), sounds (`AUDIO`).
- `js/compare.js`: MLD Index (sets every player's all-time rank `crk`), Compare page.
- `js/goat.js`: MLD GOAT page. `js/tours.js`: tournament archive (`PHOTOS` for winner photos).
- `js/form.js`: form indicators, computed automatically from `log`.
- `js/players.js`: All MLD Players (founder WaCky; `JOINED_IN` corrections).
- `js/flick.js`, `js/turbo.js`, `js/net.js`: mini games (locked behind an admin PIN; ask the owner). Firebase settings in `js/firebase-config.js`.
- Unfinished online-Flick fix is on branch `online-fix` (not merged).

## Adding a finished tournament (the usual job)
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
