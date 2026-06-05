---
name: testing-universe-generator
description: Test the Universe Generator Three.js UI end-to-end. Use when verifying generated system rendering, simulation controls, regeneration, or camera focus behavior.
---

# Universe Generator UI Testing

## Devin Secrets Needed

- None. The app is local-only and does not require login or API credentials.

## Local setup

1. Install dependencies if needed:
   ```bash
   npm install
   ```
2. Start the local app:
   ```bash
   npm run dev
   ```
3. Open the Vite local URL, usually `http://localhost:5173/`, in Chrome.

## Verification commands

Run these before or after browser testing when code changed:

```bash
npm test
npm run build
```

## Browser test flow

Record the browser while testing these visible behaviors:

1. Initial render
   - The page should show a generated system title like `UGP-123456 · seed 123456`.
   - The stats panel should include `Temps simulé`, `Étoiles`, `Planètes`, `Zone habitable`, and `Limite stable primaire`.
   - The Three.js canvas should show a dark scene with at least one visible star/body label or orbit line.
2. Pause/resume
   - Click `Pause`; the button should change to `Reprendre` and the scene should remain visible.
   - Click `Reprendre`; the button should change back to `Pause` and the scene should remain visible.
3. Speed controls
   - Click `x100`, then `x1`; the rendered scene should remain visible with no blank canvas or error overlay.
   - The `Temps simulé` label is rounded to years and might stay `0.00 années` during short recordings, so do not use that text alone as proof of time advancement.
4. Regeneration
   - Click `Regénérer`; the numeric seed in the title should change and stats should remain populated.
5. Focus controls
   - Select a planet from the `Focus caméra` dropdown; the camera should move closer to that planet/label.
   - Click `Focus étoile`; the camera should return to the wider system view.

## Evidence to capture

- Full-screen recording with annotations for initial render, pause/resume, speed/regenerate, and focus.
- Screenshots for initial render, paused state, regenerated system, planet focus, and star focus.
- Browser console should be checked for unexpected runtime errors after the flow.
