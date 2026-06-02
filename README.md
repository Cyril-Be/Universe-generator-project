# Universe Generator Project

Implémentation d'un générateur procédural de systèmes stellaires avec simulation orbitale.

## Structure

- `/data/generated-system.json` : exemple de sortie procédurale
- `/src/star.js` : modèle d'étoile et constantes physiques
- `/src/planet.js` : modèle de planète
- `/src/orbit.js` : résolution de Kepler et calcul des positions
- `/src/simulation.js` : boucle de simulation (pause, x1, x10, x100)
- `/src/stellar-distribution.js` : IMF, relations masse/luminosité/température/rayon
- `/src/planetary-distribution.js` : occurrences planétaires, orbites, atmosphères
- `/src/atmosphere-generator.js` : compositions chimiques et logique de rétention
- `/src/system-generator.js` : orchestrateur principal `generateStarSystem()`
- `/src/index.js` : exports centralisés

## Usage (ES modules)

```js
import { generateStarSystem, Simulation } from "./src/index.js";

const systemData = generateStarSystem({ seed: 42 });
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
