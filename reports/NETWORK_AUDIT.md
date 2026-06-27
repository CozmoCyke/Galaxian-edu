# Network Audit Report — Galaxians

## Method

A headless Chromium browser (Playwright 1.61.1) was used to load the game at
`https://studio2.org.uk/c2/Galaxians/` and simulate gameplay (click to start,
movement, shooting, enemy interaction). All network requests were recorded.

## Requests Observed During Gameplay

| # | Status | Size     | URL |
|---|--------|----------|-----|
| 1 | 200    | 1.6 KB   | `https://studio2.org.uk/c2/Galaxians/` |
| 2 | 200    | 58.4 KB  | `https://studio2.org.uk/c2/Galaxians/c2runtime.js` |
| 3 | 200    | 5.3 KB   | `https://studio2.org.uk/c2/Galaxians/data.js` |
| 4 | 200    | 28.1 KB  | `https://studio2.org.uk/c2/Galaxians/jquery-2.1.1.min.js` |
| 5 | 200    | 0.1 KB   | `https://studio2.org.uk/c2/Galaxians/images/backgroundstar-sheet0.png` |
| 6 | 200    | 0.1 KB   | `https://studio2.org.uk/c2/Galaxians/images/enemyexplosion.png` |
| 7 | 200    | 0.1 KB   | `https://studio2.org.uk/c2/Galaxians/images/launchcollider-sheet0.png` |
| 8 | 200    | 0.1 KB   | `https://studio2.org.uk/c2/Galaxians/images/marker-sheet0.png` |
| 9 | 200    | 0.6 KB   | `https://studio2.org.uk/c2/Galaxians/images/player-sheet0.png` |
| 10| 200    | 0.1 KB   | `https://studio2.org.uk/c2/Galaxians/images/playerbullet-sheet0.png` |
| 11| 200    | 0.1 KB   | `https://studio2.org.uk/c2/Galaxians/images/playerexplosion.png` |
| 12| 200    | 65.9 KB  | `https://studio2.org.uk/c2/Galaxians/images/scorelabel.png` |
| 13| 200    | 0.5 KB   | `https://studio2.org.uk/c2/Galaxians/images/ship1-sheet0.png` |
| 14| 200    | 0.6 KB   | `https://studio2.org.uk/c2/Galaxians/images/ship2-sheet0.png` |
| 15| 200    | 0.5 KB   | `https://studio2.org.uk/c2/Galaxians/images/ship3-sheet0.png` |
| 16| 200    | 0.5 KB   | `https://studio2.org.uk/c2/Galaxians/images/ship4-sheet0.png` |
| 17| 200    | 9.2 KB   | `https://studio2.org.uk/c2/Galaxians/loading-logo.png` |
| 18| 200    | 29.6 KB  | `https://studio2.org.uk/c2/Galaxians/media/attack.ogg` |
| 19| 200    | 88.2 KB  | `https://studio2.org.uk/c2/Galaxians/media/longexplode.ogg` |
| 20| 200    | 9.7 KB   | `https://studio2.org.uk/c2/Galaxians/media/shoot.ogg` |
| 21| 200    | 11.1 KB  | `https://studio2.org.uk/c2/Galaxians/media/shortexplode.ogg` |

**Total: 21 requests, all returned HTTP 200 (OK).**

## Domain Summary

- `studio2.org.uk`: 21 requests

No cross-origin or third-party requests were made.

## Offline Functionality Proof

All resources listed above are now stored locally:

- **Original files** → `C:\dev\galaxian-edu\original\` (exact copies)
- **Working copies** → `C:\dev\galaxian-edu\app\` (with minor path corrections)

The game runs entirely from the local HTTP server at `http://127.0.0.1:8080/` and
requires no Internet connection after the initial download.

## Static Files Not Dynamically Requested

The following files are referenced in the HTML but were not re-requested during
gameplay (they are static manifests/icons):

- `offline.appcache`
- `appmanifest.json`
- `sw.js`
- `icon-16.png`
- `icon-32.png`
- `icon-114.png`
- `icon-128.png`
- `icon-256.png`

These have also been downloaded and stored locally.

## Files Not Retrieved

None. All 33 files were successfully downloaded (100% success rate).
