# Fitness Scorer (GitHub Pages ready)

A single‑page web app that mirrors your Xcode fitness scorer:

- Dropdowns (scroll‑wheel style) for **push‑ups**, **sit‑ups**, and **run time**.
- **CSV‑driven** scoring rules so you can match your official charts exactly.
- Live category badges: **Fit to Fight ≥ 72.0**, **Health Maintenance 60.0–71.9**, **Health Concern < 60.0**.
- **Save Score** to your browser (private), plus **Export Saved** to CSV.
- One‑screen, mobile‑friendly layout.

## Quick start

1. Upload this folder to a GitHub repo (e.g., `fitness-scorer`).
2. Commit and enable **GitHub Pages** (Settings → Pages → Deploy from branch → `/root`).
3. Visit your Pages URL and test.

## Customizing the scoring

The app reads `scores.csv` at load. You can **replace it** with your real chart or **import** a CSV at runtime using the “Import score rules (CSV)” control.

### CSV format

```
AGE,GENDER,CAT,EVENT,RESULT,SCORE
<25,MALE,MUSCULAR/UPPER BODY,1 min Push-ups,30,0.8
<25,MALE,MUSCULAR/UPPER BODY,1 min Push-ups,66,14.9
<25,MALE,MUSCULAR/UPPER BODY,1 min Push-ups,67,15.0
<25,MALE,MUSCULAR/UPPER BODY,1 min Sit-ups,30,0.8
...
<25,MALE,CARDIO,Run,780,15.0   # RESULT for Run is seconds (e.g., 13:00 = 780)
```
Rules are matched by **Age**, **Gender**, and **Event** (“1 min Push-ups”, “1 min Sit-ups”, or “Run”).

- **Reps events**: the app picks the largest `RESULT ≤ reps` and uses its `SCORE`.
- **Run**: the app picks the smallest `RESULT ≥ userSec` (slower → lower score).

> Tip: Keep one file per source (male/female/age bands) and merge them, or maintain a single master `scores.csv`.

## Saved scores (privacy)

Saved scores are stored in **localStorage** in the browser (no server). Clearing browser storage erases them. Use **Export Saved** to download a CSV backup.

## Deploy notes

- Everything is static (HTML/CSS/JS). No build step is required.
- If you change file names, update references in `index.html`.
- To keep everything on one screen, the layout is responsive and compact.

## License

MIT — modify freely for your unit/team.


## Update
- Improved matching to handle variations in EVENT names (e.g., '1.5 mile run', 'Run (1.5 mi)'), and age bands ('Under 25', '25–29', '60+').
- Auto-calculates as you change dropdowns.
