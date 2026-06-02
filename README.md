# Universe Generator Project

Implémentation initiale des phases 1 et 2 :

- **Phase 1** : génération d'un système stellaire réaliste au format JSON (`/data/generated-system.json`)
- **Phase 2** : moteur de simulation orbitale simplifiée et modulaire compatible web/Three.js (`/src`)

## Structure

- `/data/generated-system.json` : étoile, planètes, zones habitables, ceintures mineures
- `/src/star.js` : modèle d'étoile et constantes physiques
- `/src/planet.js` : modèle de planète
- `/src/orbit.js` : résolution de Kepler et calcul des positions
- `/src/simulation.js` : boucle de simulation (pause, x1, x10, x100)
- `/src/index.js` : exports centralisés

## Usage (ES modules)

```js
import systemData from "./data/generated-system.json" assert { type: "json" };
import { Simulation } from "./src/simulation.js";

const simulation = Simulation.fromSystemData(systemData);
simulation.setTimeScale(10);

function tick(deltaSeconds) {
  const planetStates = simulation.step(deltaSeconds);
  return planetStates;
}
```

## Consignes Copilot

Quand tu écris du code :
- garde des fichiers courts et modulaires
- commente uniquement les parties complexes
- privilégie lisibilité > optimisation
- ne change jamais toute l’architecture sans demander
- si une décision est importante, propose plusieurs options
