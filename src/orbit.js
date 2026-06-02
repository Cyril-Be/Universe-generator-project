import { AU_IN_METERS, G, SOLAR_MASS_KG } from "./star.js";

const TWO_PI = Math.PI * 2;

const degToRad = (deg) => (deg * Math.PI) / 180;

const normalizeAngle = (angle) => {
  const wrapped = angle % TWO_PI;
  return wrapped < 0 ? wrapped + TWO_PI : wrapped;
};

export function solveKeplerEquation(meanAnomaly, eccentricity, tolerance = 1e-8, maxIterations = 20) {
  let eccentricAnomaly = eccentricity < 0.8 ? meanAnomaly : Math.PI;

  for (let i = 0; i < maxIterations; i += 1) {
    const f = eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly;
    const fPrime = 1 - eccentricity * Math.cos(eccentricAnomaly);
    const step = f / fPrime;
    eccentricAnomaly -= step;

    if (Math.abs(step) < tolerance) {
      break;
    }
  }

  return eccentricAnomaly;
}

export function orbitalPeriodSeconds(semiMajorAxisAU, starMassSolar) {
  const aMeters = semiMajorAxisAU * AU_IN_METERS;
  const starMassKg = starMassSolar * SOLAR_MASS_KG;
  return TWO_PI * Math.sqrt((aMeters ** 3) / (G * starMassKg));
}

export function orbitalPositionAtTime(planet, starMassSolar, simulationTimeSeconds) {
  const period = orbitalPeriodSeconds(planet.semiMajorAxisAU, starMassSolar);
  const meanMotion = TWO_PI / period;
  const meanAnomaly = normalizeAngle(planet.initialMeanAnomaly + meanMotion * simulationTimeSeconds);

  const e = planet.eccentricity;
  const eccentricAnomaly = solveKeplerEquation(meanAnomaly, e);
  const trueAnomaly =
    2 *
    Math.atan2(
      Math.sqrt(1 + e) * Math.sin(eccentricAnomaly / 2),
      Math.sqrt(1 - e) * Math.cos(eccentricAnomaly / 2)
    );

  const radiusAU = planet.semiMajorAxisAU * (1 - e * Math.cos(eccentricAnomaly));

  const omega = degToRad(planet.argumentOfPeriapsisDeg);
  const i = degToRad(planet.inclinationDeg);
  const Omega = degToRad(planet.longitudeAscendingNodeDeg);
  const angle = trueAnomaly + omega;

  const xOrbital = radiusAU * Math.cos(angle);
  const yOrbital = radiusAU * Math.sin(angle);

  const x = xOrbital * Math.cos(Omega) - yOrbital * Math.sin(Omega) * Math.cos(i);
  const y = xOrbital * Math.sin(Omega) + yOrbital * Math.cos(Omega) * Math.cos(i);
  const z = yOrbital * Math.sin(i);

  return {
    x,
    y,
    z,
    radiusAU,
    trueAnomaly,
    meanAnomaly,
    periodSeconds: period
  };
}
