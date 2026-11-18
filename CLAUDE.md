# MLD 03 Esports website: notes for Claude

Live at https://www.mld03-esports.store (GitHub Pages, publishes from `main`).
Plain static site: no build step. Edit files, commit, push to `main`; live within ~2 minutes.
The owner is not technical: explain in simple words, never delete existing stats.

## MLD D'or is SECRET (owner's rule — do not break)
The MLD D'or is awarded every 3 seasons (next edition = S13+S14+S15). Its standings are a SURPRISE revealed only at a
ceremony after the final season: top 30 revealed 10/day, then a top-5 vote, then the winner. So UNLIKE every other
leaderboard (Top Ratings/Scorers etc. are public and live), a D'or RACE must NEVER be shown publicly. Only a FINISHED,
already-revealed edition may be public: the 1st edition (S1–12, winner Midhun, `dorNominees`) stays as-is on the public
`mld-dor` page. For S13–15 and future editions, compute standings ONLY in an admin-only view (gated like achievements'
`?admin=1`), never on any public page, until the owner reveals them. D'or points = performance score 80% + jury vote 20%
(jury vote only exists at ceremony time). When in doubt, keep it hidden and ask the owner.

## MLD D'or page structure + owner gate
The `mld-dor` page (app.js) is a LANDING with two edition cards (`dorEd` state: null=landing, 1, 2):
- 1st MLD D'or (S1–12): finished, public. `dorEdition1()` = Midhun + `nomineesBlock()` (unchanged content).
- 2nd MLD D'or (S13–15): LOCKED to everyone except the owner. Public sees a grey `.dored.locked` card; tapping it shows
  the red `.dorlockmsg` ("Not enough data yet") and nothing else. The owner sees `.dored.live` → `dorEdition2()` which
  renders `window.DOR.standings()` from **`js/dor.js`** — the REAL MLD Ballon d'Or formula (NOT data.js). Menu lead is
  "All MLD D'or winners".
`js/dor.js` holds the D'or's OWN authoritative logs (separate from data.js so it always matches WaCky's Excel): `LOG`
  (individual-stat tournament rows `[type,player,goals,rating]`), `CH` (championship points `[format,player,result,points]`),
  `AW` (award points `[tournament,award,player,points]`). Performance Score /80 = 5 categories each scored RELATIVE TO THE
  CATEGORY LEADER (value÷leader×weight): Goals 25, Rating 20 (= avg rating × ln(1+tours)), Championships 20, Awards 10,
  Longevity 5. Co-op excluded from goals/rating/longevity but its championship points count. Jury vote /20 (top 5 only) +
  S15 added at the ceremony — not in the engine yet. VALIDATED: reproduces WaCky's exact S13 scores (Ashik 80, Senpai
  54.68, Farza 54.33, Rasim 52.79, Rashid 49.73, Vishnu 48.51, …). Champ points by format: Swiss 10/8/6/4/2 · League
  8/6/4/2 · Rounds+KO 8/5 · Team Tour 5/3 (every squad player) · Co-op 2/1. Awards: Top Scorer/MOTT 1 each, season Golden
  Boot/Ball 3 each. Champ points by format: Swiss 10/8/6/4/2 · League 8/6/4/2 · Rounds+KO 8/5 · UCL 10/8 (winner/runner-up
  only, owner's call) · Team Tour 5/3 · Co-op 2/1. To add a tour: append rows to LOG/CH/AW (ask WaCky for the FORMAT — it sets
  the champ points). CONFIRMED: Derry MERGED into Vishnu; 'Junaid' (Team Tour) = Junaid Ansari. Engine now runs THROUGH
  S14 Solo Authentic (UCL): T-REX champion (10), Cijin runner-up (8), Top Scorer T-REX & Rasim (1 each), MOTT T-REX (1);
  current top: Ashik 76.7, Rasim 61.7, Senpai 53.9. STILL PENDING: S14 Co-op / Dream Team / Team Tour (need format +
  results for each). The D'or uses its own names (Fahiz, Sabith J R, Husnu… may not be in data.js); Manager Trophies
  NEVER count in the D'or.
