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

  return {
    name: `Companion-${index}`,
    spectralType: getSpectralTypeFromMass(massSolar, rng),
    massSolar,
    luminositySolar: getLuminosityFromMass(massSolar),
    temperatureK: getTemperatureFromMass(massSolar),
    radiusSolar: getRadiusFromMass(massSolar),
    orbit: {
      semiMajorAxisAU: randomBetween(rng, index === 1 ? 0.03 : 8, index === 1 ? 2 : 300),
      eccentricity: randomBetween(rng, 0, 0.6),
      configuration: index === 1 ? "close-binary" : "hierarchical"
    }
  };
};

const computeHabitableZone = (luminositySolar) => {
  const safeLuminosity = Math.max(luminositySolar, 0.01);
  return {
    innerAU: 1 / Math.sqrt(safeLuminosity),
    outerAU: 1.47 / Math.sqrt(safeLuminosity)
  };
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

  for (const planet of planets) {
    if (planet.semiMajorAxisAU <= 0 || planet.eccentricity >= 1 || planet.eccentricity < 0) {
      throw new Error(`Invalid orbital parameters for planet ${planet.name}`);
    }

    const bucket = Math.round(planet.semiMajorAxisAU * 1000);
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
  const primary = getRandomSpectralType(rng);
  const multiplicity = weightedChoice(rng, MULTIPLICITY_DISTRIBUTION);

  const stars = [
    {
      name: `${options.systemName || "Procedural-System"} A`,
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

  const planets = getRandomPlanetarySystem(primary.massSolar, primary.luminositySolar, rng);
  const habitableZone = computeHabitableZone(primary.luminositySolar);
  const minorBodies = buildMinorBodies(planets);

  const starSystem = {
    systemName: options.systemName || `UGP-${Math.floor(rng() * 1_000_000).toString().padStart(6, "0")}`,
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
    planets,
    minorBodies
  };

  validateSystem(starSystem);
  return starSystem;
}
