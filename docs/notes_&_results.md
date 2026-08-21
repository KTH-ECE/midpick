# MidPick — Notes & Results

Web app that finds a fair midpoint between two or more people and shows the
places nearby. Built on the Kakao Maps API.

- **Stack:** JavaScript · HTML · CSS (no build step)
- **Run:** open `web/index.html` with VS Code Live Server
- **API key:** Kakao Maps JS key in `web/config.js` (gitignored; copy from `config.example.js`)

---

## Version history

### v1
- Finds the exact centre between **two** points.
- Auto-finds the nearest **cafes** only, within **1 km** of the midpoint.
- Search behaves like KakaoMap — any location in South Korea (streets, stations, roads…).
- Markers: start points (blue), midpoint (red), cafes (green).
- Look: blue & white, minimal text, small centred map, title + short description on top.
- *Known issue:* the exact centre can land where there's nothing nearby (e.g. middle of a forest).

### v2
- Added the **filter panel**:
  - Categories — cafe / restaurant / station (each its own colour, no overlap).
  - Slider — number of input locations (1–7).
  - Slider — search radius (1–5 km).

### v3 — current
1. **More categories (10 total)** — added convenience store, study cafe, gas/EV station, cinema & entertainment, accommodation, hospital, shopping.
2. **Copyable midpoint box** — thin box below the map shows the midpoint's address + coordinates; click to copy, with a 2-second "Copied!" popup.
3. **English by default** — all UI text in English; `html lang="en"`. *(Kakao map tiles stay Korean — the JS SDK has no English option.)*
4. **Language toggle (EN / KO)** — small pill at the top-right of the header; switches all UI text live; choice saved in `localStorage`.
5. **Custom (brand/name) search** — text box in the filter panel (e.g. "Starbucks"); keyword search around the midpoint, with or without category filters. Custom hits get a dark "Custom" marker and are de-duplicated against category results.
6. **Use my location** — a floating pill follows the focused (empty) input, sitting to its left; asks for browser permission, reverse-geocodes GPS to an address, and autofills the box. *(Needs https or localhost.)*
7. **Bias / fairness weighting** — each Point box has a weight slider with a live %; the midpoint is a weighted average, so a higher % sits closer to that person. Equal sliders (the default) give the balanced centroid.
8. **Reset actions as small icon buttons** — *Reset %*/*Clear points* (top-right of the search card) and *Untick filters* (next to the Filter heading) replace the old dedicated reset side panel; same actions, no extra full-width section to scroll past on mobile.

---

### Apps in Toss packaging
- Added `apps-in-toss/` — wraps the existing `web/` app (unchanged) as a
  `.ait` bundle for testing inside the Toss app, for early reaction/feedback
  before a real launch. Console signup, app registration, and upload/review
  still need to be done manually (needs a real Toss account).

---

## Backlog — possible improvements
- [ ] **Pin / lock locations** — a small pin on each box keeps it fixed while changing the location count; the count slider can't drop below the number of pinned boxes.
- [ ] **A few more categories** — e.g. bar, PC game room.

---

*Keep this file current: whenever a feature or improvement is added or changed,
note it under the current version (or start a new version) and tick off the
matching backlog item. Short entries — what changed, and any caveat.*
