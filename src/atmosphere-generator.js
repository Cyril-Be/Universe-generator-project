const EARTH_ESCAPE_VELOCITY_KMS = 11.186;

const ATMOSPHERE_TEMPLATES = {
  "telluric": [
    { species: "N2", probability: 0.92, minFraction: 0.5, maxFraction: 0.9 },
    { species: "CO2", probability: 0.78, minFraction: 0.01, maxFraction: 0.4 },
    { species: "H2O", probability: 0.55, minFraction: 0.001, maxFraction: 0.08 },
    { species: "O2", probability: 0.18, minFraction: 0.05, maxFraction: 0.35 },
    { species: "CH4", probability: 0.12, minFraction: 0.0001, maxFraction: 0.03 },
    { species: "SO2", probability: 0.1, minFraction: 0.0001, maxFraction: 0.05 }
  ],
  "super-earth": [
    { species: "N2", probability: 0.7, minFraction: 0.4, maxFraction: 0.8 },
    { species: "CO2", probability: 0.62, minFraction: 0.02, maxFraction: 0.45 },
    { species: "H2O", probability: 0.6, minFraction: 0.001, maxFraction: 0.12 },
    { species: "H2", probability: 0.2, minFraction: 0.01, maxFraction: 0.2 },
    { species: "O2", probability: 0.12, minFraction: 0.04, maxFraction: 0.25 },
    { species: "CH4", probability: 0.2, minFraction: 0.0001, maxFraction: 0.05 }
  ],
  "mini-neptune": [
    { species: "H2", probability: 0.95, minFraction: 0.45, maxFraction: 0.85 },
    { species: "He", probability: 0.9, minFraction: 0.1, maxFraction: 0.5 },
    { species: "CH4", probability: 0.5, minFraction: 0.001, maxFraction: 0.08 },
    { species: "NH3", probability: 0.3, minFraction: 0.0005, maxFraction: 0.04 },
    { species: "H2O", probability: 0.4, minFraction: 0.0005, maxFraction: 0.06 }
  ],
  "ice-giant": [
    { species: "H2", probability: 0.96, minFraction: 0.4, maxFraction: 0.8 },
    { species: "He", probability: 0.9, minFraction: 0.1, maxFraction: 0.45 },
    { species: "CH4", probability: 0.75, minFraction: 0.01, maxFraction: 0.2 },
    { species: "NH3", probability: 0.52, minFraction: 0.001, maxFraction: 0.05 },
    { species: "H2S", probability: 0.25, minFraction: 0.0001, maxFraction: 0.02 }
  ],
  "neptune": [
    { species: "H2", probability: 0.96, minFraction: 0.4, maxFraction: 0.8 },
    { species: "He", probability: 0.9, minFraction: 0.1, maxFraction: 0.45 },
    { species: "CH4", probability: 0.75, minFraction: 0.01, maxFraction: 0.2 },
    { species: "NH3", probability: 0.52, minFraction: 0.001, maxFraction: 0.05 },
    { species: "H2S", probability: 0.25, minFraction: 0.0001, maxFraction: 0.02 }
  ],
  "gas-giant": [
    { species: "H2", probability: 0.99, minFraction: 0.6, maxFraction: 0.92 },
    { species: "He", probability: 0.98, minFraction: 0.08, maxFraction: 0.35 },
    { species: "CH4", probability: 0.45, minFraction: 0.0005, maxFraction: 0.03 },
    { species: "NH3", probability: 0.35, minFraction: 0.0001, maxFraction: 0.02 },
    { species: "H2O", probability: 0.25, minFraction: 0.0001, maxFraction: 0.015 }
  ]
};

const randomBetween = (rng, min, max) => min + (max - min) * rng();

const normalizeComposition = (components) => {
  const total = components.reduce((sum, item) => sum + item.fraction, 0);
  if (total <= 0) {
    return [];
  }

  return components
    .map((item) => ({ species: item.species, fraction: item.fraction / total }))
    .sort((a, b) => b.fraction - a.fraction);
};

export function estimateEscapeVelocityKmS(massEarth, radiusEarth) {
  return EARTH_ESCAPE_VELOCITY_KMS * Math.sqrt(massEarth / radiusEarth);
}

export function canRetainLightGases({ massEarth, radiusEarth, temperatureK }) {
  const escapeVelocity = estimateEscapeVelocityKmS(massEarth, radiusEarth);
  const thermalFactor = Math.sqrt(Math.max(temperatureK, 50) / 288);
  const retentionScore = escapeVelocity / (thermalFactor * 6);

  return retentionScore > 1;
}

export function generateAtmosphereComposition(
  planetType,
  { massEarth, radiusEarth, temperatureK, habitability = 0 },
  rng = Math.random
) {
  const normalizedType = String(planetType || "").toLowerCase();
  const templates = ATMOSPHERE_TEMPLATES[normalizedType] || ATMOSPHERE_TEMPLATES.telluric;
  const canRetainHydrogen = canRetainLightGases({ massEarth, radiusEarth, temperatureK });
  const components = [];

  for (const template of templates) {
    if ((template.species === "H2" || template.species === "He") && !canRetainHydrogen) {
      continue;
    }

    let probability = template.probability;
    if (template.species === "O2" && habitability > 0.65) {
      probability = Math.min(0.85, probability + 0.45 * habitability);
    }

    if (rng() <= probability) {
      components.push({
        species: template.species,
        fraction: randomBetween(rng, template.minFraction, template.maxFraction)
      });
    }
  }

  if (components.length === 0) {
    if (canRetainHydrogen) {
      components.push({ species: "H2", fraction: 0.8 }, { species: "He", fraction: 0.2 });
    } else {
      components.push({ species: "CO2", fraction: 0.7 }, { species: "N2", fraction: 0.3 });
    }
  }

  return normalizeComposition(components);
}

export const atmosphereTemplates = ATMOSPHERE_TEMPLATES;
