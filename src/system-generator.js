import {
  getLuminosityFromMass,
  getRadiusFromMass,
  getRandomSpectralType,
  getSpectralTypeFromMass,
  getTemperatureFromMass,
  stellarImfDistribution
} from "./stellar-distribution.js";
import { getRandomPlanetarySystem, planetTypeDistribution } from "./planetary-distribution.js";

const MULTIPLICITY_DISTRIBUTION = [
  { stars: 1, probability: 0.5, label: "single" },
  { stars: 2, probability: 0.4, label: "binary" },
  { stars: 3, probability: 0.1, label: "triple" }
];
const ORBIT_COLLISION_BUCKET_SIZE_AU = 0.001;
const MIN_BINARY_SEPARATION_AU = 0.12;
const MIN_STABLE_ORBIT_MARGIN = 0.85;

const randomBetween = (rng, min, max) => min + (max - min) * rng();

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const weightedChoice = (rng, items) => {
  const total = items.reduce((sum, item) => sum + item.probability, 0);
  const target = rng() * total;
  let cumulative = 0;

  for (const item of items) {
    cumulative += item.probability;
    if (target <= cumulative) {
      return item;
    }
  }

  return items[items.length - 1];
};

const createSeededRng = (seed) => {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const buildCompanionStar = (primaryMass, index, rng) => {
  const massRatio = clamp(rng() ** 1.4, 0.08, 0.98);
  const massSolar = clamp(primaryMass * massRatio, 0.08, primaryMass);
  const isCloseCompanion = index === 1;

  return {
    name: `Companion-${index}`,
    spectralType: getSpectralTypeFromMass(massSolar, rng),
    massSolar,
    luminositySolar: getLuminosityFromMass(massSolar),
    temperatureK: getTemperatureFromMass(massSolar),
    radiusSolar: getRadiusFromMass(massSolar),
    orbit: {
      semiMajorAxisAU: randomBetween(rng, isCloseCompanion ? MIN_BINARY_SEPARATION_AU : 8, isCloseCompanion ? 4 : 300),
      eccentricity: randomBetween(rng, 0, isCloseCompanion ? 0.45 : 0.6),
      configuration: isCloseCompanion ? "primary-centered" : "hierarchical"
    }
  };
};

const computeHabitableZone = (luminositySolar) => {
  const safeLuminosity = Math.max(luminositySolar, 0.0001);
  return {
    innerAU: Math.sqrt(safeLuminosity / 1.1),
    outerAU: Math.sqrt(safeLuminosity / 0.53)
  };
};

const getPrimaryOrbitStabilityLimitAU = (stars) => {
  const primary = stars[0];
  let limit = Infinity;

  for (const companion of stars.slice(1)) {
    if (!companion.orbit) {
      continue;
    }

    const binaryAxisAU = companion.orbit.semiMajorAxisAU;
    const eccentricity = companion.orbit.eccentricity;
    const massRatio = companion.massSolar / (primary.massSolar + companion.massSolar);
    const stableFraction =
      0.464 -
      0.38 * massRatio -
      0.631 * eccentricity +
      0.586 * massRatio * eccentricity +
      0.15 * eccentricity ** 2 -
      0.198 * massRatio * eccentricity ** 2;
    const companionLimit = binaryAxisAU * Math.max(0.02, stableFraction) * MIN_STABLE_ORBIT_MARGIN;
    limit = Math.min(limit, companionLimit);
  }

  return limit;
};

const buildMinorBodies = (planets) => {
  if (!planets.length) {
    return {
      asteroidBelts: [],
      cometReservoirs: [
        {
          name: "Outer Reservoir",
          innerAU: 20,
          outerAU: 120,
          composition: ["ices", "dust", "organics"]
        }
      ]
    };
  }

  const sorted = [...planets].sort((a, b) => a.semiMajorAxisAU - b.semiMajorAxisAU);
  const rocky = sorted.filter((planet) => planet.type === "telluric" || planet.type === "super-earth");
  const giant = sorted.filter((planet) => ["gas-giant", "neptune", "mini-neptune", "ice-giant"].includes(planet.type));

  const asteroidBelts = [];

  if (rocky.length && giant.length) {
    const outerRocky = rocky[rocky.length - 1].semiMajorAxisAU;
    const innerGiant = giant[0].semiMajorAxisAU;

    if (innerGiant - outerRocky > 0.3) {
      asteroidBelts.push({
        name: "Main Belt",
        innerAU: outerRocky * 1.15,
        outerAU: innerGiant * 0.85,
        composition: ["silicates", "metals"]
      });
    }
  }

  const lastOrbit = sorted[sorted.length - 1].semiMajorAxisAU;
  const cometInner = Math.max(lastOrbit * 1.7, 12);

  return {
    asteroidBelts,
    cometReservoirs: [
      {
        name: "Outer Reservoir",
        innerAU: cometInner,
        outerAU: cometInner * 4,
        composition: ["ices", "dust", "organics"]
      }
    ]
  };
};

const validateSystem = ({ stars, planets }) => {
  const orbitSet = new Set();
  const stableOrbitLimitAU = getPrimaryOrbitStabilityLimitAU(stars);

  for (const planet of planets) {
    if (planet.semiMajorAxisAU <= 0 || planet.eccentricity >= 1 || planet.eccentricity < 0) {
      throw new Error(`Invalid orbital parameters for planet ${planet.name}`);
    }

    if (planet.semiMajorAxisAU * (1 + planet.eccentricity) > stableOrbitLimitAU) {
      throw new Error(`Planet ${planet.name} exceeds the stable primary orbit limit`);
    }

    const bucket = Math.round(planet.semiMajorAxisAU / ORBIT_COLLISION_BUCKET_SIZE_AU);
    if (orbitSet.has(bucket)) {
      throw new Error(`Orbit packing collision detected near ${planet.semiMajorAxisAU} AU`);
    }

    orbitSet.add(bucket);
  }

  if (!stars.length) {
    throw new Error("Star system must contain at least one star");
  }
};

export function generateStarSystem(options = {}) {
  const rng = Number.isInteger(options.seed) ? createSeededRng(options.seed) : Math.random;
  const generatedSystemName = Number.isInteger(options.seed)
    ? `UGP-${Math.abs(options.seed).toString().padStart(6, "0").slice(-6)}`
    : `UGP-${Math.floor(rng() * 1_000_000).toString().padStart(6, "0")}`;
  const primary = getRandomSpectralType(rng);
  const multiplicity = weightedChoice(rng, MULTIPLICITY_DISTRIBUTION);

  const stars = [
    {
      name: `${options.systemName || generatedSystemName} A`,
      spectralType: primary.spectralType,
      massSolar: primary.massSolar,
      luminositySolar: primary.luminositySolar,
      temperatureK: primary.temperatureK,
      radiusSolar: primary.radiusSolar
    }
  ];

  for (let i = 1; i < multiplicity.stars; i += 1) {
    stars.push(buildCompanionStar(primary.massSolar, i, rng));
  }

  const stableOrbitLimitAU = getPrimaryOrbitStabilityLimitAU(stars);
  const planets = getRandomPlanetarySystem(primary.massSolar, primary.luminositySolar, rng, {
    maxOrbitAU: stableOrbitLimitAU,
    maxApastronAU: stableOrbitLimitAU
  });
  const habitableZone = computeHabitableZone(primary.luminositySolar);
  const minorBodies = buildMinorBodies(planets);

  const starSystem = {
    systemName: options.systemName || generatedSystemName,
    generationModel: {
      procedural: true,
      multiplicityDistribution: MULTIPLICITY_DISTRIBUTION,
      stellarImfDistribution,
      planetTypeDistribution
    },
    stellarSystem: {
      multiplicity: multiplicity.label,
      stars
    },
    star: stars[0],
    stars,
    habitableZone,
    stability: {
      primaryOrbitLimitAU: Number.isFinite(stableOrbitLimitAU) ? stableOrbitLimitAU : null
    },
    planets,
    minorBodies
  };

  validateSystem(starSystem);
  return starSystem;
}
