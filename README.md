# MLD 03 Esports website

A plain static website: no build step, no server code. Upload this whole folder to any static host.

## Folders
- `index.html` – the page layout
- `css/style.css` – all styling (colours are at the top, in `:root`)
- `js/data.js` – all-time stats (from the MLD stats tracker spreadsheet)
- `js/app.js` – menus, leaderboards, player profiles, trophies, graphs
- `images/players/` – player photos (file name = player name, e.g. `Cijin.jpg`)
- `images/trophies/` – trophy images
- `images/now/` – Season 14 / current tournament posters
- `audio/` – profile sound clips (file name = player name)

## Hosting with your own domain
Netlify, Cloudflare Pages or GitHub Pages all host this for free and let you add a custom domain.

## Online play and the Mini Games leaderboard
- `js/net.js` – shared Firebase connection (likes, game)
- `js/otf.js` – One Touch Football (online 2-player mini game)
- `js/firebase-config.js` – which Firebase project the site talks to (Firebase project "mld03")
- `js/vendor/` – the Firebase library (v10.12.2), stored here so the site does not depend on a CDN
- `firebase-rules.json` – the database rules to paste into Firebase → Realtime Database → Rules
- Testing without Firebase: open the site with `?mock=1` in two tabs of the same browser
