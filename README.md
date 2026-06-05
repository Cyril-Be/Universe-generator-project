# Universe Generator Project

Implémentation d'un générateur procédural de systèmes stellaires avec simulation orbitale et rendu Three.js interactif.

## Structure

- `/data/generated-system.json` : exemple de sortie procédurale
- `/src/core/*` : exports de compatibilité pour la couche génération scientifique
- `/src/physics/*` : exports de compatibilité pour la couche orbitale/simulation
- `/src/render/adapters.js` : conversion unités physiques → unités visuelles Three.js
- `/src/render/three-renderer.js` : scène Three.js vanilla, caméra orbitale, sphères et orbites
- `/src/system-generator.js` : orchestrateur principal `generateStarSystem()`
- `/src/simulation.js` : API temps réel `Simulation.fromSystemData(system)`
- `/src/index.js` : exports centralisés

Les fichiers historiques à la racine de `/src` restent disponibles pour éviter de casser les imports existants.

## Application locale

```bash
npm install
npm run dev
```

Puis ouvrir l'URL Vite affichée dans le terminal.

## Usage (ES modules)

```js
import { generateStarSystem, Simulation } from "./src/index.js";

const systemData = generateStarSystem({ seed: 42 });
const simulation = Simulation.fromSystemData(systemData);
simulation.setTimeScale(10);

function tick(deltaSeconds) {
  simulation.step(deltaSeconds);
  return simulation.getState();
}
```

Le rendu peut être adapté avec :

```js
import { adaptToThreeJS } from "./src/render/adapters.js";

const renderState = adaptToThreeJS(simulation.getState(), {
  distanceScale: 20,
  timeScale: 1
});
```

## Consignes Copilot

Quand tu écris du code :
- garde des fichiers courts et modulaires
- commente uniquement les parties complexes
- privilégie lisibilité > optimisation
- ne change jamais toute l’architecture sans demander
- si une décision est importante, propose plusieurs options
