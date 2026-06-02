const IMF_WEIGHTS = [
  { spectralClass: "M", probability: 0.76, massRange: [0.08, 0.6] },
  { spectralClass: "K", probability: 0.12, massRange: [0.6, 0.9] },
  { spectralClass: "G", probability: 0.07, massRange: [0.9, 1.1] },
  { spectralClass: "F", probability: 0.03, massRange: [1.1, 1.4] },
  { spectralClass: "A", probability: 0.009, massRange: [1.4, 2.1] },
  { spectralClass: "B", probability: 0.0009, massRange: [2.1, 16] },
  { spectralClass: "O", probability: 0.0001, massRange: [16, 60] }
];

const SOLAR_TEMPERATURE_K = 5772;
const UNIFORM_BIAS = 1;
const LOWER_MASS_BIAS = 2;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const randomBetween = (rng, min, max) => min + (max - min) * rng();

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

export function getLuminosityFromMass(massSolar) {
  if (massSolar < 0.43) {
    return 0.23 * massSolar ** 2.3;
  }

  if (massSolar < 2) {
    return massSolar ** 4;
  }

  if (massSolar < 20) {
    return 1.5 * massSolar ** 3.5;
  }

  return 3200 * massSolar;
}

export function getRadiusFromMass(massSolar) {
  if (massSolar < 1) {
    return massSolar ** 0.8;
  }

  return massSolar ** 0.57;
}

export function getTemperatureFromMass(massSolar) {
  const luminositySolar = getLuminosityFromMass(massSolar);
  const radiusSolar = getRadiusFromMass(massSolar);
  return SOLAR_TEMPERATURE_K * (luminositySolar / (radiusSolar ** 2)) ** 0.25;
}

export function getMassFromSpectralType(type, rng = Math.random) {
  const spectralClass = String(type || "").trim().charAt(0).toUpperCase();
  const typeData = IMF_WEIGHTS.find((item) => item.spectralClass === spectralClass);

  if (!typeData) {
    throw new Error(`Unsupported spectral type: ${type}`);
  }

  const [minMass, maxMass] = typeData.massRange;
  const bias = spectralClass === "O" || spectralClass === "B" ? UNIFORM_BIAS : LOWER_MASS_BIAS;
  const sampled = randomBetween(rng, 0, 1) ** bias;
  return clamp(minMass + sampled * (maxMass - minMass), minMass, maxMass);
}

export function getSpectralTypeFromMass(massSolar, rng = Math.random) {
  const matching = IMF_WEIGHTS.find(({ massRange }, index) => {
    const isLast = index === IMF_WEIGHTS.length - 1;
    return massSolar >= massRange[0] && (isLast ? massSolar <= massRange[1] : massSolar < massRange[1]);
  });
  const spectralClass = matching ? matching.spectralClass : "M";
  const subtype = Math.floor(rng() * 10);
  return `${spectralClass}${subtype}V`;
}

export function getRandomSpectralType(rng = Math.random) {
  const selected = weightedChoice(rng, IMF_WEIGHTS);
  const massSolar = getMassFromSpectralType(selected.spectralClass, rng);
  const luminositySolar = getLuminosityFromMass(massSolar);
  const temperatureK = getTemperatureFromMass(massSolar);
  const radiusSolar = getRadiusFromMass(massSolar);
  const subtype = Math.floor(rng() * 10);

  return {
    spectralClass: selected.spectralClass,
    spectralType: `${selected.spectralClass}${subtype}V`,
    massSolar,
    luminositySolar,
    temperatureK,
    radiusSolar
  };
}

export const stellarImfDistribution = IMF_WEIGHTS.map(({ spectralClass, probability }) => ({
  spectralClass,
  probability
}));
