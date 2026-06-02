import { generateAtmosphereComposition } from "./atmosphere-generator.js";

const PLANET_TYPE_WEIGHTS = [
  {
    type: "telluric",
    probability: 0.42,
    massRange: [0.1, 1.8],
    radiusRange: [0.45, 1.25],
    eccentricityRange: [0.0, 0.2]
  },
  {
    type: "super-earth",
    probability: 0.32,
    massRange: [1.8, 8],
    radiusRange: [1.1, 1.9],
    eccentricityRange: [0.0, 0.18]
  },
  {
    type: "mini-neptune",
    probability: 0.15,
    massRange: [4, 14],
    radiusRange: [1.8, 3.2],
    eccentricityRange: [0.01, 0.22]
  },
  {
    type: "neptune",
    probability: 0.09,
    massRange: [12, 35],
    radiusRange: [3.0, 4.8],
    eccentricityRange: [0.01, 0.25]
  },
  {
    type: "gas-giant",
    probability: 0.02,
    massRange: [35, 600],
    radiusRange: [7, 15],
    eccentricityRange: [0.01, 0.35]
  }
];
const EARTH_EQUILIBRIUM_TEMP_K = 278;
const BOX_MULLER_EPSILON = 1e-12;
const COMPRESSION_START_MASS_EARTH = 2;
const MAX_COMPRESSION_FACTOR_BONUS = 0.35;
const COMPRESSION_LOG_SCALE = 0.2;
const INNER_ORBIT_MASS_SCALING = 0.02;
const TWO_PI = 2 * Math.PI;
const PLANET_NAME_SYLLABLES = [
  "Ar",
  "Bel",
  "Cae",
  "Dor",
  "El",
  "Fen",
  "Ga",
  "Hel",
  "Io",
  "Ka",
  "Ly",
  "Mor",
  "Ny",
  "Or",
  "Pra",
  "Qua",
  "Ry",
  "Sol",
  "Tor",
  "Vel",
  "Wy",
  "Xa",
  "Yl",
  "Zen"
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

const randomLogNormal = (rng, mean = 0, sigma = 0.4) => {
  const u1 = Math.max(rng(), BOX_MULLER_EPSILON);
  const u2 = rng();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.exp(mean + sigma * z0);
};

const estimateRadiusFromMass = (type, massEarth, rng) => {
  switch (type) {
    case "telluric":
      return clamp(massEarth ** 0.28 * randomBetween(rng, 0.92, 1.08), 0.4, 1.6);
    case "super-earth":
      return clamp(1 + (massEarth - 1) ** 0.22 * randomBetween(rng, 0.95, 1.08), 1.1, 2.1);
    case "mini-neptune":
      return clamp(1.6 + massEarth ** 0.18 * randomBetween(rng, 0.9, 1.08), 1.8, 3.4);
    case "neptune":
      return clamp(2.6 + massEarth ** 0.16 * randomBetween(rng, 0.9, 1.06), 3.0, 5.0);
    case "gas-giant":
    default:
      return clamp(7.2 + Math.log10(massEarth) * randomBetween(rng, 0.8, 1.25), 7, 15.5);
  }
};

const calculateDensityGcm3 = (massEarth, radiusEarth) => {
  const earthDensity = 5.51;
  const compressionFactor =
    massEarth > COMPRESSION_START_MASS_EARTH
      ? 1 + Math.min(MAX_COMPRESSION_FACTOR_BONUS, Math.log10(massEarth) * COMPRESSION_LOG_SCALE)
      : 1;
  return clamp((earthDensity * massEarth * compressionFactor) / (radiusEarth ** 3), 0.2, 20);
};

const calculateEquilibriumTemperature = (starLuminositySolar, semiMajorAxisAU) => {
  const safeAxis = Math.max(semiMajorAxisAU, 0.03);
  return EARTH_EQUILIBRIUM_TEMP_K * (starLuminositySolar ** 0.25) / Math.sqrt(safeAxis);
};

const calculateHabitabilityScore = ({ type, massEarth, semiMajorAxisAU, starLuminositySolar }) => {
  const flux = starLuminositySolar / (semiMajorAxisAU ** 2);
  const fluxScore = Math.exp(-Math.abs(1 - flux) * 2.2);
  const massScore = Math.exp(-Math.abs(1 - massEarth) * 0.55);
  const typeModifier = type === "telluric" || type === "super-earth" ? 1 : 0.2;
  return clamp(fluxScore * massScore * typeModifier, 0, 1);
};

const makePlanetName = (index) => {
  const first = PLANET_NAME_SYLLABLES[index % PLANET_NAME_SYLLABLES.length];
  const second =
    PLANET_NAME_SYLLABLES[(index * 7 + 3) % PLANET_NAME_SYLLABLES.length].toLowerCase();
  return `${first}${second}`;
};

export function getRandomPlanetType(rng = Math.random) {
  const selected = weightedChoice(rng, PLANET_TYPE_WEIGHTS);
  const massEarth = randomBetween(rng, selected.massRange[0], selected.massRange[1]);
  const radiusEarth = clamp(
    estimateRadiusFromMass(selected.type, massEarth, rng),
    selected.radiusRange[0],
    selected.radiusRange[1]
  );

  return {
    type: selected.type,
    massEarth,
    radiusEarth,
    eccentricityRange: selected.eccentricityRange
  };
}

export function generateOrbits(planetTypes, starMass, rng = Math.random) {
  const baseInnerAU = clamp(0.03 + (1 / Math.max(starMass, 0.08)) * INNER_ORBIT_MASS_SCALING, 0.03, 0.2);
  const orbits = [];

  let currentAxis = baseInnerAU * randomBetween(rng, 0.9, 1.4);
  for (let i = 0; i < planetTypes.length; i += 1) {
    const packingFactor = randomBetween(rng, 1.25, 2.25);
    currentAxis *= packingFactor;
    currentAxis *= randomLogNormal(rng, 0, 0.18);
    currentAxis = Math.max(currentAxis, baseInnerAU + i * 0.04);
    orbits.push(currentAxis);
  }

  return orbits.sort((a, b) => a - b);
}

export function generateAtmosphere(planetType, mass, temperature, radius = 1, habitability = 0, rng = Math.random) {
  return generateAtmosphereComposition(
    planetType,
    {
      massEarth: mass,
      radiusEarth: radius,
      temperatureK: temperature,
      habitability
    },
    rng
  );
}

export function getRandomPlanetarySystem(starMass, starLuminosity, rng = Math.random) {
  const baselineCount = 3.5 * Math.max(0.6, Math.min(1.8, starMass ** 0.35));
  const count = clamp(Math.round(baselineCount + randomBetween(rng, -2, 2)), 0, 14);
  if (count === 0) {
    return [];
  }

  const rawPlanets = Array.from({ length: count }, () => getRandomPlanetType(rng));
  const orbits = generateOrbits(rawPlanets, starMass, rng);

  return rawPlanets.map((planetData, index) => {
    const semiMajorAxisAU = orbits[index];
    const estimatedTemperatureK = calculateEquilibriumTemperature(starLuminosity, semiMajorAxisAU);
    const eccentricity = randomBetween(
      rng,
      planetData.eccentricityRange[0],
      planetData.eccentricityRange[1]
    );
    const habitability = calculateHabitabilityScore({
      type: planetData.type,
      massEarth: planetData.massEarth,
      semiMajorAxisAU,
      starLuminositySolar: starLuminosity
    });

    return {
      name: makePlanetName(index),
      type: planetData.type,
      massEarth: planetData.massEarth,
      radiusEarth: planetData.radiusEarth,
      densityGcm3: calculateDensityGcm3(planetData.massEarth, planetData.radiusEarth),
      semiMajorAxisAU,
      eccentricity,
      atmosphere: generateAtmosphere(
        planetData.type,
        planetData.massEarth,
        estimatedTemperatureK,
        planetData.radiusEarth,
        habitability,
        rng
      ),
      estimatedTemperatureK,
      habitability,
      initialMeanAnomaly: randomBetween(rng, 0, TWO_PI),
      inclinationDeg: randomBetween(rng, 0, 7),
      longitudeAscendingNodeDeg: randomBetween(rng, 0, 360),
      argumentOfPeriapsisDeg: randomBetween(rng, 0, 360)
    };
  });
}

export const planetTypeDistribution = PLANET_TYPE_WEIGHTS.map(({ type, probability }) => ({
  type,
  probability
}));