Owner gate (app.js, top): `isOwner()` reads localStorage `mld_owner==='1'`. Owner unlocks a phone ONCE by opening
`?owner=<key>` (hash checked against `OWNER_HASH`, then the param is stripped from the URL); `?owner=off` clears it.
Only the key's SHA-256 hash is in the repo — the plain key is given to WaCky privately, never committed. To rotate: run
`node -e 'c=require("crypto");k=c.randomBytes(9).toString("base64url");console.log(k, c.createHash("sha256").update(k).digest("hex"))'`,
put the hash in `OWNER_HASH`, send WaCky the new `?owner=<key>` link. NOT security-grade (static site: the data feeding
the standings is public), but it keeps the standings off every normal member's screen. Never show the D'or race publicly.

## Member login (js/auth.js) — Phase 1 done
Database players log in with a password (WaCky gives each person theirs privately on WhatsApp) to prove identity — this
will gate the planned MLD Flick weekly challenge and (Phase 2) let members set their own photo. Non-members use the whole
site without logging in. Header has a profile icon (`#authBtn`, added in index.html next to search): logged out → login
modal (`#authModal`); logged in → shows the player's photo, taps to a RIGHT-SIDE account panel (`.authmodal.side` → `.authpanel` in auth.js
`openAccount`): photo + name, "View my full profile" (→ `openPlayer`), quick stat tiles (rank/goals/rating/trophies/
runner-up/tours from `byName`), achievement progress (`MLDach.panelHtml(n)` = X/total bar + 3 "closest to unlocking"
mini progress bars), and Log out at the bottom. "See all achievements" reuses the `data-acview` handler. NOTIFICATIONS
(auth.js): between "View my full profile" and the stat tiles sits a `.apnotifs` section listing `NOTIFS` (an array of
announcement cards — first is the ₹25 Flick challenge). A member with an unopened notification gets a red dot on their
profile icon (`#authBtn.hasnotif::after`); read state is per-device in localStorage `mld-notif-read`. Tapping a card
(`data-notifopen`) marks it read (`markRead` → `paintBtn` removes the dot once ALL are read; a still-pending one keeps it)
and runs its `action` — `flick-event` closes the panel and calls `FF.openEvent()`. To SEND A NEW UPDATE: append one more
object to `NOTIFS` with a NEW `id` (keep the old ones); everyone's dot lights up until they open it. Self-serve photo editing
was DROPPED (owner's call — moderation risk of random uploads); members still send WaCky a photo on WhatsApp and it's
added to DEFAULT_FACE. Login flow: type name → pick from DATABASE autocomplete (can't free-type a name) → password. Session saved
in localStorage `mld-login` `{id,name}`; `window.MLDAUTH` = {me,isMember,open,close}; fires `mld-auth` event on change.
Security (friendly-group grade, no server): password hash = PBKDF2-SHA256, 210k iters, salt `mld03-login-v1`. Hashes live
in Firebase `secret/{id}` which the rules make `.read:false` (can't be downloaded/cracked). `verify()` in auth.js: if the
secret is readable (test mode/mock) it compares directly; if read-blocked it proves the password by a validated write to
`login/{id}/{dev}` (rule accepts only when the hash matches the read-blocked secret). If a player's secret is missing,
login FAILS (no false logins). `id` = `NET.keyOf(name)`. Passwords are easy-to-type (e.g. `iron-black-43`); the full list
is NOT in the repo — it's generated and handed to WaCky as a private Excel/PDF. To add a new player's login: PATCH
`secret/{id}={h}` (rule allows create-only, `!data.exists()`), and give WaCky the password. `NET.get/set/on` (net.js) are
generic helpers for this. SETUP WaCky must do once: (1) paste the updated firebase-rules.json in the Firebase console
(adds the read-blocked `secret` + validated `login` rules AND deploys the pending game rules / closes test mode).
PRESENCE (js/online.js): each visit writes `presence/{deviceId}={t, n?}` (n = the logged-in member's name). Online means
app OPEN + FOREGROUND: a heartbeat updates `t` every BEAT (20s); readers count only entries whose `t` is within STALE
(75s), so a backgrounded/closed/crashed visit drops off even if Firebase `onDisconnect` never fired (the old bug: a
person stayed "online" for an hour). `visibilitychange` (hidden) / `pagehide` / `beforeunload` remove the entry at once,
and a local timer re-ages the list every 20s. Exposes
`window.isOnline(name)` + a `mld-online` event + `MLDonline()` = {count, names, guests}. The top online pill (tap it) opens
a minimal who's-online popover (member names + green dots + "N guests"); a profile shows a green dot by the name when that
player is online (`[data-profdot]` in openPlayer). auth.js fires `mld-auth` at init so presence gets the name. No rule
change (presence rule only checks `t`). Flick leaderboard (flick.js `boardScreen`): shows a green dot if `isOnline(mld)`.
The BOLD-for-logged-in-members was REMOVED (owner's call — he didn't want it). But `auth.js linkFlick` STILL sets
`ff/players/{ffid}/verified=true` on an actual password login (and `loadPlayers()` maps `verified`): this is the
"is a logged-in member" flag the ₹25 WEEKLY FLICK CHALLENGE uses to count only member-vs-member matches.
Already seeded: all 196 players' hashes are in Firebase `secret/`. Rules PUBLISHED by WaCky (test mode closed, secret
read-blocked). ₹25 WEEKLY CHALLENGE (DONE, flick.js `eventScreen`): a SEPARATE event leaderboard, decorated as an event
(gold/red hero, `EVENT` ribbon, big ₹25, live weekly countdown `#ffEvCd` via `startEvCd`/`fmtLeft`/`weekEnd`). It is
COMPUTED from `ff/results` this week, filtered to matches where BOTH ids have `verified=true` — so nothing extra is
written: member-vs-member matches already count on the normal board AND show here; non-member matches stay normal-only,
exactly as asked. Score = wins, but beating the SAME member counts at most `EVENT_CAP`=3 times (fairness for the real
money); tiebreak = distinct members beaten. Reached from a gold `.fkbtn.event` banner on the Flick home (above PLAY
ONLINE), from the account-panel notification, or directly via `FF.openEvent()`. The owner gives ₹25 to the top name each
week (manual payout). NO Firebase rule change (reuses `ff/results`). NEXT (still TBD with owner): direct Flick challenge.
Photo editing
dropped. Other logged-in features TBD with owner (ideas floated: predictions game, in-site D'or jury vote, direct Flick
challenges).

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
  confetti, "Send wishes" + live count (`bday/{name}/{year}` = `{n, by}` in Firebase), share, tap-to-play music-box tune,
  🎂 on profile. WHO-WISHED: each wish stores the wisher in `by` — a LOGGED-IN member's wish is `by/{m:id}=name` (so the
  birthday person sees who it was), a not-logged-in wish is `by/{deviceId}=true` (counts, stays anonymous); one wish per
  member/device. A "see who wished →" strip on the banner opens a list of named wishers + "N friends not logged in"
  (`openWishers`). Uses `NET.txn`/`NET.on` so it also works in `?mock=1`. Test with `?bdaytest=MM-DD`. No Firebase rule
  change needed (the `bday` rule only requires `n` to increment, which the wish still does). No "upcoming birthdays" list.
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
  Goal is awarded when the ball's CENTRE crosses the goal line (≈50% of the ball over), not the whole ball
  (flick-engine.js `simulate`) — fixes a ball getting stuck half-inside where a disc just bounces off it.
  Pitch sizing (flick.js `size()`): `PADX=86` makes the pitch WIDTH set the scale → a real side gutter (~44px) to pull
  back from left/right edge discs; `OY_TOP=0.34` biases the pitch UP so most of the freed vertical space becomes bottom
  room (~156px) where you pull back from your own discs. `toScreen`/`toField` both use `V.oy`, so the drag stays aligned.
  Owner (WaCky) tuned this to a drawn outline; if asked to loosen edge-dragging further, also reducing the pull distance
  for full power in `shotFromAim` (the `/230`) is the other lever (changes feel for everyone, so ask first).
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
