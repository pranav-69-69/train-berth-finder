# Train Berth Finder — Free Tool for Indian Train Travellers

Coach chuno, seat number likho — berth type (Lower / Middle / Upper / Side Lower / Side Upper), window ya aisle, aur poora coach 3D view mein apni berth highlighted dekho.

Live site: https://pranav-69-69.github.io/train-berth-finder/

## Covered coaches
- Sleeper (SL) — 1–80
- AC 3 Tier (3A) — 1–72
- AC 2 Tier (2A) — 1–54
- AC 3 Tier Economy / Garib Rath (3E) — 1–83
- AC Chair Car (CC) — 1–78
- Executive Chair Car (EC) — 1–56
- Second Sitting (2S) — 1–108
- First AC (1A) — not covered (cabins/coupes, no fixed pattern)

No PNR needed. No sign-up, no login, no data collected. Works offline.
Built by True Turns. Hosted free on GitHub Pages.

## Test
```bash
node -e "const CT=require('./app.js'); console.log(CT.decodeBerth('sl',41))"
```
Open `index.html?selftest=1` in a browser — the page runs its own checks and sets the
title to SELFTEST PASS / FAIL.
