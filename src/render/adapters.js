const DEFAULT_OPTIONS = {
  distanceScale: 20,
  timeScale: null,
  compressDistances: true,
  minPlanetRadius: 0.08,
  maxPlanetRadius: 0.6,
  minStarRadius: 0.35,
  maxStarRadius: 2.6
};

const SOLAR_RADIUS_AU = 0.00465047;
const EARTH_RADIUS_AU = 0.000042634;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const compressCoordinate = (valueAU, distanceScale, compressDistances) => {
  if (!compressDistances) {
    return valueAU * distanceScale;
  }

  return Math.sign(valueAU) * distanceScale * (Math.log1p(Math.abs(valueAU)) / Math.log(2));
};

const adaptPosition = (positionAU, options) => ({
  x: compressCoordinate(positionAU.x, options.distanceScale, options.compressDistances),
  y: compressCoordinate(positionAU.z, options.distanceScale, options.compressDistances),
  z: compressCoordinate(positionAU.y, options.distanceScale, options.compressDistances)
});

const getPlanetColor = (type) => {
  switch (type) {
    case "telluric":
      return "#b98f5a";
    case "super-earth":
      return "#6fa0a8";
    case "mini-neptune":
      return "#75a6d8";
    case "neptune":
      return "#456fd1";
    case "gas-giant":
      return "#d8b26e";
    default:
      return "#aaaaaa";
  }
};

const getStarColor = (temperatureK) => {
  if (temperatureK >= 10000) {
    return "#bcd7ff";
  }

  if (temperatureK >= 7500) {
    return "#e3ecff";
  }

  if (temperatureK >= 6000) {
    return "#fff4dc";
  }

  if (temperatureK >= 5000) {
    return "#ffd6a0";
  }

  if (temperatureK >= 3500) {
    return "#ffad66";
  }

  return "#ff7a45";
};

const adaptOrbitSamples = (planet, options, sampleCount = 96) => {
  if (planet.orbitPathAU?.length) {
    return planet.orbitPathAU.map((point) => adaptPosition(point, options));
  }

  return Array.from({ length: sampleCount + 1 }, (_, sample) => {
    const angle = (sample / sampleCount) * Math.PI * 2;
    const radiusAU = planet.semiMajorAxisAU;
    return adaptPosition({ x: radiusAU * Math.cos(angle), y: radiusAU * Math.sin(angle), z: 0 }, options);
  });
};

export function adaptToThreeJS(simulationState, options = {}) {
  const resolvedOptions = { ...DEFAULT_OPTIONS, ...options };

  return {
    paused: simulationState.paused,
    timeScale: resolvedOptions.timeScale ?? simulationState.timeScale,
    simulationTimeSeconds: simulationState.simulationTimeSeconds,
    stars: simulationState.stars.map((star) => ({
      name: star.name,
      spectralType: star.spectralType,
      luminositySolar: star.luminositySolar,
      radius: clamp(
        Math.sqrt(Math.max(star.radiusSolar, SOLAR_RADIUS_AU)) * 0.7,
        resolvedOptions.minStarRadius,
        resolvedOptions.maxStarRadius
      ),
      color: getStarColor(star.temperatureK),
      position: adaptPosition(star.positionAU, resolvedOptions)
    })),
    planets: simulationState.planets.map((planet) => ({
      name: planet.name,
      type: planet.type,
      habitability: planet.habitability,
      temperatureK: planet.estimatedTemperatureK,
      radius: clamp(
        Math.sqrt(Math.max(planet.radiusEarth * EARTH_RADIUS_AU, EARTH_RADIUS_AU)) * 12,
        resolvedOptions.minPlanetRadius,
        resolvedOptions.maxPlanetRadius
      ),
      color: getPlanetColor(planet.type),
      position: adaptPosition(planet.positionAU, resolvedOptions),
      orbitPoints: adaptOrbitSamples(planet, resolvedOptions)
    }))
  };
}
